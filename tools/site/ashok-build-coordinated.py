#!/usr/bin/env python3
"""Deterministic QA02 architectural candidate from the admitted REV04 record.
Original source JSON/SVG/approved rasters are preserved. Changes below are an
explicit user-authorized coordination proposal, never a historical CAD mirror.
"""
import copy, hashlib, json, math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/data/projects/ashok-adhikari'
SRC=json.loads((OUT/'model.public.json').read_text())
M=lambda v:round(v/1000,6)
Z=lambda y:M(14400-y)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(name,value):
    (OUT/name).write_text(json.dumps(value,indent=2,sort_keys=True,ensure_ascii=False)+'\n')

CHANGES=[
 {'item':'External envelope','source_mm':[7200,14400],'candidate_mm':[7200,14400],'change_percent':[0,0],'reason':'Treat these as OUTER wall faces; move 230 mm wall centre-lines 115 mm inward.'},
 {'item':'Stair bay width','source_mm':3300,'candidate_mm':4290,'change_percent':30,'reason':'Fits two 900 mm flights, 2000 mm run, 900 mm mid/arrival/start landings; independent porch/balcony access.'},
 {'item':'GF stair bay depth','source_mm':2000,'candidate_mm':2200,'change_percent':10,'reason':'1920 mm clear depth after outer and inner wall thicknesses.'},
 {'item':'FF stair bay depth','source_mm':1700,'candidate_mm':2200,'change_percent':round(500/1700*100,3),'reason':'Remove the arrival/entry mismatch; give both floors the same workable stair well.'},
 {'item':'GF hall nominal width','source_mm':914,'candidate_mm':1188,'change_percent':round(274/914*100,3),'reason':'1088 mm clear between 100 mm walls, with retained 914 mm bedroom doors.'},
 {'item':'Main entry width','source_mm':1067,'candidate_mm':1067,'change_percent':0,'reason':'Source door width retained; new host at x=4975 gives a real corner jamb and a separate front window.'},
 {'item':'Lounge front window width','source_mm':1524,'candidate_mm':1219,'change_percent':round(-305/1524*100,3),'reason':'Keep a proper pier between entry and window; retain source height and material.'},
 {'item':'Transverse parking centre X in plot','source_mm':6799,'candidate_mm':4056,'reference_dimension_mm':9144,'change_percent':round(-2743/9144*100,3),'reason':'Shift left by 29.998% of plot width to release a 2943 mm clear pedestrian approach on the right. Vehicle dimensions unchanged; driving/turning not certified.'},
 {'item':'GF hall/living partition stubs','source_x_mm':[3255,3261,3267,3297],'candidate_x_mm':3300,'max_normalization_mm':45,'reason':'Remove coincident duplicate wall; preserve the 1911 mm open passage between y=6833 and 8744.'},
 {'item':'Stair handedness and access','source':'U-stair; start/arrival route unresolved in REV04 structured model','candidate':'Lower flight runs right-to-left; upper flight returns left-to-right, with a level right-side landing to porch/balcony','reason':'Avoid circulation through Bedroom 2 and provide complete 900 mm start/arrival landings.'},
]

def graph(floor):
    raw=[]
    def edge(id,a,b,t=100,exterior=False):raw.append(dict(id=id,a=a,b=b,t=t,exterior=exterior))
    # A recessed open porch/balcony: no phantom wall around the whole rectangle.
    perimeter=[(115,115),(4175,115),(4175,2315),(7085,2315),(7085,14285),(115,14285)]
    for i,a in enumerate(perimeter):edge(f'{floor}-EXT-{i+1:02}',a,perimeter[(i+1)%6],230,True)
    if floor=='GF':
        for id,a,b in [
            ('REAR-BAND',(115,9400),(7085,9400)),('BED-KITCHEN',(3600,9400),(3600,14285)),
            ('BED2-HALL',(115,5600),(3300,5600)),('HALL-LOW',(3300,2200),(3300,6833)),
            ('HALL-HIGH',(3300,8744),(3300,9400)),('BATH-HALL',(2112,5600),(2112,9400)),
            ('STAIR-REAR',(115,2200),(4175,2200))]:edge(f'{floor}-{id}',a,b)
    else:
        for id,a,b in [
            ('MAIN-BAND',(115,9600),(7085,9600)),('ENS-WIR',(1650,7400),(1650,9600)),
            ('BATH-TOP',(115,7400),(3300,7400)),('BATH-BOTTOM',(115,5650),(3300,5650)),
            ('ROOM-LOUNGE',(3300,2200),(3300,9600)),('STAIR-REAR',(115,2200),(4175,2200))]:edge(f'{floor}-{id}',a,b)
    # Split every T junction to shared nodes. Never keep overlapping duplicates.
    for r in raw:r['cuts']={0.,1.}
    for a in raw:
        ax,ay=a['a'];dx,dy=a['b'][0]-ax,a['b'][1]-ay
        for b in raw:
            bx,by=b['a'];ex,ey=b['b'][0]-bx,b['b'][1]-by;den=dx*ey-dy*ex
            if not den:continue
            t=((bx-ax)*ey-(by-ay)*ex)/den;u=((bx-ax)*dy-(by-ay)*dx)/den
            if -1e-8<=t<=1+1e-8 and -1e-8<=u<=1+1e-8:a['cuts'].add(max(0,min(1,t)))
    nodes=[];node_ids={};walls=[];per=[]
    def nid(point):
        key=tuple(round(c,3) for c in point)
        if key not in node_ids:
            id=f'{floor}-N{len(nodes)+1:03}';node_ids[key]=id;nodes.append({'id':id,'x':M(key[0]),'z':Z(key[1])})
        return node_ids[key]
    for r in raw:
        ts=sorted(r['cuts']);a=r['a'];b=r['b']
        for i,(lo,hi) in enumerate(zip(ts,ts[1:])):
            p=(a[0]+(b[0]-a[0])*lo,a[1]+(b[1]-a[1])*lo);q=(a[0]+(b[0]-a[0])*hi,a[1]+(b[1]-a[1])*hi)
            if math.dist(p,q)<50:raise ValueError('Degenerate junction trace '+r['id'])
            id=r['id']+(f'-{i+1}' if len(ts)>2 else '')
            walls.append({'id':id,'a':nid(p),'b':nid(q),'thickness':M(r['t']),
                          'source':'QA02_SOURCE_CONSTRAINED_COORDINATION','status':'PROPOSED_ARCHITECTURAL_CANDIDATE',
                          'provenance':{'sourceId':r['id'],'basis':'REV04 zoning + native REV02 trace; normalized connected wall network; see coordination ledger'}})
            if r['exterior']:per.append(id)
    return {'nodes':nodes,'walls':walls,'perimeter':per,'openings':[],'labels':{}},perimeter

