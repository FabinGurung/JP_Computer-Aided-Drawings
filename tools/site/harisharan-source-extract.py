"""Extract bounded public drawing vectors and calibrated wall-face pairs; original PDFs stay private."""
import fitz,json,math,html,collections
from pathlib import Path
src=Path('../upload/Harisharan cad without basement.pdf');out=Path('public/data/projects/harisharan-adhikari');pdf=fitz.open(src)
def points(p,it):
 a=[]
 for v in it[1:]:
  if isinstance(v,fitz.Point):a.append(v*p.rotation_matrix)
  elif isinstance(v,fitz.Rect):a += [v.tl*p.rotation_matrix,v.tr*p.rotation_matrix,v.br*p.rotation_matrix,v.bl*p.rotation_matrix]
  elif isinstance(v,fitz.Quad):a += [v.ul*p.rotation_matrix,v.ur*p.rotation_matrix,v.lr*p.rotation_matrix,v.ll*p.rotation_matrix]
 return a
def colgroups(p):
 cs=[]
 for d in p.get_drawings():
  r=d['rect']*p.rotation_matrix
  if d['fill'] and 8<r.width<9 and 8<r.height<9:cs.append((r.tl+r.br)/2)
 return [[c for c in cs if (c.x<550)==left] for left in [True,False]]
def extract(page,left,key,origin=None):
 p=pdf[page];cols=colgroups(p)[0 if left else 1]
 if origin is None:
  ax=min(c.x for c in cols);by=max(c.y for c in cols)+(189 if key=='fourth' else 0);origin=(ax,by)
 ax,by=origin;scale=5.722/108.12
 # Restrict to each drawing panel. No title block, contact details or GPS fields.
 box=fitz.Rect(ax-58,by-550,ax+295,by+107) if left else fitz.Rect(ax-58,by-550,min(ax+295,985),by+107)
 if key=='roof':box=fitz.Rect(580,100,960,785)
 paths=[];lines=[];count=0
 for d in p.get_drawings():
  chunks=[]
  for it in d['items']:
   ps=points(p,it)
   if not ps or not all(box.contains(v) for v in ps):continue
   xy=[(q.x-box.x0,q.y-box.y0) for q in ps]
   def pt(a):return f'{a[0]:.2f},{a[1]:.2f}'
   if it[0]=='l':cmd=f'M{pt(xy[0])}L{pt(xy[1])}'
   elif it[0]=='c':cmd=f'M{pt(xy[0])}C'+ ' '.join(pt(v) for v in xy[1:])
   elif it[0] in ['re','qu']:cmd='M'+pt(xy[0])+'L'+' '.join(pt(v) for v in xy[1:])+'Z'
   else:continue
   # All paths retain the selected floor drawing. Native text is added separately.
   chunks.append(cmd)
   if it[0]=='l' and d.get('layer') in ['WALL','WALL 2','WALL1','WINDOW']:
    a,b=ps;A=[(a.x-ax)*scale,(by-a.y)*scale];B=[(b.x-ax)*scale,(by-b.y)*scale]
    L=math.dist(A,B)
    if L>.35:lines.append({'a':A,'b':B,'layer':d['layer'],'length':L,'sourcePath':count})
   count+=1
  if chunks:
   col=d.get('color') or (0,0,0);fill=d.get('fill');rgb=lambda c:'#'+''.join(f'{round(x*255):02x}' for x in c)
   paths.append(f'<path d="{" ".join(chunks)}" fill="{rgb(fill) if fill else "none"}" stroke="{rgb(col)}" stroke-width="{min(d.get("width",.2),1):.2f}"/>')
 for w in p.get_text('words'):
  r=fitz.Rect(w[:4])*p.rotation_matrix
  if box.contains(r):paths.append(f'<text x="{r.x0-box.x0:.2f}" y="{r.y1-box.y0:.2f}" font-size="{max(3,min(8,r.height*.8)):.2f}">{html.escape(w[4])}</text>')
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {box.width:.2f} {box.height:.2f}"><title>{key} source drawing ARC-{page+1:02}</title><rect width="100%" height="100%" fill="white"/>'+''.join(paths)+'</svg>'
 assert '9769494047' not in svg and 'tecarchengineering' not in svg and 'GPS COORDINATES' not in svg
 (out/f'source-{key}.svg').write_text(svg)
 # Pair actual parallel wall faces by overlap; gaps remain gaps. No neighboring-house geometry.
 walls=[];used=set()
 for i,a in enumerate(lines):
  if i in used or a['layer']=='WINDOW':continue
  A=a['a'];B=a['b'];L=a['length'];u=[(B[k]-A[k])/L for k in [0,1]];best=None
  for j,b in enumerate(lines):
   if j<=i or j in used or b['layer']=='WINDOW':continue
   C=b['a'];D=b['b'];v=[(D[k]-C[k])/b['length'] for k in [0,1]]
   if abs(u[0]*v[1]-u[1]*v[0])>.015:continue
   cross=lambda P:u[0]*(P[1]-A[1])-u[1]*(P[0]-A[0])
   off=(cross(C)+cross(D))/2
   if not .065<abs(off)<.30:continue
   t=sorted(sum((P[k]-A[k])*u[k] for k in [0,1]) for P in [C,D]);lo=max(0,t[0]);hi=min(L,t[1]);ov=hi-lo
   if ov<.4 or ov/min(L,b['length'])<.82:continue
   score=abs(L-b['length'])+abs(abs(off)-(.23 if abs(off)>.16 else .1))
   if best is None or score<best[0]:best=(score,j,off,lo,hi)
  if best:
   _,j,off,lo,hi=best;used.update([i,j]);normal=[-u[1],u[0]]
   pts=[[round(A[k]+u[k]*t+normal[k]*off/2,5) for k in [0,1]] for t in [lo,hi]]
   walls.append({'id':f'{key}-W{len(walls)+1:03}','a':pts[0],'b':pts[1],'thickness':round(abs(off),4),'source':f'ARC-{page+1:02} native PDF wall-face pair {i}/{j}','status':'PDF_VECTOR_CALIBRATED_CANDIDATE'})
 windows=[]
 for a in sorted([v for v in lines if v['layer']=='WINDOW'],key=lambda a:-a['length']):
  m=[(a['a'][k]+a['b'][k])/2 for k in [0,1]]
  if any(math.dist(m,[(b['a'][k]+b['b'][k])/2 for k in [0,1]])<.35 for b in windows):continue
  windows.append({'id':f'{key}-GL{len(windows)+1:03}','a':a['a'],'b':a['b'],'thickness':.05,'source':f'ARC-{page+1:02} WINDOW layer trace','status':'PDF_VECTOR_TRACE_HEIGHT_SCENARIO'})
 return {'walls':walls,'windows':windows,'sourceSvg':f'source-{key}.svg','source':f'ARC-{page+1:02}','pairing':{'pairedWallSegments':len(walls),'unpairedWallFaces':len([i for i,a in enumerate(lines) if i not in used and a['layer']!='WINDOW']),'calibration':'A-B 5722 mm / 108.12 PDF points; local X and plan Z; no survey registration'},'originPdf':[ax,by]}
