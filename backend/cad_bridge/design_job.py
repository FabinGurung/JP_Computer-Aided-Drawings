"""M08 deterministic, source-bound design inputs. No LLM-generated dimensions at runtime."""
from __future__ import annotations
import hashlib, json, math, re
from pathlib import Path

SCHEMA="fabin-cad://design-job/0.1"
SOURCE_SCHEMA="fabin-cad://design-source/0.1"
KINDS={"footing","column","beam","slab","wall"}
def require(ok, reason):
    if not ok: raise ValueError("M08 DESIGN REJECTED: "+reason)
def num(x):
    return type(x) in (float,int) and math.isfinite(x)
def identity(x):
    return isinstance(x,str) and re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{2,79}",x) is not None
def canonical(obj):
    return (json.dumps(obj,sort_keys=True,ensure_ascii=False,separators=(",",":"),allow_nan=False)+"\n").encode("utf8")
def read_json(path):
    data=Path(path).read_bytes()
    require(len(data)<1000000,"input size limit")
    item=json.loads(data)
    require(isinstance(item,dict),"root object")
    return item
def load(job_path,repo_root):
    root=Path(repo_root).resolve()
    jobfile=Path(job_path).resolve()
    require(jobfile.is_relative_to(root/"design_jobs"/"synthetic"),"only allowlisted synthetic jobs in public repository")
    job=read_json(jobfile)
    require(job.get("schema")==SCHEMA and job.get("status")=="SYNTHETIC_QA_ONLY","job schema/status")
    require(identity(job.get("job_id")) and identity(job.get("project_id")),"job/project IDs")
    source=job.get("source")
    require(isinstance(source,dict),"source record")
    relative=source.get("path")
    require(isinstance(relative,str) and relative.startswith("design_jobs/synthetic/") and
            not relative.startswith("/") and ".." not in Path(relative).parts,"source path")
    sourcefile=(root/relative).resolve()
    require(sourcefile.is_relative_to(root/"design_jobs"/"synthetic") and sourcefile.is_file(),"source path confinement")
    digest=hashlib.sha256(sourcefile.read_bytes()).hexdigest()
    require(source.get("sha256")==digest,"source SHA256 mismatch")
    item=read_json(sourcefile)
    require(item.get("schema")==SOURCE_SCHEMA and item.get("status")=="SYNTHETIC_QA_ONLY","source type")
    require(item.get("project_id")==job["project_id"] and item.get("units")=="mm","source project and units")
    elements=item.get("elements"); openings=item.get("openings")
    require(isinstance(elements,list) and 0<len(elements)<=200 and isinstance(openings,list) and len(openings)<=100,"element/opening lists")
    ids=set(); elements_by_id={};levels=item.get("levels")
    require(isinstance(levels,list) and 0<len(levels)<=40,"level list")
    level_ids={}
    for l in levels:
        require(isinstance(l,dict) and identity(l.get("id")) and l["id"] not in level_ids,"level identity")
        require(num(l.get("z_mm")) and abs(l["z_mm"])<=100000,"level elevation")
        level_ids[l["id"]]=l["z_mm"]
    for e in elements:
        require(isinstance(e,dict) and identity(e.get("id")) and e["id"] not in ids,"element identity")
        ids.add(e["id"]);elements_by_id[e["id"]]=e
        require(e.get("kind") in KINDS and e.get("level_id") in level_ids,"element kind/level")
        require(e.get("source_id")=="SYNTHETIC_SPEC","source per element")
        for prop in ("x_mm","y_mm","z_mm","length_mm","width_mm","height_mm"):
            require(num(e.get(prop)),"missing/nonnumeric "+e["id"]+"."+prop)
            require(abs(e[prop])<1000000,"implausible coordinate "+e["id"])
        require(all(1<=e[k]<=100000 for k in ("length_mm","width_mm","height_mm")),"positive dimensions "+e["id"])
        require(e["z_mm"]>=level_ids[e["level_id"]]-100000,"level frame")
    holes_by_host={}
    for o in openings:
        require(isinstance(o,dict) and identity(o.get("id")) and o["id"] not in ids,"opening ID collision")
        ids.add(o["id"])
        host=elements_by_id.get(o.get("host_id"))
        require(host is not None and host["kind"]=="wall","opening host must be wall")
        require(o.get("source_id")=="SYNTHETIC_SPEC","opening evidence ID")
        for prop in ("offset_mm","sill_mm","width_mm","height_mm"):
            require(num(o.get(prop)) and o[prop]>=0,"opening dimension "+prop)
        require(o["width_mm"]>0 and o["height_mm"]>0,"opening must have positive area")
        require(o["offset_mm"]+o["width_mm"]<host["length_mm"] and
                o["sill_mm"]+o["height_mm"]<host["height_mm"] and o["offset_mm"]>0,
                "opening must fit strictly inside wall")
        region=(o["offset_mm"],o["sill_mm"],o["offset_mm"]+o["width_mm"],o["sill_mm"]+o["height_mm"])
        for prev in holes_by_host.get(host["id"],[]):
            require(not (region[0]<prev[2] and region[2]>prev[0] and region[1]<prev[3] and region[3]>prev[1]),
                    "overlapping wall openings")
        holes_by_host.setdefault(host["id"],[]).append(region)
    require({"footing","beam","slab","wall"}.issubset({e["kind"] for e in elements}),
            "M08 example must demonstrate footing beam slab and wall")
    return {"job":job,"source":item,"source_sha256":digest,"elements":elements,"openings":openings,
            "by_id":elements_by_id,"levels":level_ids,"state":"SYNTHETIC_QA_ONLY"}
