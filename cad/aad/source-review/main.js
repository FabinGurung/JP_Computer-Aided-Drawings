/* Reusable AAD source-review viewport: source-derived horizontal XY → world XZ.
 * 2D and Three.js use one normalized source assembly; no legacy inferred grid.
 * Vertical column/beam/elevation depths in this stage are SCHEMATIC.
 */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
const $=id=>document.getElementById(id);
const moduleURL=file=>new URL("../../../assets/js/"+file,location.href).href;
const {createSourceGroundFloorReview}=await import(/* @vite-ignore */moduleURL("aad-source-ground-floor.mjs"));
const {findProjectedBeamCrossing,nearestSourceElements,worldXZToNativeStructuralMM}=
 await import(/* @vite-ignore */moduleURL("aad-source-coordinate-picking.mjs"));
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
let selectedId=null,pinned=null,hovered=null,threePinMarker=null,proposedCrossing=null;
const fmt=n=>Number.isFinite(n)?n.toFixed(3):"—";
const sourceHandles=e=>e.source.entityHandles?.join(", ")||e.source.entityHandle||"none";
const ns="http://www.w3.org/2000/svg";
function node(tag,props={},text=null){const p=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props))p.setAttribute(k,v);
 if(text!==null)p.textContent=text;return p;}

const beamChoices=model.elements.filter(e=>e.kind==="beam");
for(const select of [$("pin-beam-a"),$("pin-beam-b")]){
 for(const e of beamChoices){
  const option=document.createElement("option");option.value=e.id;option.textContent=e.id;select.append(option);
 }
}
$("pin-beam-a").value=elementMap.has("SB-GF-018")?"SB-GF-018":beamChoices[0]?.id||"";
$("pin-beam-b").value=elementMap.has("SB-GF-020")?"SB-GF-020":beamChoices[1]?.id||"";
function prepareCrossing(){
 try{
  proposedCrossing=findProjectedBeamCrossing(model.elements,$("pin-beam-a").value,$("pin-beam-b").value);
  const nearI4=elementMap.get("SC-I4");
  const gap=nearI4?Math.hypot(nearI4.x-proposedCrossing.x,nearI4.z-proposedCrossing.z):null;
  $("pin-proposal").textContent="Extended candidate centrelines: "+
   proposedCrossing.beamIds.join(" × ")+" → X "+fmt(proposedCrossing.x)+
   ", Z "+fmt(proposedCrossing.z)+" m. Endpoint extensions: "+
   fmt(proposedCrossing.extensionA_m)+" / "+fmt(proposedCrossing.extensionB_m)+
   " m. "+(gap!==null?"SC-I4 source centre is "+fmt(gap)+" m away. ":"")+
   (proposedCrossing.onBothOriginalSegments?"On both candidate segments. ":
    "These candidate segments do NOT physically intersect as extracted; projected extensions only. ")+
   "No structural geometry is moved or approved.";
  $("pin-crossing").disabled=!proposedCrossing.withinReviewExtensionLimit;
 }catch(error){
  proposedCrossing=null;$("pin-crossing").disabled=true;
  $("pin-proposal").textContent="Cannot determine a reliable projected crossing: "+error.message;
 }
}
for(const sel of [$("pin-beam-a"),$("pin-beam-b")])sel.addEventListener("change",prepareCrossing);
function planarCursor(event){
 const ctm=svg.getScreenCTM();
 if(!ctm)return null;
 const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
 const result=p.matrixTransform(ctm.inverse());
 return Number.isFinite(result.x)&&Number.isFinite(result.y)?{x:result.x,z:result.y}:null;
}
function threeGroundCursor(event){
 if(!camera||!renderer)return null;
 const canvas=renderer.domElement,box=canvas.getBoundingClientRect();
 if(!box.width||!box.height)return null;
 const position=new THREE.Vector2((event.clientX-box.left)/box.width*2-1,
  -(event.clientY-box.top)/box.height*2+1);
 const ray=new THREE.Raycaster();ray.setFromCamera(position,camera);
 const point=new THREE.Vector3();
 if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),point))return null;
 return Number.isFinite(point.x)&&Number.isFinite(point.z)?{x:point.x,z:point.z}:null;
}
function showHover(where,p){
 if(!p)return;
 hovered={view:where,x:p.x,z:p.z};
 $(where==="2D"?"cursor2d":"cursor3d").textContent=where+
  " X "+fmt(p.x)+" · Z "+fmt(p.z)+" m";
}
function drawPlanPin(){
 if(!pinned)return;
 const cross=node("g",{"data-pinned-coordinate":"true","pointer-events":"none"});
 const x=pinned.x,z=pinned.z,reach=.35;
 cross.append(node("circle",{cx:x,cy:z,r:.16,fill:"none",stroke:"#e74e1b",
  "stroke-width":".065"}));
 cross.append(node("line",{x1:x-reach,y1:z,x2:x+reach,y2:z,stroke:"#e74e1b","stroke-width":".055"}));
 cross.append(node("line",{x1:x,y1:z-reach,x2:x,y2:z+reach,stroke:"#e74e1b","stroke-width":".055"}));
 cross.append(node("title",{},"Pinned world X "+fmt(x)+" / Z "+fmt(z)+" metres · user review only"));
 svg.append(cross);
}
function drawThreePin(){
 if(!scene)return;
 if(threePinMarker){scene.remove(threePinMarker);threePinMarker.traverse(o=>{
  o.geometry?.dispose();o.material?.dispose();});threePinMarker=null;}
 if(!pinned)return;
 const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0xe74e1b,side:THREE.DoubleSide});
 const ring=new THREE.Mesh(new THREE.RingGeometry(.15,.21,40),mat);
 ring.rotation.x=-Math.PI/2;g.add(ring);
 const points=[new THREE.Vector3(-.4,0,0),new THREE.Vector3(.4,0,0),
  new THREE.Vector3(0,0,-.4),new THREE.Vector3(0,0,.4)];
 const lines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),
  new THREE.LineBasicMaterial({color:0xe74e1b}));
 g.add(lines);g.position.set(pinned.x,.09,pinned.z);scene.add(g);threePinMarker=g;
}
function pinWorldPoint(p,method="USER_PICK"){
 if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z))throw Error("World coordinate is not finite");
 // Precision of this marker is display precision, not certified source survey.
 pinned={x:Math.round(p.x*1e6)/1e6,z:Math.round(p.z*1e6)/1e6,method};
 const native=worldXZToNativeStructuralMM(model.registration,pinned);
 const near=nearestSourceElements(model.elements,pinned,5);
 const comparison=elementMap.get("SC-I4");
 const sep=comparison?Math.hypot(pinned.x-comparison.x,pinned.z-comparison.z):null;
 const report=[
  "PIN: "+method+" · registered world X "+fmt(pinned.x)+", Z "+fmt(pinned.z)+" m",
  "Structural DXF native (derived by inverse registration): X "+native.x.toFixed(3)+
   " mm, Y "+native.y.toFixed(3)+" mm",
  ...(sep!==null?["Existing SC-I4 source X "+fmt(comparison.x)+", Z "+fmt(comparison.z)+
   " m · pin is "+fmt(sep)+" m from original"]:[]),
  "Nearest source candidates (not validated supports):",
  ...near.map(v=>"  "+v.elementId+" ["+v.kind+"] "+fmt(v.distanceM)+" m"),
  "HOLD: Cursor or projected intersection does not revise structural DXF or BIM."
 ];
 const value=report.join("\n");$("pin-details").textContent=value;
 $("pin-copy-text").value=value;
 $("pin-status").textContent=method==="PROJECTED_BEAM_CROSSLINES"?
  "Projected beam crossing pinned; source column unchanged":
  "Pinned "+fmt(pinned.x)+" / "+fmt(pinned.z)+" m ("+method+")";
 $("pin-copy").disabled=false;drawPlan();drawThreePin();return pinned;
}
$("pin-crossing").addEventListener("click",()=>{
 if(proposedCrossing?.withinReviewExtensionLimit)pinWorldPoint(proposedCrossing,"PROJECTED_BEAM_CROSSLINES");
});
$("pin-clear").addEventListener("click",()=>{
 pinned=null;$("pin-status").textContent="No pinned point; click/tap a 2D or 3D coordinate.";
 $("pin-copy-text").value="No point pinned";$("pin-details").textContent="No point pinned";
 $("pin-copy").disabled=true;drawPlan();drawThreePin();
});
$("pin-copy").addEventListener("click",async()=>{
 const field=$("pin-copy-text");field.focus();field.select();
 try{await navigator.clipboard.writeText(field.value);$("pin-status").textContent="Coordinate description copied.";}
 catch{$("pin-status").textContent="Text selected; use your browser's Copy command.";}
});
svg.addEventListener("pointermove",event=>showHover("2D",planarCursor(event)));
svg.addEventListener("click",event=>{
 const p=planarCursor(event);if(p)pinWorldPoint(p,"2D_TAP");
},true);
prepareCrossing();
\nfunction extents(){
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
 drawPlanPin();
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
 renderer.domElement.addEventListener("pointermove",event=>showHover("3D",threeGroundCursor(event)));
 renderer.domElement.addEventListener("click",event=>{
  const p=threeGroundCursor(event);if(p)pinWorldPoint(p,"3D_GROUND_TAP");
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
 scene.add(group);drawThreePin();
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
 getPinnedPoint:()=>pinned?{...pinned}:null,getHoverPoint:()=>hovered?{...hovered}:null,
 getProjectedCrossing:()=>proposedCrossing?{...proposedCrossing}:null,
 pinWorldPoint:(x,z)=>pinWorldPoint({x,z},"USER_EXPLICIT_COORDINATE"),
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
