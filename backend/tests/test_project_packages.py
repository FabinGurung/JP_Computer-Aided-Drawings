"""A project package is an independent input: never rebuild software per building."""
from pathlib import Path
from tempfile import TemporaryDirectory
from copy import deepcopy
import json,unittest
from backend.cad_bridge.model import load_model,ModelError
from backend.cad_bridge.adapters import export_ifc,export_dxf
from backend.cad_bridge.constraints import resolve_model
class ProjectPackageTest(unittest.TestCase):
 def new_package(self,project_id,foot_x):
  model=json.loads(Path("public/cad/demo.json").read_text())
  model["project_id"]=project_id;model["authority"]="DRAFT"
  next(e for e in model["elements"] if e["id"]=="FOOTING_A1")["x_mm"]=foot_x
  levels=list(dict.fromkeys(e["level"] for e in model["elements"]))
  return {"schema":"fabin-cad://project-package/0.1",
   "project":{"id":project_id,"name":"Independent template project","kind":"residential","revision":"DRAFT-0001","coordinate_system":"LOCAL_CARTESIAN","units":"mm","datum_label":"LOCAL_ORIGIN_UNVERIFIED"},
   "levels":[{"id":id,"elevation_mm":0} for id in levels],
   "source_refs":[],
   "element_semantics":[{"element_id":e["id"],"discipline":"STRUCTURAL","description":"unverified "+e["kind"],"source_ids":[],"verification":"UNVERIFIED"} for e in model["elements"]],
   "model":model}
 def test_two_project_packages_load_export_and_remain_isolated(self):
  import ifcopenshell,ezdxf
  with TemporaryDirectory() as temp:
   root=Path(temp);results=[]
   for name,offset in [("DEMO-A-001",200),("DEMO-B-002",700)]:
    p=self.new_package(name,offset);src=root/(name+".json");src.write_text(json.dumps(p))
    loaded=load_model(src);self.assertEqual(loaded["project_id"],name)
    output=root/(name+".ifc");dx=root/(name+".dxf")
    export_ifc(loaded,output);export_dxf(loaded,dx)
    elements=ifcopenshell.open(str(output)).by_type("IfcColumn")
    self.assertEqual(len(elements),2)
    self.assertEqual(len(list(ezdxf.readfile(str(dx)).modelspace().query("LWPOLYLINE"))),len(loaded["elements"]))
    c=next(e for e in elements if e.Tag=="COL_A1")
    results.append((c.GlobalId,c.ObjectPlacement.RelativePlacement.Location.Coordinates[0]))
   self.assertNotEqual(results[0][0],results[1][0])
   self.assertNotEqual(results[0][1],results[1][1])
 def test_mismatched_identity_or_unlisted_level_rejected(self):
  with TemporaryDirectory() as temp:
   p=self.new_package("DEMO-C-003",200);path=Path(temp)/"bad.json"
   p["model"]["project_id"]="FOREIGN-CAD";path.write_text(json.dumps(p))
   with self.assertRaises(ValueError):load_model(path)
   p["model"]["project_id"]=p["project"]["id"];p["levels"]=[{"id":"CUSTOM","elevation_mm":0}]
   path.write_text(json.dumps(p))
   with self.assertRaises(ValueError):load_model(path)
 def test_source_pointer_requires_opaque_record_id(self):
  with TemporaryDirectory() as temp:
   p=self.new_package("DEMO-D-004",200)
   p["source_refs"]=[{"source_id":"ARCH-001","kind":"DWG","external_record_id":"https://private.example/source","verification":"UNVERIFIED"}]
   path=Path(temp)/"source.json";path.write_text(json.dumps(p))
   with self.assertRaises(ValueError):load_model(path)
if __name__=="__main__":unittest.main()
