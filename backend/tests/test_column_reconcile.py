"""M05: remote block-local coordinates + true world bounds, no semantic shortcuts."""
import hashlib,json,math
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import ezdxf
from backend.cad_bridge.column_reconcile import reconcile_columns

class ColumnReconcileTest(unittest.TestCase):
 def setup_fixture(self,root):
  root=Path(root);dxf=root/"structural.dxf";layout=root/"field.json"
  doc=ezdxf.new("R2007");doc.units=4
  a=doc.blocks.new("RECT_REMOTE")
  a.add_lwpolyline([(9000,5000),(9400,5000),(9400,5400),(9000,5400)],close=True)
  b=doc.blocks.new("CIRCLE_REMOTE")
  b.add_circle((820000,-5700),175)
  e0=doc.modelspace().add_blockref("RECT_REMOTE",(1000-9200,2000-5200))
  e1=doc.modelspace().add_blockref("RECT_REMOTE",(5900-9200,2000-5200))
  e2=doc.modelspace().add_blockref("CIRCLE_REMOTE",(1000-820000,5600+5700))
  rows=[
   {"grid":"A1","column_type":"C1","shape":"rectangular","x_mm":0,"y_mm":0,"width_mm":400,"depth_mm":400,"source_dxf_symbol_handle":e0.dxf.handle},
   {"grid":"B1","column_type":"C1","shape":"rectangular","x_mm":4900,"y_mm":0,"width_mm":400,"depth_mm":400,"source_dxf_symbol_handle":e1.dxf.handle},
   {"grid":"A2","column_type":"C4","shape":"circular","x_mm":0,"y_mm":3600,"diameter_mm":350,"source_dxf_symbol_handle":e2.dxf.handle}
  ]
  doc.saveas(dxf)
  layout.write_text(json.dumps({"schema":"a9://narayani/site-setout-column-face-layout/0.6",
     "status":"CORRECTED_REVIEW_CANDIDATE__NOT_FIELD_ISSUED",
     "coordinate_frame":{"units":"mm"},"project":{"id":"TEST-001"},"columns":rows}))
  return dxf,layout,rows
 def test_local_insert_is_not_global_centre(self):
  with TemporaryDirectory() as tmp:
   src,layout,rows=self.setup_fixture(tmp)
   digest=hashlib.sha256(src.read_bytes()).hexdigest()
   pkg=reconcile_columns(src,layout,"TEST-SRC",digest)
   self.assertEqual(pkg["qa"]["column_count"],3)
   self.assertEqual(pkg["alignment"]["translation_global_from_grid_mm"],[1000.0,2000.0])
   self.assertEqual(pkg["alignment"]["maximum_residual_mm"],0)
   self.assertEqual(pkg["columns"][2]["width_mm"],350)
   self.assertEqual(pkg["columns"][2]["shape"],"circular")
   self.assertTrue(all(x["height_mm"] is None and x["z_mm"] is None for x in pkg["columns"]))
   self.assertEqual(pkg["qa"]["semantic_promotion"],"BLOCKED")
 def test_hash_revision_and_geometry_conflicts_rejected(self):
  with TemporaryDirectory() as tmp:
   src,layout,rows=self.setup_fixture(tmp);digest=hashlib.sha256(src.read_bytes()).hexdigest()
   with self.assertRaises(ValueError):reconcile_columns(src,layout,"TEST-SRC","0"*64)
   obj=json.loads(layout.read_text());obj["columns"][1]["x_mm"]+=50
   layout.write_text(json.dumps(obj))
   with self.assertRaises(ValueError):reconcile_columns(src,layout,"TEST-SRC",digest)
   obj["columns"][1]["x_mm"]-=50;obj["columns"][2]["diameter_mm"]=450
   layout.write_text(json.dumps(obj))
   with self.assertRaises(ValueError):reconcile_columns(src,layout,"TEST-SRC",digest)
if __name__=="__main__":unittest.main()
