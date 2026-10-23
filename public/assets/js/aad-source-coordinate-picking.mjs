/* Reusable, read-only CAD source-coordinate picking helpers.
 * Registered world X/Z is in metres. Crossings of EXTENDED beam candidate
 * centrelines are interpretation proposals, not source columns or connections.
 */
const round6=x=>Math.round(x*1e6)/1e6;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function pointDistanceToSegment(p,a,b){
 const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
 if(den<1e-15)return distance(p,a);
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/den));
 return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
}
export function findProjectedBeamCrossing(elements,beamAId,beamBId,{maxExtensionM=.5}={}){
 const supported=new Set(["beam","plinth-beam"]);
 const a=elements.find(e=>e.id===beamAId&&supported.has(e.kind));
 const b=elements.find(e=>e.id===beamBId&&supported.has(e.kind));
 if(!a||!b||a.id===b.id)throw Error("Two distinct source beam candidates required");
 const ax=a.ax,az=a.az,bx=b.ax,bz=b.az,rx=a.bx-a.ax,rz=a.bz-a.az,
  sx=b.bx-b.ax,sz=b.bz-b.az,det=rx*sz-rz*sx;
 const la=Math.hypot(rx,rz),lb=Math.hypot(sx,sz);
 if(la<.01||lb<.01||Math.abs(det)/(la*lb)<.05)throw Error("Beam candidates parallel or poorly conditioned");
 const qx=bx-ax,qz=bz-az,t=(qx*sz-qz*sx)/det,u=(qx*rz-qz*rx)/det;
 const outside=v=>v<0?-v:v>1?v-1:0;
 const extensionA=outside(t)*la,extensionB=outside(u)*lb;
 const x=ax+t*rx,z=az+t*rz;
 return{
  beamIds:[beamAId,beamBId],x:round6(x),z:round6(z),
  extensionA_m:round6(extensionA),extensionB_m:round6(extensionB),
  onBothOriginalSegments:extensionA<1e-8&&extensionB<1e-8,
  withinReviewExtensionLimit:extensionA<=maxExtensionM+1e-9&&extensionB<=maxExtensionM+1e-9,
  status:"PROJECTED_BEAM_LINE_INTERSECTION_NOT_VERIFIED_DXF_JOINT",
  interpretation:"Intersecting extended source candidate centrelines is a review proposal; it does not replace the DXF column or establish beam bearing."
 };
}
export function nearestSourceElements(elements,position,limit=4){
 if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))throw Error("Finite world X/Z required");
 const arr=elements.filter(e=>e.kind==="beam"||e.kind==="plinth-beam"||e.kind==="column").map(e=>{
  const d=e.kind==="column"?Math.hypot(position.x-e.x,position.z-e.z):
   pointDistanceToSegment(position,{x:e.ax,z:e.az},{x:e.bx,z:e.bz});
  return{elementId:e.id,kind:e.kind,distanceM:round6(d)};
 });
 return arr.sort((a,b)=>a.distanceM-b.distanceM||a.elementId.localeCompare(b.elementId)).slice(0,limit);
}
export function worldXZToNativeStructuralMM(registration,position){
 if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))throw Error("Finite world X/Z required");
 if(registration?.scale!==1||registration?.rotationDeg!==0)throw Error("Unverified registration transform");
 const o=registration.originArchitecturalMM,t=registration.structuralToArchitecturalMM;
 return{
  x:round6(o.x+position.x*1000-t.dx),
  y:round6(o.y-position.z*1000-t.dy)
 };
}
