/* M26 shared AAD adapter: source-reviewed structure -> canonical building elements.
 * Works for any project matching source project ID; never mutates stage payloads.
 * GF placement and member heights are explicit schematic review assumptions.
 * IFC records, when emitted, remain conceptual geometry, never engineering sign-off.
 */
const round=n=>Math.round(n*1e6)/1e6;
const check=(cond,msg)=>{if(!cond)throw Error("AAD M26 review structure: "+msg)};
const finite=(n,label)=>{check(Number.isFinite(n),label+" nonnumeric");return n};
const circle=(x,z,r)=>Array.from({length:36},(_,i)=>{
 const a=2*Math.PI*i/36;return{x:round(x+r*Math.cos(a)),z:round(z+r*Math.sin(a))};
});
export function buildAADReviewedStructure(manifest,qa,m70){
 check(manifest?.projectId===qa?.projectId&&qa?.projectId===m70?.projectId,"project mismatch");
 check(manifest.levels?.[0]?.id==="gf"&&manifest.levels[0].elevation===0,
  "ground-floor datum is not zero; cannot place user geometry");
 check(qa.status==="ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION"&&qa.engineeringApproval===false,
  "QA cannot be used as a certified building model");
 check(qa.columns?.length===23&&qa.footings?.length===21&&m70.records?.length===16,
  "source counts changed; reject reassembly");
 const reviewStatus="USER_AUTHORIZED_SOURCE_GEOMETRY__ENGINEERING_HOLD";
 const cols=qa.columns.map(c=>{
  finite(c.x,"column X");finite(c.z,"column Z");
  const circular=Boolean(c.circular),width=finite(c.width,"column width");
  check(width>.2&&width<.6,"source column section unbounded");
  return{id:manifest.projectId+":gf:QA-COL:"+c.grid,kind:"column",ifcType:"IfcColumn",
   level:"gf",x:c.x,z:c.z,y:1.40,dx:width,dy:2.80,dz:width,rotationDeg:0,
   name:"QA "+c.grid+" "+c.section,source:c.source.file,status:reviewStatus,
   previewOnly:true,geometryVerticalBasis:"SCHEMATIC GF 2.80M HEIGHT NOT DXF STAGE DESIGN",
   geometryPlanBasis:"DXF preferred column centres; owner-reviewed I3 relocation",
   profile:circular?circle(c.x,c.z,width/2):null,holes:[],
   provenance:{basis:"user-reviewed-dxf-source",sourceId:c.source.dxfId||c.source.originalDXFColumnId,
    grid:c.grid,section:c.section,qaId:c.id,approval:"USER_MESSAGE_ONLY",
    engineeringStatus:"HOLD",sourceElement:c.source}};
 });
 const pads=qa.footings.map(f=>{
  finite(f.x,"footing X");finite(f.z,"footing Z");
  check(f.dx>1&&f.dz>1&&f.dx<5&&f.dz<5,"footing footprint outside expected bounds");
  return{id:manifest.projectId+":gf:QA-FOOT:"+f.id,kind:"footing",ifcType:"IfcFooting",
   level:"gf",x:f.x,z:f.z,y:-.25,dx:f.dx,dy:.30,dz:f.dz,rotationDeg:0,
   name:f.label,source:f.source.file,status:reviewStatus,previewOnly:true,
   geometryVerticalBasis:"SCHEMATIC footing slab 0.30m thick at -0.25m; real founding depth unverified",
   geometryPlanBasis:"Original DXF drawn footing outlines, owner-reviewed",
   provenance:{basis:"user-reviewed-dxf-footing",sourceId:f.source.dxfId,
    grid:f.grid,qaId:f.id,orphanIds:f.orphanOriginalColumnIds,
    engineeringStatus:f.status,stageComparison:f.stageComparison,
    excavationWorkingArea:f.excavationWorkingArea,approval:"USER_MESSAGE_ONLY"}};
 });
 const beams=m70.records.map(b=>{
  const dx=b.bx-b.ax,dz=b.bz-b.az,len=Math.hypot(dx,dz);
  check(len>.2&&Number.isFinite(len),"invalid source beam run");
  return{id:manifest.projectId+":gf:QA-BEAM:"+b.id,kind:"beam",ifcType:"IfcBeam",
   level:"gf",x:b.x,z:b.z,y:0,dx:round(len),dy:.30,dz:.23,
   rotationDeg:round(Math.atan2(dz,dx)*180/Math.PI),
   name:"M70 GF/plinth "+b.id+" · "+b.fromGrid+" to "+b.toGrid,
   source:b.source.file,status:reviewStatus,previewOnly:true,
   geometryVerticalBasis:"M70 beam 230×300mm plan/section sourced; 3D vertical centroid 0.00 is illustrative",
   provenance:{basis:"m70-frozen-source",sourceId:b.id,fromGrid:b.fromGrid,toGrid:b.toGrid,
    sourceMM:b.source.sourceMM,engineeringStatus:"HOLD",approval:"USER_MESSAGE_ONLY"}};
 });
 const ids=new Set(),all=[...cols,...pads,...beams];
 for(const e of all){check(!ids.has(e.id),"duplicate element id "+e.id);ids.add(e.id);}
 check(cols.some(e=>e.provenance.grid==="I3")&&!cols.some(e=>e.provenance.grid==="I4"),
   "owner I3/I4 proposal drifted");
 return{schema:"jp-cad://aad-reviewed-structural-assembly/1",projectId:manifest.projectId,
  reviewStatus:"ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION",userAuthorization:"M25_RECORDED",
  sourcePriority:"M70_BEAMS_DXF_COLUMNS_DXF_FOOTING_OUTLINES",
  expected:{columns:23,beams:16,footings:21},
  notes:[
   "GF-only source-backed review model. No invented source-confirmed upper-storey columns/beams",
   "Architectural source-to-review datum is provisional; GF area-calibrated wall vertices have measurable registration residuals",
   "Column heights, footing thickness/depth and exact vertical beam placements remain schematic",
   "I3 footing and load-path, orphaned combined footing support, and G1 concrete/excavation/rebar dimensions unresolved"
  ],elements:all};
}
