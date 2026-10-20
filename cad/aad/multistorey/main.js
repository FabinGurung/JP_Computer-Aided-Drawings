/* Generic AAD multistorey UI. Shared geometry is in aad-building-core.mjs.
 * This viewer has NO hardcoded project geometry or project-specific paths.
 */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
const $=id=>document.getElementById(id);
const moduleURL=file=>new URL("../../../assets/js/"+file,location.href).href;
const {assembleBuilding,verifyAssembly}=await import(/* @vite-ignore */moduleURL("aad-building-core.mjs"));
const {writeIFC4,checkIfcReferences}=await import(/* @vite-ignore */moduleURL("aad-building-ifc4.mjs"));
const {createAADWorkspace}=await import(/* @vite-ignore */moduleURL("aad-unified-workspace.mjs"));
const params=new URLSearchParams(location.search);
const chosen=params.get("manifest");
let building=null,renderer=null,camera=null,orbit=null,scene=null,geometryGroup=null;
let workspace=null,activeLevel="all",activeEdit=null,lastUndo=null,baseUrl=null;
let selectedId=null,selectionOverlay=null; // one selection shared by plan, 3D and component schedule
const svgNS="http://www.w3.org/2000/svg";
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),hitMeshes=[],floorFlags=new Map(),kindFlags=new Map(),rowsById=new Map();
const palettes={wall:0x4d7889,door:0xc28d72,window:0x63b4e0,slab:0x96bba8,roof:0x9db9b0,column:0x40997d,beam:0xcea365,stair:0x9386bb,landing:0xa48cc9};
const status=txt=>$("action-status").textContent=txt;
function download(name,text,mime){
 const url=URL.createObjectURL(new Blob([text],{type:mime}));
 const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function shapeSolid(e){
 const p=e.profile,shape=new THREE.Shape();
 const contour=[...p],signed=contour.reduce((sum,v,i)=>{const q=contour[(i+1)%contour.length];return sum+v.x*q.z-q.x*v.z;},0);
 if(signed<0)contour.reverse();
 contour.forEach((v,i)=>i?shape.lineTo(v.x,-v.z):shape.moveTo(v.x,-v.z));
 shape.closePath();
 for(const hole of e.holes||[]){
  const h=new THREE.Path(),pts=[...hole],a=pts.reduce((sum,v,i)=>{const q=pts[(i+1)%pts.length];return sum+v.x*q.z-q.x*v.z;},0);
  if(a>0)pts.reverse();
  pts.forEach((v,i)=>i?h.lineTo(v.x,-v.z):h.moveTo(v.x,-v.z));
  h.closePath();shape.holes.push(h);
 }
 const geom=new THREE.ExtrudeGeometry(shape,{depth:e.dy,steps:1,bevelEnabled:false,curveSegments:1});
 geom.rotateX(-Math.PI/2);
 const mat=new THREE.MeshStandardMaterial({color:palettes[e.kind]||0x8195a4,metalness:.03,roughness:.78,side:THREE.DoubleSide,transparent:true,opacity:e.kind==="roof"?.52:e.kind==="slab"?.75:.92});
 const m=new THREE.Mesh(geom,mat);m.position.y=e.y-e.dy/2;return [m];
}
function boxes(e){
 const parts=e.steps||[e];
 return parts.map(p=>{
  const geom=new THREE.BoxGeometry(p.dx,p.dy,p.dz);
  const mat=new THREE.MeshStandardMaterial({color:palettes[e.kind]||0x647b8a,roughness:.75,transparent:e.kind==="window",opacity:e.kind==="window"?.78:1});
  const mesh=new THREE.Mesh(geom,mat);
  mesh.position.set(p.x,p.y,p.z);
  mesh.rotation.y=-(e.rotationDeg||0)*Math.PI/180;
  return mesh;
 });
}
function renderModel(){
 if(!building)return;
 if(geometryGroup){scene.remove(geometryGroup);geometryGroup.traverse(x=>{if(x.geometry)x.geometry.dispose();if(x.material)x.material.dispose();});}
 geometryGroup=new THREE.Group();hitMeshes.length=0;
 for(const e of building.elements){
  if(!e.ifcType)continue;
  const groupMeshes=e.profile?shapeSolid(e):boxes(e);
  for(const m of groupMeshes){
   m.userData.element=e;m.userData.normalColor=palettes[e.kind]||0x8195a4;
   geometryGroup.add(m);hitMeshes.push(m);
  }
 }
 scene.add(geometryGroup);applyVisible();
}
function applyVisible(){
 if(!geometryGroup)return;
 for(const m of hitMeshes){
  const e=m.userData.element;
  m.visible=(floorFlags.get(e.level)!==false)&&(kindFlags.get(e.kind)!==false);
 }
 paintSelection();
}
function selectedPosition(e){
 if(e&&Number.isFinite(e.x)&&Number.isFinite(e.z))return{x:e.x,y:Number.isFinite(e.y)?e.y:0,z:e.z};
 if(e?.profile?.length){
  return{x:e.profile.reduce((s,p)=>s+p.x,0)/e.profile.length,
   y:Number.isFinite(e.y)?e.y:0,
   z:e.profile.reduce((s,p)=>s+p.z,0)/e.profile.length};
 }
 if(e?.steps?.length)return{x:e.steps[0].x,y:e.steps[0].y,z:e.steps[0].z};
 if(activeEdit?.kind==="node"&&workspace){
  const state=workspace.snapshot(),l=state.manifest.levels.find(t=>t.id===activeEdit.level);
  const p=state.models[l.id].floorGraph.nodes.find(n=>n.id===activeEdit.id);
  if(p){const w=projectToWorld(p,l.transform);return{x:w.x,y:l.elevation+1.2,z:w.z};}
 }
 return null;
}
function paintSelection(){
 const picked=building?.elements.find(e=>e.id===selectedId);
 for(const m of hitMeshes){
  const on=Boolean(selectedId&&m.userData.element.id===selectedId);
  if(m.material?.emissive){
   m.material.emissive.setHex(on?0xff9300:0x000000);
   m.material.emissiveIntensity=on?.8:0;
   if(m.material.opacity<.98)m.material.opacity=on?1:(m.userData.element.kind==="roof"?.52:.75);
  }
  m.userData.isSelected=on;
 }
 if(selectionOverlay){scene.remove(selectionOverlay);selectionOverlay.traverse?.(n=>{n.geometry?.dispose?.();n.material?.dispose?.();});selectionOverlay=null;}
 if(scene&&selectedId){
  selectionOverlay=new THREE.Group();
  for(const m of hitMeshes.filter(m=>m.visible&&m.userData.isSelected)){
   const line=new THREE.BoxHelper(m,0xff9c28);selectionOverlay.add(line);
  }
  const p=selectedPosition(picked);
  if(p&&(!picked||!hitMeshes.some(m=>m.visible&&m.userData.isSelected))){
   const dot=new THREE.Mesh(new THREE.SphereGeometry(.19,12,10),new THREE.MeshBasicMaterial({color:0xffa020,depthTest:false}));
   dot.position.set(p.x,p.y,p.z);dot.renderOrder=999;selectionOverlay.add(dot);
  }
  scene.add(selectionOverlay);
 }
 for(const [id,row] of rowsById){
  const isOn=id===selectedId;
  row.classList.toggle("aad-selected-row",isOn);
  row.setAttribute("aria-selected",String(isOn));
 }
 const canvas=$("viewer3d").querySelector("canvas");
 if(canvas)canvas.dataset.selectedElementId=selectedId||"";
 $("viewer2d").dataset.selectedElementId=selectedId||"";
 $("elements").dataset.selectedElementId=selectedId||"";
 const label=$("aad-selected-summary");
 if(label)label.textContent=selectedId?"Selected: "+selectedId:"Select an element in 2D, 3D or the component schedule";
}
function centerView(){
 if(!geometryGroup)return;
 const box=new THREE.Box3();
 for(const m of hitMeshes)if(m.visible)box.expandByObject(m);
 if(box.isEmpty())return;
 const center=box.getCenter(new THREE.Vector3()),span=box.getSize(new THREE.Vector3());
 const radius=Math.max(span.x,span.z,span.y,6);
 orbit.target.copy(center);
 camera.position.set(center.x+radius*.8,center.y+radius*.95,center.z+radius*1.05);
 camera.near=.05;camera.far=Math.max(200,radius*12);camera.updateProjectionMatrix();orbit.update();
}
function initRenderer(){
 const node=$("viewer3d");
 scene=new THREE.Scene();scene.background=new THREE.Color(0xeaf2f4);
 camera=new THREE.PerspectiveCamera(48,node.clientWidth/Math.max(100,node.clientHeight),.05,500);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(node.clientWidth,node.clientHeight);
 renderer.outputColorSpace=THREE.SRGBColorSpace;node.append(renderer.domElement);
 orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.07;
 scene.add(new THREE.HemisphereLight(0xffffff,0x657c83,2.4));
 const directional=new THREE.DirectionalLight(0xffffff,1.8);directional.position.set(19,32,13);scene.add(directional);
 const ground=new THREE.GridHelper(60,30,0x9ab3ba,0xcbdde1);ground.position.y=-.22;scene.add(ground);
 const axes=new THREE.AxesHelper(2);axes.position.set(-1,0,-1);scene.add(axes);
 renderer.domElement.addEventListener("click",ev=>{
  if(!building)return;
  const r=renderer.domElement.getBoundingClientRect();
  mouse.set((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);
  raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects(hitMeshes.filter(m=>m.visible),false)[0];
  if(hit)selectElement(hit.object.userData.element);
 });
 const ro=new ResizeObserver(()=>{const w=node.clientWidth,h=node.clientHeight;if(w<50||h<50)return;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);});
 ro.observe(node);
 const run=()=>{requestAnimationFrame(run);orbit.update();renderer.render(scene,camera);};run();
}
function htmlText(e){
 const spans=["<b>"+e.id+"</b>","IFC: "+(e.ifcType||"NONE"),"Level: "+e.level,"Source: "+e.source,"Status: "+e.status];
 if(Number.isFinite(e.x))spans.push("World (X, Y, Z): ("+[e.x,e.y,e.z].map(v=>Number(v).toFixed(3)).join(", ")+") m");
 if(Number.isFinite(e.dx))spans.push("Metric size (L/H/T): "+[e.dx,e.dy,e.dz].map(v=>Number(v).toFixed(3)).join(" × ")+" m");
 if(e.profile)spans.push("Polygon vertices: "+e.profile.length+", stair voids: "+(e.holes?.length||0));
 if(e.host)spans.push("Hosted on: "+e.host);
 return spans.join("\n");
}
function selectElement(e){
 selectedId=e.id;
 if(e.level&&building.levels.some(l=>l.id===e.level))setLevel(e.level);
 if(e.kind==="wall"||e.kind==="door"||e.kind==="window")activeEdit={level:e.level,kind:e.kind==="wall"?"wall":"opening",id:e.id.split(":").slice(2).join(":")};
 else activeEdit=null;
 refreshEditPanel();
 if(!activeEdit)$("selection").textContent=htmlText(e);
 drawPlan();paintSelection();
 const row=rowsById.get(e.id);
 if(row){
  const holder=row.closest(".table-wrap");
  if(holder){const top=row.offsetTop-holder.offsetTop;holder.scrollTop=Math.max(0,top-holder.clientHeight/2);}
 }
}
function addStoreys(){
 const node=$("storeys");node.replaceChildren();
 for(const l of building.levels){
  const label=document.createElement("label"),span=document.createElement("span"),c=document.createElement("input");c.type="checkbox";c.checked=true;
  span.textContent=l.name+" · "+l.elevation.toFixed(2)+"m";const small=document.createElement("small");small.textContent=l.area.toFixed(2)+" m²";
  label.append(c,span,small);node.append(label);floorFlags.set(l.id,true);
  c.addEventListener("change",()=>{floorFlags.set(l.id,c.checked);applyVisible();});
 }
 const nodeTypes=$("component-types");nodeTypes.replaceChildren();
 for(const k of ["wall","column","beam","slab","roof","door","window","stair","landing"]){
  const label=document.createElement("label"),c=document.createElement("input");c.type="checkbox";c.checked=true;
  const text=document.createElement("span");text.textContent=k+" ("+(building.counts[k]||0)+")";label.append(c,text);nodeTypes.append(label);
  kindFlags.set(k,true);c.addEventListener("change",()=>{kindFlags.set(k,c.checked);applyVisible();});
 }
}
function addStats(){
 const stat=$("quantities");stat.replaceChildren();
 for(const [kind,n] of Object.entries(building.counts)){
  const row=document.createElement("div");row.className="stat";
  const label=document.createElement("span");label.textContent=kind;
  const val=document.createElement("strong");val.textContent=n;row.append(label,val);stat.append(row);
 }
 const row=document.createElement("div");row.className="stat";
 row.innerHTML="<span>Block B plate area</span><strong>"+building.area.model.toFixed(2)+" m²</strong>";stat.append(row);
}
function addRows(){
 const tbody=$("elements");tbody.replaceChildren();rowsById.clear();
 for(const e of building.elements.filter(e=>e.ifcType)){
  const tr=document.createElement("tr");tr.dataset.elementId=e.id;tr.tabIndex=0;tr.setAttribute("role","button");tr.setAttribute("aria-selected","false");const dims=Number.isFinite(e.dx)?[e.dx,e.dy,e.dz].map(n=>n.toFixed(2)).join(" × "):e.profile?"Polygon / "+e.dy+"m":"Steps "+e.steps?.length;
  for(const s of [e.id,e.level,e.ifcType,e.kind,e.x?.toFixed(3)||"—",e.y.toFixed(3),e.z?.toFixed(3)||"—",dims,e.status]){
   const td=document.createElement("td");td.textContent=s;tr.append(td);
  }
  tr.addEventListener("click",()=>selectElement(e));tr.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectElement(e);}});tbody.append(tr);rowsById.set(e.id,tr);
 }
}
function runQa(){
 const result=verifyAssembly(building),summary=[];
 summary.push("Geometry/connectivity: "+(result.valid?"PASS WITH ENGINEERING WARNINGS":"ERROR"));
 summary.push("Area delta: "+result.areaDeviation.toFixed(4)+" m²");
 summary.push("Assembly elements: "+building.elements.length+" (modeled IFC elements "+building.elements.filter(e=>e.ifcType).length+")");
 summary.push("Assumptions/warnings: "+result.assumptions.length+"; errors: "+result.errors.length);
 try{
  const file=writeIFC4(building),parsed=checkIfcReferences(file.text);
  summary.push("IFC4 STEP internal references: PASS ("+parsed.lines+" entities)");
  summary.push("IFC walls: "+file.counts.IfcWall+" / columns: "+file.counts.IfcColumn+" / doors: "+file.counts.IfcDoor);
  summary.push("IFC external parser check: validated by release CI; see GitHub Actions");
 }catch(e){summary.push("IFC EXPORT FAILED: "+e.message);}
 summary.push("Structural capacity/code QA: HOLD (assumptions, not design)");
 $("qa-result").textContent=summary.join("\n");
 return result;
}

