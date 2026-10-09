from __future__ import annotations
from copy import deepcopy
from pathlib import Path
import tempfile,unittest
from backend.cad_bridge.model import load_model
from backend.cad_bridge.constraints import resolve_model,section_faces
from backend.cad_bridge.adapters import export_dxf,export_ifc,export_step
class ParametricTest(unittest.TestCase):
 def setUp(self):self.m=load_model("public/cad/demo.json")
 def by(self,m,id):return next(e for e in m["elements"] if e["id"]==id)
 def test_chain(self):
  before=resolve_model(self.m);col=self.by(before,"COL_A1");beam=self.by(before,"BEAM_FRONT")
  draft=deepcopy(self.m);self.by(draft,"FOOTING_A1")["x_mm"]+=200
  after=resolve_model(draft)
  self.assertEqual(self.by(after,"COL_A1")["x_mm"],col["x_mm"]+200)
  self.assertEqual(self.by(after,"BEAM_FRONT")["x_mm"],beam["x_mm"]+200)
  self.assertEqual(self.by(after,"BEAM_FRONT")["length_mm"],beam["length_mm"]-200)
  self.assertEqual(self.by(self.m,"COL_A1")["x_mm"],700)
 def test_resize(self):
  before=self.by(resolve_model(self.m),"COL_A1")["x_mm"]
  draft=deepcopy(self.m);self.by(draft,"FOOTING_A1")["length_mm"]+=200
  self.assertEqual(self.by(resolve_model(draft),"COL_A1")["x_mm"],before+100)
 def test_invalid_cycle_and_span(self):
  cyclic=deepcopy(self.m);cyclic["links"].append({"id":"BAD_LOOP","kind":"center_on_top","parent_id":"COL_A1","child_id":"FOOTING_A1"})
  with self.assertRaises(ValueError):resolve_model(cyclic)
  bad=deepcopy(self.m);self.by(bad,"FOOTING_B1")["y_mm"]+=400
  with self.assertRaises(ValueError):resolve_model(bad)
 def test_section(self):
  before=section_faces(self.m,"y",875)
  draft=deepcopy(self.m);self.by(draft,"FOOTING_A1")["x_mm"]+=200
  after=section_faces(draft,"y",875)
  b=next(e for e in before if e["element_id"]=="BEAM_FRONT")
  a=next(e for e in after if e["element_id"]=="BEAM_FRONT")
  self.assertEqual(a["x0_mm"]-b["x0_mm"],200)
 def test_adapter_parity(self):
  import ezdxf,ifcopenshell
  from OCP.STEPControl import STEPControl_Reader
  from OCP.IFSelect import IFSelect_RetDone
  expected=self.by(resolve_model(self.m),"COL_A1")
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);dx=d/"model.dxf";ifc=d/"model.ifc";step=d/"model.step"
   export_dxf(self.m,dx);export_ifc(self.m,ifc);export_step(self.m,step)
   cols=list(ezdxf.readfile(str(dx)).modelspace().query('LWPOLYLINE[layer=="COLUMN"]'))
   self.assertEqual(len(cols),2)
   self.assertTrue(any(round(c[0][0])==round(expected["x_mm"]) for c in cols))
   obj=next(x for x in ifcopenshell.open(str(ifc)).by_type("IfcColumn") if x.Tag=="COL_A1")
   self.assertAlmostEqual(obj.ObjectPlacement.RelativePlacement.Location.Coordinates[0],expected["x_mm"]/1000)
   reader=STEPControl_Reader();self.assertEqual(reader.ReadFile(str(step)),IFSelect_RetDone)
if __name__=="__main__":unittest.main()
