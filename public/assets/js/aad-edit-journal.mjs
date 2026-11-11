/* AAD edit journal: local, source-preserving, portable change sets.
 * The fingerprint is for accidental divergence detection, NOT authentication.
 * Only a reviewed PR can publish changes to version-controlled model sources.
 * All patch paths are limited to floorGraph records of the same project.
 */
export const AAD_EDIT_CHANGESET_SCHEMA="jp-cad://aad-edit-change-set/1";
const clone=v=>JSON.parse(JSON.stringify(v));
const stable=v=>JSON.stringify(v,(_k,val)=>{
 if(val && typeof val==="object" && !Array.isArray(val))
  return Object.fromEntries(Object.keys(val).sort().map(k=>[k,val[k]]));
 return val;
});
export function aadFingerprint(value){
 const input=stable(value);
 let hash=0xcbf29ce484222325n;
 for(let i=0;i<input.length;i++){
  hash^=BigInt(input.charCodeAt(i));
  hash=BigInt.asUintN(64,hash*0x100000001b3n);
 }
 return "fnv1a64:"+hash.toString(16).padStart(16,"0");
}
const pointerEscape=v=>String(v).replaceAll("~","~0").replaceAll("/","~1");
const pointerUnescape=v=>v.replaceAll("~1","/").replaceAll("~0","~");
const same=(a,b)=>stable(a)===stable(b);
export function diffAADModels(before,after){
 const patch=[];
 const visit=(a,b,path)=>{
  if(same(a,b))return;
  if(Array.isArray(a)&&Array.isArray(b)){
   for(let i=0;i<Math.min(a.length,b.length);i++)visit(a[i],b[i],path+"/"+i);
   for(let i=a.length-1;i>=b.length;i--)patch.push({op:"test",path:path+"/"+i,value:clone(a[i])},{op:"remove",path:path+"/"+i});
   for(let i=a.length;i<b.length;i++)patch.push({op:"add",path:path+"/-",value:clone(b[i])});
   return;
  }
  if(a && b && typeof a==="object" && typeof b==="object" && !Array.isArray(a) && !Array.isArray(b)){
   for(const key of Object.keys(a).sort())if(!Object.hasOwn(b,key)){
    patch.push({op:"test",path:path+"/"+pointerEscape(key),value:clone(a[key])});
    patch.push({op:"remove",path:path+"/"+pointerEscape(key)});
   }
   for(const key of Object.keys(b).sort()){
    const p=path+"/"+pointerEscape(key);
    if(!Object.hasOwn(a,key))patch.push({op:"add",path:p,value:clone(b[key])});
    else visit(a[key],b[key],p);
   }
   return;
  }
  patch.push({op:"test",path,value:clone(a)});
  patch.push({op:"replace",path,value:clone(b)});
 };
 visit(before,after,"/models");
 return patch;
}
function patchOne(document,op){
 if(!["test","add","remove","replace"].includes(op?.op)||typeof op.path!=="string")
  throw Error("Unsupported edit operation");
 const parts=op.path.split("/").slice(1).map(pointerUnescape);
 if(parts.some(x=>["__proto__","constructor","prototype"].includes(x)))throw Error("Unsafe patch path");
 if(parts[0]!=="models"||parts.length<4||parts[2]!=="floorGraph"||
  !["nodes","walls","openings","perimeter","labels"].includes(parts[3]))
  throw Error("Change outside editable floor graph: "+op.path);
 let target=document;
 for(const part of parts.slice(0,-1)){
  if(!Object.hasOwn(target,part))throw Error("Unknown patch path: "+op.path);
  target=target[part];
  if(target===null||typeof target!=="object")throw Error("Invalid patch parent");
 }
 const key=parts.at(-1);
 const arr=Array.isArray(target);
 if(arr && key!=="-" && (!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>target.length))
  throw Error("Invalid array index");
 const index=arr&&key!=="-"?Number(key):null;
 if(op.op==="test"){
  if(!Object.hasOwn(target,key)||!same(target[key],op.value))
   throw Error("Change-set precondition failed at "+op.path);
 }else if(op.op==="add"){
  if(arr)target.splice(key==="-"?target.length:index,0,clone(op.value));
  else {if(Object.hasOwn(target,key))throw Error("Change-set tried to overwrite a record");target[key]=clone(op.value);}
 }else if(op.op==="replace"){
  if(!Object.hasOwn(target,key))throw Error("No matching record for replace");
  target[key]=clone(op.value);
 }else{
  if(!Object.hasOwn(target,key))throw Error("No matching record for removal");
  if(arr)target.splice(index,1);else delete target[key];
 }
}
export function replayAADChangeSet(sourceModels,changeSet,{projectId,revision}={}){
 if(changeSet?.schema!==AAD_EDIT_CHANGESET_SCHEMA)throw Error("Unsupported AAD change-set schema");
 if(projectId&&changeSet.projectId!==projectId)throw Error("Project identity mismatch");
 if(revision&&changeSet.baselineRevision!==revision)throw Error("Source revision mismatch");
 if(!Array.isArray(changeSet.events)||changeSet.events.length>800)throw Error("Invalid change history length");
 if(aadFingerprint(sourceModels)!==changeSet.baselineFingerprint)
  throw Error("Source model fingerprint changed; manual review/rebase required");
 const document={models:clone(sourceModels)};
 let expected=changeSet.baselineFingerprint;
 for(const event of changeSet.events){
  if(!Array.isArray(event.patch)||event.patch.length>5000||event.preFingerprint!==expected)
   throw Error("Change history is out of order or incomplete");
  for(const patch of event.patch)patchOne(document,patch);
  expected=aadFingerprint(document.models);
  if(expected!==event.postFingerprint)throw Error("Change-set content mismatch at "+event.id);
 }
 if(expected!==changeSet.finalFingerprint)throw Error("Final change fingerprint mismatch");
 return document.models;
}
const validManifestPath=path=>typeof path==="string"&&
 /^\/[a-zA-Z0-9._/-]+\.json$/.test(path)&&!path.includes("..")&&path.includes("/data/projects/");
