"""M10.2 synthetic-only native angled wall model execution."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from .angled_executor import build


def main():
    parser=argparse.ArgumentParser(description="M10.2 exact native CAD geometry synthetic QA")
    parser.add_argument("--preset",choices=["synthetic-angled-t-network"],required=True)
    parser.add_argument("--repo-root",default=".")
    parser.add_argument("--out",required=True)
    args=parser.parse_args()
    root=Path(args.repo_root).resolve()
    try:
        result=build(root/"design_jobs/synthetic/m10_2_demo.source.json",root,args.out)
    except (ValueError,OSError,TypeError,KeyError):
        print(json.dumps({"status":"REJECTED","code":"VALIDATION_OR_NATIVE_RUNTIME_REJECTED"}),
              file=sys.stderr)
        return 2
    print(json.dumps({"status":"SYNTHETIC_NATIVE_GEOMETRY_BUILT",
                      "section_method":result["section_method"],
                      "source_sha256":result["source_sha256"],
                      "engineering_approval":"HOLD",
                      "quantity_takeoff":"BLOCKED",
                      "outputs":len(result["outputs"])},sort_keys=True))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
