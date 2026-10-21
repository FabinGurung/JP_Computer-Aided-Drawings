/* M16: deterministic, non-codal AI design provenance and owner-specified constraints.
 * This is authoring QA, not source authentication, zoning certification or engineering approval.
 */
const EPS=1e-7;
const finite=(v,label)=>{
 if(typeof v!=="number"||!Number.isFinite(v))throw Error(label+" must be a finite number");
 return v;
};
const positive=(v,label)=>{
 finite(v,label);
 if(v<=0)throw Error(label+" must be positive");
 return v;
};
const required=(v,label,max=240)=>{
 if(typeof v!=="string"||!v.trim()||v.length>max)throw Error("Invalid "+label);
 return v.trim();
};
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const pointOn=(p,a,b)=>{
 const d2=(b.x-a.x)**2+(b.z-a.z)**2;
 if(d2<EPS*EPS)return Math.hypot(p.x-a.x,p.z-a.z)<EPS;
 const t=((p.x-a.x)*(b.x-a.x)+(p.z-a.z)*(b.z-a.z))/d2;
 return t>=-EPS&&t<=1+EPS&&Math.abs(cross(a,b,p))/Math.sqrt(d2)<EPS;
};
const inPolygon=(p,poly)=>{
 if(poly.some((v,i)=>pointOn(p,v,poly[(i+1)%poly.length])))return true;
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a.z>p.z)!==(b.z>p.z) && p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 return inside;
};
const properCross=(a,b,c,d)=>{
 const s1=cross(a,b,c),s2=cross(a,b,d),s3=cross(c,d,a),s4=cross(c,d,b);
 return ((s1>EPS&&s2< -EPS)||(s1< -EPS&&s2>EPS))&&
        ((s3>EPS&&s4< -EPS)||(s3< -EPS&&s4>EPS));
};
function polygon(raw,label){
 if(!Array.isArray(raw)||raw.length<3||raw.length>80)throw Error(label+" needs 3..80 vertices");
 const out=raw.map((p,i)=>{
  if(!Array.isArray(p)||p.length!==2)throw Error("Invalid "+label+" vertex "+i);
  return{x:finite(p[0],label+" X"),z:finite(p[1],label+" Z")};
 });
 for(let i=0;i<out.length;i++){
  const a=out[i],b=out[(i+1)%out.length];
  if(Math.hypot(a.x-b.x,a.z-b.z)<.25)throw Error(label+" has a degenerate edge");
  for(let j=i+1;j<out.length;j++){
   if(j===(i+1)%out.length||(i===0&&j===out.length-1))continue;
   if(properCross(a,b,out[j],out[(j+1)%out.length]))
    throw Error(label+" is self-intersecting");
  }
 }
 const area=out.reduce((sum,a,i)=>{const b=out[(i+1)%out.length];return sum+a.x*b.z-b.x*a.z;},0)/2;
 if(area<1)throw Error(label+" must be counterclockwise and exceed 1 square metre");
 return out;
}
const world=(p,t)=>{
 const a=(t.rotationDeg??0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return{x:p.x*c-p.z*s+(t.x??0),z:p.x*s+p.z*c+(t.z??0)};
};
function checkInside(poly,envelope,levelId){
 for(const p of poly)if(!inPolygon(p,envelope))
  throw Error("Level "+levelId+" exceeds owner-specified buildable envelope");
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];
  const mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
  if(!inPolygon(mid,envelope))
   throw Error("Level "+levelId+" crosses outside owner-specified buildable envelope");
  for(let j=0;j<envelope.length;j++){
   if(properCross(a,b,envelope[j],envelope[(j+1)%envelope.length]))
    throw Error("Level "+levelId+" crosses owner-specified buildable envelope boundary");
  }
 }
}
export function checkAADAuthoring(spec,levelItems){
 const mode=spec.publication?.mode;
 const sources=spec.sources??[];
 if(!Array.isArray(sources)||sources.length>60)throw Error("sources must be a list of at most 60 records");
 const ids=new Set();
 const normalizedSources=sources.map((s,i)=>{
  const id=required(s?.id,"source id "+i,64);
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)||ids.has(id))throw Error("Duplicate or invalid AAD source ID "+id);
  ids.add(id);
  if(!["dxf","pdf","drawing","document","other"].includes(s.kind))throw Error("Invalid AAD source kind "+id);
  return{id,kind:s.kind,reference:required(s.reference,"source reference "+id,400)};
 });
 if(mode==="owner-approved-public"&&spec.evidence?.kind==="synthetic")
  throw Error("Real owner-approved project cannot claim synthetic-only evidence");
 const levelEvidence=levelItems.map(l=>{
  const input=spec.levels.find(v=>v.id===l.id);
  const e=input.geometryProvenance??(mode==="synthetic-demo"?{basis:"synthetic"}:null);
  if(!e||!["synthetic","source-referenced","ai-inferred"].includes(e.basis))
   throw Error("Level "+l.id+" needs explicit geometryProvenance basis");
  if(mode==="owner-approved-public"&&e.basis==="synthetic")
   throw Error("Real owner-approved level "+l.id+" cannot be labeled synthetic");
  if(e.basis==="synthetic"){
   if(mode!=="synthetic-demo")throw Error("Synthetic provenance requires synthetic publication mode");
   return{level:l.id,basis:e.basis,status:"SYNTHETIC_NOT_SITE_MEASURED"};
  }
  if(e.basis==="ai-inferred")
   return{level:l.id,basis:e.basis,rationale:required(e.rationale,"AI inference rationale "+l.id,500),
     status:"AI_INFERRED_NOT_SOURCE_VERIFIED"};
  const id=required(e.sourceId,"source ID for level "+l.id,64);
  if(!ids.has(id))throw Error("Unknown source ID "+id+" for level "+l.id);
  return{level:l.id,basis:e.basis,sourceId:id,locator:required(e.locator,"source locator "+l.id,240),
   status:"SOURCE_REFERENCED_NOT_INDEPENDENTLY_VERIFIED"};
 });
 const constraints=spec.constraints??{};
 if(!constraints||typeof constraints!=="object"||Array.isArray(constraints))
  throw Error("constraints must be an object");
 const allowed=new Set(["maxFloorPlateAreaM2","maxTotalFloorPlateAreaM2","buildableEnvelope"]);
 for(const k of Object.keys(constraints))if(!allowed.has(k))throw Error("Unsupported AAD constraint "+k);
 const checks=[];
 if(constraints.maxFloorPlateAreaM2!==undefined){
  const limit=positive(constraints.maxFloorPlateAreaM2,"maxFloorPlateAreaM2");
  for(const level of levelItems){
   if(level.sourceArea>limit+EPS)throw Error("Level "+level.id+" exceeds owner-specified maximum floor plate area");
  }
  checks.push({code:"OWNER_MAX_FLOOR_PLATE",limitM2:limit,status:"PASSED_USER_CONSTRAINT_NOT_CODE_APPROVAL"});
 }
 if(constraints.maxTotalFloorPlateAreaM2!==undefined){
  const limit=positive(constraints.maxTotalFloorPlateAreaM2,"maxTotalFloorPlateAreaM2");
  const total=levelItems.reduce((s,l)=>s+l.sourceArea,0);
  if(total>limit+EPS)throw Error("Building exceeds owner-specified maximum total floor plate area");
  checks.push({code:"OWNER_MAX_TOTAL_FLOOR_PLATE",limitM2:limit,computedM2:Math.round(total*1000)/1000,
    status:"PASSED_USER_CONSTRAINT_NOT_CODE_APPROVAL"});
 }
 if(constraints.buildableEnvelope!==undefined){
  const envelope=polygon(constraints.buildableEnvelope,"buildableEnvelope");
  for(const l of levelItems){
   const input=spec.levels.find(v=>v.id===l.id);
   const local=polygon(input.outline,"outline "+l.id);
   const t=l.transform;
   for(const k of ["x","z","rotationDeg"])finite(t[k],"level "+l.id+" transform "+k);
   checkInside(local.map(p=>world(p,t)),envelope,l.id);
  }
  checks.push({code:"OWNER_BUILDABLE_ENVELOPE",coordinateSystem:"WORLD_XZ_METRES",status:"PASSED_USER_CONSTRAINT_NOT_SURVEY_OR_ZONING_APPROVAL"});
 }
 return{sources:normalizedSources,levels:levelEvidence,checks};
}
