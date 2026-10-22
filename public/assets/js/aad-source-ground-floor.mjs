/* Reusable source-ledger ground-floor preview compiler.
 * Independent of the legacy AI rectangular structural grid.
 * REVIEW geometry only: no assumptions of verified structural dimensions.
 */
const requireText=(v,l)=>{if(typeof v!=="string"||!v.trim())throw Error("Missing "+l);return v;};
const finite=(v,l)=>{const n=Number(v);if(!Number.isFinite(n))throw Error("Invalid "+l);return n;};
const round=x=>Math.round(x*1e6)/1e6;
export function createSourceGroundFloorReview(input){
 if(input?.schema!=="jp-cad://aad-source-gf-review/1")throw Error("Invalid source GF schema");
 const registration=input.registration||{},translation=registration.structuralToArchitecturalMM||{},origin=registration.originArchitecturalMM||{};
 for(const k of ["dx","dy"])finite(translation[k],k);
 for(const k of ["x","y"])finite(origin[k],k);
 if(registration.scale!==1||registration.rotationDeg!==0)throw Error("This registered review requires native unit scale and zero rotation");
 const arch=(x,y)=>({x:round((finite(x,"archX")-origin.x)/1000),z:round((origin.y-finite(y,"archY"))/1000)});
 const struct=(x,y)=>arch(finite(x,"structX")+translation.dx,finite(y,"structY")+translation.dy);
 const toPair=(arr,i,l)=>{if(!Array.isArray(arr)||arr.length<=i)throw Error(l+" missing tuple");return finite(arr[i],l);};
 const originId=new Set();
 const add=(out,e)=>{requireText(e.id,"element ID");if(originId.has(e.id))throw Error("Duplicate structural/architectural review ID "+e.id);originId.add(e.id);out.push(e);};
 const elements=[];
 const columns=new Map();
 for(const [id,grid,type,x,y,textHandle,footingHandle] of input.columns){
  const point=struct(x,y);
  const el={id,kind:"column",grid,type,x:point.x,z:point.z,
   label:grid+" · "+type,source:{file:"STRUCTURAL_DXF",entityHandle:textHandle,sourceMM:[x,y],footingHandle},
   status:"DXF_DERIVED_COLUMN_CANDIDATE_NOT_ENGINEER_APPROVED"};
  add(elements,el);columns.set(id,el);
 }
 for(const [id,handle,type,x,y,dx,dz,attached,conflict] of input.footings){
  const point=struct(x,y),links=requireText(attached,"footing columns").split(",");
  for(const c of links)if(!columns.has(c))throw Error("Footing "+id+" references unknown "+c);
  if(!(dx>0&&dz>0))throw Error("Invalid footing footprint "+id);
  add(elements,{id,kind:"footing",type,x:point.x,z:point.z,dx:finite(dx,id+" width"),dz:finite(dz,id+" depth"),
   columnIds:links,label:type+" "+id.slice(3),conflict:conflict===1,
   source:{file:"STRUCTURAL_DXF",entityHandle:handle,sourceMM:[x,y]},
   status:conflict===1?"HOLD_CONFLICT_G1_DRAWN_1800_SCHEDULE_IF3_2100":"DXF_DRAWN_FOOTING_OUTLINE_CANDIDATE"});
 }
 for(const [id,edges,ax,ay,bx,by,width] of input.beams){
  const a=struct(ax,ay),b=struct(bx,by);
  if(Math.hypot(a.x-b.x,a.z-b.z)<.1)throw Error("Degenerate beam "+id);
  add(elements,{id,kind:"beam",ax:a.x,az:a.z,bx:b.x,bz:b.z,
   x:round((a.x+b.x)/2),z:round((a.z+b.z)/2),width:finite(width,"beam width"),
   label:id,source:{file:"STRUCTURAL_DXF",entityHandles:edges.split(","),nativeLineMM:[ax,ay,bx,by]},
   status:"PAIRED_EDGE_CANDIDATE_SECTION_DEPTH_AND_CONNECTIVITY_UNVERIFIED"});
 }
 for(const [handle,ax,ay,bx,by] of input.architectureLines){
  const a=arch(ax,ay),b=arch(bx,by);
  add(elements,{id:"AW-"+handle,kind:"architectural-line",
   ax:a.x,az:a.z,bx:b.x,bz:b.z,x:round((a.x+b.x)/2),z:round((a.z+b.z)/2),
   label:"Architectural wall edge "+handle,
   source:{file:"ARCHITECTURAL_DXF",entityHandle:handle,nativeLineMM:[ax,ay,bx,by]},
   status:"DIRECT_DXF_WALL_EDGE_PARTIAL_SOURCE_PASS_NOT_FULL_CLOSED_GRAPH"});
 }
 for(const [handle,points] of input.architecturePolylines||[]){
  if(!Array.isArray(points)||points.length<2||points.length>100)throw Error("Invalid architectural polyline "+handle);
  for(let i=0;i<points.length-1;i++){
   const [ax,ay]=points[i],[bx,by]=points[i+1];
   const a=arch(ax,ay),b=arch(bx,by);
   add(elements,{id:"AWP-"+handle+"-"+String(i).padStart(2,"0"),kind:"architectural-line",
    ax:a.x,az:a.z,bx:b.x,bz:b.z,x:round((a.x+b.x)/2),z:round((a.z+b.z)/2),
    label:"Architectural wall polyline "+handle+" · segment "+(i+1),
    source:{file:"ARCHITECTURAL_DXF",entityHandle:handle,subentitySegmentIndex:i,nativeLineMM:[ax,ay,bx,by]},
    status:"DIRECT_DXF_WALL_POLYLINE_SEGMENT_PENDING_CLOSED_GRAPH"});
  }
 }
 const counts=Object.fromEntries(["column","footing","beam","architectural-line"].map(kind=>[kind,elements.filter(e=>e.kind===kind).length]));
 const expected=input.countsExpected||{};
 if(expected.columns!==undefined&&counts.column!==expected.columns)throw Error("Source column count contract failed");
 if(expected.isolatedFootings!==undefined&&expected.combinedFootings!==undefined&&
  counts.footing!==expected.isolatedFootings+expected.combinedFootings)
  throw Error("Source footing count contract failed");
 if(expected.groundFloorBeamCandidateSegments!==undefined&&counts.beam!==expected.groundFloorBeamCandidateSegments)
  throw Error("Source beam count contract failed");
 if(expected.directSourceArchitecturalLines!==undefined&&expected.directSourceArchitecturalPolylineSegments!==undefined&&
   counts["architectural-line"]!==expected.directSourceArchitecturalLines+expected.directSourceArchitecturalPolylineSegments)
  throw Error("Source architectural edge count contract failed");
 if(expected.combinedFootings!==undefined&&
   elements.filter(e=>e.kind==="footing"&&e.type==="CF1").length!==expected.combinedFootings)
  throw Error("Combined footing count mismatch");
 const conflicts=elements.filter(e=>e.conflict);
 const expectedConflicts=(input.issues||[]).filter(i=>i.footingHandle&&i.scheduledM);
 if(expectedConflicts.length!==conflicts.length)throw Error("Footing source-conflict count mismatch");
 for(const issue of expectedConflicts){
  const f=conflicts.find(e=>e.source.entityHandle===issue.footingHandle);
  if(!f||!issue.drawnM.every((v,i)=>Math.abs(v-[f.dx,f.dz][i])<1e-6))
   throw Error("Footing conflict native footprint/handle does not match source record");
 }
 const all=elements.flatMap(e=>Number.isFinite(e.ax)?[[e.ax,e.az],[e.bx,e.bz]]:[[e.x,e.z]]);
 const bounds={minX:Math.min(...all.map(p=>p[0])),maxX:Math.max(...all.map(p=>p[0])),
  minZ:Math.min(...all.map(p=>p[1])),maxZ:Math.max(...all.map(p=>p[1]))};
 if([bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ].some(v=>v>100))throw Error("Source registration outside expected plot extent");
 return{schema:"jp-cad://aad-source-gf-assembly/1",projectId:input.projectId,
  name:input.name,phase:"GROUND_FLOOR_SOURCE_REVIEW_ONLY",stage:"ENGINEERING_HOLD",
  productionApproved:false,sourceAuthority:input.sourceAuthority,
  registration,counts,bounds,elements,issues:input.issues||[],disclaimer:
   "Original DXF-derived source candidates, not a certified structural model. CAD element fidelity and floor/beam connectivity require further QA. No IFC, construction approval, or live BIM replacement."};
}
