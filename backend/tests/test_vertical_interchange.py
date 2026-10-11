"""Five-engine M07: native DXF -> corrected column review -> verticals -> IFC/STEP/DXF."""
import copy,json,hashlib
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from backend.tests.test_column_reconcile import ColumnReconcileTest
from backend.cad_bridge.column_reconcile import reconcile_columns
from backend.cad_bridge.vertical_interchange import build,export_dxf,export_ifc,export_step

class FiveEngineInterchangeTest(unittest.TestCase):
    def fixture(self,root):
        dx,layout,_=ColumnReconcileTest().setup_fixture(root)
        fingerprint=hashlib.sha256(dx.read_bytes()).hexdigest()
        p=reconcile_columns(dx,layout,"GENERIC-SOURCE",fingerprint)
        v={"schema":"fabin-cad://vertical-observations/0.1",
           "status":"PROVISIONAL_NOT_FIELD_ISSUED","project_id":p["project_id"],
           "plan_source_sha256":fingerprint,"plan_layout_sha256":p["source"]["layout_sha256"],
           "datum_label":"USER_LOCAL_DATUM",
           "vertical_sources":[{"id":"SEC-01","record_id":"DRAWING-SECTION-3","kind":"SECTION","review":"USER_REVIEWED_NOT_AUTHORIZED"}],
           "levels":[{"id":"BASE","z_mm":-500,"source_ids":["SEC-01"]},
                     {"id":"L01","z_mm":3100,"source_ids":["SEC-01"]}],
           "segments":[{"grid":c["grid"],"from_level":"BASE","to_level":"L01","source_ids":["SEC-01"]} for c in p["columns"]]}
        return dx,p,v
    def test_native_roundtrip_fidelity(self):
        import ezdxf,ifcopenshell
        from OCP.STEPControl import STEPControl_Reader
        from OCP.TopAbs import TopAbs_SOLID
        from OCP.TopExp import TopExp_Explorer
        with TemporaryDirectory() as tmp:
            root=Path(tmp);dx,p,v=self.fixture(root)
            data=build(p,v,dx)
            self.assertEqual(len(data["solids"]),3)
            self.assertEqual([s["shape"] for s in data["solids"]].count("circular"),1)
            self.assertEqual({s["height_mm"] for s in data["solids"]},{3600})
            dxf=root/"out.dxf";ifc=root/"out.ifc";step=root/"out.step"
            export_dxf(data,dxf);export_ifc(data,ifc);export_step(data,step)
            parsed=ezdxf.readfile(dxf)
            self.assertEqual(len(parsed.modelspace().query("CIRCLE")),1)
            self.assertEqual(len(parsed.modelspace().query("LWPOLYLINE")),2)
            self.assertEqual(parsed.units,4)
            for entity in parsed.modelspace():
                self.assertEqual(entity.get_xdata("FABIN_CAD")[-1].value,"NOT_FIELD_ISSUED")
            bim=ifcopenshell.open(str(ifc))
            self.assertEqual(len(bim.by_type("IfcColumn")),3)
            self.assertEqual(len(bim.by_type("IfcCircleProfileDef")),1)
            self.assertEqual(len(bim.by_type("IfcRectangleProfileDef")),2)
            self.assertEqual(len(bim.by_type("IfcExtrudedAreaSolid")),3)
            self.assertEqual({c.Tag for c in bim.by_type("IfcColumn")},
                             {s["id"] for s in data["solids"]})
            self.assertTrue(all("PROVISIONAL" in c.Description for c in bim.by_type("IfcColumn")))
            rdr=STEPControl_Reader()
            self.assertEqual(rdr.ReadFile(str(step)),1)
            self.assertGreater(rdr.TransferRoots(),0)
            explorer=TopExp_Explorer(rdr.OneShape(),TopAbs_SOLID)
            count=0
            while explorer.More():count+=1;explorer.Next()
            self.assertEqual(count,3)
    def test_all_revision_and_source_gates(self):
        with TemporaryDirectory() as tmp:
            dx,p,v=self.fixture(tmp)
            build(p,v,dx)
            changed=copy.deepcopy(v);changed["plan_source_sha256"]="a"*64
            with self.assertRaisesRegex(ValueError,"source linkage"):build(p,changed,dx)
            changed=copy.deepcopy(v);changed["levels"][0]["z_mm"]=None
            with self.assertRaisesRegex(ValueError,"coordinate"):build(p,changed,dx)
            changed=copy.deepcopy(v);changed["segments"][0]["source_ids"]=[]
            with self.assertRaisesRegex(ValueError,"source"):build(p,changed,dx)
            changed=copy.deepcopy(v);changed["status"]="FIELD_APPROVED"
            with self.assertRaisesRegex(ValueError,"schema/status"):build(p,changed,dx)
            changed=copy.deepcopy(p);changed["columns"][0]["width_mm"]=600
            with self.assertRaisesRegex(ValueError,"dimensions"):build(changed,v,dx)
            original=Path(dx).read_bytes()
            Path(dx).write_bytes(original+b"\n")
            with self.assertRaisesRegex(ValueError,"SHA mismatch"):build(p,v,dx)
    def test_cli_produces_bounded_manifest_and_refuses_overwrites(self):
        from backend.cad_bridge.vertical_cli import main
        from unittest.mock import patch
        with TemporaryDirectory() as tmp:
            root=Path(tmp);dx,p,v=self.fixture(root)
            pp=root/"plan.json";vp=root/"vertical.json";out=root/"release"
            pp.write_text(json.dumps(p));vp.write_text(json.dumps(v))
            args=["m07","--plan",str(pp),"--vertical",str(vp),"--source-dxf",str(dx),"--out-dir",str(out)]
            with patch("sys.argv",args):self.assertEqual(main(),0)
            data=json.loads((out/"manifest.json").read_text())
            self.assertEqual(data["engineering_release"],"HOLD")
            self.assertEqual(len(data["objects"]),3)
            self.assertEqual(len(data["exports"]),3)
            with patch("sys.argv",args):self.assertEqual(main(),2)
if __name__=="__main__":unittest.main()
