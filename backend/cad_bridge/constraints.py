"""Deterministic normalized M02 link resolver, compatible with original M01 boxes."""
from __future__ import annotations
def resolve_model(model:dict)->dict:
    from copy import deepcopy
    source=deepcopy(model)
    elements={e["id"]:e for e in source["elements"]}
    links=source.get("links",[])
    if not isinstance(links,list):raise ValueError("links must be an array")
    drivers={}
    link_ids=set()
    for link in links:
        if not isinstance(link,dict) or not link.get("id") or link["id"] in link_ids:
            raise ValueError("Invalid or repeated link")
        link_ids.add(link["id"])
        c=link.get("child_id")
        if c not in elements or c in drivers:raise ValueError("Missing/duplicate driven element")
        if link.get("kind")=="center_on_top": dependencies=[link.get("parent_id")]
        elif link.get("kind")=="span_columns_x":dependencies=[link.get("from_id"),link.get("to_id")]
        else:raise ValueError("Unsupported link kind")
        if any(d not in elements or d==c for d in dependencies):raise ValueError("Bad link dependencies")
        for key in ("offset_x_mm","offset_y_mm","offset_z_mm"):
            if key in link:
                import math
                if isinstance(link[key],bool) or not isinstance(link[key],(int,float)) or not math.isfinite(link[key]) or abs(link[key])>1e6:
                    raise ValueError("Invalid link offset")
        drivers[c]=link
    visiting,done=set(),set()
    def solve(id:str)->dict:
        e=elements[id]
        if id in done:return e
        if id in visiting:raise ValueError("Dependency cycle: "+id)
        visiting.add(id);link=drivers.get(id)
        if link and link["kind"]=="center_on_top":
            p=solve(link["parent_id"])
            e["x_mm"]=p["x_mm"]+(p["length_mm"]-e["length_mm"])/2+link.get("offset_x_mm",0)
            e["y_mm"]=p["y_mm"]+(p["width_mm"]-e["width_mm"])/2+link.get("offset_y_mm",0)
            e["z_mm"]=p["z_mm"]+p["height_mm"]+link.get("offset_z_mm",0)
        elif link and link["kind"]=="span_columns_x":
            a,b=solve(link["from_id"]),solve(link["to_id"])
            if a["kind"]!="column" or b["kind"]!="column" or e["kind"]!="beam":
                raise ValueError("Span requires columns and beam")
            ax=a["x_mm"]+a["length_mm"]/2;bx=b["x_mm"]+b["length_mm"]/2
            ay=a["y_mm"]+a["width_mm"]/2;by=b["y_mm"]+b["width_mm"]/2
            if bx-ax<=50 or abs(ay-by)>200:raise ValueError("Span supports are misaligned or reversed")
            e["x_mm"]=ax;e["length_mm"]=bx-ax
            e["y_mm"]=(ay+by)/2-e["width_mm"]/2+link.get("offset_y_mm",0)
            e["z_mm"]=min(a["z_mm"]+a["height_mm"],b["z_mm"]+b["height_mm"])-e["height_mm"]+link.get("offset_z_mm",0)
        visiting.remove(id);done.add(id);return e
    for id in elements:solve(id)
    return source

def section_faces(model:dict,axis:str,offset_mm:float)->list[dict]:
    import math
    if axis not in ("x","y") or not math.isfinite(offset_mm):raise ValueError("Invalid section plane")
    out=[]
    for e in resolve_model(model)["elements"]:
        lo=e["x_mm"] if axis=="x" else e["y_mm"]
        extent=e["length_mm"] if axis=="x" else e["width_mm"]
        if lo<=offset_mm<=lo+extent:
            x0=e["y_mm"] if axis=="x" else e["x_mm"]
            horizontal=e["width_mm"] if axis=="x" else e["length_mm"]
            out.append({"element_id":e["id"],"kind":e["kind"],"x0_mm":x0,"x1_mm":x0+horizontal,
                         "z0_mm":e["z_mm"],"z1_mm":e["z_mm"]+e["height_mm"]})
    return out