MODELS={};ROOMS={};DEFERRED=[];OPENING_MAP=[]
for floor in ('GF','FF'):
    g,outline=graph(floor);nodes={n['id']:n for n in g['nodes']}
    rooms=copy.deepcopy(SRC[floor]['rooms'])
    for r in rooms:
        if r['id'].endswith('STAIR'):r['bbox']=[0,0,4290,2200]
        if r['id'] in ('GF-PARK','FF-BALC'):r['bbox']=[4290,0,7200,2200]
        if r['id'] in ('GF-BED2','FF-BED2'):r['bbox'][1]=2200
        if r['id'] in ('GF-LOUNGE','FF-LOUNGE'):r['bbox'][1]=2200
        if r['id']=='GF-BATH':r['bbox'][2]=2112
        if r['id']=='GF-HALL-REV04-001':r['bbox'][0]=2112
    ROOMS[floor]=rooms;g['labels']={r['id']:r['name'] for r in rooms}
    opening_records=copy.deepcopy(SRC[floor]['openings'])
    for o in opening_records:
        if o.get('action')=='REMOVE':DEFERRED.append({'id':o['id'],'reason':'REMOVED_IN_SOURCE'});continue
        if o['type'] not in ('DOOR','WINDOW','VENTILATOR'):DEFERRED.append({'id':o['id'],'reason':'UNENCLOSED_PASSAGE_RETAINED_IN_WALL_NETWORK'});continue
        original=copy.deepcopy(o)
        x,y=o['anchor'];width,height=o['size_mm'];style='hinged'
        if o['id'].endswith('D-MAIN'):x,y,width=4975,2315,1067
        if o['id'] in ('GF-W005','FF-W005'):x,y,width=6250,2315,1219
        if o['id']=='FF-W007':y=1000
        if o['id']=='GF-D-REAR':x,y=4230,14285
        if o['id'] in ('GF-D-BED1-HALL','GF-D-BED2-HALL'):x=2706
        if o['id']=='GF-D-BATH-HALL':x,y,width=2112,6200,850;style='sliding'
        if o['id']=='FF-D-MAINBATH-LOUNGE':width=850;style='sliding'
        if o['id']=='FF-D-MAIN-ENS':width=850
        if x==0:x=115
        if y==14400:y=14285
        if y==0:y=115
        o['anchor']=[x,y];o['size_mm']=[width,height];o['style']=style;o['sourceAnchor']=original['anchor'];o['sourceSize']=original['size_mm']
    opening_records=[o for o in opening_records if o.get('action')!='REMOVE' and o['type'] in ('DOOR','WINDOW','VENTILATOR')]
    opening_records.append({'id':floor+'-D-STAIR-PORCH','type':'DOOR','anchor':[4175,1000],'size_mm':[1067,2134],
                            'material':'SAL WOOD','style':'hinged','sourceAnchor':None,'sourceSize':None,
                            'basis':'Proposed independent porch/balcony access; source stair-to-bedroom removals preserved'})
    if floor=='GF':opening_records.append({'id':'GF-OPEN-KITCHEN','type':'DOOR','anchor':[5500,9400],'size_mm':[1100,2300],
                                           'style':'passage','material':'OPEN','sourceAnchor':None,'sourceSize':None,'basis':'Required continuous kitchen access'})
    else:opening_records.append({'id':'FF-D-WIR-MAIN','type':'DOOR','anchor':[2475,9600],'size_mm':[850,1981],
                                  'style':'sliding','material':'SAL WOOD','sourceAnchor':None,'sourceSize':None,'basis':'Required direct walk-in wardrobe access'})
    for o in opening_records:
        px,pz=M(o['anchor'][0]),Z(o['anchor'][1]);W,H=map(M,o['size_mm']);candidates=[]
        for w in g['walls']:
            a,b=nodes[w['a']],nodes[w['b']];dx,dz=b['x']-a['x'],b['z']-a['z'];L=math.hypot(dx,dz)
            at=((px-a['x'])*dx+(pz-a['z'])*dz)/L;d=abs((px-a['x'])*dz-(pz-a['z'])*dx)/L
            offset=round(at-W/2,6)
            if d<.001 and offset>=0 and offset+W<=L+.000001:candidates.append((d,w['id'],offset))
        if not candidates:raise ValueError('Unhosted opening '+o['id']+' '+str(o['anchor']))
        _,host,offset=min(candidates);kind='door' if o['type']=='DOOR' else 'window'
        sill=0 if kind=='door' else (.6 if o['id'].endswith('W006') else 2.1 if o['type']=='VENTILATOR' else 1.1 if o['id']=='GF-W003' else .9)
        if o['id']=='GF-V002':sill=round(2.876-.914-H,6)
        swing=-1 if o['id'] in ('GF-D-MAIN','FF-D-MAIN','GF-D-REAR','GF-D-BED1-HALL','FF-D-LOUNGE-MAIN','FF-D-BED2-LOUNGE') else 1
        g['openings'].append({'id':o['id'],'wallId':host,'kind':kind,'offset':offset,'width':W,'height':H,'sill':sill,'swingSign':swing,
                               'style':o.get('style','fixed-glazing'),'apertureType':o['type'].lower(),'source':'REV04_SIZE_WITH_QA02_HOST_COORDINATION',
                               'status':'COORDINATED_CANDIDATE__SILLS_PROVISIONAL' if kind=='window' else 'COORDINATED_CANDIDATE',
                               'provenance':{'sourceId':o['id'],'basis':o.get('basis','Source opening size/intent with explicit host, jamb and datum coordination')}})
        OPENING_MAP.append({'id':o['id'],'sourceAnchor':o.get('sourceAnchor'),'candidateAnchor':o['anchor'],'sourceSize':o.get('sourceSize'),
                            'candidateSize':o['size_mm'],'host':host,'sill_mm':round(sill*1000),'style':o.get('style','fixed-glazing')})
    MODELS[floor.lower()]={'schema':'jp-cad://aad-floor/1','height':3.048,'allowSourceJunctionSegments':True,'floorGraph':g,'roomEnvelopes':rooms}

