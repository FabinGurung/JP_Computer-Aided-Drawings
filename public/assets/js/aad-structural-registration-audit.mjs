/* AAD architectural/structural placement review — NOT engineering design QA.
 * Compare column centers to the current modeled wall CENTERLINES in world X/Z.
 * Proximity neither proves correctness nor requires all columns to sit on walls:
 * transfer beams, columns in open spaces, wall offsets may be intentional.
 */
const round=n=>Math.round(n*1000)/1000;
const wallEndpoints=e=>{
 const a=(e.rotationDeg||0)*Math.PI/180,u={x:Math.cos(a)*e.dx/2,z:Math.sin(a)*e.dx/2};
 return [{x:e.x-u.x,z:e.z-u.z},{x:e.x+u.x,z:e.z+u.z}];
};
const segmentDistance=(p,a,b)=>{
 const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
 if(den<=1e-12)return Math.hypot(p.x-a.x,p.z-a.z);
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/den));
 return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
};
export function auditAADStructuralRegistration(elements,levels,manifest,{reviewToleranceM=.2,sourceReviewed=false,sourceOrigin=null}={}){
 if(!(reviewToleranceM>0&&reviewToleranceM<=1))throw Error("AAD review tolerance must be positive and no greater than 1m");
 const byLevel=[],details=[],beams=[],diagnostics=[];
 const origin=sourceOrigin||manifest.structural?.columns?.source||"STRUCTURAL_GRID_SOURCE_UNSPECIFIED";
 for(const level of levels){
  const cols=elements.filter(e=>e.kind==="column"&&e.level===level.id);
  const walls=elements.filter(e=>e.kind==="wall"&&e.level===level.id);
  const reviewed=cols.map(c=>{
   const nearest=walls.map(w=>{
    const [a,b]=wallEndpoints(w);return{id:w.id,metres:segmentDistance(c,a,b)};
   }).sort((a,b)=>a.metres-b.metres)[0]||null;
   return{elementId:c.id,level:level.id,worldX:c.x,worldZ:c.z,nearestWallId:nearest?.id||null,
    distanceToWallCenterlineM:nearest?round(nearest.metres):null,
    proximityWithinReviewTolerance:nearest?nearest.metres<=reviewToleranceM+1e-9:false,
    reviewStatus:"NOT_STRUCTURALLY_VERIFIED"};
  });
  details.push(...reviewed);
  const beamRows=elements.filter(e=>e.kind==="beam"&&e.level===level.id).map(e=>{
   const near=walls.map(w=>{
    const [a,b]=wallEndpoints(w);return{id:w.id,metres:segmentDistance({x:e.x,z:e.z},a,b)};
   }).sort((a,b)=>a.metres-b.metres)[0]||null;
   return{elementId:e.id,level:level.id,nearestWallId:near?.id||null,
    centreDistanceToWallM:near?round(near.metres):null,
    note:"Beam midpoint proximity is NOT proof of support, continuous alignment or code compliance"};
  });
  beams.push(...beamRows);
  const distant=reviewed.filter(c=>c.distanceToWallCenterlineM===null||c.distanceToWallCenterlineM>reviewToleranceM);
  byLevel.push({level:level.id,columns:cols.length,withinReviewTolerance:cols.length-distant.length,
   beyondReviewTolerance:distant.length,beams:beamRows.length,beamMidpointsBeyondTolerance:beamRows.filter(b=>b.centreDistanceToWallM===null||b.centreDistanceToWallM>reviewToleranceM).length});
  // This is a review need, not an ERROR: detached columns can be legitimate.
  if(distant.length)diagnostics.push({severity:"WARNING",code:"COLUMN_WALL_REGISTRATION_REVIEW",level:level.id,
   message:distant.length+"/"+cols.length+" column centres are farther than "+reviewToleranceM+
   "m from modelled wall centre-lines. Grid source: "+origin+
   ". Check structural DXF datum, floor registration and intended freestanding columns; DO NOT snap automatically."});
 }
 if(details.length)diagnostics.push(sourceReviewed?
   {severity:"WARNING",code:"SOURCE_STRUCTURAL_ARCHITECTURAL_REGISTRATION_HOLD",level:null,
    message:"Columns/beams originate from owner-reviewed DXF/M70 records; the main architectural wall graph remains area-calibrated and lacks exact datum confirmation. Geometry parity is not engineering certification."}:
   {severity:"WARNING",code:"STRUCTURAL_GRID_PROVENANCE_REVIEW",level:null,
    message:"Columns and beams were assembled from the manifest structural grid, not extracted/verified from the cited DXF. 2D/3D/table parity is not alignment approval."});
 return{schema:"jp-cad://aad-structural-registration-review/1",
  kind:"geometric-proximity-audit-not-code-check",
  gridOrigin:origin,sourceStructuralDrawingId:manifest.sourceAuthority?.structuralDxfDriveId||null,
  axes:"BUILDING_WORLD_XZ_METRES",reviewToleranceM,levels:byLevel,columns:details,beams,
  approval:"ENGINEERING_HOLD",recommendedAction:"RECONCILE_CITED_STRUCTURAL_DXF_TO_ARCHITECTURAL_DATUM_BEFORE_MOVING_GRID",
  diagnostics};
}
