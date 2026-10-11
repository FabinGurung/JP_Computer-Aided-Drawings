"""Offline DXF/IFC/STEP export from M05+M06 local inputs."""
import argparse,json,sys
from pathlib import Path
from .vertical_interchange import parse,build,digest,export_dxf,export_ifc,export_step

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--plan",required=True)
    p.add_argument("--vertical",required=True)
    p.add_argument("--source-dxf",required=True)
    p.add_argument("--out-dir",required=True)
    a=p.parse_args()
    try:
        target=Path(a.out_dir)
        if target.exists() and any(target.iterdir()):
            raise ValueError("Refusing nonempty output directory")
        data=build(parse(a.plan),parse(a.vertical),a.source_dxf)
        target.mkdir(parents=True,exist_ok=True)
        reports=[]
        for filename,callback in [
            ("columns.dxf",export_dxf),("columns.ifc",export_ifc),("columns.step",export_step)
        ]:
            path=target/filename
            info=callback(data,path)
            info.update({"filename":filename,"sha256":digest(path),"bytes":path.stat().st_size})
            reports.append(info)
        manifest={"schema":"fabin-cad://five-engine-export-manifest/0.1",
            "status":"PROVISIONAL_NOT_FIELD_ISSUED","project_id":data["project_id"],
            "source_sha256":data["source_sha256"],"layout_sha256":data["layout_sha256"],
            "objects":[{"id":s["id"],"source_handle":s["source_handle"],"shape":s["shape"]} for s in data["solids"]],
            "engineering_release":"HOLD","quantity_takeoff":"BLOCKED","exports":reports}
        (target/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
        print(json.dumps({"status":manifest["status"],"count":len(data["solids"]),"exports":[x["filename"] for x in reports]}))
        return 0
    except (ValueError,RuntimeError,ImportError,OSError) as error:
        print("M07_REJECTED: "+str(error),file=sys.stderr)
        return 2
if __name__=="__main__":raise SystemExit(main())
