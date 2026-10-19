/* AAD project component register v1: read-only project-data adapter.
 * Shared rendering/geometry engine is never duplicated or modified here.
 * Coordinates are local authored-model metres (X,Z map axes; Y elevation).
 * IfcXxx strings are prospective IFC entity classifications, NOT IFC objects.
 */
(()=>{"use strict";
 const root=document.querySelector("[data-aad-component-register]");
 if(!root)return;
 const files={gf:"aad-ground-floor-model.json",ff:"aad-first-floor-model.json",sf:"aad-second-floor-model.json"};
 const names={gf:"Ground",ff:"First",sf:"Second"};
 const levels={gf:0,ff:3,sf:6};
 const types=[
  ["wall","Wall","IfcWall"],["door","Door","IfcDoor"],["window","Window","IfcWindow"],
  ["space","Semantic room label","IfcSpace (candidate)"],
  ["column","Column","IfcColumn"],["beam","Beam","IfcBeam"],["slab","Slab","IfcSlab"],
  ["stair","Stair flight","IfcStair"],["furniture","Bed / furniture","IfcFurnishingElement"]
 ];
 const dataRoot=root.dataset.projectDataRoot||"../../../data/projects/narayani-parajuli/";
 const tbody=root.querySelector("[data-register-body]");
 const counts=root.querySelector("[data-register-counts]");
 const floorFilter=root.querySelector("[data-register-floor]");
 const typeFilter=root.querySelector("[data-register-type]");
 const find=root.querySelector("[data-register-search]");
 const status=root.querySelector("[data-register-status]");
 let baseline=[], active="gf", derived=new Map();
 const fmt=n=>Number.isFinite(n)?Number(n).toFixed(3):"—";
 const norm=n=>Number(n).toFixed(6);
 const midpoint=(a,b)=>({x:(a.x+b.x)/2,z:(a.z+b.z)/2});
 const polar=(a,b,dist)=>{const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);return {x:a.x+dx/len*dist,z:a.z+dz/len*dist};};
 function item({floor,id,type,kind,ifc,host,at,ends,size,source,notes}){
  return {floor,id,type,kind,ifc,host:host||"—",at:at||null,ends:ends||null,size:size||"—",source:source||"Authored semantic model",notes:notes||""};
 }
 function readFloor(floor,model){
  const graph=model.floorGraph;if(!graph)throw Error("Missing native AAD connected graph for "+floor);
  const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
  const walls=new Map(graph.walls.map(w=>[w.id,w]));
  const out=[],y=levels[floor];
  for(const wall of graph.walls){
   const a=nodes.get(wall.a),b=nodes.get(wall.b);
   if(!a||!b)throw Error("Unresolved source wall node "+wall.id);
   const length=Math.hypot(a.x-b.x,a.z-b.z);
   out.push(item({floor,id:wall.id,type:"wall",kind:wall.id.startsWith("EXT-")?"External wall":"Partition wall",
    ifc:"IfcWall",host:"—",at:{...midpoint(a,b),y:y+(model.height-.18)/2},ends:[a,b],
    size:fmt(length)+"m × "+fmt(wall.thickness)+"m × "+fmt(model.height-.18)+"m",
    source:"AAD authored wall graph",notes:"Endpoints are model map coordinates; not surveyed site coordinates"}));
  }
  for(const opening of graph.openings){
   const wall=walls.get(opening.wallId),a=nodes.get(wall?.a),b=nodes.get(wall?.b);
   if(!a||!b)throw Error("Unhosted opening "+opening.id);
   const start=polar(a,b,opening.offset),end=polar(a,b,opening.offset+opening.width);
   out.push(item({floor,id:opening.id,type:opening.kind,kind:opening.kind==="door"?"Hosted door":"Hosted window",
    ifc:opening.kind==="door"?"IfcDoor":"IfcWindow",host:opening.wallId,
    at:{...midpoint(start,end),y:y+opening.sill+opening.height/2},ends:[start,end],
    size:fmt(opening.width)+"m W × "+fmt(opening.height)+"m H · sill "+fmt(opening.sill)+"m",
    source:"AAD hosted opening graph",notes:"Placement defined by host wall offset: "+fmt(opening.offset)+"m from "+wall.a}));
  }
  for(const [id,name] of Object.entries(graph.labels)){
   // Labels are not a proven persistent IfcSpace, and do not store a metric centroid.
   out.push(item({floor,id,type:"space",kind:String(name),ifc:"IfcSpace (candidate)",
    at:null,size:"Conceptual; AAD auto-derived face, not saved IFC space",
    source:"Semantic label in floorGraph.labels",notes:"Metric centroid appears only when native AAD computes the floor face; no IFC space object stored"}));
  }
  return out;
 }
 function textCell(row,value){const td=document.createElement("td");td.textContent=String(value);row.append(td);return td;}
 function pickRows(){
  const filterType=typeFilter.value,q=find.value.trim().toLowerCase();
  const expanded=baseline.map(e=>{
   const v=derived.get(e.floor+":"+e.id);
   return v&&e.type==="space"?{...e,at:v.at,size:v.size,notes:e.notes+"; centroid read from native AAD plan"}:e;
  });
  return expanded.filter(e=>(floorFilter.value==="all"||e.floor===floorFilter.value)&&
   (filterType==="all"||e.type===filterType)&&
   (!q||[e.floor,e.id,e.kind,e.type,e.ifc,e.host,e.size,e.notes].join(" ").toLowerCase().includes(q)));
 }
 function render(){
  const rows=pickRows();tbody.replaceChildren();
  for(const e of rows){
   const tr=document.createElement("tr");tr.dataset.kind=e.type;
   textCell(tr,names[e.floor]);textCell(tr,e.id);textCell(tr,e.kind);textCell(tr,e.ifc);
   textCell(tr,e.host);
   textCell(tr,e.at?"("+fmt(e.at.x)+", "+fmt(e.at.z)+")":"— (not stored)");
   textCell(tr,e.at?fmt(e.at.y):"—");
   textCell(tr,e.ends?"("+fmt(e.ends[0].x)+", "+fmt(e.ends[0].z)+") → ("+fmt(e.ends[1].x)+", "+fmt(e.ends[1].z)+")":"—");
   textCell(tr,e.size);textCell(tr,e.source);
   tr.title=e.notes;
   tbody.append(tr);
  }
  const n=baseline.length;
  status.textContent=rows.length+" shown / "+n+" authored records · "+(rows.filter(e=>e.type==="space").length)+" semantic room labels in selection";
 }
 function calc(){
  counts.replaceChildren();
  for(const [key,label,ifc] of types){
   const count=baseline.filter(e=>e.type===key).length;
   const card=document.createElement("div");card.className="aad-count-tile";card.dataset.status=count?"modeled":"unmodeled";
   const strong=document.createElement("strong");strong.textContent=count;
   const name=document.createElement("span");name.textContent=label;
   const small=document.createElement("small");small.textContent=ifc+(count?" · model records":" · not modeled");
   card.append(strong,name,small);counts.append(card);
  }
 }
 function updateSpaceCentroids(frame,floor){
  try{
   const doc=frame?.contentDocument;
   const mdl=baseline.some(r=>r.floor===floor);
   if(!doc||!mdl)return;
   const native=doc.querySelector("#plan"),labels=native?.querySelectorAll("[data-room-label]");
   const env=Number(doc.getElementById("length")?.value),depth=Number(doc.getElementById("width")?.value);
   if(!Number.isFinite(env)||!Number.isFinite(depth)||!labels?.length)return;
   const scale=Math.min(465/env,420/depth),left=(600-env*scale)/2,top=110+(440-depth*scale)/2;
   for(const el of labels){
    const id=el.getAttribute("data-room-label"),xx=Number(el.getAttribute("x")),zz=Number(el.getAttribute("y"));
    if(!id||!Number.isFinite(xx)||!Number.isFinite(zz))continue;
    const value={at:{x:(xx-left)/scale,z:(zz-top)/scale,y:levels[floor]+.02},size:el.textContent||"AAD derived region"};
    derived.set(floor+":"+id,value);
   }
   render();
  }catch(_){}
 }
 root.addEventListener("change",e=>{if(e.target===floorFilter||e.target===typeFilter)render();});
 find.addEventListener("input",render);
 const exportButton=root.querySelector("[data-register-export]");
 exportButton.addEventListener("click",()=>{
  const fields=["floor","id","type","kind","ifc","host","map_x_m","map_z_m","elevation_y_m","start_xz","end_xz","size","source","notes"];
  const q=v=>'"'+String(v??"").replaceAll('"','""')+'"';
  const csv=[fields.join(","),...pickRows().map(e=>[names[e.floor],e.id,e.type,e.kind,e.ifc,e.host,
   e.at?norm(e.at.x):"",e.at?norm(e.at.z):"",e.at?norm(e.at.y):"",
   e.ends?norm(e.ends[0].x)+"|"+norm(e.ends[0].z):"",e.ends?norm(e.ends[1].x)+"|"+norm(e.ends[1].z):"",
   e.size,e.source,e.notes].map(q).join(","))].join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="Narayani_AAD_Component_Register_Local_Coordinates_v1.csv";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 window.NarayaniAADComponentRegister={setActiveFloor(f){if(files[f]){active=f;floorFilter.value=f;render();}},updateSpaceCentroids};
 Promise.all(Object.entries(files).map(async ([floor,file])=>{
  const url=new URL(dataRoot+file,location.href);
  const resp=await fetch(url,{cache:"no-store"});
  if(!resp.ok)throw Error(file+" HTTP "+resp.status);
  return readFloor(floor,await resp.json());
 })).then(group=>{
  baseline=group.flat();calc();floorFilter.value="all";render();
  status.textContent=baseline.length+" authored records · "+baseline.filter(x=>x.type==="wall").length+" walls, "+baseline.filter(x=>x.type==="door").length+" doors, "+baseline.filter(x=>x.type==="window").length+" windows, "+baseline.filter(x=>x.type==="space").length+" semantic room labels. Each floor retains its local AAD coordinates.";
  updateSpaceCentroids(document.getElementById("aad-engine"),active);
 }).catch(e=>{status.textContent="Component registry unavailable: "+e.message;});
})();