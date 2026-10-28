"""Owner-pinned, evidence-labeled MEP coordination; not a construction issue."""
import math

def add_services(m):
    E=m['presentation']['elements'];P=lambda x,y,h=0:{'x':round(x/1000-1.944,6),'z':round(16.4-y/1000,6),'y':h}
    assets=[{'id':'SEPTIC','name':'Septic tank - 2 chambers','xMm':1746,'yMm':8281,'widthMm':1300,'lengthMm':2300,'heightMm':2000,'internalLiquidM3':2.0,'requiredLiquidM3':1.7064,'colour':'#b76b32'},
            {'id':'SOAK','name':'Soak pit - indicative 1500 mm internal diameter','xMm':1130,'yMm':17053,'widthMm':1800,'lengthMm':1800,'heightMm':1800,'internalDiameterMm':1500,'requiredInfiltrationLPerM2Day':800/(math.pi*1.5*1.5),'colour':'#8d68b8'}]
    def obj(id,name,parts,system='P - Drainage',colour='#a0673d',**extra):
        lo={k:min(p[k]-p['d'+k]/2 for p in parts) for k in ['x','y','z']};hi={k:max(p[k]+p['d'+k]/2 for p in parts) for k in lo}
        e={'id':'MEP-'+id,'name':name,'kind':'auxiliary','level':'gf','contextLevels':['gf','ff'],'ifcType':'IfcBuildingElementProxy','source':'USER_V2_COORDINATES_AND_NBC208','status':'MEP_COORDINATION_NOT_CONSTRUCTION_ISSUED','discipline':'MEP','system':system,'colour':colour,'provenance':{'basis':'User v2 siting; NBC208 B1.3-B1.8, B14 and UWSSP8.4.4; display envelope, physical clashes retained'},'parts':parts,**extra}
        for k in lo:e[k]=(lo[k]+hi[k])/2;e['d'+k]=max(.01,hi[k]-lo[k])
        E.append(e);return e
    def box(x,y,z,dx,dy,dz,c):return {'x':x,'y':y,'z':z,'dx':dx,'dy':dy,'dz':dz,'colour':c}
    for a in assets:
        p=P(a['xMm'],a['yMm']);x,z=p['x'],p['z'];w,l=a['widthMm']/1000,a['lengthMm']/1000;c=a['colour'];h=a['heightMm']/1000
        parts=[box(x,-h+.075,z,w,.15,l,c),box(x,-h/2,z-l/2+.075,w,h,.15,c),box(x,-h/2,z+l/2-.075,w,h,.15,c),box(x-w/2+.075,-h/2,z,.15,h,l,c),box(x+w/2-.075,-h/2,z,.15,h,l,c),box(x,.015,z,.6,.03,.6,c)]
        if a['id']=='SEPTIC':
            # Inspection cutaway baffle with a 150 mm transfer opening (detail assumption).
            for dx in [-1,1]:parts.append(box(x+dx*(w+.15)/4,-h/2,z-l/6,(w-.15)/2,h,.1,c))
            parts.extend([box(x,-1.575,z-l/6,.15,.85,.1,c),box(x,-.5,z-l/6,.15,1,.1,c)])
        e=obj(a['id'],a['name'],parts,assetId=a['id'],shape='circular' if a['id']=='SOAK' else 'rectangular')
        if a['id']=='SOAK':
            e.pop('parts');e.update(x=x,z=z,y=-h/2,dx=w,dz=l,dy=h,clashBasis='Conservative bounding excavation envelope',profile=[{'x':x+.9*math.cos(i*math.tau/48),'z':z+.9*math.sin(i*math.tau/48)} for i in range(48)],holes=[[{'x':x+.75*math.cos(i*math.tau/48),'z':z+.75*math.sin(i*math.tau/48)} for i in range(48)]])
    routes=[]
    def route(id,name,points,diameter=100,system='P - Sanitary',colour='#b35c37',fixtures=None):
        points=[p for i,p in enumerate(points) if i==0 or p!=points[i-1]]
        parts=[]
        for a,b in zip(points,points[1:]):parts.append(box((a['x']+b['x'])/2,(a['y']+b['y'])/2,(a['z']+b['z'])/2,max(abs(a['x']-b['x']),diameter/1000),max(abs(a['y']-b['y']),diameter/1000),max(abs(a['z']-b['z']),diameter/1000),colour))
        obj(id,name,parts,system,colour,pipeRoute=points,diameterMm=diameter,fixtureIds=fixtures or [])
        routes.append({'id':id,'name':name,'system':system,'diameterMm':diameter,'points':points,'fixtureIds':fixtures or [],'diameterBasis':('Mechanical duct routing assumption; fan airflow not sized' if system.startswith('M') else 'Electrical conduit routing assumption; cables/protection not sized' if system.startswith('E') else 'NBC208 B1.7 full-bore stack continuation' if system=='P - Vent' else 'DN100 effluent coordination assumption; UWSSP8.4.4' if system=='P - Effluent' else 'NBC208 B1.4 WC minimum DN100; other branch values coordination assumptions'),'slopeBasis':'Underground gravity DN100 nominal 1:57; falls encoded in endpoints; vent/duct/conduit not gravity drain'})
    sx=P(1746,7131,-.75);outlet=P(1746,9431,-.8);ox=P(1130,17053,-1.05)
    # Outside wet stacks, continuous DN100 to roof without diameter reduction.
    stacks=[(-.12,7.1,'WEST'),(6.8,.35,'KITCHEN')]
    fixture_groups={k:[] for _,_,k in stacks}
    for f in list(E):
        if f['kind']!='fixture':continue
        k='KITCHEN' if 'KITCHEN' in f['id'] else 'WEST';xx,zz,_=next(s for s in stacks if s[2]==k);yy=f['y']-.3
        point={'x':f['x'],'z':f['z'],'y':yy};join={'x':xx,'z':f['z'],'y':yy-.05};end={'x':xx,'z':zz,'y':yy-.05-abs(f['z']-zz)/57}
        route('BRANCH-'+f['id'],f['name']+' trapped waste branch',[point,join,end],100 if 'WC' in f['id'] or 'PAN' in f['id'] else 75,fixtures=[f['id']]);fixture_groups[k].append(f['id'])
    for xx,zz,k in stacks:
        route('STACK-'+k,k+' soil/waste stack',[{'x':xx,'z':zz,'y':-.4},{'x':xx,'z':zz,'y':6.706}],100,fixtures=fixture_groups[k])
        route('VENT-'+k,k+' full-bore vent to open air',[{'x':xx,'z':zz,'y':6.706},{'x':xx,'z':zz,'y':7.606}],100,'P - Vent','#7464b4')
        start={'x':xx,'z':zz,'y':-.4};bend={'x':sx['x'],'z':zz,'y':-.4-abs(xx-sx['x'])/57};end={**sx,'y':bend['y']-abs(zz-sx['z'])/57};route('DRAIN-'+k,k+' buried gravity drain via inspection/cleanout',[start,bend,end]);route('INLET-'+k,k+' drop at septic inlet',[end,sx])
    route('EFFLUENT','Septic treated effluent to soak pit',[outlet,{'x':ox['x'],'z':outlet['z'],'y':-.82},ox],100,'P - Effluent','#397e8b')
    for xx,zz,k in stacks:route('EXTRACT-'+k,k+' mechanical exhaust to outside air',[{'x':max(.1,xx),'z':zz,'y':2.8},{'x':xx-.4,'z':zz,'y':2.8}],150,'M - Exhaust','#598a56')
    route('E-CONDUIT','Electrical distribution conduit - schematic, no cable/breaker sizing',[{'x':4.3,'z':12.1,'y':1.5},{'x':4.3,'z':12.1,'y':2.8},{'x':4.3,'z':7.1,'y':2.8},{'x':.25,'z':7.1,'y':2.8}],25,'E - Electrical','#c39a26')
    m['release']={'version':'v2','previous':'v1','project':'Ashok Adhikari','branch':'feat/ashok-v2-mep-site-coordinates'}
    m['services']={'siteFrame':{'originX':-1.944,'originZ':16.4,'widthMm':9144,'lengthMm':18288,'buildingOffsetX':1944,'buildingOffsetY':2000,'plinthRect':[1944,2000,9144,16400],'outsideWCRect':[127,16863,1327,18263]},'schema':'jp-cad://mep-coordination/1','coordinateBasis':'Plot front-left corner; X page-right, Y toward rear, mm. Building source X=plotX-1944; Y=plotY-2000. Not surveyed coordinates.','assets':assets,'routes':routes,'occupantsAssumed':8,'dailyFlowL':800,'constructionIssued':False,'sources':[{'id':'NBC208','url':'https://giwmscdnone.gov.np/media/app/public/54/posts/1679824552_72.pdf','clauses':'B1.3-B1.8, B14; vents continue at stack diameter; trapped fixtures; sloped drainage'},{'id':'UWSSP','url':'https://giwmscdnone.gov.np/media/pdf_upload/Design%20Guidelines_iwb2hdn.pdf','clauses':'8.4.4 septic volume, two chambers, 2:1 lengths, soak infiltration'},{'id':'REVIT','url':'https://www.autodesk.com/learn/ondemand/module/build-plumbing-systems-in-revit','clauses':'Separate sanitary and vent system classifications; gravity slope and roof penetrations. Workflow reference, not Nepal code.'}],'notes':['Selected soak point overlaps existing outside WC; retain exact owner pin and flag collision.','Septic outer envelope crosses plinth by 452 mm at the selected centre; do not silently move it.','Mechanical exhaust discharges to outside air, never into a sewage vent.','No supply-water/drain cross-connections. Rainwater stays independent.','Vent extension 900 mm above terrace is a coordination assumption; termination separation from openings remains to be resolved.','E conduit illustrates distribution only; earthing, circuit protection and cable sizes are not designed.']}
    
    for slab in E:
        if slab['id'] in ['FF-ROOF-TERRACE','FF-FLOOR-PLATE']:
            slab.setdefault('holes',[]).append([{'x':6.7,'z':.25},{'x':6.9,'z':.25},{'x':6.9,'z':.45},{'x':6.7,'z':.45}])
    m['presentation']['sitePicker']={'basis':'plot','originX':-1.944,'originZ':16.4,'widthMm':9144,'lengthMm':18288}
    m['presentation']['roofCoverDefault']=True
    m['revision']='AAD-ASHOK-MODEL-001-R000004'
