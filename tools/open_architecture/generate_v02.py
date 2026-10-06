from __future__ import annotations
import argparse, base64, copy, hashlib, json, math, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/'models/open-architecture-engine-v0.2/poc-model.json'
OUT=ROOT/'public/research/open-architecture-engine-v0.2'
EPS=1e-9

def load(p=MODEL): return json.loads(p.read_text(encoding='utf-8'))
def length(w): return math.hypot(w['end_mm'][0]-w['start_mm'][0],w['end_mm'][1]-w['start_mm'][1])
def basis(w):
    L=length(w)
    if L<=EPS: raise ValueError(f"zero-length wall: {w['element_id']}")
    dx=w['end_mm'][0]-w['start_mm'][0]; dy=w['end_mm'][1]-w['start_mm'][1]
    return L,dx/L,dy/L,-dy/L,dx/L
def point(w,d,n=0):
    L,ux,uy,nx,ny=basis(w)
    if d < -EPS or d > L+EPS: raise ValueError('point outside wall')
    return (w['start_mm'][0]+ux*d+nx*n,w['start_mm'][1]+uy*d+ny*n)
def polyseg(w,a,b):
    h=w['thickness_mm']/2
    return [point(w,a,h),point(w,b,h),point(w,b,-h),point(w,a,-h)]
def canonical_ids(m):
    return sorted(x['element_id'] for s in m['storeys'] for g in ('slabs','walls','openings','doors','windows') for x in s.get(g,[]))
def room_id(storey_id,wall_ids):
    token=hashlib.sha1('|'.join(sorted(wall_ids)).encode()).hexdigest()[:8].upper()
    return f'ROOM-{storey_id}-{token}'
def opening_map(s):
    d={}
    for o in s.get('openings',[]): d.setdefault(o['wall_id'],[]).append(o)
    for v in d.values(): v.sort(key=lambda o:(o['offset_mm'],o['element_id']))
    return d
def plan_segments(w,ops):
    cursor=0.0; out=[]
    for o in ops:
        a=float(o['offset_mm']); b=a+float(o['width_mm'])
        if a-cursor>EPS: out.append((cursor,a))
        cursor=max(cursor,b)
    if length(w)-cursor>EPS: out.append((cursor,length(w)))
    return out

def detect_rooms(s):
    walls={w['element_id']:w for w in s.get('walls',[])}
    def k(p): return (round(float(p[0]),6),round(float(p[1]),6))
    adj={}; ends={}
    for wid,w in walls.items():
        a,b=k(w['start_mm']),k(w['end_mm']); ends[wid]=(a,b)
        adj.setdefault(a,[]).append((wid,b)); adj.setdefault(b,[]).append((wid,a))
    if any(len(v)!=2 for v in adj.values()): raise ValueError('v0.2 room detection requires degree-2 closed wall loops')
    unused=set(walls); rooms=[]
    while unused:
        wid=sorted(unused)[0]; start,cur=ends[wid]; prev=wid; ids=[wid]; pts=[start,cur]; unused.remove(wid)
        while cur!=start:
            c=[x for x in adj[cur] if x[0]!=prev]
            if len(c)!=1: raise ValueError('ambiguous room boundary')
            wid,nxt=c[0]
            if wid in ids: raise ValueError('room boundary reuses wall')
            ids.append(wid); unused.discard(wid); pts.append(nxt); prev,cur=wid,nxt
        p=pts[:-1]; area=sum(p[i][0]*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p)))/2
        if abs(area)<=EPS: raise ValueError('zero-area room')
        if area<0: p=list(reversed(p))
        rooms.append({'element_id':room_id(s['storey_id'],ids),'storey_id':s['storey_id'],'boundary_wall_ids':sorted(ids),'polygon_mm':[[x,y] for x,y in p],'area_mm2_centerline':abs(area),'area_m2_centerline':round(abs(area)/1e6,6),'detection_method':'closed-wall-centerline-loop'})
    return sorted(rooms,key=lambda r:r['element_id'])

