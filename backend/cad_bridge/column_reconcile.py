"""Native INSERT block footprints -> audited semantic 2D column review.

Never trust INSERT insertion point as physical centre. Blocks can contain remote
geometry; use transformed virtual entity bounding boxes and source handles.
No invented column heights, elevations, reinforcement or construction approval.
"""
from __future__ import annotations
import argparse,hashlib,json,math,re,statistics
from pathlib import Path
from typing import Any
import ezdxf
from ezdxf import bbox

SCHEMA="fabin-cad://semantic-column-review/0.1"
def require(condition:Any,message:str)->None:
    if not condition:raise ValueError("M05 source reconciliation rejected: "+message)

def load_layout(path:Path)->tuple[dict,str]:
    raw=path.read_bytes()
    require(len(raw)<=2_000_000,"layout too large")
    sha=hashlib.sha256(raw).hexdigest()
    if path.suffix.lower() in (".html",".htm"):
        doc=raw.decode("utf-8")
        match=re.search(r'<script\s+id=["\x27]payload["\x27]\s+type=["\x27]application/json["\x27]\s*>(.*?)</script>',doc,re.S)
        require(match is not None,"missing inert embedded JSON payload")
        return json.loads(match.group(1)),sha
    require(path.suffix.lower()==".json","layout must be JSON or inert HTML script payload")
    return json.loads(raw),sha

def sha256_file(path:Path)->str:
    digest=hashlib.sha256()
    with path.open("rb") as stream:
        for buf in iter(lambda:stream.read(1024*1024),b""):digest.update(buf)
    return digest.hexdigest()

