"""Run M09.2 synthetic-only source bundle verification, no geometry production."""
from __future__ import annotations
import argparse
import json
import sys
from .governed_job import ContractError
from .source_bundle import write_bundle_validation


def main():
    p = argparse.ArgumentParser(description="Public synthetic CAD evidence validator")
    p.add_argument("--bundle", required=True)
    p.add_argument("--repo-root", default=".")
    p.add_argument("--out", required=True)
    args = p.parse_args()
    try:
        result = write_bundle_validation(args.bundle, args.repo_root, args.out)
    except ContractError as exc:
        print(json.dumps({"status": "REJECTED", "code": exc.code}), file=sys.stderr)
        return 2
    except (ValueError, OSError, KeyError, TypeError):
        print(json.dumps({"status": "REJECTED", "code": "IO_OR_RUNTIME_ERROR"}), file=sys.stderr)
        return 2
    print(json.dumps({"status": "SYNTHETIC_EVIDENCE_VERIFIED_REVIEW_REQUIRED",
                      "bundle_id": result["bundle_id"], "run_key": result["run_key"],
                      "engineering_approval": "HOLD"}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