levels=[]
for page,left,key,name,y,area in [(2,True,'ground','Ground floor',0,297.84),(2,False,'first','First floor',3,297.84),(3,True,'second','Second floor',6,297.84),(3,False,'third','Third floor',9,297.84),(4,True,'fourth','Fourth floor residence',12,179.91)]:
 e=extract(page,left,key);levels.append({'id':key,'name':name,'elevation':y,'sourceArea':area,**e});print(key,len(e['walls']),len(e['windows']))
extract(4,False,'roof',(650,640))
model={'schema':'jp-cad://harisharan-building-workspace/1','revision':'R000002','issueForConstruction':False,'sourceAuthority':'HAR-SRC-ARC-001 / HAR-SRC-STR-001 / HAR-SRC-RPT-001','levels':levels,'roofSource':'source-roof.svg','floorToFloor':3,'slabThickness':.125,'mainBeam':[.3,.55],'secondaryBeam':[.3,.4],'stair':{'widthScenario':1.1,'riser':.15,'tread':.3,'waist':.17,'source':'STR-12; tread/riser dimensions source-backed; waist note also says 150 mm; stair envelopes are coordination proxies'},'notes':['Named PDF wall layers are paired into calibrated wall centreline candidates. Original vector plans remain separately available for comparison.','Door openings are retained where wall-face pairs are interrupted; door leaves and frames are not semantically certified. Window trace heights are selectable scenarios.','Slab openings, lift/shear-wall foundations and reinforcing detail require accepted source registration. Gross floor/slab quantities are labeled accordingly.','No approved dates, crew sizes or productivity rates were supplied. Gantt uses editable planning assumptions and relative days; no scheduling-repository synchronization is claimed.']}
(out/'building.json').write_text(json.dumps(model,indent=2)+'\n')