def reconcile_columns(dxf_path:str|Path,layout_path:str|Path,source_id:str,
                      expected_sha256:str,tolerance_mm:float=1.0)->dict:
    source=Path(dxf_path);layout_file=Path(layout_path)
    require(source.is_file() and source.suffix.lower()==".dxf","existing DXF required")
    require(re.fullmatch("[A-Za-z0-9_-]{3,80}",source_id) is not None,"invalid source ID")
    require(re.fullmatch("[0-9a-f]{64}",expected_sha256) is not None,"explicit lowercase expected SHA256 required")
    require(math.isfinite(tolerance_mm) and 0<tolerance_mm<=5,"tolerance must be 0..5mm")
    actual_sha=sha256_file(source);require(actual_sha==expected_sha256,"immutable DXF SHA256 mismatch")
    layout,layout_sha=load_layout(layout_file)
    schema=layout.get("schema")
    if schema=="a9://narayani/site-setout-column-face-layout/0.6":
        require("NOT_FIELD_ISSUED" in layout.get("status",""),"legacy v0.6 is not field issued")
    elif schema=="fabin-cad://column-grid-observations/0.1":
        require(layout.get("status")=="SOURCE_GRID_OBSERVATIONS_UNVERIFIED","generic input must remain unapproved")
    else:
        raise ValueError("M05 source reconciliation rejected: unsupported layout schema")
    project_id=layout.get("project",{}).get("id","")
    require(isinstance(project_id,str) and re.fullmatch("[A-Za-z0-9_-]{3,80}",project_id) is not None,
            "invalid project ID")
    require(layout.get("coordinate_frame",{}).get("units")=="mm","layout coordinate units must be mm")
    raw=layout.get("columns")
    require(isinstance(raw,list) and len(raw)>0 and len(raw)<=500,"invalid corrected column list")
    doc=ezdxf.readfile(source)
    require(doc.header.get("$INSUNITS")==4,"native DXF must declare millimetres")
    require(doc.dxfversion=="AC1021","review requires expected AC1021 source version")
    ids=set();handles=set();found=[]
    for row in raw:
        grid=row.get("grid");handle=row.get("source_dxf_symbol_handle")
        require(isinstance(grid,str) and re.fullmatch("[A-Z][0-9]{1,2}",grid) and grid not in ids,"duplicate/bad grid ID")
        require(isinstance(handle,str) and re.fullmatch("[0-9A-Fa-f]{1,24}",handle) and handle not in handles,"duplicate/bad handle")
        ids.add(grid);handles.add(handle)
        e=doc.entitydb.get(handle)
        require(e is not None and e.dxftype()=="INSERT" and e.dxf.owner==doc.modelspace().block_record_handle,
                "handle "+handle+" is not a modelspace block reference")
        bounds=bbox.extents([e],fast=True)
        require(bounds.has_data,"no transformed geometry bbox for "+grid)
        cx=(bounds.extmin.x+bounds.extmax.x)/2
        cy=(bounds.extmin.y+bounds.extmax.y)/2
        width=bounds.extmax.x-bounds.extmin.x
        depth=bounds.extmax.y-bounds.extmin.y
        shape=row.get("shape")
        require(shape in ("rectangular","circular"),"unsupported shape "+grid)
        size_x=row.get("diameter_mm") if shape=="circular" else row.get("width_mm")
        size_y=row.get("diameter_mm") if shape=="circular" else row.get("depth_mm")
        for value in (cx,cy,width,depth,size_x,size_y,row.get("x_mm"),row.get("y_mm")):
            require(type(value) in (int,float) and math.isfinite(value),"nonfinite geometry "+grid)
        require(size_x>0 and size_y>0 and abs(width-size_x)<=tolerance_mm and abs(depth-size_y)<=tolerance_mm,
                "CAD physical geometry vs field schedule size mismatch "+grid)
        if shape=="circular":
            circles=[v for v in e.virtual_entities() if v.dxftype()=="CIRCLE"]
            require(circles and any(abs(v.dxf.radius*2-size_x)<=tolerance_mm for v in circles),
                    "circular column shape not found in native block "+grid)
        found.append({"grid":grid,"column_type":row.get("column_type"),
                      "shape":shape,"x_mm":float(row["x_mm"]),"y_mm":float(row["y_mm"]),
                      "width_mm":float(size_x),"depth_mm":float(size_y),
                      "source_handle":handle.upper(),"native_centre_global_mm":[cx,cy],
                      "native_bbox_mm":[bounds.extmin.x,bounds.extmin.y,bounds.extmax.x,bounds.extmax.y]})
    off_x=statistics.median(r["native_centre_global_mm"][0]-r["x_mm"] for r in found)
    off_y=statistics.median(r["native_centre_global_mm"][1]-r["y_mm"] for r in found)
    for item in found:
        dx=item["native_centre_global_mm"][0]-off_x-item["x_mm"]
        dy=item["native_centre_global_mm"][1]-off_y-item["y_mm"]
        delta=math.hypot(dx,dy)
        require(delta<=tolerance_mm,"grid mapping conflict "+item["grid"]+"; residual="+str(delta))
        item["residual_mm"]=round(delta,6)
        item["geometry_review"]="DXF_BLOCK_GEOMETRY_CHECKED"
        item["vertical_review"]="HEIGHT_AND_ELEVATION_UNVERIFIED"
        item["z_mm"]=None
        item["height_mm"]=None
    return {"schema":SCHEMA,"status":"SEMANTIC_PLAN_REVIEW_ONLY",
      "project_id":project_id,
      "source":{"source_id":source_id,"file_sha256":actual_sha,"layout_sha256":layout_sha,
        "units":"mm","dxf_version":doc.dxfversion},
      "alignment":{"method":"TRANSFORMED_INSERT_BLOCK_BBOX_CENTRE_TRANSLATION",
        "rotation_deg":0,"scale":1,"translation_global_from_grid_mm":[round(off_x,6),round(off_y,6)],
        "tolerance_mm":tolerance_mm,
        "maximum_residual_mm":round(max(x["residual_mm"] for x in found),6)},
      "columns":found,
      "qa":{"column_count":len(found),"all_source_handles_unique":True,
            "plan_geometry_gate":"CHECKED_FOR_2D_REVIEW_ONLY",
            "vertical_geometry_gate":"HOLD_UNTIL_ELEVATIONS_AND_HEIGHTS_VERIFIED",
            "construction_gate":"NOT_FIELD_ISSUED","semantic_promotion":"BLOCKED"}}

def main()->int:
    cli=argparse.ArgumentParser(description="Reconcile source DXF native column blocks with corrected local 2D layout.")
    cli.add_argument("--dxf",required=True);cli.add_argument("--layout",required=True)
    cli.add_argument("--source-id",required=True);cli.add_argument("--expected-sha256",required=True)
    cli.add_argument("--tolerance-mm",type=float,default=1.0)
    cli.add_argument("--out",required=True)
    a=cli.parse_args()
    pkg=reconcile_columns(a.dxf,a.layout,a.source_id,a.expected_sha256,a.tolerance_mm)
    dest=Path(a.out);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(pkg,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":pkg["status"],"count":pkg["qa"]["column_count"],
      "max_residual_mm":pkg["alignment"]["maximum_residual_mm"],"out":str(dest)}))
    return 0

if __name__=="__main__":raise SystemExit(main())