# A source-owned presentation layer. Every unknown has a separate status.
ELEMENTS=[];seq={}
def item(floor,id,kind,x,y,dx,dz,h,base=0,colour=None,status='SCHEMATIC_FURNITURE',parts=None,ifc=None,profile=None,holes=None,basis=None):
    elevation=.61+(3.048 if floor=='ff' else 0)
    e={'id':id,'level':floor,'kind':kind,'name':id.replace('-',' ').title(),'x':M(x),'z':Z(y),'y':round(elevation+M(base+h/2),6),
       'dx':M(dx),'dz':M(dz),'dy':M(h),'ifcType':ifc or 'IfcBuildingElementProxy','source':'QA02_SOURCE_CONSTRAINED_PRESENTATION',
       'status':status,'colour':colour,'provenance':{'sourceId':id,'basis':basis or 'Illustrative fit envelope within source-constrained room; product choice unverified'}}
    for prefix,room in [(p,p) for p in ['GF-BED1','GF-BED2','GF-LOUNGE','GF-KITCHEN','FF-MAIN','FF-BED2','FF-LOUNGE','FF-WIR']]:
        if id.startswith(prefix):e['roomId']=room
    if id.startswith('FIX-GF-') and 'EXT' not in id:e['roomId']='GF-BATH'
    if id=='FIX-KITCHEN-SINK':e['roomId']='GF-KITCHEN'
    if id.startswith('FIX-FF-ENS'):e['roomId']='FF-ENS'
    if id.startswith('FIX-FF-MB'):e['roomId']='FF-BATH'
    if parts:
        e['parts']=[{'x':M(x+a),'z':Z(y+b),'y':round(elevation+M(base+c+hh/2),6),'dx':M(ww),'dz':M(dd),'dy':M(hh),'colour':co}
                    for a,b,c,ww,dd,hh,co in parts]
    if profile:e.update(profile=[{'x':M(a),'z':Z(b)} for a,b in profile],holes=[[{'x':M(a),'z':Z(b)} for a,b in ring] for ring in holes or []])
    ELEMENTS.append(e);return e

def bed(f,id,x,y,w=1600):
    parts=[(0,0,0,w,2000,280,'#aa8263'),(0,0,280,w-40,1960,180,'#f4f0e5'),(0,-200,460,w-80,1500,65,'#839b8a'),
           (-w/4,700,460,w/2-80,400,120,'#fffdf6'),(w/4,700,460,w/2-80,400,120,'#fffdf6'),(0,1030,0,w+100,90,950,'#876b53')]
    item(f,id,'furniture',x,y,w+100,2100,950,parts=parts)
    for sign in [-1,1]:
        if x+sign*(w/2+280)-210<230:continue
        item(f,id+'-BEDSIDE-'+str(sign),'furniture',x+sign*(w/2+280),y+750,420,420,450,colour='#d3b58b')
def wardrobe(f,id,x,y,w=1700,d=550):
    item(f,id,'furniture',x,y,w,d,2250,colour='#b68e67')
def sofa(f,id,x,y):
    parts=[(0,0,0,850,2200,220,'#876d55'),(0,0,220,820,2150,230,'#c6cbb9'),(-360,0,450,120,2200,380,'#aeb9a1'),
           (0,-1050,450,850,110,280,'#aeb9a1'),(0,1050,450,850,110,280,'#aeb9a1')]
    item(f,id,'furniture',x,y,900,2300,850,parts=parts)
    item(f,id+'-RUG','furniture',x+850,y,1800,2400,12,colour='#e6d9bd')
    item(f,id+'-COFFEE','furniture',x+1250,y,700,1100,380,colour='#b1845d')
    item(f,id+'-TV','furniture',6730,y,350,1600,550,parts=[(0,0,0,350,1600,450,'#9c7958'),(-50,0,550,80,1200,700,'#263a3f')])
