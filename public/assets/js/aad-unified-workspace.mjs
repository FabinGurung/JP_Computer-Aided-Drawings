/* Shared CAD/AAD unified authoring state v1.
 * The SAME versioned floor-model objects drive 2D plans, 3D assembly, IFC4,
 * component tables and exports. No parallel iframe message protocol.
 * Changes are local working drafts; canonical GitHub/Drive evidence is read-only.
 */
import {assembleBuilding,verifyAssembly} from "./aad-building-core.mjs?aad=20261028-r03";
import {addConnectedWall,splitConnectedWall,joinConnectedWalls,removeConnectedWall,
 addHostedOpening,removeHostedOpening,derivePlanRooms} from "./aad-topology.mjs";
const clone=v=>JSON.parse(JSON.stringify(v));
const finite=(v,name)=>{if(typeof v!=="number"||!Number.isFinite(v))throw Error(name+" must be a finite number");return v;};
const bounded=(v,min,max,name)=>{finite(v,name);if(v<min||v>max)throw Error(name+" must be "+min+"–"+max+" m");return Math.round(v*1000)/1000;};
const getFloor=(models,id)=>{const floor=models[id];if(!floor?.floorGraph)throw Error("Unknown AAD storey "+id);return floor.floorGraph;};
const findBy=(items,id,type)=>{const item=items.find(x=>x.id===id);if(!item)throw Error("Unknown "+type+" "+id);return item;};
function geometricalIntegrity(models){
 const uniqueIDs=(items,label)=>{
  const set=new Set();
  for(const item of items){if(!item.id||set.has(item.id))throw Error("Duplicate "+label+" ID "+item.id);set.add(item.id);}
 };
 for(const [floorId,model] of Object.entries(models)){
  const g=model.floorGraph,nodes=new Map(g.nodes.map(x=>[x.id,x]));
  uniqueIDs(g.nodes,"node");uniqueIDs(g.walls,"wall");uniqueIDs(g.openings,"opening");
  for(const n of g.nodes){bounded(n.x,-40,80,"node X");bounded(n.z,-40,80,"node Z");}
  if(g.nodes.length>900||g.walls.length>1200||g.openings.length>750)throw Error("AAD editable graph size exceeded");
  for(const w of g.walls){
   const a=nodes.get(w.a),b=nodes.get(w.b);
   if(!a||!b||Math.hypot(a.x-b.x,a.z-b.z)<(model.allowSourceJunctionSegments?.05:.25))throw Error("Invalid wall segment "+floorId+"/"+w.id);
   bounded(w.thickness,.06,.8,"wall thickness");
  }
  for(const o of g.openings){
   const w=findBy(g.walls,o.wallId,"host wall"),a=nodes.get(w.a),b=nodes.get(w.b);
   const apertureMin=o.apertureType==="ventilator"?.15:.3;
   if(o.width<apertureMin||o.height<apertureMin||o.sill<0||o.offset<0||o.offset+o.width>Math.hypot(a.x-b.x,a.z-b.z)+.00001)
    throw Error("Hosted opening conflicts with wall "+floorId+"/"+o.id);
   if(o.sill+o.height>model.height+.01)throw Error("Opening height exceeds its storey "+floorId+"/"+o.id);
  }
 }
}
export function createAADWorkspace(manifest,initialModels,{reviewStructure=null}={}){
 const baseManifest=clone(manifest),sourceModels=clone(initialModels),reviewData=reviewStructure?clone(reviewStructure):null;
 geometricalIntegrity(sourceModels);
 let models=clone(sourceModels),version=0,lastEdit=null;
 let assembly=assembleBuilding(baseManifest,models,{reviewStructure:reviewData});
 function change(level,entity,patch){
  const next=clone(models),graph=getFloor(next,level),change=patch||{};
  if(entity.kind==="node"){
   const node=findBy(graph.nodes,entity.id,"node");
   if("x" in change)node.x=bounded(change.x,-40,80,"node X");
   if("z" in change)node.z=bounded(change.z,-40,80,"node Z");
  }else if(entity.kind==="wall"){
   const wall=findBy(graph.walls,entity.id,"wall");
   if("thickness" in change)wall.thickness=bounded(change.thickness,.06,.8,"wall thickness");
  }else if(entity.kind==="opening"){
   const opening=findBy(graph.openings,entity.id,"opening");
   for(const name of ["offset","width","height","sill"])
    if(name in change)opening[name]=bounded(change[name],name==="width"||name==="height"?.3:0,30,name);
  }else throw Error("Unsupported semantic edit "+entity.kind);
  return admit(next,{level,entity,patch:clone(change)});
 }
 function admit(next,record){
  geometricalIntegrity(next);
  const candidate=assembleBuilding(baseManifest,next,{allowAreaDrift:true,reviewStructure:reviewData});
  const qa=verifyAssembly(candidate);
  if(!qa.valid)throw Error("Editing blocked by building-wide QA: "+qa.errors.map(x=>x.code).join(", "));
  models=next;assembly=candidate;version++;lastEdit={...record,version};
  return snapshot();
 }
 function topology(level,action,args={}){
  const next=clone(models),graph=getFloor(next,level);
  const actions={
   addWall:()=>addConnectedWall(graph,args),
   splitWall:()=>splitConnectedWall(graph,args),
   joinWalls:()=>joinConnectedWalls(graph,args),
   removeWall:()=>removeConnectedWall(graph,args),
   addOpening:()=>addHostedOpening(graph,args,next[level].height),
   removeOpening:()=>removeHostedOpening(graph,args)
  };
  if(!Object.hasOwn(actions,action))throw Error("Unsupported AAD topology action "+action);
  const result=actions[action]();
  const checked=admit(next,{kind:"topology",level,action,args:clone(args),result:clone(result)});
  return{...checked,result};
 }
 function rooms(level){return derivePlanRooms(getFloor(models,level)).map(r=>clone(r));}

 
 function reset(){
  models=clone(sourceModels);
  assembly=assembleBuilding(baseManifest,models,{reviewStructure:reviewData});version++;lastEdit={kind:"reset",version};
  return snapshot();
 }
 function restore(bundle){
  if(bundle?.schema!=="jp-cad://aad-working-draft/1"||bundle.projectId!==baseManifest.projectId)
   throw Error("Only same-project AAD working-draft bundles can be imported");
  if(Object.keys(bundle.models||{}).sort().join(",")!==Object.keys(sourceModels).sort().join(","))
   throw Error("Working draft floor IDs mismatch");
  const candidateModels=clone(bundle.models);
  for(const [level,floor] of Object.entries(candidateModels)){
   const source=sourceModels[level].floorGraph,g=floor.floorGraph;
   const originalExterior=new Set(source.perimeter);
   // Floor ID and original exterior wall IDs cannot be silently dropped.
   // Splitting source exterior walls is allowed: the anchored wall ID remains
   // and the newly generated perimeter segment carries draft provenance.
   for(const id of originalExterior)if(!g.walls.some(w=>w.id===id)||!g.perimeter.includes(id))
    throw Error("Imported draft removed original exterior wall "+level+"/"+id);
   if(g.perimeter.some(id=>!g.walls.some(w=>w.id===id)))
    throw Error("Imported draft has dangling perimeter wall "+level);
   for(const wall of g.walls)if(!source.walls.some(w=>w.id===wall.id)&&wall.source!=="AI_AUTHORED_PLAN_TOPOLOGY"&&wall.source!=="AI_EDITED_HOST_SPLIT")
    throw Error("Untrusted new wall provenance "+level+"/"+wall.id);
   for(const o of g.openings)if(!source.openings.some(k=>k.id===o.id)&&o.source!=="AI_AUTHORED_HOSTED_OPENING")
    throw Error("Untrusted new opening provenance "+level+"/"+o.id);
  }
  geometricalIntegrity(candidateModels);
  const candidate=assembleBuilding(baseManifest,candidateModels,{allowAreaDrift:true,reviewStructure:reviewData});
  if(!verifyAssembly(candidate).valid)throw Error("Imported draft fails building QA");
  models=candidateModels;assembly=candidate;version++;lastEdit={kind:"restore",version};
  return snapshot();
 }
 function snapshot(){return{assembly:clone(assembly),models:clone(models),manifest:clone(baseManifest),version,lastEdit:clone(lastEdit)};}
 function bundle(){return{
  schema:"jp-cad://aad-working-draft/1",projectId:baseManifest.projectId,
  baseline:baseManifest.revision,reviewStatus:"DRAFT_ENGINEERING_HOLD",revision:version,
  manifest:clone(baseManifest),models:clone(models),lastEdit:clone(lastEdit),
  note:"Browser-authored changes, not committed canonical source. IFC export is an analytical snapshot of the same working state."};}
 return{change,topology,rooms,reset,restore,snapshot,bundle};
}
