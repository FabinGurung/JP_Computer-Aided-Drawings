"""Stable public-safe canonical box model M01 (millimetres, Z up)."""
from __future__ import annotations
import json
import math
from pathlib import Path
ALLOWED={"slab","footing","wall","column","beam"}
class ModelError(ValueError): pass

def load_model(path: str|Path) -> dict:
    model=json.loads(Path(path).read_text(encoding="utf-8"))
    from .project_package import extract_model
    model=extract_model(model)
    if not isinstance(model,dict) or model.get("schema")!="fabin-cad://canonical-boxes/0.1" or model.get("units")!="mm":
        raise ModelError("Unsupported canonical schema or units")
    if not model.get("project_id") or model.get("authority") not in {"DEMO_ONLY","DRAFT"}:
        raise ModelError("Require a draft/test project identity; never assert engineering authority")
    rows=model.get("elements")
    if not isinstance(rows,list) or not rows: raise ModelError("Missing elements")
    seen=set()
    for e in rows:
        if not isinstance(e,dict) or not isinstance(e.get("id"),str) or e["id"] in seen:
            raise ModelError("Duplicate/missing element id")
        seen.add(e["id"])
        if e.get("kind") not in ALLOWED or not e.get("level"):
            raise ModelError("Unknown element kind or level")
        for name in ("x_mm","y_mm","z_mm","length_mm","width_mm","height_mm"):
            value=e.get(name)
            if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):
                raise ModelError("Invalid "+name+" for "+e["id"])
            if name in ("length_mm","width_mm","height_mm") and value<=0:
                raise ModelError("Nonpositive "+name+" for "+e["id"])
            if name not in ("length_mm","width_mm","height_mm") and abs(value)>1000000:
                raise ModelError("Extreme coordinate for "+e["id"])
    from .constraints import resolve_model
    resolve_model(model)  # reject invalid/orphaned/cyclic relationships before any exporter runs
    return model

def dims_m(e:dict)->tuple[float,float,float]:
    return e["length_mm"]/1000,e["width_mm"]/1000,e["height_mm"]/1000
