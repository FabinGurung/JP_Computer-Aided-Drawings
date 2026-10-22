/* CAD/AAD core · multistorey building assembler v1.
 * A reusable pure-data engine. No site-specific dimensions, floor assumptions, or
 * fabricated structural approvals belong in this file.
 * Map coordinate convention: X east of local origin; Z plan-depth; Y elevation.
 * IFC export maps these to IFC X,Y,Z respectively.
 */
import {auditAADStructuralRegistration} from "./aad-structural-registration-audit.mjs";
const finite=(v,label)=>{if(typeof v!=="number"||!Number.isFinite(v))throw Error(label+" must be finite");return v;};
const positive=(v,label)=>{finite(v,label);if(v<=0)throw Error(label+" must be positive");return v;};
const round=n=>Math.round(n*1e6)/1e6;
const area=ps=>ps.reduce((s,p,i)=>{const q=ps[(i+1)%ps.length];return s+p.x*q.z-q.x*p.z;},0)/2;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const midpoint=(a,b)=>({x:(a.x+b.x)/2,z:(a.z+b.z)/2});
const inside=(p,poly)=>{
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if(((a.z>p.z)!==(b.z>p.z))&&(p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x))hit=!hit;
 }
 return hit;
};
function normalizeManifest(manifest){
 if(manifest?.schema!=="jp-cad://aad-building/1")throw Error("Wrong multistorey AAD manifest schema");
 if(!/^[A-Za-z0-9_-]{3,48}$/.test(manifest.projectId||""))throw Error("Invalid building project ID");
 if(!Array.isArray(manifest.levels)||manifest.levels.length<2||manifest.levels.length>12)throw Error("Building needs 2..12 levels");
 const ids=new Set();
 for(const l of manifest.levels){
  if(!/^[a-zA-Z0-9_-]{1,32}$/.test(l.id)||ids.has(l.id))throw Error("Invalid or duplicate level");
  ids.add(l.id);finite(l.elevation,"level elevation");positive(l.height,"level height");
  finite(l.transform.x,"transform x");finite(l.transform.z,"transform z");finite(l.transform.rotationDeg,"level rotation");
  positive(l.sourceArea,"sourceArea");
  if(!l.model||!/^[-_a-zA-Z0-9]+\.json$/.test(l.model))throw Error("Invalid local floor file");
 }
 const levels=[...manifest.levels].sort((a,b)=>a.elevation-b.elevation);
 for(let i=1;i<levels.length;i++){
  if(levels[i].elevation<levels[i-1].elevation+levels[i-1].height-0.005)throw Error("Overlapping storey heights");
 }
 if(!manifest.structural||!manifest.structural.columns||!manifest.structural.beams||!manifest.structural.slabs)throw Error("Missing structural assumptions");
 return levels;
}
const localToWorld=(p,t)=>{
 const a=t.rotationDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return{x:round(p.x*c-p.z*s+t.x),z:round(p.x*s+p.z*c+t.z)};
};
function modelPerimeter(model){
 const g=model.floorGraph;
 if(!g||!Array.isArray(g.nodes)||!Array.isArray(g.walls)||!Array.isArray(g.perimeter))throw Error("A level lacks its source AAD wall graph");
 const nodes=new Map(g.nodes.map(n=>[n.id,n])),walls=new Map(g.walls.map(w=>[w.id,w]));
 const points=[];let cursor=walls.get(g.perimeter[0])?.a;
 for(const id of g.perimeter){
  const w=walls.get(id);if(!w)throw Error("Missing exterior wall "+id);
  const node=nodes.get(cursor);if(!node)throw Error("Disconnected perimeter");
  points.push({x:node.x,z:node.z});
  cursor=w.a===cursor?w.b:w.b===cursor?w.a:null;
  if(!cursor)throw Error("Exterior wall sequence is not closed");
 }
 if(cursor!==walls.get(g.perimeter[0])?.a)throw Error("Exterior wall does not close");
 return points;
}
function addBox(elements,id,kind,ifcType,level,x,y,z,dx,dy,dz,opts={}){
 positive(dx,"box width");positive(dy,"box height");positive(dz,"box depth");
 const e={id,kind,ifcType,level,x:round(x),y:round(y),z:round(z),dx:round(dx),dy:round(dy),dz:round(dz),
  rotationDeg:round(opts.rotationDeg||0),source:opts.source||"ASSUMED",status:opts.status||"INFERRED",
  host:opts.host||null,name:opts.name||id,provenance:opts.provenance||null,profile:null,steps:null};
 elements.push(e);return e;
}
export function assembleBuilding(manifest,models,options={}){
 const levels=normalizeManifest(manifest),elements=[],diagnostics=[],placements=[],projectId=manifest.projectId;
 const seen=new Set();
 const put=e=>{if(seen.has(e.id))throw Error("Nonunique building element ID "+e.id);seen.add(e.id);};
 const byLevel=new Map(),areaSum={source:0,model:0};
 for(const level of levels){
  const model=models[level.id];if(!model)throw Error("Missing floor model "+level.id);
  const g=model.floorGraph,perimeter=modelPerimeter(model),world=perimeter.map(p=>localToWorld(p,level.transform));
  const square=Math.abs(area(world)),diff=square-level.sourceArea;
  if(Math.abs(diff)>.02){
   if(!options.allowAreaDrift)throw Error("Unreconciled area on "+level.id+": "+square+" vs "+level.sourceArea);
   diagnostics.push({severity:"WARNING",code:"DRAFT_AREA_DEVIATION",level:level.id,
    message:"Working draft floor area "+round(square)+" m² differs from frozen source schedule "+level.sourceArea+" m²; source truth has not been modified"});
  }
  areaSum.source+=level.sourceArea;areaSum.model+=square;
  const nodes=new Map(g.nodes.map(n=>[n.id,n])),wallmap=new Map(g.walls.map(w=>[w.id,w]));
  const source="SOURCE_ALIGNED_ARCHITECTURAL_DRAFT";
  const start=elements.length;
  for(const w of g.walls){
   const a=localToWorld(nodes.get(w.a),level.transform),b=localToWorld(nodes.get(w.b),level.transform);
   const length=dist(a,b),angle=Math.atan2(b.z-a.z,b.x-a.x)*180/Math.PI;
   const p=midpoint(a,b),h=level.height-(manifest.structural.slabs.thickness||.18);
   const e=addBox(elements,projectId+":"+level.id+":"+w.id,"wall","IfcWall",level.id,p.x,level.elevation+h/2,p.z,length,h,w.thickness,{
    source:w.source||source,status:w.status||"AREA_CALIBRATED",rotationDeg:angle,name:w.id,host:null,provenance:w.provenance||null
   });put(e);
  }
  for(const o of g.openings){
   const w=wallmap.get(o.wallId);if(!w)throw Error("Dangling opening "+o.id);
   const a=localToWorld(nodes.get(w.a),level.transform),b=localToWorld(nodes.get(w.b),level.transform),L=dist(a,b);
   if(o.offset<0||o.offset+o.width>L+.005)throw Error("Opening outside wall "+o.id);
   const t=(o.offset+o.width/2)/L;
   const p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
   const ang=Math.atan2(b.z-a.z,b.x-a.x)*180/Math.PI;
   const e=addBox(elements,projectId+":"+level.id+":"+o.id,o.kind,o.kind==="door"?"IfcDoor":"IfcWindow",level.id,p.x,level.elevation+o.sill+o.height/2,p.z,o.width,o.height,Math.max(.06,w.thickness-.02),{
    source:o.source||"SOURCE_FLOORGRAPH_HOSTED_OPENING",status:o.status||"ASSUMED_DIMENSIONS",host:projectId+":"+level.id+":"+w.id,rotationDeg:ang,provenance:o.provenance||null
   });put(e);
  }
  for(const [id,name] of Object.entries(g.labels||{})){
   const e={id:projectId+":"+level.id+":"+id,kind:"space-label",ifcType:null,level:level.id,
    x:null,y:level.elevation,z:null,dx:null,dy:null,dz:null,
    source:"SEMANTIC_LABEL_NO_VERIFIED_BOUNDARY",status:"NOT_IFC_SPACE",name};
   elements.push(e);put(e);
  }
  const slabT=positive(manifest.structural.slabs.thickness,"slab thickness");
  const isGround=level===levels[0];
  const slab={id:projectId+":"+level.id+":SLAB",kind:"slab",ifcType:"IfcSlab",level:level.id,
   y:round(level.elevation-slabT/2),profile:world,holes:[],dy:slabT,x:null,z:null,
   source:"AREA_CALIBRATED_FLOOR_PLATE",status:"SCHEMATIC_THICKNESS",name:"Floor plate "+level.id,
    provenance:manifest.structural.slabs.provenance||null};
  if(!isGround&&manifest.stairs?.opening){
   const op=manifest.stairs.opening;
   const hole=[{x:op.x,z:op.z},{x:op.x+op.width,z:op.z},{x:op.x+op.width,z:op.z+op.depth},{x:op.x,z:op.z+op.depth}];
   if(hole.every(p=>inside(p,world)))slab.holes.push(hole);
   else diagnostics.push({severity:"ERROR",code:"STAIRWELL_OUTSIDE_SLAB",level:level.id,message:"Vertical stairwell void not contained by slab"});
  }
  elements.push(slab);put(slab);
  byLevel.set(level.id,{level,model,perimeter:world,area:round(square),newElements:elements.slice(start)});
  placements.push({id:level.id,name:level.name,elevation:level.elevation,transform:level.transform,area:round(square),sourceArea:level.sourceArea});
  if(Math.abs(level.transform.x)>0||Math.abs(level.transform.z)>0||level.transform.rotationDeg!==0)
   diagnostics.push({severity:"WARNING",code:"ASSUMED_LEVEL_REGISTRATION",level:level.id,message:"Local floor origin/rotation inferred; requires common grid or survey QA"});
 }
 const structure=manifest.structural,col=structure.columns,beam=structure.beams,slab=structure.slabs;
 const pointInLevel=(x,z,id)=>inside({x,z},byLevel.get(id).perimeter);
 const bx=[...col.gridX],bz=[...col.gridZ];
 if(bx.length<2||bz.length<2||bx.length>12||bz.length>12)throw Error("Column grid size invalid");
 for(const l of levels){
  const ceiling=l.elevation+l.height-slab.thickness;
  for(let ix=0;ix<bx.length;ix++)for(let iz=0;iz<bz.length;iz++){
   const x=bx[ix],z=bz[iz],grid="G"+(ix+1)+"-"+(iz+1);
   if(!pointInLevel(x,z,l.id)){
    diagnostics.push({severity:"INFO",code:"GRID_OUTSIDE_STOREY",level:l.id,message:grid+" omitted outside modeled slab; possible transfer must be checked"});
    continue;
   }
   const e=addBox(elements,projectId+":"+l.id+":COL:"+grid,"column","IfcColumn",l.id,x,l.elevation+(l.height-slab.thickness)/2,z,
    col.sizeX,l.height-slab.thickness,col.sizeZ,{source:col.source||"ASSUMED_STRUCTURAL_GRID_NOT_SOURCE_REGISTERED",status:"ENGINEERING_HOLD",name:"Column "+grid,provenance:col.provenance||null});put(e);
  }
  for(let zi=0;zi<bz.length;zi++)for(let xi=0;xi<bx.length-1;xi++){
   const x=(bx[xi]+bx[xi+1])/2,z=bz[zi],delta=bx[xi+1]-bx[xi];
   if(!pointInLevel(bx[xi],z,l.id)||!pointInLevel(bx[xi+1],z,l.id)||!pointInLevel(x,z,l.id))continue;
   const e=addBox(elements,projectId+":"+l.id+":BEAM-X:"+xi+"-"+zi,"beam","IfcBeam",l.id,x,ceiling-beam.depth/2,z,delta,beam.depth,beam.widthX,{
    source:col.source||"ASSUMED_STRUCTURAL_GRID_NOT_SOURCE_REGISTERED",status:"ENGINEERING_HOLD",name:"Beam X "+xi+"-"+zi,provenance:beam.provenance||null
   });put(e);
  }
  for(let xi=0;xi<bx.length;xi++)for(let zi=0;zi<bz.length-1;zi++){
   const x=bx[xi],z=(bz[zi]+bz[zi+1])/2,delta=bz[zi+1]-bz[zi];
   if(!pointInLevel(x,bz[zi],l.id)||!pointInLevel(x,bz[zi+1],l.id)||!pointInLevel(x,z,l.id))continue;
   const e=addBox(elements,projectId+":"+l.id+":BEAM-Z:"+xi+"-"+zi,"beam","IfcBeam",l.id,x,ceiling-beam.depth/2,z,beam.widthZ,beam.depth,delta,{
    source:col.source||"ASSUMED_STRUCTURAL_GRID_NOT_SOURCE_REGISTERED",status:"ENGINEERING_HOLD",name:"Beam Z "+xi+"-"+zi,provenance:beam.provenance||null
   });put(e);
  }
 }
 if(manifest.stairs?.opening){
  const op=manifest.stairs.opening,steps=manifest.stairs.risers||18;
  if(steps%2||steps<8||steps>36)throw Error("Stair risers need a bounded even count");
  for(let i=0;i<levels.length-1;i++){
   const l=levels[i],next=levels[i+1],rise=next.elevation-l.elevation;
   const perFlight=steps/2,stepRise=rise/steps,tread=op.depth/perFlight*.8;
   const flightWidth=Math.min(op.width/2-.09,.95),half=op.width/2;
   const flights=[];
   for(let flight=0;flight<2;flight++){
    const stepsGeom=[];
    for(let n=1;n<=perFlight;n++){
     const z=flight===0?op.z+(.09+tread*(n-.5)):op.z+op.depth-.09-tread*(n-.5);
     const x=op.x+(flight===0?flightWidth/2+.03:half+flightWidth/2+.03);
     const height=stepRise*(n+(flight?perFlight:0));
     stepsGeom.push({x,y:l.elevation+height/2,z,dx:flightWidth,dy:height,dz:tread*.92});
    }
    const stair={id:projectId+":"+l.id+":STAIR:FLIGHT-"+(flight+1),kind:"stair",ifcType:"IfcStairFlight",
     level:l.id,x:op.x+(flight===0?flightWidth/2:half+flightWidth/2),y:l.elevation+rise/2,z:op.z+op.depth/2,
     steps:stepsGeom,source:"USER_AUTHORIZED_METRIC_STAIR_SCHEME",status:"ENGINEERING_HOLD",name:"U-stair flight "+(flight+1),
     numberOfRisers:perFlight,riserHeight:stepRise,treadLength:tread,provenance:manifest.stairs.provenance||null};
    elements.push(stair);put(stair);flights.push(stair);
   }
   const landing=addBox(elements,projectId+":"+l.id+":STAIR:LANDING","landing","IfcSlab",l.id,
    op.x+op.width/2,l.elevation+rise/2-.075,op.z+op.depth-.27,
    op.width,.15,.54,{source:"USER_AUTHORIZED_METRIC_STAIR_SCHEME",status:"ENGINEERING_HOLD",name:"Mid-flight landing",provenance:manifest.stairs.landingProvenance||null});
   put(landing);
   diagnostics.push({severity:"WARNING",code:"STAIR_DESIGN_ASSUMED",level:l.id,message:steps+" risers at "+round(stepRise)+"m each; stair shape and structural support unverified"});
  }
 }
 const top=levels.at(-1),roofT=positive(slab.roofThickness||slab.thickness,"roof thickness");
 const roof={id:projectId+":ROOF",kind:"roof",ifcType:"IfcSlab",level:top.id,
  y:round(top.elevation+top.height+roofT/2),profile:byLevel.get(top.id).perimeter,
  holes:[],dy:roofT,x:null,z:null,name:"Conceptual roof plate",
  status:"ENGINEERING_HOLD",source:"MODEL_SF_OUTLINE_ASSUMED_ROOF",provenance:slab.roofProvenance||null};
 elements.push(roof);put(roof);
 // Inter-storey support must be visible as an audit, not asserted via floor area alone.
 const key=e=>round(e.x)+":"+round(e.z),colByLevel=new Map();
 for(const l of levels){colByLevel.set(l.id,new Set(elements.filter(e=>e.kind==="column"&&e.level===l.id).map(key)));}
 for(let i=1;i<levels.length;i++){
  for(const e of elements.filter(e=>e.kind==="column"&&e.level===levels[i].id)){
   if(!colByLevel.get(levels[i-1].id).has(key(e)))diagnostics.push({severity:"ERROR",code:"UNSUPPORTED_COLUMN",level:levels[i].id,message:e.id+" has no same-grid column below"});
  }
 }
 const structuralAlignment=auditAADStructuralRegistration(elements,levels,manifest);
 diagnostics.push(...structuralAlignment.diagnostics);
 diagnostics.push({severity:"WARNING",code:"ENGINEERING_UNVERIFIED",level:null,message:"Column/beam sections, spans, foundations and stair load path are assumed; source structural DXF not reconciled with member detail"});
 diagnostics.push({severity:"WARNING",code:"STOREY_ORIGINS_NOT_SURVEY_VERIFIED",level:null,message:"Floor transforms use an owner-approved metric hypothesis, not surveyed global coordinates"});
 const count={};for(const e of elements)count[e.kind]=(count[e.kind]||0)+1;
 return{schema:"jp-cad://aad-building-assembly/1",projectId,name:manifest.name||projectId,
  levels:placements,elements,diagnostics,structuralAlignment,counts:count,area:{source:round(areaSum.source),model:round(areaSum.model)},
  reviewStatus:"DRAFT_ENGINEERING_HOLD",manifest,qa:{ifcExportStatus:"NOT_VERIFIED_UNTIL_ROUNDTRIP"}};
}
export function verifyAssembly(assembly){
 const errors=assembly.diagnostics.filter(d=>d.severity==="ERROR");
 return{valid:!errors.length,errors,areaDeviation:round(assembly.area.model-assembly.area.source),
  counts:assembly.counts,assumptions:assembly.diagnostics.filter(d=>d.severity==="WARNING")};
}
