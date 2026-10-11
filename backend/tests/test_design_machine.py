"""M08 actual native-engine acceptance and negative source/geometry tests."""
import copy,hashlib,json,unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from backend.cad_bridge.design_job import load
from backend.cad_bridge.design_executor import build,make_occt
ROOT=Path(__file__).resolve().parents[2]
JOB=ROOT/"design_jobs/synthetic/m08_demo.job.json"
SOURCE=ROOT/"design_jobs/synthetic/m08_demo.source.json"
class M08DesignMachineTests(unittest.TestCase):
 def test_all_five_object_classes_and_true_opening_boolean(self):
  import ezdxf,ifcopenshell
  from OCP.BRepGProp import BRepGProp
  from OCP.GProp import GProp_GProps
  from OCP.STEPControl import STEPControl_Reader
  state=load(JOB,ROOT)
  self.assertEqual(len(state["elements"]),5)
  with TemporaryDirectory() as d:
   result=build(JOB,ROOT,Path(d)/"output")
   self.assertEqual(result["status"],"SYNTHETIC_QA_ONLY")
   self.assertEqual(result["engineering_approval"],"HOLD")
   self.assertEqual(result["quantity_takeoff"],"BLOCKED")
   self.assertEqual(len(result["outputs"]),6)
   output=Path(d)/"output"
   self.assertTrue(all(hashlib.sha256((output/e["name"]).read_bytes()).hexdigest()==e["sha256"] for e in result["outputs"]))
   dxf=ezdxf.readfile(output/"design.dxf")
   self.assertEqual(len(dxf.modelspace().query("LWPOLYLINE")),5)
   self.assertEqual(len(dxf.modelspace().query("LINE")),1)
   bim=ifcopenshell.open(str(output/"design.ifc"))
   for kind in ("IfcWall","IfcFooting","IfcBeam","IfcSlab","IfcColumn"):
    self.assertEqual(len(bim.by_type(kind)),1,kind)
   self.assertEqual(len(bim.by_type("IfcOpeningElement")),1)
   relations=bim.by_type("IfcRelVoidsElement")
   self.assertEqual(len(relations),1)
   self.assertEqual(relations[0].RelatingBuildingElement.Tag,"Wall01")
   self.assertEqual(relations[0].RelatedOpeningElement.Tag,"Opening01")
   rdr=STEPControl_Reader()
   self.assertEqual(rdr.ReadFile(str(output/"design.step")),1)
   self.assertGreater(rdr.TransferRoots(),0)
   from OCP.TopAbs import TopAbs_SOLID
   from OCP.TopExp import TopExp_Explorer
   exp=TopExp_Explorer(rdr.OneShape(),TopAbs_SOLID);count=0
   while exp.More():count+=1;exp.Next()
   self.assertEqual(count,5)
   p=GProp_GProps();BRepGProp.VolumeProperties(make_occt(state),p)
   expected=sum(e["length_mm"]*e["width_mm"]*e["height_mm"] for e in state["elements"])
   expected-=1000*2100*200
   self.assertAlmostEqual(p.Mass(),expected,delta=expected*0.0000005)
   self.assertIn("SYNTHETIC QA", (output/"index.html").read_text())
   self.assertIn("<svg", (output/"section.svg").read_text())
 def test_no_second_write_or_fake_job_authority(self):
  with TemporaryDirectory() as d:
   out=Path(d)/"out";build(JOB,ROOT,out)
   with self.assertRaisesRegex(ValueError,"target must be empty"):build(JOB,ROOT,out)
   external=Path(d)/"untrusted.job.json";external.write_text(JOB.read_text())
   with self.assertRaisesRegex(ValueError,"allowlisted"):load(external,ROOT)
 def test_bad_sha_dims_opening_source_or_status_fail_closed(self):
  with TemporaryDirectory() as d:
   root=Path(d)/"repo";folder=root/"design_jobs/synthetic";folder.mkdir(parents=True)
   j=json.loads(JOB.read_text());s=json.loads(SOURCE.read_text())
   sp=folder/"m08_demo.source.json";jp=folder/"m08_demo.job.json"
   def attempt():
    sp.write_text(json.dumps(s,indent=2)+"\n")
    j["source"]["sha256"]=hashlib.sha256(sp.read_bytes()).hexdigest()
    jp.write_text(json.dumps(j))
    return load(jp,root)
   attempt()
   j["source"]["sha256"]="0"*64
   sp.write_text(json.dumps(s,indent=2)+"\n");jp.write_text(json.dumps(j))
   with self.assertRaisesRegex(ValueError,"SHA256 mismatch"):load(jp,root)
   j["source"]["sha256"]=hashlib.sha256(sp.read_bytes()).hexdigest()
   s["elements"][0]["height_mm"]=None
   with self.assertRaisesRegex(ValueError,"missing/nonnumeric"):attempt()
   s=json.loads(SOURCE.read_text());s["openings"][0]["offset_mm"]=8400
   with self.assertRaisesRegex(ValueError,"fit strictly"):attempt()
   s=json.loads(SOURCE.read_text());s["openings"].append(copy.deepcopy(s["openings"][0]));s["openings"][1]["id"]="Opening02"
   with self.assertRaisesRegex(ValueError,"overlapping wall openings"):attempt()
   s=json.loads(SOURCE.read_text());s["status"]="FIELD_APPROVED"
   with self.assertRaisesRegex(ValueError,"source type"):attempt()
if __name__=="__main__":unittest.main()
