"""M11.1 pinned reusable synthetic assembly executor."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from .assembly_executor import build_assembly


def main():
    parser=argparse.ArgumentParser(
        description="Public allowlisted M11 synthetic typed assembly only")
    parser.add_argument("--preset",choices=["synthetic-assembly"],required=True)
    parser.add_argument("--repo-root",default=".")
    parser.add_argument("--out",required=True)
    a=parser.parse_args()
    root=Path(a.repo_root).resolve()
    try:
        result=build_assembly(
            root/"design_jobs/synthetic/m11_demo.assembly.json",root,a.out)
    except (ValueError, OSError, KeyError, TypeError):
        print(json.dumps({"status":"REJECTED",
                          "code":"SYNTHETIC_ASSEMBLY_VALIDATION_OR_RUNTIME_ERROR"},
                         sort_keys=True),file=sys.stderr)
        return 2
    print(json.dumps({
        "status":"SYNTHETIC_ASSEMBLY_QA_ONLY",
        "assembly_id":result["assembly_id"],
        "outputs":len(result["outputs"]),
        "component_instances":result["component_instances"],
        "engineering_approval":"HOLD",
        "quantity_takeoff":"BLOCKED"
    },sort_keys=True))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