def dining(f,id,x,y):
    parts=[(0,0,720,1300,800,55,'#c09d76')]+[(a,b,0,65,65,720,'#87654b') for a in [-520,520] for b in [-290,290]]
    item(f,id,'furniture',x,y,1300,800,775,parts=parts)
    for a in [-380,380]:
        for b in [-700,700]:item(f,id+f'-CHAIR-{a}-{b}','furniture',x+a,y+b,450,450,800,parts=[(0,0,0,420,420,450,'#bba180'),(0,170 if b>0 else -170,450,450,65,350,'#a9b59d')])
def fixture(f,id,x,y,w,d,h,kind):
    if kind=='wc':parts=[(0,0,0,w*.7,d*.7,h*.7,'#f5f4ef'),(0,-d*.25,h*.65,w,d*.65,h*.35,'#fffdfa'),(0,d*.35,0,w,d*.25,h,'#f2f3ef')]
    elif kind=='basin':parts=[(0,0,0,w,d,h,'#a6b4a6'),(0,0,h,w,d,45,'#faf8f0'),(0,0,h+40,w*.7,d*.7,15,'#bcced0')]
    elif kind=='tub':parts=[(0,0,0,w,d,h*.75,'#f7f6ed'),(0,0,h*.75,w*.8,d*.65,20,'#aac7c5')]
    elif kind=='shower':parts=[(0,0,0,w,d,30,'#c8dedb'),(w/2-15,0,30,18,d,1750,'#9fbfc2')]
    else:parts=[(0,0,0,w,d,h,'#d5e0db')]
    item(f,id,'fixture',x,y,w,d,max(h,1800 if kind=='shower' else h+60),parts=parts,status='SOURCE_FIXTURE_ENVELOPE_COORDINATED')

bed('gf','GF-BED1-BED',1800,12650,1600);wardrobe('gf','GF-BED1-WARDROBE',1200,9950,1700,550)
bed('gf','GF-BED2-BED',1125,4020,1350);wardrobe('gf','GF-BED2-WARDROBE',2975,3200,450,1500)
sofa('gf','GF-LOUNGE-SOFA',4750,4500)
dining('gf','GF-KITCHEN-DINING',5300,11300)
item('gf','GF-KITCHEN-REAR-COUNTER','furniture',5550,13900,2800,540,900,colour='#b7ad92')
item('gf','GF-KITCHEN-SIDE-COUNTER','furniture',6700,12800,540,1700,900,colour='#b7ad92')
item('gf','GF-KITCHEN-FRIDGE','furniture',4050,13200,700,700,1850,colour='#b9c8c7')
fixture('gf','FIX-GF-BASIN',1730,6550,600,400,750,'basin')
fixture('gf','FIX-GF-WC',650,7200,410,695,785,'wc')
fixture('gf','FIX-GF-TUB',650,8350,750,1500,420,'tub')
fixture('gf','FIX-GF-SHOWER',1612,8850,900,900,30,'shower')
fixture('gf','FIX-KITCHEN-SINK',5400,13900,900,500,915,'sink')
bed('ff','FF-MAIN-BED',2700,12650,1800)
wardrobe('ff','FF-WIR-CABINET',1950,8500,500,1700)
bed('ff','FF-BED2-BED',1125,4020,1350);wardrobe('ff','FF-BED2-WARDROBE',2975,3200,450,1500)
sofa('ff','FF-LOUNGE-SOFA',4750,4800)
item('ff','FF-MAIN-DESK','furniture',5600,13900,1500,500,750,colour='#bca17b')
item('ff','FF-MAIN-READING-CHAIR','furniture',5700,11650,750,800,850,colour='#9fae92')
fixture('ff','FIX-FF-ENS-WC',500,8600,520,360,390,'wc')
fixture('ff','FIX-FF-ENS-BASIN',1402.5,9150,395,370,750,'basin')
fixture('ff','FIX-FF-ENS-SHOWER',1125,7850,800,800,30,'shower')
fixture('ff','FIX-FF-MB-BASIN',2850,5900,600,400,750,'basin')
fixture('ff','FIX-FF-MB-WC',2450,7070,520,360,390,'wc')
fixture('ff','FIX-FF-MB-SHOWER',700,6525,900,900,30,'shower')

# Architectural floor finishes, not a structural slab design.
for f,rooms in ROOMS.items():
    for r in rooms:
        if r['id'].endswith('STAIR'):continue
        x0,y0,x1,y1=r['bbox'];x0=max(x0+55,230);x1=min(x1-55,6970);y0=max(y0+55,230);y1=min(y1-55,14170)
        if r['id'] in ('GF-PARK','FF-BALC'):x0,y0,x1,y1=4290,0,7200,2200
        co='#d7bd98' if 'BED' in r['name'] else '#c8d9d4' if 'BATH' in r['name'] or 'ENSUITE' in r['name'] else '#ddd5c4'
        item(f.lower(),r['id']+'-FINISH','floor',(x0+x1)/2,(y0+y1)/2,x1-x0,y1-y0,22,base=-22,colour=co,status='ARCHITECTURAL_FINISH_ASSUMPTION')
    item(f.lower(),f+'-FLOOR-PLATE','floor',3600,7200,7200,14400,150,base=-172,
         profile=[(0,0),(7200,0),(7200,14400),(0,14400)],holes=[[(250,250),(3150,250),(3150,2150),(250,2150)]] if f=='FF' else [],
         colour='#ded8c9',status='DISPLAY_THICKNESS_NOT_STRUCTURAL_DESIGN',ifc='IfcSlab',basis='Outer footprint exact; 150 mm thickness assumed for architectural visualization only')