def validate(m):
    if m.get('units')!='mm': raise ValueError('v0.2 POC requires mm')
    seen=set()
    for s in m['storeys']:
        walls={w['element_id']:w for w in s.get('walls',[])}; ops={o['element_id']:o for o in s.get('openings',[])}
        for g in ('slabs','walls','openings','doors','windows'):
            for x in s.get(g,[]):
                if x['element_id'] in seen: raise ValueError('duplicate element_id')
                seen.add(x['element_id'])
        by={}
        for w in walls.values():
            if min(w['thickness_mm'],w['height_mm'])<=0: raise ValueError('invalid wall')
            length(w)
        for o in ops.values():
            if o['kind'] not in ('door','window') or o['wall_id'] not in walls: raise ValueError('invalid opening host/kind')
            w=walls[o['wall_id']]; a=o['offset_mm']; b=a+o['width_mm']
            if min(o['width_mm'],o['height_mm'])<=0 or o['sill_mm']<0 or a<0 or b>length(w)+EPS or o['sill_mm']+o['height_mm']>w['height_mm']+EPS: raise ValueError('invalid opening dimensions')
            if o['kind']=='door' and o['sill_mm']!=0: raise ValueError('door sill must be 0')
            by.setdefault(o['wall_id'],[]).append(o)
        for v in by.values():
            v.sort(key=lambda o:o['offset_mm'])
            if any(v[i]['offset_mm']+v[i]['width_mm']>v[i+1]['offset_mm']+EPS for i in range(len(v)-1)): raise ValueError('overlapping openings')
        refs=[]
        for d in s.get('doors',[]):
            if d['opening_id'] not in ops or ops[d['opening_id']]['kind']!='door': raise ValueError('invalid door opening ref')
            refs.append(d['opening_id'])
        for w in s.get('windows',[]):
            if w['opening_id'] not in ops or ops[w['opening_id']]['kind']!='window': raise ValueError('invalid window opening ref')
            refs.append(w['opening_id'])
        if sorted(refs)!=sorted(ops): raise ValueError('each opening must have exactly one fixture')
        detect_rooms(s)

def dimensions(m):
    out=[]
    for s in m['storeys']:
        pts=[p for slab in s.get('slabs',[]) for p in slab['polygon_mm']]
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        out += [{'dimension_id':f"DIM-{s['storey_id']}-OVERALL-X",'kind':'overall_x','value_mm':max(xs)-min(xs)},{'dimension_id':f"DIM-{s['storey_id']}-OVERALL-Y",'kind':'overall_y','value_mm':max(ys)-min(ys)}]
        for o in s.get('openings',[]):
            for key,kind in [('width_mm','opening_width'),('height_mm','opening_height'),('sill_mm','opening_sill')]: out.append({'dimension_id':f"DIM-{o['element_id']}-{kind.split('_')[-1].upper()}",'element_id':o['element_id'],'kind':kind,'value_mm':o[key]})
    return out

def svg(m):
    s=m['storeys'][0]; hosted=opening_map(s); rooms=detect_rooms(s); W,H=1100,780; xmin,ymin,xmax,ymax=-900,-900,6900,4900
    sx=lambda x:(x-xmin)/(xmax-xmin)*W; sy=lambda y:H-(y-ymin)/(ymax-ymin)*H; pt=lambda p:f'{sx(p[0]):.2f},{sy(p[1]):.2f}'
    q=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Open Architecture Engine v0.2 generated floor plan">','<rect width="100%" height="100%" fill="white"/>','<style>text{font-family:system-ui,sans-serif}.wall{fill:#cbd5e1;stroke:#334155;stroke-width:1.3}.room{fill:#ecfeff;stroke:#67e8f9;stroke-dasharray:6 6}.opening{stroke:#0f172a;stroke-width:2}.window{stroke:#0284c7;stroke-width:2}</style>']
    for r in rooms:
        q.append(f'<polygon class="room" points="{" ".join(pt(p) for p in r["polygon_mm"])}"/><text x="{sx(sum(p[0] for p in r["polygon_mm"])/len(r["polygon_mm"])):.2f}" y="{sy(sum(p[1] for p in r["polygon_mm"])/len(r["polygon_mm"])):.2f}" text-anchor="middle">{r["element_id"]} · {r["area_m2_centerline"]:.2f} m²*</text>')
    walls={w['element_id']:w for w in s['walls']}
    for w in walls.values():
        for a,b in plan_segments(w,hosted.get(w['element_id'],[])): q.append(f'<polygon class="wall" points="{" ".join(pt(p) for p in polyseg(w,a,b))}"><title>{w["element_id"]}</title></polygon>')
    opid={o['element_id']:o for o in s['openings']}
    for d in s.get('doors',[]):
        o=opid[d['opening_id']]; w=walls[o['wall_id']]; *_,nx,ny=basis(w); h=point(w,o['offset_mm']); e=(h[0]+nx*o['width_mm'],h[1]+ny*o['width_mm'])
        q.append(f'<line class="opening" x1="{sx(h[0]):.2f}" y1="{sy(h[1]):.2f}" x2="{sx(e[0]):.2f}" y2="{sy(e[1]):.2f}"/>')
    for win in s.get('windows',[]):
        o=opid[win['opening_id']]; w=walls[o['wall_id']]; a=o['offset_mm']; b=a+o['width_mm']
        for n in (-w['thickness_mm']/4,w['thickness_mm']/4):
            p1,p2=point(w,a,n),point(w,b,n); q.append(f'<line class="window" x1="{sx(p1[0]):.2f}" y1="{sy(p1[1]):.2f}" x2="{sx(p2[0]):.2f}" y2="{sy(p2[1]):.2f}"/>')
    q += [f'<text x="550" y="30" text-anchor="middle" font-size="20">Open Architecture Engine v0.2 · {m["project_id"]}</text>','<text x="550" y="760" text-anchor="middle" font-size="12">* room area = wall-centreline software geometry QA only</text>','</svg>']
    return '\n'.join(q)

