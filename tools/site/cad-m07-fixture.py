"""Generate synthetic structural source and M05/M06 review without client data."""
from pathlib import Path
import json,hashlib
from backend.tests.test_column_reconcile import ColumnReconcileTest
from backend.cad_bridge.column_reconcile import reconcile_columns
from backend.cad_bridge.vertical_interchange import build
from backend.cad_bridge.vertical_cli import main
from unittest.mock import patch

root=Path("/tmp/cad-m07-browser")
root.mkdir(parents=True,exist_ok=True)
dx,layout,_=ColumnReconcileTest().setup_fixture(root)
sha=hashlib.sha256(dx.read_bytes()).hexdigest()
plan=reconcile_columns(dx,layout,"SYNTHETIC-DXF",sha)
vertical={"schema":"fabin-cad://vertical-observations/0.1",
 "status":"PROVISIONAL_NOT_FIELD_ISSUED","project_id":plan["project_id"],
 "plan_source_sha256":sha,"plan_layout_sha256":plan["source"]["layout_sha256"],
 "datum_label":"SYNTHETIC_TEST_DATUM",
 "vertical_sources":[{"id":"SYN-SECTION","record_id":"SYNTHETIC-SHEET-01","kind":"SECTION","review":"USER_REVIEWED_NOT_AUTHORIZED"}],
 "levels":[{"id":"BASE","z_mm":0,"source_ids":["SYN-SECTION"]},{"id":"L01","z_mm":3200,"source_ids":["SYN-SECTION"]}],
 "segments":[{"grid":c["grid"],"from_level":"BASE","to_level":"L01","source_ids":["SYN-SECTION"]} for c in plan["columns"]]}
p=root/"plan.json";v=root/"vertical.json";p.write_text(json.dumps(plan));v.write_text(json.dumps(vertical))
with patch("sys.argv",["m07","--plan",str(p),"--vertical",str(v),"--source-dxf",str(dx),"--out-dir",str(root/"outputs")]):
 assert main()==0
print("M07_SYNTHETIC_FIVE_ENGINE_FIXTURE_READY")