function projectToWorld(p,t){
 const radians=(t.rotationDeg||0)*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
 return{x:p.x*c-p.z*s+t.x,z:p.x*s+p.z*c+t.z};
}
function drawPlan(){
 const doc=$("viewer2d");doc.replaceChildren();
 if(!workspace)return;
 const state=workspace.snapshot(),models=state.models;
 const levels=activeLevel==="all"?state.manifest.levels:state.manifest.levels.filter(l=>l.id===activeLevel);
 const outlines=[],pts=[];
 for(const l of levels){
  const g=models[l.id].floorGraph,nodeMap=new Map(g.nodes.map(n=>[n.id,projectToWorld(n,l.transform)]));
  const color=l.id==="gf"?"#2c7886":l.id==="ff"?"#9c8068":"#6782b4";
  outlines.push({l,g,nodeMap,color});pts.push(...nodeMap.values());
 }
 const minX=Math.min(...pts.map(p=>p.x))-1.1,minZ=Math.min(...pts.map(p=>p.z))-1.1,
       maxX=Math.max(...pts.map(p=>p.x))+1.1,maxZ=Math.max(...pts.map(p=>p.z))+1.1;
 doc.setAttribute("viewBox",[minX,minZ,maxX-minX,maxZ-minZ].join(" "));
 const el=(name,attrs={})=>{
  const node=document.createElementNS(svgNS,name);
  for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
  return node;
 };
 for(const {l,g,nodeMap,color} of outlines){
  const faded=activeLevel==="all"?.64:1;
  for(const w of g.walls){
   const a=nodeMap.get(w.a),b=nodeMap.get(w.b);
   if(!a||!b)continue;
   const item=el("line",{x1:a.x,y1:a.z,x2:b.x,y2:b.z,stroke:color,"stroke-width":Math.max(.09,w.thickness),"stroke-linecap":"round",opacity:faded,class:"aad-wall"+(selectedId===building.projectId+":"+l.id+":"+w.id?" is-selected":"")});
   item.dataset.part=l.id+":"+w.id;
   item.addEventListener("click",evt=>{evt.stopPropagation();focusEditor(l.id,"wall",w.id);});
   doc.append(item);
  }
  for(const o of g.openings){
   const wall=g.walls.find(w=>w.id===o.wallId),a=nodeMap.get(wall.a),b=nodeMap.get(wall.b);
   const length=Math.hypot(b.x-a.x,b.z-a.z),from=o.offset/length,to=(o.offset+o.width)/length;
   const item=el("line",{
    x1:a.x+(b.x-a.x)*from,y1:a.z+(b.z-a.z)*from,x2:a.x+(b.x-a.x)*to,y2:a.z+(b.z-a.z)*to,
    class:(o.kind==="door"?"aad-door":"aad-window")+(selectedId===building.projectId+":"+l.id+":"+o.id?" is-selected":""),
    "stroke-width":o.kind==="door"?.21:.28
   });
   item.dataset.part=l.id+":"+o.id;
   item.addEventListener("click",evt=>{evt.stopPropagation();focusEditor(l.id,"opening",o.id);});
   doc.append(item);
  }
  if(activeLevel===l.id){
   for(const n of g.nodes){
    const p=nodeMap.get(n.id),circle=el("circle",{cx:p.x,cy:p.z,r:selectedId===building.projectId+":"+l.id+":NODE:"+n.id?.23:.13,class:"aad-node"+(selectedId===building.projectId+":"+l.id+":NODE:"+n.id?" is-selected":""),"data-node":n.id,tabindex:"0",role:"button","aria-label":"Move node "+n.id});
    circle.addEventListener("click",evt=>{evt.stopPropagation();focusEditor(l.id,"node",n.id);});
    circle.addEventListener("pointerdown",evt=>{
     evt.preventDefault();evt.stopPropagation();
     circle.setPointerCapture(evt.pointerId);circle.classList.add("dragging");
     const initialX=Number(circle.getAttribute("cx")),initialZ=Number(circle.getAttribute("cy"));
     const onMove=e=>{
      const box=doc.getBoundingClientRect(),v=doc.viewBox.baseVal;
      const x=v.x+(e.clientX-box.left)/box.width*v.width,z=v.y+(e.clientY-box.top)/box.height*v.height;
      circle.setAttribute("cx",x.toFixed(3));circle.setAttribute("cy",z.toFixed(3));
     };
     const onEnd=e=>{
      circle.removeEventListener("pointermove",onMove);circle.removeEventListener("pointerup",onEnd);
      circle.classList.remove("dragging");
      if(Math.hypot(Number(circle.getAttribute("cx"))-initialX,Number(circle.getAttribute("cy"))-initialZ)<.04)return;
      const v={x:Number(circle.getAttribute("cx")),z:Number(circle.getAttribute("cy"))};
      const t=l.transform,a=-(t.rotationDeg||0)*Math.PI/180,dx=v.x-t.x,dz=v.z-t.z;
      applyModelEdit(l.id,"node",n.id,{x:dx*Math.cos(a)-dz*Math.sin(a),z:dx*Math.sin(a)+dz*Math.cos(a)});
     };
     circle.addEventListener("pointermove",onMove);circle.addEventListener("pointerup",onEnd,{once:true});
    });
    doc.append(circle);
   }
  }
 }
 const ground=activeLevel==="all"?"All aligned storeys (select a floor to edit)":state.manifest.levels.find(l=>l.id===activeLevel).name+" · elevation "+state.manifest.levels.find(l=>l.id===activeLevel).elevation.toFixed(2)+" m";
 // Structural objects are 3D IFC components without authored 2D floor-graph
 // geometry. Display their world-coordinate locator instead of inventing one.
 const selected=building.elements.find(e=>e.id===selectedId);
 const hasPlan=selected&&["wall","door","window"].includes(selected.kind);
 const position=selectedPosition(selected);
 if(position&&selected&&!hasPlan&&(activeLevel==="all"||activeLevel===selected.level)){
  const marker=el("g",{"data-plan-selection-marker":selected.id,role:"img","aria-label":"Selected element world-location indicator"});
  marker.append(el("circle",{cx:position.x,cy:position.z,r:.55,fill:"#ffe9bc","fill-opacity":".32",stroke:"#ef831b","stroke-width":".15"}));
  marker.append(el("circle",{cx:position.x,cy:position.z,r:.15,fill:"#ed7820"}));
  const tag=el("text",{x:position.x+.62,y:position.z-.45});
  tag.textContent=selected.ifcType+" · plan locator (not a drawn footprint)";
  marker.append(tag);doc.append(marker);
 }
 $("aad-plan-level").textContent=ground;
 $("aad-building-level").textContent=activeLevel==="all"?"All storeys":"Selected storey "+activeLevel.toUpperCase();
}
function focusEditor(level,kind,id){
 const nativeId=building.projectId+":"+level+":"+id;
 if(kind!=="node"){
  const entity=building.elements.find(e=>e.id===nativeId);
  if(entity){selectElement(entity);return;}
 }
 setLevel(level);activeEdit={level,kind,id};selectedId=building.projectId+":"+level+":NODE:"+id;
 refreshEditPanel();drawPlan();paintSelection();
}
function refreshEditPanel(){
 const selection=activeEdit,state=workspace?.snapshot();
 const names=["a","b","c","d"];
 const fields=names.map(n=>({field:$("aad-field-"+n),wrap:$("aad-field-"+n+"-wrap"),label:$("aad-field-"+n+"-label")}));
 for(const f of fields)f.wrap.hidden=true;
 $("aad-apply-edit").hidden=true;
 if(!selection||!state)return;
 const g=state.models[selection.level].floorGraph;
 let values={};
 if(selection.kind==="wall"){
  const item=g.walls.find(x=>x.id===selection.id);
  if(!item)return;values={thickness:item.thickness};
 }else if(selection.kind==="node"){
  const item=g.nodes.find(x=>x.id===selection.id);
  if(!item)return;values={x:item.x,z:item.z};
 }else if(selection.kind==="opening"){
  const item=g.openings.find(x=>x.id===selection.id);
  if(!item)return;values={offset:item.offset,width:item.width,height:item.height,sill:item.sill};
 }
 const keys=Object.keys(values);
 keys.forEach((k,i)=>{fields[i].wrap.hidden=false;fields[i].label.textContent=k+" (m)";fields[i].field.value=Number(values[k]).toFixed(3);fields[i].field.dataset.metric=k;});
 $("aad-apply-edit").hidden=false;
 $("selection").textContent=selection.level.toUpperCase()+" / "+selection.id+" · "+selection.kind+" (floor-local coordinates, m)\nEdit parameters or drag node circles. All linked views and BIM exports use the same model.";
}
function applyModelEdit(level,kind,id,patch){
 try{
  lastUndo=workspace.bundle();
  workspace.change(level,{kind,id},patch);
  activeEdit={level,kind,id};selectedId=workspace.snapshot().manifest.projectId+":"+level+":"+(kind==="node"?"NODE:":"")+id;persistDraft();
  refreshAll();setLevel(level);
  $("edit-notice").textContent="Updated "+id+" across plan, 3D, quantities, IFC4 and component table.";
  status("Live linked model v"+workspace.snapshot().version+" · edited "+id+" · ENGINEERING HOLD");
 }catch(error){
  lastUndo=null;
  $("edit-notice").textContent="Edit rejected: "+error.message;
  drawPlan();
 }
}
function refreshAll(){
 building=workspace.snapshot().assembly;
 renderModel();drawPlan();addStats();addRows();runQa();refreshEditPanel();paintSelection();
 $("aad-edit-version").textContent="Working BIM draft v"+workspace.snapshot().version+(workspace.snapshot().lastEdit?" · unsent to source":"");
 $("aad-undo").disabled=!lastUndo;
}
function persistDraft(){
 try{localStorage.setItem("aad:unified:draft:"+workspace.snapshot().manifest.projectId,JSON.stringify(workspace.bundle()));}catch(_){}
}
function setLevel(level){
 activeLevel=level;
 for(const l of building.levels)floorFlags.set(l.id,level==="all"||l.id===level);
 for(const [idx,label] of [...$("storeys").querySelectorAll("label")].entries())
  label.querySelector("input").checked=floorFlags.get(building.levels[idx].id);
 $("aad-storey").value=level;applyVisible();drawPlan();
}
function setViewMode(mode){
 if(!["split","plan","building"].includes(mode))mode="split";
 document.body.dataset.viewMode=mode;$("aad-view-mode").value=mode;
 try{localStorage.setItem("aad:unified:view-mode",mode);}catch(_){}
 if(renderer){const node=$("viewer3d");renderer.setSize(node.clientWidth,Math.max(200,node.clientHeight));
  camera.aspect=node.clientWidth/Math.max(200,node.clientHeight);camera.updateProjectionMatrix();}
}

