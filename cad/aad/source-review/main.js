/* Reusable AAD source-review viewport: source-derived horizontal XY → world XZ.
 * 2D and Three.js use one normalized source assembly; no legacy inferred grid.
 * Vertical column/beam/elevation depths in this stage are SCHEMATIC.
 */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
const $=id=>document.getElementById(id);
const moduleURL=file=>new URL("../../../assets/js/"+file,location.href).href;
const {createSourceGroundFloorReview}=await import(/* @vite-ignore */moduleURL("aad-source-ground-floor.mjs"));
const {bridgeM70Plinth}=await import(/* @vite-ignore */moduleURL("aad-m70-plinth-bridge.mjs"));
const {reconcileM23Stages}=await import(/* @vite-ignore */moduleURL("aad-m23-governed-stages.mjs"));
const {deriveUserQAPreview}=await import(/* @vite-ignore */moduleURL("aad-m24-user-reviewed-preview.mjs"));
const {createAADSvgNavigator}=await import(/* @vite-ignore */moduleURL("aad-source-svg-navigation.mjs"));
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
// Opt-in project adapter lives beside the project ledger; the shared viewer
// never hardcodes a Narayani stage, and frozen stage bytes remain untouched.
let plinth=null,staged=null,adapter=null,userQA=null;
const adapterURL=new URL(dataURL.pathname.replace(/[^/]+$/,"aad-source-stage-links-v1.json"),location.origin);
const adapterResponse=await fetch(adapterURL.href,{cache:"no-store"});
if(adapterResponse.ok){
 adapter=await adapterResponse.json();
 if(adapter.schema!=="jp-cad://aad-project-stage-links/1"||adapter.projectId!==model.projectId)
  throw Error("Invalid source-project stage adapter");
 for(const item of adapter.additionalLayers||[]){
  if(item.kind!=="plinth-beam"||item.stage!=="M70")throw Error("Unsupported source stage adapter");
  const stageURL=new URL(item.dataPath,location.origin),metaURL=new URL(item.metadataPath,location.origin);
  if(stageURL.origin!==location.origin||metaURL.origin!==location.origin||
   !stageURL.pathname.endsWith("/stages/m70/stage-data.json")||
   !metaURL.pathname.endsWith("/stages/m70/meta.json"))
   throw Error("Frozen M70 adapter must resolve to the known same-origin stage snapshots");
  const [dataResponse,metaResponse]=await Promise.all([
   fetch(stageURL.href,{cache:"no-store"}),fetch(metaURL.href,{cache:"no-store"})]);
  if(!dataResponse.ok||!metaResponse.ok)throw Error("Missing required M70 frozen source stage");
  const stage=await dataResponse.json(),meta=await metaResponse.json();
  plinth=bridgeM70Plinth(model,stage,meta);
  plinth.grid=stage.spatial_db.grid;
  model.elements.push(...plinth.records);
  model.counts["plinth-beam"]=plinth.runCount;
  model.m70PlinthReview=plinth;
 }
 if(adapter.governedStages){
  if(!plinth)throw Error("M60/M40/V03 stages require M70 registered grid");
  const loaded={};
  for(const key of ["m60","m40","v03"]){
   const spec=adapter.governedStages[key];if(!spec)throw Error("Missing "+key+" source");
   const p=new URL(spec.dataPath,location.origin),q=new URL(spec.metadataPath,location.origin);
   if(p.origin!==location.origin||q.origin!==location.origin||
    !p.pathname.endsWith("/stages/"+key+"/stage-data.json")||
    !q.pathname.endsWith("/stages/"+key+"/meta.json"))
    throw Error("Untrusted governed source "+key);
   const [a,b]=await Promise.all([fetch(p.href,{cache:"no-store"}),fetch(q.href,{cache:"no-store"})]);
   if(!a.ok||!b.ok)throw Error("Missing "+key+" frozen snapshot");
   loaded[key]=await a.json();loaded[key+"Meta"]=await b.json();
  }
  staged=reconcileM23Stages(model,plinth,loaded.m60,loaded.m40,loaded.v03,
   {m60:loaded.m60Meta,m40:loaded.m40Meta,v03:loaded.v03Meta});
  model.elements.push(...staged.columns,...staged.footings);
  model.counts["stage-column"]=staged.columns.length;
  model.counts["stage-footing"]=staged.footings.length;
  model.governedStageReview=staged;
 }
 if(params.get("qa")==="user-reviewed"){
  if(!adapter.optionalUserQA||!plinth||!staged)
   throw Error("User QA mode requires project-owned stage sources");
  const qaURL=new URL(adapter.optionalUserQA.dataPath,location.origin);
  if(qaURL.origin!==location.origin||
     !qaURL.pathname.endsWith("/aad-user-qa-decisions-v1.json"))
   throw Error("Unsupported user QA review file");
  const result=await fetch(qaURL.href,{cache:"no-store"});
  if(!result.ok)throw Error("Missing user-reviewed decisions");
  let approval=null;
  if(adapter.optionalUserQA.messageApprovalPath){
   const approvedURL=new URL(adapter.optionalUserQA.messageApprovalPath,location.origin);
   if(approvedURL.origin!==location.origin||
      !approvedURL.pathname.endsWith("/aad-user-message-approval-20261024.json"))
    throw Error("M25 unexpected user authorization source");
   const approvedResponse=await fetch(approvedURL.href,{cache:"no-store"});
   if(!approvedResponse.ok)throw Error("Missing M25 user message approval event");
   approval=await approvedResponse.json();
  }
  userQA=deriveUserQAPreview(model,plinth,staged,await result.json(),approval);
  model.elements.push(...userQA.columns,...userQA.footings);
  model.counts["qa-column"]=userQA.columns.length;
  model.counts["qa-footing"]=userQA.footings.length;
  model.userQAWorkingReview=userQA;
 }
}else if(adapterResponse.status!==404)throw Error("Cannot load project stage adapter ("+adapterResponse.status+")");
$("name").textContent=model.name;
const labels={"column":"DXF comparison columns","footing":"DXF comparison footings",
 "beam":"DXF archived beam candidates","plinth-beam":"M70 GF/plinth beams",
 "stage-column":"M60 columns","stage-footing":"M40/V03 footings",
 "qa-column":"User QA proposed columns (HOLD)","qa-footing":"User QA DXF footings (HOLD)",
 "architectural-line":"Architectural edges"};
