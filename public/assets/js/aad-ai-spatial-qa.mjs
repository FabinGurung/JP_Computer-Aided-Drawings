/* M17: Optional owner-specified spatial constraints.
 * Not a municipality bylaw engine; only verifies input geometry and explicitly
 * supplied limits. Room faces are graph candidates, not certified clear areas.
 */
import {derivePlanRooms} from "./aad-topology.mjs";
import {normalizeAADComponentEvidence} from "./aad-ai-authoring-qa.mjs";
const finite=(x,label)=>{if(typeof x!=="number"||!Number.isFinite(x))throw Error(label+" must be finite");return x;};
const positive=(x,label)=>{finite(x,label);if(x<=0)throw Error(label+" must be positive");return x;};
const convert=(p,t)=>{
 const a=t.rotationDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return{x:p[0]*c-p[1]*s+t.x,z:p[0]*s+p[1]*c+t.z};
};
const checks=()=>({status:"PASSED_USER_INPUT_NOT_MUNICIPAL_OR_ENGINEERING_APPROVAL"});
export function checkAADArchitecturalConstraints(spec,levelItems,models,sources){
 const c=spec.constraints||{},out=[];
 const levelById=new Map(levelItems.map(x=>[x.id,x]));
 if(c.site!==undefined){
  const site=c.site,b=site?.bounds,st=site?.setbacks;
  if(!b||!st)throw Error("Site constraints require explicit world XZ bounds and four setbacks");
  const keys=["minX","maxX","minZ","maxZ"];
  const limits=Object.fromEntries(keys.map(k=>[k,finite(b[k],"site bounds "+k)]));
  const setbacks=Object.fromEntries(keys.map(k=>[k,finite(st[k],"setback "+k)]));
  if(keys.some(k=>setbacks[k]<0))throw Error("Setbacks cannot be negative");
  if(limits.maxX<=limits.minX||limits.maxZ<=limits.minZ)throw Error("Invalid site rectangle");
  const inner={minX:limits.minX+setbacks.minX,maxX:limits.maxX-setbacks.maxX,
   minZ:limits.minZ+setbacks.minZ,maxZ:limits.maxZ-setbacks.maxZ};
  if(inner.minX>=inner.maxX||inner.minZ>=inner.maxZ)
   throw Error("Owner setbacks consume entire site");
  const assumed={basis:"ai-inferred",rationale:"Provided rectangular site/setbacks not independently surveyed or checked against code"};
  const provenance=normalizeAADComponentEvidence(site.provenance,assumed,sources,"site/setbacks",spec.publication.mode);
  for(const l of levelItems){
   const input=spec.levels.find(x=>x.id===l.id);
   for(const p of input.outline){
    const w=convert(p,l.transform);
    if(w.x<inner.minX-.00001||w.x>inner.maxX+.00001||w.z<inner.minZ-.00001||w.z>inner.maxZ+.00001)
     throw Error("Level "+l.id+" breaches user-specified setback envelope");
   }
  }
  const plotArea=(limits.maxX-limits.minX)*(limits.maxZ-limits.minZ);
  out.push({code:"OWNER_SITE_RECTANGLE_SETBACKS",siteAreaM2:Math.round(plotArea*1000)/1000,
   buildableBounds:inner,provenance,...checks()});
  if(c.maxSiteCoverageRatio!==undefined){
   const ratio=positive(c.maxSiteCoverageRatio,"maxSiteCoverageRatio");
   if(ratio>1)throw Error("maxSiteCoverageRatio must not exceed 1");
   const ground=levelItems[0],coverage=ground.sourceArea/plotArea;
   if(coverage>ratio+.000001)throw Error("Ground floor exceeds user-specified site coverage");
   out.push({code:"OWNER_MAX_SITE_COVERAGE",limitRatio:ratio,
    calculatedRatio:Math.round(coverage*10000)/10000,...checks()});
  }
 }else if(c.maxSiteCoverageRatio!==undefined)throw Error("Site coverage requires owner-specified site bounds");
 const roomRules=["minRoomFaceAreaM2","minRoomFaceBBoxSpanM","minDoorsPerBoundedRoom"];
 const hasRooms=roomRules.some(k=>c[k]!==undefined);
 if(hasRooms){
  if(c.minRoomFaceAreaM2!==undefined)positive(c.minRoomFaceAreaM2,"minRoomFaceAreaM2");
  if(c.minRoomFaceBBoxSpanM!==undefined)positive(c.minRoomFaceBBoxSpanM,"minRoomFaceBBoxSpanM");
  if(c.minDoorsPerBoundedRoom!==undefined&&(!Number.isInteger(c.minDoorsPerBoundedRoom)||c.minDoorsPerBoundedRoom<0||c.minDoorsPerBoundedRoom>8))
   throw Error("minDoorsPerBoundedRoom must be an integer from 0 to 8");
  let roomsTotal=0;
  for(const [level,model] of Object.entries(models)){
   const g=model.floorGraph,nodes=new Map(g.nodes.map(n=>[n.id,n])),
    walls=g.walls,rooms=derivePlanRooms(g);
   if(!rooms.length)throw Error("No derived room faces on "+level+" for room/access checks");
   for(const face of rooms){
    roomsTotal++;
    const poly=face.nodes.map(k=>nodes.get(k));
    const spanX=Math.max(...poly.map(p=>p.x))-Math.min(...poly.map(p=>p.x));
    const spanZ=Math.max(...poly.map(p=>p.z))-Math.min(...poly.map(p=>p.z));
    if(c.minRoomFaceAreaM2!==undefined&&face.area<c.minRoomFaceAreaM2-.00001)
     throw Error(level+"/"+face.id+" below user-specified room-face area");
    if(c.minRoomFaceBBoxSpanM!==undefined&&Math.min(spanX,spanZ)<c.minRoomFaceBBoxSpanM-.00001)
     throw Error(level+"/"+face.id+" below user-specified room-face bounding span");
    const boundary=new Set();
    for(let i=0;i<face.nodes.length;i++){
     const a=face.nodes[i],b=face.nodes[(i+1)%face.nodes.length],
      w=walls.find(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a));
     if(w)boundary.add(w.id);
    }
    const doorCount=g.openings.filter(o=>o.kind==="door"&&boundary.has(o.wallId)).length;
    if(c.minDoorsPerBoundedRoom!==undefined&&doorCount<c.minDoorsPerBoundedRoom)
     throw Error(level+"/"+face.id+" has insufficient modeled boundary doors");
   }
  }
  out.push({code:"OWNER_ROOM_FACE_AND_DOOR_TOPOLOGY",facesChecked:roomsTotal,
   note:"Bounding-box span is not certified clear room width; a modeled door is not an approved egress route",
   ...checks()});
 }
 return out;
}