def dxf(m):
    s=m['storeys'][0]; hosted=opening_map(s); walls={w['element_id']:w for w in s['walls']}; opid={o['element_id']:o for o in s['openings']}; out=['0','SECTION','2','HEADER','0','ENDSEC','0','SECTION','2','ENTITIES']
    def line(layer,a,b): out.extend(['0','LINE','8',layer,'10',str(a[0]),'20',str(a[1]),'30','0','11',str(b[0]),'21',str(b[1]),'31','0'])
    for slab in s['slabs']:
        p=slab['polygon_mm']
        for i in range(len(p)): line('A-SLAB',p[i],p[(i+1)%len(p)])
    for w in walls.values():
        h=w['thickness_mm']/2
        for a,b in plan_segments(w,hosted.get(w['element_id'],[])):
            line('A-WALL',point(w,a,h),point(w,b,h)); line('A-WALL',point(w,a,-h),point(w,b,-h)); line('A-WALL',point(w,a,h),point(w,a,-h)); line('A-WALL',point(w,b,h),point(w,b,-h))
    for d in s['doors']:
        o=opid[d['opening_id']]; w=walls[o['wall_id']]; *_,nx,ny=basis(w); h=point(w,o['offset_mm']); line('A-DOOR',h,(h[0]+nx*o['width_mm'],h[1]+ny*o['width_mm']))
    for win in s['windows']:
        o=opid[win['opening_id']]; w=walls[o['wall_id']]; a=o['offset_mm']; b=a+o['width_mm']
        for n in (-w['thickness_mm']/4,w['thickness_mm']/4): line('A-WINDOW',point(w,a,n),point(w,b,n))
    return '\n'.join(out+['0','ENDSEC','0','EOF'])+'\n'

def add_box(pos,idx,c):
    base=len(pos)//3
    for x,y,z in c: pos.extend([x,y,z])
    faces=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]; idx.extend(base+i for i in faces)
def box_segment(w,a,b,z0,z1):
    p=polyseg(w,a,b); return [(x/1000,y/1000,z0/1000) for x,y in p]+[(x/1000,y/1000,z1/1000) for x,y in p]
def wall_pieces(w,ops):
    cuts=sorted({0.0,float(length(w)),*[float(o['offset_mm']) for o in ops],*[float(o['offset_mm']+o['width_mm']) for o in ops]}); out=[]
    for a,b in zip(cuts[:-1],cuts[1:]):
        mid=(a+b)/2; active=[o for o in ops if o['offset_mm']-EPS<=mid<=o['offset_mm']+o['width_mm']+EPS]
        if not active: out.append((a,b,0,float(w['height_mm'])))
        else:
            o=active[0]; sill=float(o['sill_mm']); top=sill+float(o['height_mm'])
            if sill>EPS: out.append((a,b,0,sill))
            if w['height_mm']-top>EPS: out.append((a,b,top,float(w['height_mm'])))
    return out

