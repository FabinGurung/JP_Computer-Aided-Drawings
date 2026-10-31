#!/usr/bin/env python3
"""M32: read-only source DXF strip-candidate extraction from the M30 ZIP archive.

Usage: python tools/site/aad-m32-extract-native-strips.py M30.zip out.json
No network, no original DXF modification, no coordinate registration, no IFC.
The archive retains full extraction rows and exact raw DXF LINE handles.
"""
import collections
import hashlib
import json
import math
import pathlib
import sys
import zipfile

archive_path=pathlib.Path(sys.argv[1])
output_path=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(archive_path) as archive:
    report=json.loads(archive.read("M30_SOURCE_REPORT.json"))
    source=json.loads(archive.read("aad_m30_struct.json"))
assert source["sourceSha256"]==report["source"]["structural"]["sha256"]
assert source["coords"]=="native_DXF_millimetres_unregistered"
anchors={"gf":832998.5,"ff":869172.5,"sf":907281.5}
def round_mm(x):
    return round(float(x),3)
def vector_line(row):
    handle, layer, kind, coords, _=row
    if layer!="wall" or kind!="LINE":
        return None
    a,b=[tuple(float(n) for n in p) for p in coords]
    dx,dy=b[0]-a[0],b[1]-a[1]
    length=math.hypot(dx,dy)
    if length<=500:
        return None
    return {"handle":handle,"a":a,"b":b,"length":length,
            "unit":(dx/length,dy/length),"normal":(-dy/length,dx/length)}
def compare(a,b):
    ux,uy=a["unit"]
    vx,vy=b["unit"]
    direction=ux*vx+uy*vy
    if abs(direction)<math.cos(math.radians(.7)):
        return None
    center_b=tuple((x+y)/2 for x,y in zip(b["a"],b["b"]))
    gap=abs(sum((p-q)*n for p,q,n in zip(center_b,a["a"],a["normal"])))
    if abs(gap-230)>2.1:
        return None
    def proj(point):
        return sum((p-q)*n for p,q,n in zip(point,a["a"],a["unit"]))
    starts=sorted([proj(b["a"]),proj(b["b"])])
    overlap=max(0,min(a["length"],starts[1])-max(0,starts[0]))
    overlap_ratio=overlap/min(a["length"],b["length"])
    if overlap<500 or overlap_ratio<.83:
        return None
    strict=(abs(a["length"]-b["length"])<5
            and overlap_ratio>.995 and abs(gap-230)<1.25)
    bstart,bend=(b["a"],b["b"]) if direction>0 else (b["b"],b["a"])
    endpoints=[[(x+y)/2 for x,y in zip(p,q)]
               for p,q in ((a["a"],bstart),(a["b"],bend))]
    return {"handles":[a["handle"],b["handle"]],"gap_mm":round_mm(gap),
            "strict":strict,"endpoints_mm":endpoints}
floors={}
for floor,info in source["floors"].items():
    rows=info["entities"]
    segments=[v for row in rows if (v:=vector_line(row)) is not None]
    pairs=[]
    for i,a in enumerate(segments):
        for b in segments[i+1:]:
            result=compare(a,b)
            if result:
                pairs.append(result)
    strict=[item for item in pairs if item["strict"]]
    for item in strict:
        item["normalized_axis_m"]=[
          [round_mm((point[0]-anchors[floor])/1000),
           round_mm(-point[1]/1000)] for point in item["endpoints_mm"]]
        item["source_status"]="DRAWING_STRIP_HYPOTHESIS_NOT_ENGINEER_VERIFIED_BEAM"
    native_handles=[h for pair in strict for h in pair["handles"]]
    assert len(native_handles)==len(set(native_handles)),floor+" duplicate handle"
    floors[floor]={
      "sourceWallLines":sum(row[1]=="wall" and row[2]=="LINE" for row in rows),
      "sourceLongLines":len(segments),
      "allPairedHypotheses":len(pairs),
      "strictSourceStrips":len(strict),
      "strictPairs":strict
    }
assert {f:v["strictSourceStrips"] for f,v in floors.items()}=={
    "gf":17,"ff":17,"sf":17}
assert {f:v["allPairedHypotheses"] for f,v in floors.items()}=={
    "gf":35,"ff":35,"sf":33}
def canon(item):
    return tuple(sorted(tuple(p) for p in item["normalized_axis_m"]))
common=set(canon(x) for x in floors["gf"]["strictPairs"])
assert all({canon(x) for x in floors[k]["strictPairs"]}==common
           for k in ("ff","sf"))
assert len(common)==17
result={
 "schema":"jp-cad://aad-m32-extractor-source-check/1",
 "stage":"M32","projectId":"PRJ-000007",
 "originalStructuralDXFSHA256":source["sourceSha256"],
 "M30ArchiveSHA256":hashlib.sha256(archive_path.read_bytes()).hexdigest(),
 "commonStrictSheetRelativeAxes":17,
 "sourceDrawingStripsOnly":True,
 "IFCMembersAdded":0,
 "constructionApproved":False,
 "floors":floors,
 "limitations":["No surveyed common source-building datum.",
  "Matching paired LINE source strokes does not prove engineered beam member axes.",
  "Original beam text annotations not automatically associated with actual member sections.",
  "No upper column continuity, loads, footing capacity or engineer signoff."]
}
output_path.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
print("AAD_M32_SOURCE_REGENERATION_PASS",json.dumps({
    "counts":{k:v["strictSourceStrips"] for k,v in floors.items()},
    "nativeCommonAxes":17,"constructionApproval":False}))
