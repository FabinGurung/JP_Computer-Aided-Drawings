"""Run: python -m backend.cad_bridge.cli --model public/cad/demo.json --format dxf --out /tmp/demo.dxf"""
from __future__ import annotations
import argparse,json,sys
from pathlib import Path
from .model import load_model
from .adapters import export_dxf,export_ifc,export_step,section_edges
def main()->int:
    parser=argparse.ArgumentParser(description="Five-stack CAD bridge; research/demo only")
    parser.add_argument("--model",default="public/cad/demo.json")
    parser.add_argument("--format",choices=("dxf","ifc","step","section"),required=True)
    parser.add_argument("--out",help="Output file path for dxf/ifc/step")
    parser.add_argument("--section-z-mm",type=float,default=1000)
    args=parser.parse_args()
    try:
        model=load_model(args.model)
        if args.format=="section":
            answer=section_edges(model,args.section_z_mm)
        else:
            if not args.out:raise ValueError("--out is required for exports")
            Path(args.out).parent.mkdir(parents=True,exist_ok=True)
            answer={"dxf":export_dxf,"ifc":export_ifc,"step":export_step}[args.format](model,args.out)
        print(json.dumps(answer,sort_keys=True));return 0
    except (ValueError,RuntimeError,ImportError,ModuleNotFoundError) as error:
        print("CAD_BRIDGE_ERROR: "+str(error),file=sys.stderr);return 2
if __name__=="__main__":raise SystemExit(main())