if(staged){
 $("m60-layer-label").hidden=false;$("m40-layer-label").hidden=false;
 for(const kind of ["beam","column","footing"]){
  const ctl=document.querySelector('.toolbar input[value="'+kind+'"]');
  if(ctl)ctl.checked=false;
 }
 for(const issue of staged.issues){
  const li=document.createElement("li");li.className="warning";
  li.textContent=issue.code+" · "+issue.note;$("issues").append(li);
 }
}
if(userQA){
 $("qa-column-label").hidden=false;$("qa-footing-label").hidden=false;
 for(const kind of ["stage-column","stage-footing","column","footing","beam"]){
  const ctl=document.querySelector('.toolbar input[value="'+kind+'"]');
  if(ctl)ctl.checked=false;
 }
 const hold=document.createElement("li");hold.className="warning";
 hold.textContent=(userQA.userMessageApproval?
   "M25 USER CHAT APPROVAL RECORDED for the M24 review proposal. Engineering design checks remain OPEN. ":
   "M24 USER-REVIEWED WORKING PROPOSAL ONLY. ")+
  "23 DXF-preferred columns with "+
  "I4 removed from proposed geometry and Ø350 I3 added at M70 beam junction; "+
  "21 original DXF footing outlines. NOT engineering-approved or for construction. "+
  "F3 answer contradiction, G1 footing/excavation allowance and orphan CF1 I4 support remain unresolved.";
 $("issues").append(hold);
 for(const item of userQA.discrepancies){
  const li=document.createElement("li");li.className="warning";
  li.textContent=item.code+": "+item.note;$("issues").append(li);
 }
}
if(plinth){
 const control=$("plinth-layer-label");control.hidden=false;
 const m70Info=document.createElement("li");m70Info.className="warning";
 m70Info.textContent="M70 FROZEN PLINTH NETWORK: "+plinth.runCount+
  " source-backed runs · "+plinth.centerlineLengthM.toFixed(3)+" m total · "+
  "230 × 300 mm · registered against 23 DXF column-grid controls (maximum residual "+
  (plinth.maxColumnResidualM*1000).toFixed(2)+" mm). "+
  "M70 governs GF/plinth beams; DXF candidate lines are archival comparison evidence.";
 $("issues").append(m70Info);
 for(const issue of plinth.warnings){const item=document.createElement("li");
  item.className="warning";item.textContent=issue;$("issues").append(item);}
 // Initially show the plinth-beam design network rather than the incomplete
 // GF paired-edge source candidates. Both remain manually switchable.
 const oldBeamBox=document.querySelector('.toolbar input[value="beam"]');
 if(oldBeamBox)oldBeamBox.checked=false;
}
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
const palette={"column":0x168267,"footing":0x9a79ba,"beam":0xd29a50,
 "plinth-beam":0x984914,"stage-column":0x0a9665,"stage-footing":0x9567b1,
 "qa-column":0x00598c,"qa-footing":0x9a5996,"architectural-line":0x376b7f};