# Two 9-riser flights, 8 treads each. The full 900 mm side landing stays level.
parts=[]
for n in range(1,9):
    h=3048/18*n;parts.append((3150-(n-.5)*250,700,h/2,250,900,h,'#c2ad8c'))
    h=3048/18*(9+n);parts.append((1150+(n-.5)*250,1700,h/2,250,900,h,'#c2ad8c'))
# item() accepts relative parts; these parts already use building coordinates.
stair_parts=[(x-2150,y-1200,h-150,w,d,150,c) for x,y,_,w,d,h,c in parts]
stair=item('gf','GF-STAIR-FLIGHTS','stair',2150,1200,2000,1900,3048,parts=stair_parts,status='DIMENSIONAL_COORDINATION_NOT_STRUCTURAL_DESIGN',
     basis='18 risers / 169.333 mm, two 8-tread runs at 250 mm; direction reverses around a 900 mm landing')
for plan_y,centre_height,sign in [(700,762,-1),(1700,2286,1)]:
    stair['parts'].append({'x':2.15,'z':Z(plan_y),'y':M(610+centre_height-150),'dx':M(math.hypot(2000,8*3048/18)), 'dy':.15,'dz':.9,'colour':'#c2ad8c','rotationZ':math.degrees(math.atan2(sign*8*3048/18,2000))})
stair['provenance']['basis']+='; thin treads and 150 mm display waist replace solid-to-floor blocks, preserving the headroom volume between stacked stairs. RC size/rebar remain unissued.'
item('gf','GF-STAIR-MID-LANDING','landing',700,1200,900,1900,150,base=1524-150,colour='#c2ad8c',status='LANDING_COORDINATION')
rail=item('gf','GF-STAIR-HANDRAILS','guard',2150,1200,2100,200,4000,status='900MM_STAIR_GUARD_COORDINATION_NOT_FIXING_DESIGN',basis='900 mm above the two source stair flight pitch lines; posts and rail sizing are illustrative')
rail['parts']=[]
for flight,plan_y,centre_height,slope in [(0,1170,762,-1),(1,1230,2286,1)]:
    rail['parts'].append({'x':2.15,'z':Z(plan_y),'y':M(610+centre_height+900),'dx':M(math.hypot(2000,8*3048/18)), 'dy':.04,'dz':.04,'colour':'#806c4d','rotationZ':math.degrees(math.atan2(slope*8*3048/18,2000))})
    for n in range(9):
        x=3150-n*250 if flight==0 else 1150+n*250
        y=centre_height+slope*(x-2150)*8*3048/18/2000
        rail['parts'].append({'x':M(x),'z':Z(plan_y),'y':M(610+y+450),'dx':.03,'dy':.9,'dz':.03,'colour':'#806c4d'})
rail['parts'].append({'x':.235,'z':Z(1200),'y':3.034,'dx':.02,'dy':.04,'dz':1.9,'colour':'#806c4d'})
for y in [300,750,1200,1650,2100]:rail['parts'].append({'x':.235,'z':Z(y),'y':2.584,'dx':.02,'dy':.9,'dz':.02,'colour':'#806c4d'})
entry_parts=[]
for n in range(1,4):entry_parts.append((0,-900+(n-.5)*300,0,1100,300,n*152.5,'#c2b89f'))
item('gf','GF-ENTRY-STEPS','stair',5500,0,1100,900,610,base=-610,parts=entry_parts,status='FOUR_RISERS_152_5MM_PLINTH_ACCESS',basis='610 mm source plinth; four equal risers with three 300 mm goings; porch is final landing')
for f in ('gf','ff'):
    item(f,f.upper()+'-STAIR-SIDE-LANDING','landing',3600,1200,900,1900,100,base=-100,colour='#d4c8b1',status='900MM_CLEAR_LEVEL_START_OR_ARRIVAL')
for e in ELEMENTS:
    if e['id'] in ('GF-STAIR-FLIGHTS','GF-STAIR-MID-LANDING','GF-STAIR-HANDRAILS'):e['contextLevels']=['gf','ff']

# Explicit column *coordination markers*. No member sizing/capacity inference.
for f in ('gf','ff'):
    for ix,x in enumerate([150,4290,7050]):
        for iy,y in enumerate([150,2200,5600,9400,14250]):
            if x>4290 and y<2200:continue
            item(f,f'{f.upper()}-COLUMN-MARKER-{ix+1}-{iy+1}','column',x,y,300,300,2898,colour='#d7a14b',
                 status='PROPOSED_COLUMN_LOCATION__300MM_DISPLAY_MARKER_NOT_A_DESIGNED_SECTION',
                 basis='User requested visible columns; source DXF has no columns. Amber 300 mm glyphs show coordination positions only; foundations/rebar/sections require engineering.')

# Balcony guard and roof terrace: dimensioned display concept, no invented top storey.
for id,x,y,w,d in [('FRONT',5745,35,2910,50),('RIGHT',7165,1100,50,2200)]:
    item('ff','FF-BALCONY-GUARD-'+id,'guard',x,y,w,d,1100,colour='#91b4b7',status='PROPOSED_GUARD_NOT_ENGINEERING_DESIGNED')