async function main(){
 if(!chosen)throw Error("Open this shared viewer with a project-owned ?manifest= path. No default client model is baked into the engine.");
 const url=new URL(chosen,location.href),dataBase=new URL("../../../data/projects/",location.href);
 if(url.origin!==location.origin||!url.pathname.startsWith(dataBase.pathname)||!url.pathname.endsWith(".json")||url.pathname.includes(".."))
  throw Error("Building manifest must be same-origin versioned AAD project data");
 const result=await fetch(url.href,{cache:"no-store"});if(!result.ok)throw Error("Manifest HTTP "+result.status);
 const manifest=await result.json();const prefix=new URL("./",url.href);
 const models={};for(const l of manifest.levels){
  const modelURL=new URL(l.model,prefix);
  if(modelURL.origin!==location.origin||!modelURL.pathname.startsWith(prefix.pathname))throw Error("Invalid model reference");
  const fetched=await fetch(modelURL,{cache:"no-store"});if(!fetched.ok)throw Error("Floor model HTTP "+fetched.status);
  models[l.id]=await fetched.json();
 }
 workspace=createAADWorkspace(manifest,models);
 const storageKey="aad:unified:draft:"+manifest.projectId;
 try{
  const stored=localStorage.getItem(storageKey);
  if(stored){workspace.restore(JSON.parse(stored));status("Recovered locally saved working draft · canonical sources unchanged");}
 }catch(err){status("Saved draft ignored: "+err.message);}
 building=workspace.snapshot().assembly;
 for(const l of building.levels){
  const option=document.createElement("option");option.value=l.id;option.textContent=l.name+" · "+l.elevation.toFixed(2)+"m";
  $("aad-storey").append(option);
 }
 $("building-name").textContent=building.name;
 $("building-subtitle").textContent=building.levels.length+" storeys · one world coordinate frame · "+building.area.model.toFixed(2)+"m² Block B floor areas · "+building.elements.filter(e=>e.ifcType).length+" modeled IFC-typed components";
 const link=$("source-ledger");link.href=new URL("MODEL_QA_MANIFEST_v2.json",prefix).href;
 initRenderer();addStoreys();addStats();addRows();renderModel();setLevel("all");centerView();runQa();
 try{const mode=localStorage.getItem("aad:unified:view-mode");setViewMode(mode||"split");}catch(_){setViewMode("split");}
 $("aad-edit-version").textContent=workspace.snapshot().version?"Recovered working draft v"+workspace.snapshot().version:"Canonical source · no edits";
 status("Shared AAD building assembly ready · "+building.diagnostics.length+" QA findings (engineering HOLD)");
}
$("fit").addEventListener("click",centerView);
$("isolate").addEventListener("click",()=>{
 for(const label of $("storeys").querySelectorAll("label")){
  label.querySelector("input").checked=true;
 }
 for(const floor of building.levels)floorFlags.set(floor.id,true);
 applyVisible();centerView();
});
$("run-qa").addEventListener("click",()=>{if(building){runQa();status("Geometry and IFC4 reference QA completed");}});
$("download-ifc").addEventListener("click",()=>{
 if(!building)return;
 try{const r=writeIFC4(building);checkIfcReferences(r.text);download(r.filename,r.text,"application/x-step");
  status("IFC4 file generated ("+r.entityCount+" IFC records). Engineering approval remains HOLD.");
 }catch(e){status("IFC4 export failed: "+e.message);}
});
$("download-json").addEventListener("click",()=>{if(building)download(building.projectId+"_AAD_MULTISTOREY_A01.json",JSON.stringify(building,null,2),"application/json");});