def gltf(m):
    s=m['storeys'][0]; hosted=opening_map(s); pos=[]; idx=[]; prov=[]
    for slab in s['slabs']:
        p=slab['polygon_mm']; add_box(pos,idx,[(x/1000,y/1000,-slab['thickness_mm']/1000) for x,y in p]+[(x/1000,y/1000,0) for x,y in p]); prov.append({'source_element_id':slab['element_id'],'kind':'slab','piece_count':1})
    for w in s['walls']:
        pcs=wall_pieces(w,hosted.get(w['element_id'],[]))
        for a,b,z0,z1 in pcs: add_box(pos,idx,box_segment(w,a,b,z0,z1))
        prov.append({'source_element_id':w['element_id'],'kind':'wall','piece_count':len(pcs),'hosted_opening_ids':[o['element_id'] for o in hosted.get(w['element_id'],[])]})
    pb=struct.pack('<'+'f'*len(pos),*pos); ib=struct.pack('<'+'I'*len(idx),*idx); pad=(4-len(pb)%4)%4; blob=pb+b'\0'*pad+ib; uri='data:application/octet-stream;base64,'+base64.b64encode(blob).decode(); xs=pos[0::3]; ys=pos[1::3]; zs=pos[2::3]
    return {'asset':{'version':'2.0','generator':'Fabin JP_Computer-Aided-Drawings open-architecture-engine-v0.2'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':m['project_id'],'extras':{'canonical_element_ids':canonical_ids(m),'room_ids':[r['element_id'] for r in detect_rooms(s)],'piece_provenance':prov}}],'meshes':[{'primitives':[{'attributes':{'POSITION':0},'indices':1,'mode':4}]}],'buffers':[{'byteLength':len(blob),'uri':uri}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(pb),'target':34962},{'buffer':0,'byteOffset':len(pb)+pad,'byteLength':len(ib),'target':34963}],'accessors':[{'bufferView':0,'componentType':5126,'count':len(pos)//3,'type':'VEC3','min':[min(xs),min(ys),min(zs)],'max':[max(xs),max(ys),max(zs)]},{'bufferView':1,'componentType':5125,'count':len(idx),'type':'SCALAR','min':[min(idx)],'max':[max(idx)]}]}

def manifest(m):
    rooms=[r for s in m['storeys'] for r in detect_rooms(s)]; raw=json.dumps(m,sort_keys=True,separators=(',',':')).encode()
    return {'schema':'fabin-project-drawings://generated-manifest/0.2','source':'models/open-architecture-engine-v0.2/poc-model.json','source_sha256':hashlib.sha256(raw).hexdigest(),'project_id':m['project_id'],'revision':m['revision'],'outputs':['plan.svg','plan.dxf','model.gltf','rooms.json','dimensions.json'],'scope':['host-attached door/window openings','closed-loop room detection','derived dimensions','synchronized SVG/DXF/glTF generation'],'canonical_element_ids':canonical_ids(m),'room_ids':[r['element_id'] for r in rooms],'known_limitations':['Room area is wall-centreline software geometry QA, not quantity authority.','IFC is intentionally not emitted in v0.2; real IfcOpenShell is the next gate.','Research/software QA only; not architectural, structural, codal, construction or client approval.'],'non_regression':{'v0.1_source':'models/open-architecture-engine-v0.1/poc-model.json','narayani_stage_files_must_remain_untouched':True}}
def payloads(m):
    rooms=[r for s in m['storeys'] for r in detect_rooms(s)]
    return {'plan.svg':svg(m),'plan.dxf':dxf(m),'model.gltf':json.dumps(gltf(m),separators=(',',':'),sort_keys=True),'rooms.json':json.dumps({'schema':'fabin-project-drawings://derived-rooms/0.2','rooms':rooms},indent=2,sort_keys=True),'dimensions.json':json.dumps({'schema':'fabin-project-drawings://derived-dimensions/0.2','dimensions':dimensions(m)},indent=2,sort_keys=True),'manifest.json':json.dumps(manifest(m),indent=2,sort_keys=True)}
def write(m,out=OUT):
    validate(m); out.mkdir(parents=True,exist_ok=True); p=payloads(m)
    for n,t in p.items(): (out/n).write_text(t,encoding='utf-8')
    return p
def acceptance(m):
    a=payloads(m); ids=canonical_ids(m); rooms=[r['element_id'] for r in detect_rooms(m['storeys'][0])]; v=copy.deepcopy(m); o=next(x for x in v['storeys'][0]['openings'] if x['kind']=='window'); o['width_mm']+=100; validate(v); b=payloads(v); changed=['plan.svg','plan.dxf','model.gltf','dimensions.json','manifest.json']
    if any(a[n]==b[n] for n in changed): raise AssertionError('mutation failed to propagate')
    if ids!=canonical_ids(v) or rooms!=[r['element_id'] for r in detect_rooms(v['storeys'][0])] or a['rooms.json']!=b['rooms.json']: raise AssertionError('stable IDs/room boundary regressed')
    return {'status':'PASS','mutated_element_id':o['element_id'],'mutation':'+100 mm width','propagated_outputs':changed,'stable_canonical_ids':ids,'stable_room_ids':rooms}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--model',type=Path,default=MODEL); ap.add_argument('--out',type=Path,default=OUT); ap.add_argument('--acceptance-check',action='store_true'); a=ap.parse_args(); m=load(a.model); p=write(m,a.out); print('generated:',', '.join(sorted(p)))
    if a.acceptance_check: print('OPEN_ARCHITECTURE_V02_ACCEPTANCE='+json.dumps(acceptance(m),sort_keys=True))
if __name__=='__main__': main()
