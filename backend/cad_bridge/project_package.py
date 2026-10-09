"""Public-neutral M03 package validation and extraction. No file bytes or source URL fetching."""
from __future__ import annotations
import re,math
PROJ=re.compile(r"^[A-Z0-9][A-Z0-9_-]{2,63}$")
LEVEL=re.compile(r"^[A-Z0-9][A-Z0-9_-]{0,63}$")
def reject(condition:bool,message:str):
    if not condition:raise ValueError("Invalid CAD project package: "+message)
def extract_model(raw:dict)->dict:
    """Return canonical draft geometry for existing IFC/DXF/STEP adapters."""
    if raw.get("schema")!="fabin-cad://project-package/0.1":
        return raw
    p=raw.get("project")
    reject(isinstance(p,dict) and isinstance(p.get("id"),str) and bool(PROJ.fullmatch(p["id"])),"project ID")
    reject(isinstance(p.get("name"),str) and 0<len(p["name"].strip())<=150,"project name")
    reject(isinstance(p.get("revision"),str) and 0<len(p["revision"])<=60,"revision")
    reject(p.get("kind") in ("residential","commercial","institutional","other"),"category")
    reject(p.get("units")=="mm" and p.get("coordinate_system")=="LOCAL_CARTESIAN","units/coordinates")
    reject(isinstance(p.get("datum_label"),str) and 0<len(p["datum_label"])<=100,"datum")
    levels=raw.get("levels")
    reject(isinstance(levels,list) and 0<len(levels)<=100,"levels")
    level_ids=set()
    for level in levels:
        reject(isinstance(level,dict) and isinstance(level.get("id"),str) and bool(LEVEL.fullmatch(level["id"])),"level ID")
        reject(level["id"] not in level_ids,"duplicate level")
        reject(isinstance(level.get("elevation_mm"),(float,int)) and not isinstance(level["elevation_mm"],bool) and math.isfinite(level["elevation_mm"]),"level elevation")
        level_ids.add(level["id"])
    sources=raw.get("source_refs")
    reject(isinstance(sources,list) and len(sources)<=500,"source refs")
    source_ids=set()
    for source in sources:
        reject(isinstance(source,dict) and isinstance(source.get("source_id"),str) and bool(PROJ.fullmatch(source["source_id"])),"source ID")
        reject(source["source_id"] not in source_ids,"repeated source ID")
        reject(source.get("kind") in ("IFC","DXF","DWG","PDF","SURVEY","OTHER"),"source kind")
        ref=source.get("external_record_id")
        reject(isinstance(ref,str) and 0<len(ref)<=200 and not any(s in ref.lower() for s in ("http://","https://","?","#","..")),"record pointer must be opaque, not URL/path")
        reject(source.get("verification") in ("UNVERIFIED","CHECKED"),"source verification")
        source_ids.add(source["source_id"])
    model=raw.get("model")
    reject(isinstance(model,dict) and model.get("project_id")==p["id"],"model and package project ID mismatch")
    reject(model.get("schema")=="fabin-cad://canonical-boxes/0.1","unsupported canonical model")
    reject(model.get("units")=="mm" and model.get("authority") in ("DRAFT","DEMO_ONLY"),"unsafe model authority")
    reject(isinstance(model.get("elements"),list) and bool(model["elements"]),"missing geometry")
    element_ids=set()
    for e in model["elements"]:
        reject(isinstance(e,dict) and isinstance(e.get("id"),str) and e["id"] not in element_ids,"element identity")
        reject(e.get("level") in level_ids,"element references unregistered level")
        element_ids.add(e["id"])
    semantic=raw.get("element_semantics")
    reject(isinstance(semantic,list) and len(semantic)<=len(element_ids),"semantic records")
    annotated=set()
    for record in semantic:
        reject(isinstance(record,dict) and record.get("element_id") in element_ids and record["element_id"] not in annotated,"semantic element ref")
        reject(record.get("discipline") in ("STRUCTURAL","ARCHITECTURAL"),"discipline")
        reject(isinstance(record.get("description"),str) and 0<len(record["description"])<=240,"semantic description")
        reject(record.get("verification") in ("UNVERIFIED","CHECKED"),"semantic verification")
        reject(isinstance(record.get("source_ids"),list) and all(s in source_ids for s in record["source_ids"]),"semantic source link")
        annotated.add(record["element_id"])
    return model
