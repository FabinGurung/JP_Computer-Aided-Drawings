"""ezdxf source intake: exact native coordinates, conservative geometry overlay, no automatic BIM claims."""
from __future__ import annotations
import argparse,hashlib,json,math
from collections import Counter
from pathlib import Path
from typing import Any
import ezdxf

SCHEMA="fabin-cad://dxf-review-overlay/0.1"
ENTITY_TYPES=("LINE","LWPOLYLINE","CIRCLE","ARC")
UNIT_MM=4

def points_for(e:Any)->list[list[float]]|None:
    t=e.dxftype()
    if t=="LINE": return [[float(e.dxf.start.x),float(e.dxf.start.y)],[float(e.dxf.end.x),float(e.dxf.end.y)]]
    if t=="LWPOLYLINE":
        if any(abs(p[4])>1e-12 for p in e.get_points("xyseb")): return None  # Bulged arcs require explicit tessellation, not straight chords.
        return [[float(p[0]),float(p[1])] for p in e.get_points("xy")]
    if t in ("CIRCLE","ARC"):
        c=e.dxf.center
        return [[float(c.x),float(c.y)]]  # Center used only for filtering, radii preserved separately.
    return None

def intakedxf(path:str|Path,source_id:str,region:tuple[float,float,float,float],max_entities:int=5000)->dict:
    source=Path(path)
    if source.suffix.lower()!=".dxf":raise ValueError("Input must be an unmodified .dxf, not DWG/PDF")
    if not source.is_file():raise ValueError("DXF file not found")
    if not (3<=len(source_id)<=80 and source_id.replace("-","").replace("_","").isalnum()):raise ValueError("Invalid source identity")
    if len(region)!=4 or any(not math.isfinite(v) for v in region):raise ValueError("Invalid finite region")
    xmin,ymin,xmax,ymax=region
    if xmax<=xmin or ymax<=ymin or max(xmax-xmin,ymax-ymin)>200000:raise ValueError("Region must be positive and <=200m")
    if max_entities<1 or max_entities>20000:raise ValueError("max_entities must be 1..20000")
    sha=hashlib.sha256()
    with source.open("rb") as inp:
        for block in iter(lambda:inp.read(1024*1024),b""):sha.update(block)
    doc=ezdxf.readfile(source)
    if doc.header.get("$INSUNITS")!=UNIT_MM:raise ValueError("DXF must declare millimetres ($INSUNITS=4)")
    records=[];stats=Counter();outside=Counter();unsupported=Counter()
    origin_x,origin_y=xmin,ymin
    for e in doc.modelspace():
        typ=e.dxftype()
        if typ not in ENTITY_TYPES:continue
        try: points=points_for(e)
        except (ValueError,TypeError,AttributeError) as exc:
            unsupported[type(exc).__name__]+=1;continue
        if points is None:unsupported["BULGE_OR_UNSUPPORTED_GEOMETRY"]+=1;continue
        if not points or any(not math.isfinite(v) for point in points for v in point):
            unsupported["INVALID_COORDINATES"]+=1;continue
        # Strict complete-inside region; never clip and invent endpoints.
        if not all(xmin<=p[0]<=xmax and ymin<=p[1]<=ymax for p in points):
            outside[typ]+=1;continue
        if len(records)>=max_entities:raise ValueError("Selected region exceeds max_entities: choose a narrower site region")
        record={"handle":str(e.dxf.handle),"layer":str(e.dxf.layer)[:160],"kind":typ,
                "points_mm":[[round(p[0]-origin_x,6),round(p[1]-origin_y,6)] for p in points],
                "closed":bool(e.closed) if typ=="LWPOLYLINE" else False}
        if typ in ("CIRCLE","ARC"):
            record["radius_mm"]=round(float(e.dxf.radius),6)
            if typ=="ARC":
                record["start_angle_deg"]=float(e.dxf.start_angle)
                record["end_angle_deg"]=float(e.dxf.end_angle)
            r=record["radius_mm"]
            if not math.isfinite(r) or r<=0 or r>200000:
                unsupported["INVALID_RADIUS"]+=1;continue
            if not all(xmin<=p[0]-r and p[0]+r<=xmax and ymin<=p[1]-r and p[1]+r<=ymax for p in points):
                outside[typ]+=1;continue
        stats[typ]+=1;records.append(record)
    handles=[r["handle"] for r in records]
    if len(set(handles))!=len(handles):raise ValueError("Duplicate DXF entity handles")
    return {"schema":SCHEMA,
            "status":"SOURCE_GEOMETRY_REVIEW_ONLY",
            "source":{"source_id":source_id,"file_sha256":sha.hexdigest(),"dxf_version":doc.dxfversion,"units":"mm",
                      "region_global_mm":[xmin,ymin,xmax,ymax],"local_origin_global_mm":[origin_x,origin_y]},
            "entities":records,
            "qa":{"selected_count":len(records),"by_kind":dict(stats),"outside_region":dict(outside),
                  "unsupported_or_bulge":dict(unsupported),
                  "modelspace_entity_count":len(doc.modelspace()),
                  "semantic_gate":"NO_AUTOMATIC_BIM_PROMOTION"}}

def main()->int:
    p=argparse.ArgumentParser(description="Generate local private-safe DXF review overlay, not approved BIM.")
    p.add_argument("--dxf",required=True);p.add_argument("--source-id",required=True)
    p.add_argument("--xmin",type=float,required=True);p.add_argument("--ymin",type=float,required=True)
    p.add_argument("--xmax",type=float,required=True);p.add_argument("--ymax",type=float,required=True)
    p.add_argument("--max-entities",type=int,default=5000);p.add_argument("--out",required=True)
    a=p.parse_args()
    overlay=intakedxf(a.dxf,a.source_id,(a.xmin,a.ymin,a.xmax,a.ymax),a.max_entities)
    out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(overlay,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"status":overlay["status"],"source_id":a.source_id,"source_sha256":overlay["source"]["file_sha256"],
                      "selected":len(overlay["entities"]),"types":overlay["qa"]["by_kind"],"out":str(out)}))
    return 0

if __name__=="__main__":raise SystemExit(main())