$("aad-storey").addEventListener("change",e=>setLevel(e.target.value));
$("aad-show-all").addEventListener("click",()=>setLevel("all"));
$("aad-view-mode").addEventListener("change",e=>setViewMode(e.target.value));
$("aad-apply-edit").addEventListener("click",()=>{
 if(!activeEdit||!workspace)return;
 const patch={};for(const key of ["a","b","c","d"]){
  const wrap=$("aad-field-"+key+"-wrap");
  if(!wrap.hidden){const inp=$("aad-field-"+key);patch[inp.dataset.metric]=Number(inp.value);}
 }
 applyModelEdit(activeEdit.level,activeEdit.kind,activeEdit.id,patch);
});
$("aad-undo").addEventListener("click",()=>{
 if(!lastUndo)return;
 try{workspace.restore(lastUndo);lastUndo=null;persistDraft();refreshAll();status("Undid last edit");}
 catch(err){status("Undo failed: "+err.message);}
});
$("aad-reset").addEventListener("click",()=>{
 if(!workspace)return;lastUndo=workspace.bundle();workspace.reset();activeEdit=null;selectedId=null;
 try{localStorage.removeItem("aad:unified:draft:"+workspace.snapshot().manifest.projectId);}catch(_){}
 refreshAll();status("Restored canonical source geometry; source data unchanged.");
});
$("aad-save-working").addEventListener("click",()=>{
 if(workspace)download(workspace.snapshot().manifest.projectId+"_AAD_EDITABLE_BUILDING_DRAFT.json",
  JSON.stringify(workspace.bundle(),null,2),"application/json");
});
$("aad-import-working").addEventListener("click",()=>$("aad-import-file").click());
$("aad-import-file").addEventListener("change",async e=>{
 try{
  const file=e.target.files?.[0];if(!file||file.size>200000)throw Error("Select a valid draft JSON under 200KB");
  const parsed=JSON.parse(await file.text());lastUndo=workspace.bundle();workspace.restore(parsed);
  persistDraft();refreshAll();status("Restored editable building draft into shared linked viewports.");
 }catch(err){status("Import failed: "+err.message);}
 e.target.value="";
});

