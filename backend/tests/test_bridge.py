"""Real-world adapter smoke tests using the demo only; never inspect client data."""
from pathlib import Path
import tempfile,unittest,json
from backend.cad_bridge.model import load_model,ModelError
from backend.cad_bridge.adapters import export_dxf,export_ifc,export_step,section_edges
MODEL_PATH="public/cad/demo.json"
class CadBridgeTest(unittest.TestCase):
 def setUp(self):self.model=load_model(MODEL_PATH)
 def test_model_positive_and_unique(self):
  self.assertEqual(self.model["units"],"mm")
  self.assertEqual(len({e["id"] for e in self.model["elements"]}),len(self.model["elements"]))
 def test_invalid_element_dimension(self):
  with tempfile.TemporaryDirectory() as d:
   candidate=json.loads(json.dumps(self.model));candidate["elements"][0]["width_mm"]=0
   path=Path(d)/"invalid.json";path.write_text(json.dumps(candidate))
   with self.assertRaises(ModelError):load_model(path)
 def test_dxf_real_parser(self):
  import ezdxf
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/"demo.dxf";report=export_dxf(self.model,path)
   source=ezdxf.readfile(str(path))
   self.assertEqual(report["elements"],len(self.model["elements"]))
   self.assertEqual(len(list(source.modelspace().query("LWPOLYLINE"))),len(self.model["elements"]))
   self.assertEqual(source.units,4)
 def test_ifc_real_parser(self):
  import ifcopenshell
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/"demo.ifc";report=export_ifc(self.model,path)
   source=ifcopenshell.open(str(path))
   objects=[s for t in ("IfcWall","IfcSlab","IfcColumn","IfcFooting","IfcBeam") for s in source.by_type(t)]
   self.assertEqual(len(objects),len(self.model["elements"]))
   self.assertEqual({x.Tag for x in objects},{e["id"] for e in self.model["elements"]})
   self.assertEqual(report["storeys"],3)
 def test_open_cascade_step_and_section(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/"demo.step";report=export_step(self.model,path)
   self.assertGreater(path.stat().st_size,300)
   self.assertEqual(report["engine"],"OpenCascade/OCP")
   section=section_edges(self.model,1000)
   self.assertGreater(section["edge_count"],0)
if __name__=="__main__":unittest.main()
