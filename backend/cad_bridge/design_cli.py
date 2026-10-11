"""Deterministic CAD job invocation. Only allowlisted checked-in synthetic jobs."""
from __future__ import annotations
import argparse,json,sys
from pathlib import Path
from .design_executor import build
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--job",required=True)
    p.add_argument("--repo-root",default=".")
    p.add_argument("--out",required=True)
    a=p.parse_args()
    try:
        result=build(a.job,a.repo_root,a.out)
        print(json.dumps({"result":"BUILD_COMPLETE_SYNTHETIC_REVIEW_ONLY",
          "job_id":result["job_id"],"artifacts":len(result["outputs"]),
          "engineering_approval":result["engineering_approval"]}))
        return 0
    except (ValueError,RuntimeError,ImportError,OSError,KeyError,TypeError) as error:
        print("M08_BUILD_REJECTED: "+str(error),file=sys.stderr)
        return 2
if __name__=="__main__":raise SystemExit(main())
