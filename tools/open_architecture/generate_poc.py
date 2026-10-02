from __future__ import annotations
import base64, json, math, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "models" / "open-architecture-engine-v0.1" / "poc-model.json"
OUT = ROOT / "public" / "research" / "open-architecture-engine-v0.1"

def load_model():
    return json.loads(MODEL.read_text(encoding="utf-8"))

def wall_polygon(w):
    x1, y1 = w["start_mm"]; x2, y2 = w["end_mm"]
    dx, dy = x2-x1, y2-y1
    length = math.hypot(dx, dy)
    if length <= 0:
        raise ValueError(f'zero-length wall: {w["element_id"]}')
    nx, ny = -dy/length, dx/length
    h = w["thickness_mm"]/2
    return [(x1+nx*h,y1+ny*h),(x2+nx*h,y2+ny*h),(x2-nx*h,y2-ny*h),(x1-nx*h,y1-ny*h)]

def validate(model):
    ids=set()
    for storey in model["storeys"]:
        if storey["height_mm"] <= 0: raise ValueError("storey height must be positive")
        for group in ("slabs","walls"):
            for el in storey.get(group,[]):
                eid=el["element_id"]
                if eid in ids: raise ValueError(f"duplicate element_id: {eid}")
                ids.add(eid)
        for w in storey.get("walls",[]):
            if w["thickness_mm"] <= 0 or w["height_mm"] <= 0:
                raise ValueError(f'invalid wall dimensions: {w["element_id"]}')
            if w["start_mm"] == w["end_mm"]:
                raise ValueError(f'zero-length wall: {w["element_id"]}')

def svg(model):
    s=model["storeys"][0]; pts=[]
    for slab in s["slabs"]: pts.extend(slab["polygon_mm"])
    for w in s["walls"]: pts.extend(wall_polygon(w))
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    pad=500; xmin,xmax=min(xs)-pad,max(xs)+pad; ymin,ymax=min(ys)-pad,max(ys)+pad
    W,H=1000,700
    sx=lambda x:(x-xmin)/(xmax-xmin)*W
    sy=lambda y:H-(y-ymin)/(ymax-ymin)*H
    q=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="POC generated floor plan">','<rect width="100%" height="100%" fill="white"/>']
    for slab in s["slabs"]:
        poly=" ".join(f"{sx(x):.2f},{sy(y):.2f}" for x,y in slab["polygon_mm"])
        q.append(f'<polygon points="{poly}" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>')
    for w in s["walls"]:
        poly=" ".join(f"{sx(x):.2f},{sy(y):.2f}" for x,y in wall_polygon(w))
        q.append(f'<polygon points="{poly}" fill="#cbd5e1" stroke="#334155" stroke-width="2"><title>{w["element_id"]}</title></polygon>')
    q += [
      f'<text x="500" y="32" text-anchor="middle" font-family="system-ui" font-size="20">POC · {model["project_id"]} · revision {model["revision"]}</text>',
      '<text x="500" y="675" text-anchor="middle" font-family="system-ui" font-size="18">6000 mm</text>',
      '<text x="30" y="350" text-anchor="middle" transform="rotate(-90 30 350)" font-family="system-ui" font-size="18">4000 mm</text>',
      '</svg>'
    ]
    return "\n".join(q)

def dxf(model):
    s=model["storeys"][0]; out=["0","SECTION","2","HEADER","0","ENDSEC","0","SECTION","2","ENTITIES"]
    def line(layer,a,b):
        out.extend(["0","LINE","8",layer,"10",str(a[0]),"20",str(a[1]),"30","0","11",str(b[0]),"21",str(b[1]),"31","0"])
    for slab in s["slabs"]:
        p=slab["polygon_mm"]
        for i in range(len(p)): line("A-SLAB",p[i],p[(i+1)%len(p)])
    for w in s["walls"]:
        p=wall_polygon(w)
        for i in range(4): line("A-WALL",p[i],p[(i+1)%4])
    out += ["0","ENDSEC","0","EOF"]
    return "\n".join(out)+"\n"

def add_box(pos,idx,corners):
    base=len(pos)//3
    for x,y,z in corners: pos.extend([x,y,z])
    faces=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]
    idx.extend(base+i for i in faces)

def wall_box(w,z0,z1):
    p=wall_polygon(w)
    return [(x/1000,y/1000,z0/1000) for x,y in p]+[(x/1000,y/1000,z1/1000) for x,y in p]

def slab_box(poly,z0,z1):
    if len(poly)!=4: raise ValueError("POC supports quadrilateral slab only")
    return [(x/1000,y/1000,z0/1000) for x,y in poly]+[(x/1000,y/1000,z1/1000) for x,y in poly]

def gltf(model):
    s=model["storeys"][0]; pos=[]; idx=[]
    for slab in s["slabs"]: add_box(pos,idx,slab_box(slab["polygon_mm"],-slab["thickness_mm"],0))
    for w in s["walls"]: add_box(pos,idx,wall_box(w,0,w["height_mm"]))
    pbytes=struct.pack("<"+"f"*len(pos),*pos); ibytes=struct.pack("<"+"I"*len(idx),*idx)
    pad=(4-len(pbytes)%4)%4; blob=pbytes+b"\x00"*pad+ibytes
    uri="data:application/octet-stream;base64,"+base64.b64encode(blob).decode()
    xs=pos[0::3]; ys=pos[1::3]; zs=pos[2::3]
    return {"asset":{"version":"2.0","generator":"Fabin Project_Drawings open-architecture-engine-v0.1"},"scene":0,"scenes":[{"nodes":[0]}],"nodes":[{"mesh":0,"name":model["project_id"]}],"meshes":[{"primitives":[{"attributes":{"POSITION":0},"indices":1,"mode":4}]}],"buffers":[{"byteLength":len(blob),"uri":uri}],"bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":len(pbytes),"target":34962},{"buffer":0,"byteOffset":len(pbytes)+pad,"byteLength":len(ibytes),"target":34963}],"accessors":[{"bufferView":0,"componentType":5126,"count":len(pos)//3,"type":"VEC3","min":[min(xs),min(ys),min(zs)],"max":[max(xs),max(ys),max(zs)]},{"bufferView":1,"componentType":5125,"count":len(idx),"type":"SCALAR","min":[min(idx)],"max":[max(idx)]}]}

def manifest(model):
    return {"schema":"fabin-project-drawings://generated-manifest/0.1","source":"models/open-architecture-engine-v0.1/poc-model.json","project_id":model["project_id"],"revision":model["revision"],"outputs":["plan.svg","plan.dxf","model.gltf"],"scope":["rectangular slab","axis-defined walls"],"known_limitations":["No doors/windows/openings in v0.1 POC.","No IFC artifact emitted until IfcOpenShell validation is available.","This is software geometry QA only, not architectural/structural approval."]}

def main():
    model=load_model(); validate(model); OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"plan.svg").write_text(svg(model),encoding="utf-8")
    (OUT/"plan.dxf").write_text(dxf(model),encoding="utf-8")
    (OUT/"model.gltf").write_text(json.dumps(gltf(model),separators=(",",":")),encoding="utf-8")
    (OUT/"manifest.json").write_text(json.dumps(manifest(model),indent=2),encoding="utf-8")
    print("generated:",", ".join(manifest(model)["outputs"]))

if __name__=="__main__":
    main()
