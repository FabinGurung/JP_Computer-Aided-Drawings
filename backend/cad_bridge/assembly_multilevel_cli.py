"""M11.2 synthetic-only fixed-preset assembly execution."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from .assembly_multilevel_executor import build

def main():
    p=argparse.ArgumentParser(description='M11.2 public synthetic native assembly')
    p.add_argument('--preset',choices=['synthetic-multilevel'],required=True)
    p.add_argument('--repo-root',default='.')
    p.add_argument('--out',required=True)
    arg=p.parse_args()
    root=Path(arg.repo_root).resolve()
    try:
        report=build(root/'design_jobs/synthetic/m11_2_multistorey.assembly.json', root,arg.out)
    except (ValueError,OSError,KeyError,TypeError):
        print(json.dumps({'status':'REJECTED','code':'M11_2_SYNTHETIC_VALIDATION_OR_RUNTIME_ERROR'}),file=sys.stderr)
        return 2
    print(json.dumps({'status':report['status'],'assembly_id':report['assembly_id'],
      'levels':report['levels'],'components':report['component_instances'],
      'engineering_approval':'HOLD','quantity_takeoff':'BLOCKED'},sort_keys=True))
    return 0
if __name__=='__main__':
    raise SystemExit(main())
