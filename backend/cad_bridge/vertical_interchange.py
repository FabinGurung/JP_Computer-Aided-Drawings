"""M07 source-gated interoperable column geometry. Local CLI only.

DXF native symbols -> M05 source-reconciled plan -> M06 user-attested verticals
-> exact rectangles and cylinders in IFC4 (IfcOpenShell), STEP (OCP) and DXF.
All output geometry is PROVISIONAL_NOT_FIELD_ISSUED; no quantity authority.
"""
from __future__ import annotations
from pathlib import Path
import hashlib,json,math,re,uuid
from typing import Any

SCHEMA="fabin-cad://source-linked-interchange/0.1"
def check(v:Any,reason:str)->None:
    if not v:raise ValueError("M07 interchange rejected: "+reason)
def number(v:Any)->bool:
    return type(v) in (float,int) and math.isfinite(v)
def parse(path:str|Path)->dict:
    p=Path(path)
    check(p.is_file() and p.stat().st_size<=2_000_000,"JSON input missing or oversized")
    data=json.loads(p.read_text(encoding="utf-8"))
    check(isinstance(data,dict),"JSON input must be object")
    return data
def digest(path:str|Path)->str:
    h=hashlib.sha256()
    with Path(path).open("rb") as stream:
        for b in iter(lambda:stream.read(1024*1024),b""):h.update(b)
    return h.hexdigest()