roof=item('ff','FF-ROOF-TERRACE','roof',3600,7200,7200,14400,172,base=2876,
          profile=[(0,0),(4290,0),(4290,2200),(7200,2200),(7200,14400),(0,14400)],holes=[[(250,250),(3150,250),(3150,2150),(250,2150)]],colour='#c6c8bc',ifc='IfcSlab',
          status='TWO_STOREY_ROOF_WITH_SPECIFIED_ACCESS_VOID',basis='Current GF+FF geometry and user instruction; missing M08 is excluded from active design inputs')
roof['roofAccess']=True
# Continue the same dimensional stair to the roof. This specifies architecture,
# not RC waist-slab/rebar or footing design. Every physical thickness remains labelled.
for original in list(ELEMENTS):
    if original['id'] not in ('GF-STAIR-FLIGHTS','GF-STAIR-MID-LANDING','GF-STAIR-HANDRAILS'):continue
    e=copy.deepcopy(original);e['id']=e['id'].replace('GF-STAIR','FF-ROOF-STAIR');e['level']='ff';e['name']='Roof access '+e['name'];e['y']=round(e['y']+3.048,6)
    for part in e.get('parts',[]):part['y']=round(part['y']+3.048,6)
    e['contextLevels']=[];e['roofPart']=True;e['roofAccess']=True
    e['provenance']={'basis':'NBC 206:2024 Tables 3/4: 900 mm flight, 250 mm tread, 169.333 mm riser; actual structural detail and finished obstruction evidence still required'}
    ELEMENTS.append(e)
item('ff','ROOF-ARRIVAL-LANDING','landing',3600,1200,900,1900,100,base=3048-100,colour='#d4c8b1',status='ROOF_900MM_ARRIVAL_LANDING');ELEMENTS[-1].update(roofPart=True,roofAccess=True)
# Lightweight enclosure extends to y=2400; rear exit opens onto the actual L-shaped
# terrace, rather than onto the unroofed balcony corner. Nominal door 1000x2134.
for id,x,y,w,d,h,b in [('FRONT',2145,50,4290,100,2400,3048),('LEFT',50,1200,100,2200,2400,3048),('RIGHT',4240,1200,100,2200,2400,3048),
 ('REAR-L',1550,2350,3100,100,2400,3048),('REAR-R',4195,2350,190,100,2400,3048),('HEADER',3600,2350,1000,100,266,3048+2134)]:
    item('ff','ROOF-ACCESS-ENCLOSURE-'+id,'auxiliary',x,y,w,d,h,base=b,colour='#d8d2be',status='ARCHITECTURAL_ENCLOSURE_NOT_STRUCTURAL_SECTION',basis='2400 mm clear enclosure height; 100 mm display envelope, material and supporting structure require design')
    ELEMENTS[-1].update(roofPart=True,roofAccess=True)
item('ff','ROOF-ACCESS-DOOR','auxiliary',3120,2785,40,920,2134,base=3048,colour='#ab8057',status='ROOF_EXIT_1000MM_NOMINAL_OPENING_920MM_CLEAR_LEAF_ENVELOPE');ELEMENTS[-1].update(roofPart=True,roofAccess=True)
item('ff','ROOF-ACCESS-COVER','auxiliary',2145,1200,4290,2400,150,base=3048+2400,colour='#c4c7b7',status='DISPLAY_THICKNESS_NOT_STRUCTURAL_DESIGN');ELEMENTS[-1].update(roofPart=True,roofAccess=True,roofCover=True)
for id,x,y,w,d in [('REAR',3600,14340,7200,120),('LEFT',60,7200,120,14400),('RIGHT',7140,8300,120,12200)]:
    item('ff','FF-ROOF-PARAPET-'+id,'guard',x,y,w,d,1066.8,base=3048,colour='#ddd7c8',status='HISTORIC_PARAPET_HEIGHT_REUSED_FOR_TERRACE_CONCEPT')
    ELEMENTS[-1]['roofPart']=True

# Plot in building-local coordinates; the source building origin remains exact.
item('gf','SITE-PLOT','site',2628,7144,9144,18288,40,base=-660,colour='#afbd96',status='SOURCE_PLOT_CONTEXT')
item('gf','SITE-PATH','site',2628,-1000,9144,2000,30,base=-640,colour='#c3bcaa',status='FRONT_SETBACK_APPROACH_CONTEXT')
# Proposed parked vehicle moved left to clear the entry, with exact source size.
cx=4056-1944;cy=1000-2000
car_parts=[(0,0,180,4290,1770,700,'#e4e8dd'),(0,0,880,2500,1550,690,'#709798'),(-1300,-780,0,650,180,500,'#333f3d'),(1300,-780,0,650,180,500,'#333f3d'),(-1300,780,0,650,180,500,'#333f3d'),(1300,780,0,650,180,500,'#333f3d')]
car_parts.extend([(900,-930,850,180,152,180,'#9b6653'),(900,930,850,180,152,180,'#9b6653')])
item('gf','SITE-CAR-DOLPHIN','site',cx,cy,4290,1770,1570,base=-610,parts=car_parts,status='REFERENCE_VEHICLE__EXTENDED_MIRROR_ENVELOPE_FAILS_2000MM_STRIP',basis='Source body 4290x1770x1570 retained; BYD UK July 2024 specifies 2012 mm extended-mirror width and 5.25 m minimum tyre turning radius. No operational parking acceptance.')
for x,y in [(-1300,1000),(-1300,6000),(-1300,11500),(6600,1300)]:
    item('gf',f'PLANT-{x}-{y}','landscape',x,y,400,400,1100,parts=[(0,0,0,380,380,400,'#b28d68'),(0,0,400,500,500,650,'#6f8c63')])

