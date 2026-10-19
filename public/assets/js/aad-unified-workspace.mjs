/* Shared CAD/AAD unified authoring state v1.
 * The SAME versioned floor-model objects drive 2D plans, 3D assembly, IFC4,
 * component tables and exports. No parallel iframe message protocol.
 * Changes are local working drafts; canonical GitHub/Drive evidence is read-only.
 */
import {assembleBuilding,verifyAssembly} from "./aad-building-core.mjs";
const clone=v=>JSON.parse(JSON.stringify(v));
const finite=(v,name)=>{if(typeof v!=="number"||!Number.isFinite(v))throw Error(name+" must be a finite number");return v;};
const bounded=(v,min,max,name)=>{finite(v,name);if(v<min||v>max)throw Error(name+" must be "+min+"–"+max+" m");return Math.round(v*1000)/1000;};
const getFloor=(models,id)=>{const floor=models[id];if(!floor?.floorGraph)throw Error("Unknown AAD storey "+id);return floor.floorGraph;};
const findBy=(items,id,type)=>{const item=items.find(x=>x.id===id);if(!item)throw Error("Unknown "+type+" "+id);return item;};
function geometricalIntegrity(models){
 for(const [floorId,model] of Object.entries(models)){
  const g=model.floorGraph,nodes=new Map(g.nodes.map(x=>[x.id,x]));
  for(const w of g.walls){
   const a=nodes.get(w.a),b=nodes.get(w.b);
   if(!a||!b||Math.hypot(a.x-b.x,a.z-b.z)<.25)throw Error("Invalid wall segment "+floorId+"/"+w.id);
   bounded(w.thickness,.06,.8,"wall thickness");
  }
  for(const o of g.openings){
   const w=findBy(g.walls,o.wallId,"host wall"),a=nodes.get(w.a),b=nodes.get(w.b);
   if(o.width<.3||o.height<.3||o.sill<0||o.offset<0||o.offset+o.width>Math.hypot(a.x-b.x,a.z-b.z)+.00001)
    throw Error("Hosted opening conflicts with wall "+floorId+"/"+o.id);
   if(o.sill+o.height>model.height+.01)throw Error("Opening height exceeds its storey "+floorId+"/"+o.id);
  }
 }
}
export function createAADWorkspace(manifest,initialModels){
 const baseManifest=clone(manifest),sourceModels=clone(initialModels);
 geometricalIntegrity(sourceModels);
 let models=clone(sourceModels),version=0,lastEdit=null;
 let assembly=assembleBuilding(baseManifest,models);
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
  geometricalIntegrity(next);
  const candidate=assembleBuilding(baseManifest,next,{allowAreaDrift:true});
  const qa=verifyAssembly(candidate);
  if(!qa.valid)throw Error("Editing blocked by building-wide QA: "+qa.errors.map(x=>x.code).join(", "));
  models=next;assembly=candidate;version++;lastEdit={level,entity,patch:clone(change),version};
  return snapshot();
 }
 function reset(){
  models=clone(sourceModels);
  assembly=assembleBuilding(baseManifest,models);version++;lastEdit={kind:"reset",version};
  return snapshot();
 }
 function restore(bundle){
  if(bundle?.schema!=="jp-cad://aad-working-draft/1"||bundle.projectId!==baseManifest.projectId)
   throw Error("Only same-project AAD working-draft bundles can be imported");
  if(Object.keys(bundle.models||{}).sort().join(",")!==Object.keys(sourceModels).sort().join(","))
   throw Error("Working draft floor IDs mismatch");
  const candidateModels=clone(bundle.models);
  for(const [level,floor] of Object.entries(candidateModels)){
   const reference=sourceModels[level].floorGraph,g=floor.floorGraph;
   if(g.nodes.length!==reference.nodes.length||g.walls.length!==reference.walls.length||g.openings.length!==reference.openings.length)
    throw Error("Draft changes semantic topology on "+level+"; use a versioned engine migration first");
   if(g.nodes.some((x,i)=>x.id!==reference.nodes[i].id)||g.walls.some((x,i)=>x.id!==reference.walls[i].id)||
      g.openings.some((x,i)=>x.id!==reference.openings[i].id||x.wallId!==reference.openings[i].wallId))
    throw Error("Draft IDs and hosted relationships changed on "+level);
  }
  geometricalIntegrity(candidateModels);
  const candidate=assembleBuilding(baseManifest,candidateModels,{allowAreaDrift:true});
  if(!verifyAssembly(candidate).valid)throw Error("Imported draft fails building QA");
  models=candidateModels;assembly=candidate;version++;lastEdit={kind:"restore",version};
  return snapshot();
 }
 function snapshot(){return{assembly,models,manifest:baseManifest,version,lastEdit};}
 function bundle(){return{
  schema:"jp-cad://aad-working-draft/1",projectId:baseManifest.projectId,
  baseline:baseManifest.revision,reviewStatus:"DRAFT_ENGINEERING_HOLD",revision:version,
  manifest:clone(baseManifest),models:clone(models),lastEdit:clone(lastEdit),
  note:"Browser-authored changes, not committed canonical source. IFC export is an analytical snapshot of the same working state."};}
 return{change,reset,restore,snapshot,bundle};
}