const shown=new Set(Object.keys(labels));
if(plinth)shown.delete("beam");else shown.delete("plinth-beam");
if(staged){shown.delete("column");shown.delete("footing");}
else {shown.delete("stage-column");shown.delete("stage-footing");}
if(userQA){shown.delete("stage-column");shown.delete("stage-footing");}
else {shown.delete("qa-column");shown.delete("qa-footing");}
const elementMap=new Map(model.elements.map(e=>[e.id,e]));
let selectedId=null,pinned=null,hovered=null,threePinMarker=null,proposedCrossing=null;
const fmt=n=>Number.isFinite(n)?n.toFixed(3):"—";
const sourceHandles=e=>e.source.entityHandles?.join(", ")||e.source.entityHandle||"none";
const ns="http://www.w3.org/2000/svg";
// Attach drag suppression before registering the click-to-pin listener.
const planNav=createAADSvgNavigator(svg,extents);
function node(tag,props={},text=null){const p=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props))p.setAttribute(k,v);
 if(text!==null)p.textContent=text;return p;}

const beamChoices=model.elements.filter(e=>e.kind==="beam"||e.kind==="plinth-beam");
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

$("zoom-in").addEventListener("click",()=>planNav.zoomIn());
$("zoom-out").addEventListener("click",()=>planNav.zoomOut());
$("zoom-reset").addEventListener("click",()=>planNav.reset());
function extents(){
 const b=model.bounds;return{x:b.minX-.9,y:b.minZ-.9,w:b.maxX-b.minX+1.8,h:b.maxZ-b.minZ+1.8};
}
function drawPlan(){
 const b=extents();planNav.apply();
 svg.setAttribute("preserveAspectRatio","xMidYMid meet");svg.replaceChildren();
 const background=node("rect",{x:b.x,y:b.y,width:b.w,height:b.h,fill:"#edf7f7"});svg.append(background);
 const ggrid=node("g",{stroke:"#bed6d8","stroke-width":".013"});
 for(let x=Math.floor(b.x);x<=b.x+b.w;x++)ggrid.append(node("line",{x1:x,y1:b.y,x2:x,y2:b.y+b.h}));
 for(let z=Math.floor(b.y);z<=b.y+b.h;z++)ggrid.append(node("line",{x1:b.x,y1:z,x2:b.x+b.w,y2:z}));
 svg.append(ggrid);
 for(const e of [...model.elements].sort((a,b)=>({"architectural-line":0,footing:1,beam:2,"plinth-beam":3,"stage-footing":4,"stage-column":5,column:6,
 "qa-footing":7,"qa-column":8}[a.kind])-({"architectural-line":0,footing:1,beam:2,
 "plinth-beam":3,"stage-footing":4,"stage-column":5,column:6,"qa-footing":7,"qa-column":8}[b.kind]))){
  if(!shown.has(e.kind))continue;
  const active=e.id===selectedId;
  let g;
  if(["column","stage-column","qa-column"].includes(e.kind)){
   const stageCol=e.kind==="stage-column"||e.kind==="qa-column";
   g=node("circle",{cx:e.x,cy:e.z,r:stageCol?e.width/2:(active?.21:.14),
    fill:active?"#f26923":stageCol?"#0e9665":"#0e8461",stroke:"#fff","stroke-width":".055"});
  } else if(["footing","stage-footing","qa-footing"].includes(e.kind)){
   g=node("rect",{x:e.x-e.dx/2,y:e.z-e.dz/2,width:e.dx,height:e.dz,
    fill:e.conflict?"#f4bca4":active?"#cfb5e3":"#c6b3da",
    "fill-opacity":".45",stroke:e.conflict?"#d7492b":"#8d64b2",
    "stroke-dasharray":e.conflict?".23 .12":undefined,"stroke-width":active?".095":".048"});
   if(e.conflict){const alert=node("text",{x:e.x+e.dx/2+.12,y:e.z,"font-size":".19",fill:"#bb3920"},"!");svg.append(alert);}
  } else{
   const colors=e.kind==="plinth-beam"?"#984914":e.kind==="beam"?"#bd884b":"#356c79";
   g=node("line",{x1:e.ax,y1:e.az,x2:e.bx,y2:e.bz,
    stroke:active?"#ed681d":colors,"stroke-width":active?".15":e.kind==="plinth-beam"?".23":e.kind==="beam"?".115":".065",
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
 orbit.enableDamping=true;orbit.update();orbit.saveState();
 $("reset-3d").addEventListener("click",()=>{orbit.reset();orbit.update();});
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
  if(["column","stage-column","qa-column"].includes(e.kind)){
   // Source identifies the CENTRE only; width/height here are schematic.
   const stageCol=e.kind==="stage-column"||e.kind==="qa-column";
    const shape=stageCol?(e.circular?new THREE.CylinderGeometry(e.width/2,e.width/2,2.8,24):
     new THREE.BoxGeometry(e.width,2.8,e.depth)):new THREE.BoxGeometry(.17,2.8,.17);
    const mesh=new THREE.Mesh(shape,new THREE.MeshStandardMaterial({color}));
   mesh.position.set(e.x,1.4,e.z);add(e,mesh);
  }else if(["footing","stage-footing","qa-footing"].includes(e.kind)){
   // Preserve the real plan footprint; visible thickness is display-only.
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(e.dx,.07,e.dz),new THREE.MeshStandardMaterial({
    color:e.conflict?0xd35030:color,transparent:true,opacity:.58}));
   mesh.position.set(e.x,-.17,e.z);add(e,mesh);
  }else if(e.kind==="plinth-beam"){
   // M70 has a source-supported 230x300mm rectangular section; height/location
   // along Y remains a SCHEMATIC visual aid only, not construction set-out.
   const length=Math.hypot(e.bx-e.ax,e.bz-e.az);
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(length,.30,.23),
    new THREE.MeshStandardMaterial({color}));
   mesh.rotation.y=-Math.atan2(e.bz-e.az,e.bx-e.ax);
   mesh.position.set(e.x,.60,e.z);add(e,mesh);
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
  "Source: "+e.source.file,"Source handle / run: "+sourceHandles(e),"Source-native coordinates: "+
  JSON.stringify(e.source.sourceMM||e.source.nativeLineMM||e.source.nativeLineMM),
  ["footing","stage-footing","qa-footing"].includes(e.kind)?
   "Footing footprint: "+e.dx+" × "+e.dz+" m · linked working columns "+
    e.columnIds.join(", "):"",
   e.kind==="qa-column"?"QA proposed column "+e.grid+" · "+e.section+
    " · source "+(e.source.dxfId||e.source.originalDXFColumnId||"none")+
    " · construction HOLD.":"",
   e.kind==="qa-footing"?"DXF source "+e.source.dxfId+
    " · stage comparison "+JSON.stringify(e.stageComparison)+
    " · original support IDs "+e.originalDxfColumnIds.join(", ")+
    " · orphaned "+(e.orphanOriginalColumnIds.join(", ")||"none")+
    " · extra excavation/formwork working space >100mm is a SEPARATE unmeasured allowance.":"",
   e.kind==="stage-column"?"M60 section "+e.section+"; DXF candidate "+
    (e.otherSource?.dxfColumnId||"none")+"; offset "+(e.otherSource?.distanceToDxfM??"unmatched")+" m":"",
   e.kind==="stage-footing"?"M40 depth "+e.drawingDepthM+" m; V03 "+
    e.rebar.barSpec+"; cover "+e.rebar.coverMm+" mm; original DXF "+
    (e.otherSource.dxfFootingId||"unmatched")+" "+
    (e.otherSource.dxfPlanSizeM?.join("×")||"no comparison")+" m":"",
  e.kind==="beam"?"GF DXF paired-edge width: "+e.width+" m; height and support graph unverified":"",
  e.kind==="plinth-beam"?"M70 plinth run "+e.fromGrid+" → "+e.toGrid+
   " · frozen centerline "+e.lengthM+" m · source section 230 × 300 mm. "+
   "Ground-floor level label and vertical location remain schematic in 3D; not engineering-certified.":"",
  ...(e.kind==="beam"?model.beamEndpointReview.details.filter(v=>v.beamId===e.id).map(v=>
   "Endpoint "+v.end+": nearest column candidate "+v.nearestColumnId+
   " at "+v.distanceM+" m; proximity within "+beamReview.toleranceM+" m: "+
   (v.withinDisplayTolerance?"YES":"NO — REVIEW")+"; not confirmed as support"):[]),
  e.conflict?"STAGE/DXF CONFLICT HOLD. G1: M40/V03 IF3 2.1×2.1 m; original DXF outline 1.8×1.8 m. Do not issue construction geometry.":"",
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
 getPlanView:()=>planNav.view(),resetPlanView:()=>planNav.reset(),getGovernedStages:()=>staged,getUserQAPreview:()=>userQA,
 zoomPlan:factor=>planNav.zoom(factor),getM70Plinth:()=>plinth,
 getPinnedPoint:()=>pinned?{...pinned}:null,getHoverPoint:()=>hovered?{...hovered}:null,
 getProjectedCrossing:()=>proposedCrossing?{...proposedCrossing}:null,
 pinWorldPoint:(x,z)=>pinWorldPoint({x,z},"USER_EXPLICIT_COORDINATE"),
 getViewCoordinateProof:(id)=>{
  const e=elementMap.get(id);
  if(!e)throw Error("Unknown source element "+id);
  const dom=[...svg.querySelectorAll("[data-id]")].find(x=>x.getAttribute("data-id")===id);
  const visual=clickables.find(x=>x.userData.id===id);
  const row=[...$("rows").querySelectorAll("tr")].find(x=>x.dataset.id===id);
  const plan=dom&&["column","stage-column","qa-column"].includes(e.kind)?{x:Number(dom.getAttribute("cx")),z:Number(dom.getAttribute("cy"))}:
   dom&&["footing","stage-footing","qa-footing"].includes(e.kind)?{x:Number(dom.getAttribute("x"))+Number(dom.getAttribute("width"))/2,
    z:Number(dom.getAttribute("y"))+Number(dom.getAttribute("height"))/2}:
   dom&&["beam","plinth-beam","architectural-line"].includes(e.kind)?
    {x:(Number(dom.getAttribute("x1"))+Number(dom.getAttribute("x2")))/2,
     z:(Number(dom.getAttribute("y1"))+Number(dom.getAttribute("y2")))/2}:null;
  const mesh=visual&&["column","footing","plinth-beam","stage-column","stage-footing","qa-column","qa-footing"].includes(e.kind)?{x:visual.position.x,z:visual.position.z}:null;
  return{elementId:id,source:{x:e.x,z:e.z},plan,mesh,
   table:row?{x:Number(row.cells[3].textContent.split("/")[0]),z:Number(row.cells[3].textContent.split("/")[1])}:null};
 }
};
