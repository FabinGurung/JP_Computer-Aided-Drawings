/* Reusable AAD source-review viewport: source-derived horizontal XY → world XZ.
 * 2D and Three.js use one normalized source assembly; no legacy inferred grid.
 * Vertical column/beam/elevation depths in this stage are SCHEMATIC.
 */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
const $=id=>document.getElementById(id);
const moduleURL=file=>new URL("../../../assets/js/"+file,location.href).href;
const {createSourceGroundFloorReview}=await import(/* @vite-ignore */moduleURL("aad-source-ground-floor.mjs"));
const params=new URLSearchParams(location.search);
const dataParam=params.get("data");
if(!dataParam)throw Error("Source review needs ?data= pointing to a branch-reviewed source ledger JSON");
const dataURL=new URL(dataParam,location.origin);
if(dataURL.origin!==location.origin||!dataURL.pathname.endsWith(".json"))throw Error("Only same-origin source-ledger JSON is allowed");
const response=await fetch(dataURL.href,{cache:"no-store"});
if(!response.ok)throw Error("Cannot fetch reviewed source ledger ("+response.status+")");
const input=await response.json(),model=createSourceGroundFloorReview(input),svg=$("plan");
$("name").textContent=model.name;
const labels={"column":"Columns","footing":"Footings","beam":"Beam candidates","architectural-line":"Architectural edges"};
$("counts").replaceChildren(...Object.entries(model.counts).map(([kind,n])=>{
 const el=document.createElement("span");el.className="stat";el.textContent=n+" "+labels[kind];return el;
}));
$("registration").textContent="Structural → architectural DXF registration: +"+
 model.registration.structuralToArchitecturalMM.dx.toFixed(6)+" mm X, "+
 model.registration.structuralToArchitecturalMM.dy.toFixed(6)+" mm Y; rotation 0°, scale 1; coordinates source-native (mm) → shared preview world X/Z (m).";
const beamReview=model.beamEndpointReview;
const supportNotice=document.createElement("li");supportNotice.className="warning";
supportNotice.textContent="GF BEAM ENDPOINTS · SOURCE REVIEW: "+beamReview.beyondTolerance+
 " / "+beamReview.endpoints+" paired-edge candidate endpoints are more than "+
 beamReview.toleranceM+" m from their nearest sourced column centre. "+
 "This is not a beam support or load-path validation; do not automatically snap, trim or connect.";
$("issues").append(supportNotice);
for(const issue of model.issues){const li=document.createElement("li");li.className="warning";
 li.textContent=issue.code+": "+(issue.note||issue.decision||"Source review HOLD");$("issues").append(li);}
const palette={"column":0x168267,"footing":0x9a79ba,"beam":0xd29a50,"architectural-line":0x376b7f};
const shown=new Set(Object.keys(labels)),elementMap=new Map(model.elements.map(e=>[e.id,e]));
let selectedId=null;
const fmt=n=>Number.isFinite(n)?n.toFixed(3):"—";
const sourceHandles=e=>e.source.entityHandles?.join(", ")||e.source.entityHandle||"none";
const ns="http://www.w3.org/2000/svg";
function node(tag,props={},text=null){const p=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props))p.setAttribute(k,v);
 if(text!==null)p.textContent=text;return p;}