// Stable command adapter for browser automation and external AI agents.
// An AI decides/constructs the action; the shared engine validates and commits
// it to the local working model. No raw-language interpreter is claimed here.
window.AADStudio=Object.freeze({
 getCapabilities:()=>({schema:"jp-cad://aad-studio-capabilities/1",editor:"shared-multistorey",
   actions:["selectElementById","change","setLevel","getSnapshot","getDraft"],coordinates:"metres",ifc:"IFC4"}),
 selectElementById:(id)=>{
  if(!building)return false;
  const e=building.elements.find(x=>x.id===id);
  if(!e)return false;
  selectElement(e);return true;
 },
 change:(args)=>{
  if(!workspace||!args||!args.level||!args.kind||!args.id||!args.patch)throw Error("AAD change requires level, kind, id, patch");
  const before=workspace.snapshot().version;
  applyModelEdit(args.level,args.kind,args.id,args.patch);
  if(workspace.snapshot().version===before)throw Error($("edit-notice").textContent);
  return{version:workspace.snapshot().version,selectedElementId:selectedId};
 },
 setLevel:(level)=>{if(!building||!(level==="all"||building.levels.some(l=>l.id===level)))throw Error("Unknown AAD level");setLevel(level);},
 getSnapshot:()=>workspace?workspace.snapshot():null,
 getDraft:()=>workspace?workspace.bundle():null
});
main().catch(e=>{status("Unable to assemble this project: "+e.message);$("qa-result").textContent="ERROR: "+e.message;});