# External WC: source 1000x1200 *clear* envelope, wall thickness added outside.
wx,wy=-1217,15563
for id,x,y,w,d in [('L',wx-550,wy,100,1400),('R',wx+550,wy,100,1400),('B',wx,wy+650,1000,100)]:
    item('gf','EXT-WC-'+id,'auxiliary',x,y,w,d,2400,colour='#d5c8af',status='SOURCE_SERVICE_WC_CLEAR_SIZE__MUNICIPAL_REVIEW_PENDING')
fixture('gf','FIX-GF-EXT-PAN',wx,wy,580,450,120,'sink')
for side,sign in [('L',-1),('R',1)]:
    item('gf','EXT-WC-FRONT-'+side,'auxiliary',wx+sign*490.5,wy-650,219,100,2400,colour='#d5c8af',status='762MM_SERVICE_WC_DOOR_JAMB')
item('gf','EXT-WC-DOOR-HEADER','auxiliary',wx,wy-650,762,100,419,base=1981,colour='#d5c8af',status='SERVICE_WC_HEADER_DISPLAY')
item('gf','EXT-WC-DOOR','auxiliary',wx,wy-650,762,35,1981,colour='#ac8964',status='SOURCE_762_X_1981_SERVICE_WC_DOOR')
item('gf','EXT-WC-FLOOR','floor',wx,wy,1000,1200,100,base=-100,colour='#c8d9d4',status='SOURCE_CLEAR_SERVICE_WC_AREA')
item('gf','EXT-WC-ROOF','auxiliary',wx,wy,1200,1400,100,base=2400,colour='#c1c3b4',status='SERVICE_WC_ROOF_DISPLAY');ELEMENTS[-1]['roofPart']=True
item('gf','EXT-WC-STEP','auxiliary',wx,wy-850,900,300,150,base=-150,colour='#c2b89f',status='ONE_150MM_SERVICE_WC_ACCESS_STEP')
# External WC absolute FFL was not supplied. Use +150 mm for one-step access,
# separately from the source +610 mm main-house plinth.
for e in ELEMENTS:
    if e['id'].startswith('EXT-WC-') or e['id']=='FIX-GF-EXT-PAN':
        e['y']=round(e['y']-.46,6)
        for part in e.get('parts',[]):part['y']=round(part['y']-.46,6)

manifest={'schema':'jp-cad://aad-building/1','projectId':'ashok-adhikari','name':'Ashok Adhikari · furnished coordination model',
 'revision':'AAD-ASHOK-MODEL-001-R000003','representation':'ARCHITECTURAL_REVIEW_ONLY','sourceLedger':'coordination-ledger-qa02.json',
 'jurisdiction':{'country':'Nepal','municipality':'Pokhara Metropolitan City','ward':14,'source':'USER_20261028','parcelVerified':False},
 'codeRegister':'../../codes/nepal-pokhara.json','engineeringRecordLogicalId':'AAD-ASHOK-ENG-001',
 'excludedHistoricalInputs':['M08_MISSING_NATIVE_FILES'],
 'engineeringEvidence':{'structuralRoute':'SITE_SPECIFIC_NBC105','finishedMeasurementsVerified':False,'currentMunicipalClausesVerified':None,'percolationLPerM2Day':None,'permit':None},
 'coordinateSystem':{'units':'m','axes':'X page-right NE; Z page-down SE; Y elevation','sourceOrigin':'Front-left outer building corner','sourceXY':'x=1000X; y=14400-1000Z','surveyAlignment':'NOT_VERIFIED'},
 'levels':[],'reviewHolds':[
 {'code':'ENGINEERING_DESIGN','message':'Amber columns are proposed location markers, not designed sections. No foundation/rebar/capacity certification.'},
 {'code':'MUNICIPAL','message':'Zero-right setback and external WC location remain unverified for municipal submission.'},
 {'code':'STAIR_DETAIL','message':'18 risers, tread/landing dimensions and a real slab void coordinated; structural waist/beam/guard details and finished headroom need professional checking.'},
 {'code':'PARKING','message':'Static vehicle fits with a clear right approach. Driving/turning/gate operation still unverified.'},
 {'code':'PRESCRIPTIVE_SCOPE','message':'NBC 205 coverage cap 92.90304 m2 is exceeded; use project-specific NBC 105 engineering. Missing M08 is excluded, not an active dependency.'}],
 'restrictions':{'issueForConstruction':False,'engineeringApproval':'HOLD','stage':'SOURCE_CONSTRAINED_ARCHITECTURAL_SCHEME'},
 'presentation':{'schema':'jp-cad://architectural-presentation/1','wallHeight':2.876,'defaultLevel':'gf','defaultView':'building','defaultCutaway':True,'cleanPlan':True,
  'outerBounds':[0,0,7.2,14.4],'sourceYLength':14.4,'grid':{'minor':.1,'medium':.5,'major':1,'margin':2},
  'plotBounds':[-1.944,-1.888,7.2,16.4],'stairBay':[4.29,2.2],'northRotationDeg':45,
  'rearCaption':'NW rear ↑','frontCaption':'SE / ROAD FRONT','wallLegend':'230 mm external · 100 mm internal walls',
  'wallColour':'#e6dfcb','cameraDirection':[-1,.9,1],'floorToFloor':3.048,'plinth':.61,'roomEnvelopes':ROOMS,'elements':ELEMENTS,
  'columnLegend':'Amber = proposed column positions / display envelopes, NOT designed member sizes',
  'roofAccess':{'riseM':3.048,'risers':18,'treadM':.25,'flightWidthM':.9,'enclosureClearHeightM':2.4,'exitNominalWidthM':1,'exitClearLeafEnvelopeM':.92,'source':'NBC206 Table3/Table4; user instruction 20261028','finishedBeamHeadroomVerified':False},
  'vehicleEnvelope':{'bodyWidthM':1.77,'extendedMirrorWidthM':2.012,'stripDepthM':2,'transverseExtendedMirrorFit':False,'minimumTyreTurningRadiusM':5.25,'sweptPathVerified':False},
  'sourceGeometryHash':'6c204ffd644585c391b3bfbc2b553402b52b0657c16eca3d46dc70162105305e'}}
