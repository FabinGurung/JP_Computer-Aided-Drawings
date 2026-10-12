"""M09 public-synthetic contract validator; never dispatches private designs."""
from __future__ import annotations
import argparse
import json
import sys
from .governed_job import ContractError, write_validation

def main():
    parser = argparse.ArgumentParser(description="Validate an allowlisted synthetic CAD job contract")
    parser.add_argument("--contract", required=True)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    try:
        result = write_validation(args.contract, args.repo_root, args.out)
    except ContractError as error:
        print(json.dumps({"schema": "fabin-cad://governed-job-diagnostic/0.1",
                          "status": "REJECTED", "code": error.code}, sort_keys=True), file=sys.stderr)
        return 2
    except (OSError, ValueError, TypeError, KeyError) as error:
        # Public diagnostics must not echo arbitrary source paths or credentials.
        print(json.dumps({"schema": "fabin-cad://governed-job-diagnostic/0.1",
                          "status": "REJECTED", "code": "IO_OR_RUNTIME_ERROR"}, sort_keys=True), file=sys.stderr)
        return 2
    print(json.dumps({"status": "VALIDATED_SYNTHETIC_ONLY", "run_key": result["run_key"],
                      "artifact": args.out, "engineering_approval": "HOLD"}, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