function extents(){
 const b=model.bounds;return{x:b.minX-.9,y:b.minZ-.9,w:b.maxX-b.minX+1.8,h:b.maxZ-b.minZ+1.8};
}
function drawPlan(){
 const b=extents();svg.setAttribute("viewBox",[b.x,b.y,b.w,b.h].join(" "));
 svg.setAttribute("preserveAspectRatio","xMidYMid meet");svg.replaceChildren();
 const background=node("rect",{x:b.x,y:b.y,width:b.w,height:b.h,fill:"#edf7f7"});svg.append(background);
 const ggrid=node("g",{stroke:"#bed6d8","stroke-width":".013"});
 for(let x=Math.floor(b.x);x<=b.x+b.w;x++)ggrid.append(node("line",{x1:x,y1:b.y,x2:x,y2:b.y+b.h}));
 for(let z=Math.floor(b.y);z<=b.y+b.h;z++)ggrid.append(node("line",{x1:b.x,y1:z,x2:b.x+b.w,y2:z}));
 svg.append(ggrid);
 for(const e of [...model.elements].sort((a,b)=>({"architectural-line":0,footing:1,beam:2,column:3}[a.kind])-({"architectural-line":0,footing:1,beam:2,column:3}[b.kind]))){
  if(!shown.has(e.kind))continue;
  const active=e.id===selectedId;
  let g;
  if(e.kind==="column"){
   g=node("circle",{cx:e.x,cy:e.z,r:active?.21:.14,fill:active?"#f26923":"#0e8461",stroke:"#fff","stroke-width":".055"});
  } else if(e.kind==="footing"){
   g=node("rect",{x:e.x-e.dx/2,y:e.z-e.dz/2,width:e.dx,height:e.dz,
    fill:e.conflict?"#f4bca4":active?"#cfb5e3":"#c6b3da",
    "fill-opacity":".45",stroke:e.conflict?"#d7492b":"#8d64b2",
    "stroke-dasharray":e.conflict?".23 .12":undefined,"stroke-width":active?".095":".048"});
   if(e.conflict){const alert=node("text",{x:e.x+e.dx/2+.12,y:e.z,"font-size":".27",fill:"#bb3920"},"G1 !");svg.append(alert);}
  } else{
   const colors=e.kind==="beam"?"#bd884b":"#356c79";
   g=node("line",{x1:e.ax,y1:e.az,x2:e.bx,y2:e.bz,
    stroke:active?"#ed681d":colors,"stroke-width":active?".15":e.kind==="beam"?".115":".065",
    "stroke-dasharray":e.kind==="beam"?".27 .12":undefined,"stroke-linecap":"round"});
  }
  g.classList.add("draw");g.setAttribute("data-id",e.id);
  g.addEventListener("click",ev=>{ev.stopPropagation();choose(e.id);});
  g.append(node("title",{},e.label+" / "+e.id+" / "+e.status));
  svg.append(g);
 }
}
let scene,camera,renderer,orbit,group,clickables;
function initThree(){
 const container=$("model3d"),w=container.clientWidth,h=container.clientHeight;
 scene=new THREE.Scene();scene.background=new THREE.Color(0xe8f1f2);
 camera=new THREE.PerspectiveCamera(40,Math.max(1,w/h),.1,1000);
 const bb=model.bounds,cx=(bb.minX+bb.maxX)/2,cz=(bb.minZ+bb.maxZ)/2;
 const range=Math.max(bb.maxX-bb.minX,bb.maxZ-bb.minZ);
 camera.position.set(cx+range*.8,range*.92,cz+range*1.1);
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.setSize(Math.max(w,100),Math.max(h,100));container.append(renderer.domElement);
 scene.add(new THREE.AmbientLight(0xffffff,1.6));
 const lamp=new THREE.DirectionalLight(0xffffff,2);lamp.position.set(cx+10,18,cz+6);scene.add(lamp);
 const grid=new THREE.GridHelper(Math.ceil(range+4),Math.ceil(range+4),0x8bb0b8,0xc9dce0);
 grid.position.set(cx,-.26,cz);scene.add(grid);
 orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(cx,0,cz);
 orbit.enableDamping=true;orbit.update();
 const raycaster=new THREE.Raycaster();raycaster.params.Line.threshold=.30;
 renderer.domElement.addEventListener("click",event=>{
  const bounds=renderer.domElement.getBoundingClientRect(),
    pointer=new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(clickables,false);
  if(hits.length)choose(hits[0].object.userData.id);
 });
 window.addEventListener("resize",()=>{const w=container.clientWidth,h=container.clientHeight;
  camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h);});
 const animate=()=>{requestAnimationFrame(animate);orbit.update();renderer.render(scene,camera);};animate();
}
function renderThree(){
 if(group){scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 group=new THREE.Group();clickables=[];
 const add=(e,mesh)=>{mesh.userData.id=e.id;group.add(mesh);clickables.push(mesh);};
 for(const e of model.elements){
  if(!shown.has(e.kind))continue;
  const active=e.id===selectedId,color=active?0xf26b21:palette[e.kind];
  if(e.kind==="column"){
   // Source identifies the CENTRE only; width/height here are schematic.
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(.17,2.8,.17),new THREE.MeshStandardMaterial({color}));
   mesh.position.set(e.x,1.4,e.z);add(e,mesh);
  }else if(e.kind==="footing"){
   // Preserve the real plan footprint; visible thickness is display-only.
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(e.dx,.07,e.dz),new THREE.MeshStandardMaterial({
    color:e.conflict?0xd35030:color,transparent:true,opacity:.58}));
   mesh.position.set(e.x,-.17,e.z);add(e,mesh);
  }else{
   // Only the horizontal native CAD line is supported: Y is display-only.
   const points=[new THREE.Vector3(e.ax,e.kind==="beam"?2.75:.04,e.az),
     new THREE.Vector3(e.bx,e.kind==="beam"?2.75:.04,e.bz)];
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
     new THREE.LineBasicMaterial({color:color,linewidth:2}));
   add(e,line);
  }
 }
 scene.add(group);
}
function drawTable(){
 const kind=$("filter").value,query=$("search").value.trim().toLowerCase();
 const selected=model.elements.filter(e=>(kind==="all"||kind===e.kind)&&(!query||
  [e.id,e.label,e.grid,e.type,sourceHandles(e),e.status].filter(Boolean).join(" ").toLowerCase().includes(query)));
 $("rowcount").textContent=selected.length+" displayed / "+model.elements.length+" source elements";
 const tbody=$("rows");tbody.replaceChildren();
 for(const e of selected){
  const tr=document.createElement("tr");tr.dataset.id=e.id;tr.classList.toggle("selected",e.id===selectedId);
  tr.tabIndex=0;
  const fields=[e.id,labels[e.kind],e.label||e.type||e.id,fmt(e.x)+" / "+fmt(e.z),sourceHandles(e),e.status];
  for(const v of fields){const td=document.createElement("td");td.textContent=v;tr.append(td);}
  tr.addEventListener("click",()=>choose(e.id));
  tr.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();choose(e.id);}});
  tbody.append(tr);
 }
}
function choose(id){
 const e=elementMap.get(id);if(!e)return;
 selectedId=id;
 $("selected").textContent=[
  (e.label||e.id)+" — "+labels[e.kind], "Stable ID: "+e.id, "World X/Z: "+fmt(e.x)+" / "+fmt(e.z)+" m",
  "Source: "+e.source.file,"CAD handle(s): "+sourceHandles(e),"Source-native coordinates: "+
  JSON.stringify(e.source.sourceMM||e.source.nativeLineMM||e.source.nativeLineMM),
  e.kind==="footing"?"Native drawn footprint: "+e.dx+" × "+e.dz+" m · columns: "+e.columnIds.join(", "):"",
  e.kind==="beam"?"DXF paired-edge width: "+e.width+" m; height and support graph unverified":"",
  ...(e.kind==="beam"?model.beamEndpointReview.details.filter(v=>v.beamId===e.id).map(v=>
   "Endpoint "+v.end+": nearest column candidate "+v.nearestColumnId+
   " at "+v.distanceM+" m; proximity within "+beamReview.toleranceM+" m: "+
   (v.withinDisplayTolerance?"YES":"NO — REVIEW")+"; not confirmed as support"):[]),
  e.conflict?"G1 CRITICAL: native drawn 1.8 × 1.8 m while IF3 callout/schedule requires 2.1 × 2.1 m":"",
  "Status: "+e.status,"This is source geometry for review, NOT structural approval."
 ].filter(Boolean).join("\n");
 drawPlan();renderThree();drawTable();
 const row=$("rows").querySelector('tr[data-id="'+id+'"]');if(row)row.scrollIntoView({block:"nearest"});
}
for(const box of document.querySelectorAll('.toolbar input[type="checkbox"]'))
 box.addEventListener("change",()=>{box.checked?shown.add(box.value):shown.delete(box.value);drawPlan();renderThree();});