headroom=[]
for f,elevation,own in [('gf',.61,'GF-STAIR-FLIGHTS'),('ff',3.658,'FF-ROOF-STAIR-FLIGHTS')]:
    for flight,plan_y in [(0,700),(1,1700)]:
        for n in range(1,9):
            x=3150-(n-.5)*250 if flight==0 else 1150+(n-.5)*250
            headroom.append({'id':f'{f}-flight-{flight+1}-tread-{n}','level':f,'x':M(x),'z':Z(plan_y),'surfaceY':round(elevation+3.048/18*(n+(9 if flight else 0)),6),'ignoreId':own})
headroom.append({'id':'roof-exit-threshold','level':'ff','x':3.6,'z':Z(2350),'surfaceY':6.706,'ignoreId':'ROOF-ARRIVAL-LANDING'})
manifest['presentation']['headroomSamples']=headroom
for id,name,elevation in [('gf','Ground floor',.61),('ff','First floor',3.658)]:
    # The validator measures wall centre-line polygon area, not gross footprint.
    source_area=round(6.97*14.17-2.91*2.2,6)
    manifest['levels'].append({'id':id,'name':name,'elevation':elevation,'height':3.048,'model':'aad-'+id+'-model-qa02.json',
                               'sourceArea':source_area,'transform':{'x':0,'z':0,'rotationDeg':0},'status':'QA02_CONNECTED_CENTRELINE_COORDINATION'})
    write('aad-'+id+'-model-qa02.json',MODELS[id])
import importlib.util
_spec=importlib.util.spec_from_file_location('ashok_v2_services',Path(__file__).with_name('ashok-v2-services.py'))
_mod=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_mod);_mod.add_services(manifest)
write('aad-building-qa02.json',manifest)
write('coordination-ledger-qa02.json',{'schema':'jp-cad://coordination-ledger/1','revision':manifest['revision'],'dateNpt':'2026-10-28',
 'authorization':'User requested practical aesthetic completion with up to 30% schematic allowance and no further approval pause.',
 'tolerancePolicy':'Known outer plot, footprint, wall thickness, source room rear boundaries and storey rise remain exact. Listed interior coordination changes are proposals, not a claim of quantified 30% engineering accuracy.',
 'authority':{'clientBaseline':'REV03 v0.4 preserved','sourceGeometry':'REV04 v0.8 preserved','approvedVisuals':'v0.9 GF c016 / FF c012 preserved','candidate':'Current architecture; structural sections not issued'},
 'inputs':[{'name':'REV04 semantic model','sha256':'6c204ffd644585c391b3bfbc2b553402b52b0657c16eca3d46dc70162105305e'},
           {'name':'REV02 native DXF','sha256':'475f3dd8c06a927443319bd72741e501a75dbaf1d205ce2e1e53daba5921cd41','finding':'10 LINE entities, no column or furniture objects'},
           {'name':'REV02 user sketch','sha256':'4714929bdfe2d7b2ac04475944eec100c94c885688fbbcd6caf0008ca2be7789'},
           {'name':'REV03 GF intent','sha256':'c08c85080f1d9a3ec2c1ec0c5283f101f9bfe6a99353758c8852ef42d89844ae'},
           {'name':'REV02 FF intent','sha256':'0c67c32bd2a3091b0fdf1b790fa804eb9ca6b6325522d7e441174b81452a48e1'}],
 'changes':CHANGES,'openings':OPENING_MAP,'sourceRemovedOrPassage':DEFERRED,
 'assumptions':['Standard window sill 900 mm, kitchen 1100 mm, stair 600 mm, high vents 2100 mm; kitchen 203 mm vent top remains 914 mm below assumed slab underside.',
                '150 mm floor plate thickness is display-only; amber 300 mm column glyphs are not structural sections.',
                'Furniture chosen to fit available space; actual products and MEP remain unselected. The GF tub is rotated to leave a 1037 mm approach aisle; basin/WC positions are staggered rather than blocking entries.',
                'External WC floor at +150 mm is a separate assumed datum, with one 150 mm step and its source 1000x1200 mm clear internal size.',
                'GF+FF model only. No unsupported historical top floor silently added. Roof terrace is a labeled proposal.'],
 'remainingHolds':manifest['reviewHolds']})
outputs={p.name:sha(p) for p in sorted(OUT.glob('*qa02.json')) if p.name!='output-hashes-qa02.json'}
write('output-hashes-qa02.json',{'schema':'jp-cad://output-hashes/1','sha256':outputs})
print(json.dumps({'revision':manifest['revision'],'walls':{f:len(m['floorGraph']['walls']) for f,m in MODELS.items()},'openings':len(OPENING_MAP),'presentationObjects':len(ELEMENTS)}))
