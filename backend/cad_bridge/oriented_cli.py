"""M10 synthetic-only job executor: fixed preset, no private input channel."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from .oriented_executor import build


def main():
    p = argparse.ArgumentParser(description="M10 native connected wall QA, synthetic only")
    p.add_argument("--preset", choices=("synthetic-u-walls",), required=True)
    p.add_argument("--repo-root", default=".")
    p.add_argument("--out", required=True)
    args = p.parse_args()
    root = Path(args.repo_root).resolve()
    source = root / "design_jobs/synthetic/m10_demo.source.json"
    try:
        result = build(source, root, args.out)
    except (ValueError, OSError, TypeError, KeyError):
        print(json.dumps({"schema": "fabin-cad://m10-diagnostic/0.1",
                          "status": "REJECTED", "code": "VALIDATION_OR_RUNTIME_REJECTED"},
                         sort_keys=True), file=sys.stderr)
        return 2
    print(json.dumps({"status": "SYNTHETIC_NATIVE_GEOMETRY_BUILT",
                      "source_sha256": result["source_sha256"],
                      "outputs": len(result["outputs"]),
                      "engineering_approval": "HOLD",
                      "quantity_takeoff": "BLOCKED"}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