for(const id of ["filter","search"])$(id).addEventListener(id==="filter"?"change":"input",drawTable);
initThree();drawPlan();renderThree();drawTable();
window.AADSourceReview={
 getSnapshot:()=>model,getSelected:()=>elementMap.get(selectedId)||null,selectById:choose,
 getViewCoordinateProof:(id)=>{
  const e=elementMap.get(id);
  if(!e)throw Error("Unknown source element "+id);
  const dom=[...svg.querySelectorAll("[data-id]")].find(x=>x.getAttribute("data-id")===id);
  const visual=clickables.find(x=>x.userData.id===id);
  const row=[...$("rows").querySelectorAll("tr")].find(x=>x.dataset.id===id);
  const plan=dom&&e.kind==="column"?{x:Number(dom.getAttribute("cx")),z:Number(dom.getAttribute("cy"))}:
   dom&&e.kind==="footing"?{x:Number(dom.getAttribute("x"))+Number(dom.getAttribute("width"))/2,
    z:Number(dom.getAttribute("y"))+Number(dom.getAttribute("height"))/2}:null;
  const mesh=visual&&["column","footing"].includes(e.kind)?{x:visual.position.x,z:visual.position.z}:null;
  return{elementId:id,source:{x:e.x,z:e.z},plan,mesh,
   table:row?{x:Number(row.cells[3].textContent.split("/")[0]),z:Number(row.cells[3].textContent.split("/")[1])}:null};
 }
};