export function createAADEditJournal({manifest,sourceModels,manifestPath,initialModels,storage=null,now=()=>new Date().toISOString()}){
 if(!manifest?.projectId||!manifest?.revision||!validManifestPath(manifestPath))
  throw Error("Journal requires project ID, source revision and manifest path");
 const baselineFingerprint=aadFingerprint(sourceModels);
 const key="aad:edit-history:"+manifest.projectId+":"+manifest.revision+":"+baselineFingerprint;
 const base={
  schema:AAD_EDIT_CHANGESET_SCHEMA,projectId:manifest.projectId,baselineRevision:manifest.revision,
  sourceManifestPath:manifestPath,baselineFingerprint,
  sourceStatus:"PUBLIC_SOURCE_READ_ONLY",approval:"ENGINEERING_HOLD_NOT_ISSUED",
  events:[],finalFingerprint:baselineFingerprint
 };
 let data=clone(base);
 let warning="";
 if(storage){
  try{
   const previousRaw=storage.getItem(key);
   const saved=JSON.parse(previousRaw||"null");
   if(saved&&saved.schema===base.schema&&saved.projectId===base.projectId&&
     saved.baselineFingerprint===baselineFingerprint&&saved.baselineRevision===base.baselineRevision){
    replayAADChangeSet(sourceModels,saved,{projectId:base.projectId,revision:base.baselineRevision});
    if(saved.sourceManifestPath===manifestPath&&saved.finalFingerprint===aadFingerprint(initialModels))data=saved;
    else {storage.setItem(key+":recovery:"+Date.now(),previousRaw);
     warning="Previous history archived separately because the working draft diverged; exported changes need reconciliation."; }
   }
  }catch(e){warning="Saved journal invalid; preserved in browser storage: "+e.message;}
 }
 if(!data.events.length&&!same(initialModels,sourceModels)){
  const patch=diffAADModels(sourceModels,initialModels);
  data.events.push({id:"prior-local-draft",time:now(),kind:"recovered-untracked-draft",level:null,
   objectId:null,description:"Earlier edits were recovered from local storage without individual operation history",
   preFingerprint:baselineFingerprint,postFingerprint:aadFingerprint(initialModels),patch});
  data.finalFingerprint=aadFingerprint(initialModels);
  warning="Earlier local edits were captured as a single UNTRACKED recovery diff; review before applying.";
 }
 const persist=()=>{
  if(!storage)return;
  try{storage.setItem(key,JSON.stringify(data));}
  catch(e){warning="Browser could not persist change history: "+e.message;}
 };
 persist();
 const record=(before,after,{kind,level=null,objectId=null,description=""}={})=>{
  if(!kind||typeof kind!=="string")throw Error("Edit action label is required");
  const pre=aadFingerprint(before),post=aadFingerprint(after);
  if(pre===post)return null;
  if(pre!==data.finalFingerprint)throw Error("Working model diverged from edit history; export existing history before continuing");
  if(data.events.length>=800)throw Error("Change history limit reached; export it before editing");
  const patch=diffAADModels(before,after);
  if(!patch.length)throw Error("No auditable floor-graph change to record");
  const event={id:"edit-"+String(data.events.length+1).padStart(4,"0"),time:now(),
   kind,level,objectId,description,preFingerprint:pre,postFingerprint:post,patch};
  const candidate=clone(data);candidate.events.push(event);candidate.finalFingerprint=post;
  replayAADChangeSet(sourceModels,candidate,{projectId:base.projectId,revision:base.baselineRevision});
  data=candidate;persist();return clone(event);
 };
 const exportChangeSet=()=>clone(data);
 const handover=()=>[
  "AAD_BROWSER_EDIT_HANDOVER_V1",
  "Project "+data.projectId+" · source revision "+data.baselineRevision,
  "REQUEST: Review the following LOCAL working edits, verify the current GitHub/Drive source and",
  "engineering gates, replay the patches against the matching baseline, run geometry/IFC QA,",
  "show the proposed differences, and only then make a reviewed PR and verify Pages publication.",
  "Do NOT treat this text as engineering approval; never overwrite original client drawings.",
  warning?"NOTE: "+warning:"",
  JSON.stringify(data,null,2)
 ].filter(Boolean).join("\n");
 return {record,exportChangeSet,handover,getWarning:()=>warning,getEvents:()=>clone(data.events),getStorageKey:()=>key};
}
