"""M04 DXF intake: exact unit, source hash, selected-region, semantic HOLD."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib,json,unittest
import ezdxf
from backend.cad_bridge.dxf_intake import intakedxf
class DXFIntakeTest(unittest.TestCase):
 def make(self,root,units=4):
  source=Path(root)/"test.dxf"
  doc=ezdxf.new("R2007");doc.units=units;space=doc.modelspace()
  space.add_line((100,100),(400,100),dxfattribs={"layer":"STRUCTURAL"})
  space.add_lwpolyline([(120,180),(220,180),(220,300),(120,300)],close=True,dxfattribs={"layer":"UNREVIEWED_COLUMN"})
  space.add_lwpolyline([(140,340,0,0,1),(200,340,0,0,0)],close=False,dxfattribs={"layer":"BULGED_ARC"})
  space.add_circle((300,300),25,dxfattribs={"layer":"GRID_CENTRE"})
  space.add_line((3000,3000),(3300,3000),dxfattribs={"layer":"FAR_AWAY"})
  doc.saveas(source);return source
 def test_bounded_native_geom_no_semantics(self):
  with TemporaryDirectory() as root:
   src=self.make(root);out=intakedxf(src,"DEMO-SOURCE-001",(0,0,600,600))
   self.assertEqual(out["schema"],"fabin-cad://dxf-review-overlay/0.1")
   self.assertEqual(out["source"]["file_sha256"],hashlib.sha256(src.read_bytes()).hexdigest())
   self.assertEqual(out["qa"]["selected_count"],3)
   self.assertEqual(out["qa"]["semantic_gate"],"NO_AUTOMATIC_BIM_PROMOTION")
   self.assertEqual(out["qa"]["unsupported_or_bulge"]["BULGE_OR_UNSUPPORTED_GEOMETRY"],1)
   self.assertEqual(out["qa"]["outside_region"]["LINE"],1)
   self.assertEqual(out["entities"][0]["points_mm"],[[100.0,100.0],[400.0,100.0]])
 def test_invalid_units_and_overflow_rejected(self):
  with TemporaryDirectory() as root:
   src=self.make(root,units=1)
   with self.assertRaises(ValueError):intakedxf(src,"DEMO-SOURCE-001",(0,0,600,600))
   src=self.make(root)
   with self.assertRaises(ValueError):intakedxf(src,"DEMO-SOURCE-001",(0,0,600,600),max_entities=1)
   with self.assertRaises(ValueError):intakedxf(src,"DEMO-SOURCE-001",(0,0,0,0))
if __name__=="__main__":unittest.main()
