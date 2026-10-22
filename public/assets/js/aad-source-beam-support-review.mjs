/* Non-certified source-beam endpoint proximity audit for arbitrary DXF source ledgers.
 * The nearest column is NOT necessarily its bearing support: no connectivity,
 * member schedule, reinforcement, elevation or load-path approval is implied.
 */
const rounded=value=>Math.round(value*1000)/1000;
export function reviewSourceBeamEndpoints(elements,{toleranceM=.5}={}){
 if(!(Number.isFinite(toleranceM)&&toleranceM>0&&toleranceM<=2))
  throw Error("Beam review tolerance must be >0 and <=2 metres");
 if(!Array.isArray(elements))throw Error("Source elements array required");
 const columns=elements.filter(e=>e.kind==="column");
 const beams=elements.filter(e=>e.kind==="beam");
 if(!columns.length&&beams.length)throw Error("Cannot review beam endpoints without sourced column candidates");
 const seen=new Set(),details=[];
 const nearest=(p,side,beamId)=>{
  const rows=columns.map(c=>({columnId:c.id,distanceM:Math.hypot(p.x-c.x,p.z-c.z)}))
   .sort((a,b)=>a.distanceM-b.distanceM||a.columnId.localeCompare(b.columnId));
  const candidate=rows[0];
  return{beamId,end:side,nearestColumnId:candidate?.columnId||null,
   distanceM:candidate?rounded(candidate.distanceM):null,
   withinDisplayTolerance:Boolean(candidate&&candidate.distanceM<=toleranceM+1e-9),
   status:"POTENTIAL_PROXIMITY_ONLY_SUPPORT_NOT_VERIFIED"};
 };
 for(const b of beams){
  if(seen.has(b.id))throw Error("Duplicate beam source ID "+b.id);
  seen.add(b.id);
  for(const key of ["ax","az","bx","bz"])if(!Number.isFinite(b[key]))throw Error("Beam endpoint missing "+b.id+"/"+key);
  details.push(nearest({x:b.ax,z:b.az},"A",b.id),nearest({x:b.bx,z:b.bz},"B",b.id));
 }
 const needsReview=details.filter(e=>!e.withinDisplayTolerance);
 return{schema:"jp-cad://aad-source-beam-endpoint-review/1",beamCount:beams.length,
  endpoints:details.length,withinTolerance:details.length-needsReview.length,
  beyondTolerance:needsReview.length,toleranceM,details,
  reviewStatus:"ENGINEERING_HOLD_NOT_A_BEAM_SUPPORT_GRAPH",
  interpretation:"Proximity only; edge-pair segments, true member endpoints and load paths remain unverified."};
}