def build(plan:dict,vertical:dict,source_dxf:str|Path)->dict:
    import ezdxf
    from ezdxf import bbox
    check(plan.get("schema")=="fabin-cad://semantic-column-review/0.1" and plan.get("status")=="SEMANTIC_PLAN_REVIEW_ONLY","M05 schema")
    qa=plan.get("qa",{})
    check(qa.get("semantic_promotion")=="BLOCKED" and qa.get("construction_gate")=="NOT_FIELD_ISSUED","M05 authority guard")
    src=plan.get("source",{})
    expected=src.get("file_sha256","")
    check(isinstance(expected,str) and re.fullmatch("[a-f0-9]{64}",expected),"source fingerprint")
    check(digest(source_dxf)==expected,"original DXF source SHA mismatch")
    doc=ezdxf.readfile(str(source_dxf))
    check(doc.header.get("$INSUNITS")==4 and doc.dxfversion=="AC1021" and src.get("units")=="mm","native CAD units/version")
    cols=plan.get("columns")
    check(isinstance(cols,list) and 0<len(cols)<=500 and qa.get("column_count")==len(cols),"column count")
    check(vertical.get("schema")=="fabin-cad://vertical-observations/0.1" and vertical.get("status")=="PROVISIONAL_NOT_FIELD_ISSUED","M06 schema/status")
    check(vertical.get("project_id")==plan.get("project_id") and
          vertical.get("plan_source_sha256")==expected and
          vertical.get("plan_layout_sha256")==src.get("layout_sha256"),"M05 and M06 source linkage")
    project=plan.get("project_id")
    check(isinstance(project,str) and re.fullmatch("[A-Za-z0-9_-]{3,80}",project),"project ID")
    grid={};handles=set()
    tolerance=plan.get("alignment",{}).get("tolerance_mm")
    translation=plan.get("alignment",{}).get("translation_global_from_grid_mm")
    check(number(tolerance) and 0<tolerance<=5 and isinstance(translation,list) and len(translation)==2 and all(map(number,translation)),"plan transform")
    for c in cols:
        key=c.get("grid");handle=c.get("source_handle")
        check(isinstance(key,str) and re.fullmatch("[A-Z][0-9]{1,2}",key) and key not in grid,"grid ID")
        check(isinstance(handle,str) and re.fullmatch("[0-9A-Fa-f]{1,24}",handle) and handle not in handles,"DXF handle")
        handles.add(handle);grid[key]=c
        for name in ("x_mm","y_mm","width_mm","depth_mm"):
            check(number(c.get(name)),"plan numeric "+key)
        check(c["width_mm"]>0 and c["depth_mm"]>0 and c["width_mm"]<=10000 and c["depth_mm"]<=10000,"plan sizes")
        check(c.get("shape") in ("circular","rectangular"),"shape")
        if c["shape"]=="circular":check(abs(c["width_mm"]-c["depth_mm"])<=0.001,"circular dimensions")
        check(c.get("height_mm") is None and c.get("z_mm") is None,"M05 cannot include verified heights")
        check(c.get("geometry_review")=="DXF_BLOCK_GEOMETRY_CHECKED","source geometry status")
        entity=doc.entitydb.get(handle)
        check(entity is not None and entity.dxftype()=="INSERT" and entity.dxf.owner==doc.modelspace().block_record_handle,"native INSERT "+handle)
        box=bbox.extents([entity],fast=True)
        check(box.has_data,"native block bbox")
        wx=box.extmax.x-box.extmin.x;wy=box.extmax.y-box.extmin.y
        cx=(box.extmax.x+box.extmin.x)/2;cy=(box.extmax.y+box.extmin.y)/2
        check(abs(wx-c["width_mm"])<=tolerance and abs(wy-c["depth_mm"])<=tolerance,"native block dimensions "+key)
        check(math.hypot(cx-translation[0]-c["x_mm"],cy-translation[1]-c["y_mm"])<=tolerance,"native block location "+key)
        if c["shape"]=="circular":
            check(any(abs(e.dxf.radius*2-c["width_mm"])<=tolerance for e in entity.virtual_entities() if e.dxftype()=="CIRCLE"),"native circle missing")
    sources=vertical.get("vertical_sources")
    check(isinstance(sources,list) and 0<len(sources)<=500,"M06 source records")
    sid=set()
    for s in sources:
        check(isinstance(s,dict) and isinstance(s.get("id"),str) and re.fullmatch("[A-Za-z0-9_-]{2,80}",s["id"]) and s["id"] not in sid,"source ID")
        sid.add(s["id"])
        ref=s.get("record_id")
        check(isinstance(ref,str) and 0<len(ref)<=200 and not re.search(r"https?://|[?#]|\.\.|[/\\]",ref),"opaque source record ID only")
        check(s.get("review")=="USER_REVIEWED_NOT_AUTHORIZED" and s.get("kind") in ("SECTION","ELEVATION","SURVEY","OTHER"),"source asserted status")
    levels=vertical.get("levels")
    check(isinstance(levels,list) and 2<=len(levels)<=100,"vertical levels")
    lid={}
    for level in levels:
        name=level.get("id");z=level.get("z_mm")
        check(isinstance(name,str) and re.fullmatch("[A-Za-z0-9_-]{2,80}",name) and name not in lid,"level identity")
        check(number(z) and -20000<=z<=200000,"level coordinate")
        refs=level.get("source_ids")
        check(isinstance(refs,list) and bool(refs) and len(set(refs))==len(refs) and all(r in sid for r in refs),"level sources")
        lid[name]=z
    segments=vertical.get("segments")
    check(isinstance(segments,list) and 0<len(segments)<=2000,"segments")
    solids=[];intervals={};unique=set()
    for seg in segments:
        key=seg.get("grid");lo=seg.get("from_level");hi=seg.get("to_level")
        check(key in grid and lo in lid and hi in lid and lo!=hi,"segment relation")
        ref=seg.get("source_ids")
        check(isinstance(ref,list) and bool(ref) and len(set(ref))==len(ref) and all(r in sid for r in ref),"segment source")
        bot=lid[lo];top=lid[hi]
        check(100<=top-bot<=20000,"height range")
        segment_id=key+"/"+lo+"/"+hi
        check(segment_id not in unique,"duplicate interval");unique.add(segment_id)
        previous=intervals.setdefault(key,[])
        check(not any(bot<b and top>a for a,b in previous),"overlapping intervals")
        previous.append((bot,top));c=grid[key]
        stable=key+"__"+lo+"__"+hi
        solids.append({"id":stable,"grid":key,"shape":c["shape"],"column_type":c.get("column_type",""),
            "source_handle":c["source_handle"],"x_mm":c["x_mm"],"y_mm":c["y_mm"],
            "z_mm":bot,"height_mm":top-bot,"width_mm":c["width_mm"],"depth_mm":c["depth_mm"],
            "from_level":lo,"to_level":hi,"source_ids":list(ref)})
    return {"schema":SCHEMA,"status":"PROVISIONAL_NOT_FIELD_ISSUED","project_id":project,
            "source_sha256":expected,"layout_sha256":src["layout_sha256"],
            "datum_label":vertical.get("datum_label","UNVERIFIED"),"solids":solids,
            "qa":{"source_dxf_sha256":"MATCHED_NATIVE_BYTES","geometry":"EXACT_RECTANGLE_CIRCLE_NATIVE",
                  "vertical_provenance":"USER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED",
                  "engineering_approval":"HOLD","quantity_takeoff":"BLOCKED"}}
