"""Independent release artifact gate: hashes, statuses, source identity, file allowlist."""
import argparse,hashlib,json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from backend.cad_bridge.design_job import load
def verify(directory,job,root):
    path=Path(directory);m=json.loads((path/"manifest.json").read_text())
    state=load(job,root)
    assert m["schema"]=="fabin-cad://design-result/0.1"
    assert m["status"]=="SYNTHETIC_QA_ONLY" and m["ai_geometry_generation"]=="NONE"
    assert m["source_sha256"]==state["source_sha256"]
    assert m["job_sha256"]==hashlib.sha256(Path(job).read_bytes()).hexdigest()
    assert m["project_id"]==state["job"]["project_id"]
    assert m["engineering_approval"]=="HOLD" and m["quantity_takeoff"]=="BLOCKED"
    assert m["elements"]==len(state["elements"]) and m["openings"]==len(state["openings"])
    required={"design.ifc","design.step","design.dxf","plan.svg","section.svg","index.html"}
    assert {x["name"] for x in m["outputs"]}==required
    for item in m["outputs"]:
        name=item["name"];p=path/name
        assert p.is_file() and p.stat().st_size>100
        assert p.stat().st_size==item["bytes"]
        assert hashlib.sha256(p.read_bytes()).hexdigest()==item["sha256"]
    assert {p.name for p in path.iterdir()}==required|{"manifest.json"}
    print("CAD_M08_MACHINE_ARTIFACT_READBACK_PASS",m["job_id"],len(required))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--out",required=True);p.add_argument("--job",required=True)
    p.add_argument("--repo-root",default=".");a=p.parse_args()
    verify(a.out,a.job,a.repo_root)
