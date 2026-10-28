/* Generic AAD multistorey UI. Shared geometry is in aad-building-core.mjs.
 * This viewer has NO hardcoded project geometry or project-specific paths.
 */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
const $=id=>document.getElementById(id);
const moduleURL=file=>{const u=new URL("../../../assets/js/"+file,location.href);u.searchParams.set('aad','20261028-r03');return u.href;};
const {assembleBuilding,verifyAssembly}=await import(/* @vite-ignore */moduleURL("aad-building-core.mjs"));
const {writeIFC4,checkIfcReferences}=await import(/* @vite-ignore */moduleURL("aad-building-ifc4.mjs"));
const {createAADWorkspace}=await import(/* @vite-ignore */moduleURL("aad-unified-workspace.mjs"));
const {loadAADReviewedStructure}=await import(/* @vite-ignore */moduleURL("aad-reviewed-structural-intake.mjs"));
const {deriveM29DatumEvidence}=await import(/* @vite-ignore */moduleURL("aad-m29-source-datum.mjs"));
const {buildAADComponentGroups,describeAADSelection,classifyAADComponent}=await import(/* @vite-ignore */moduleURL("aad-component-register.mjs"));
const {wallSolidCells}=await import(/* @vite-ignore */moduleURL("aad-wall-voids.mjs"));
const {drawPresentationPlan}=await import(/* @vite-ignore */moduleURL("aad-dimensioned-plan.mjs"));
const params=new URLSearchParams(location.search);
const chosen=params.get("manifest");
if(params.get('embed')==='1')document.body.dataset.aadEmbed='true';
let building=null,renderer=null,camera=null,orbit=null,scene=null,geometryGroup=null;
let workspace=null,activeLevel="all",activeEdit=null,lastUndo=null,baseUrl=null;
let m29Evidence=null,showM29SourceEdges=false,showM29UpperProjection=false;
let m30Evidence=null;
let selectedId=null,selectionOverlay=null;let auditInitialized=false;
let cutaway=false,showDimensions=true,showPlanGrid=true,showFurniture=true,roofAccessMode=false;
let drawMode=false,drawFirst=null; // two-click wall drafting; engine handles snapping/intersections // one selection shared by plan, 3D and component schedule
const svgNS="http://www.w3.org/2000/svg";
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),hitMeshes=[],floorFlags=new Map(),kindFlags=new Map(),rowsById=new Map();
const palettes={wall:0x4d7889,door:0xc28d72,window:0x63b4e0,slab:0x96bba8,roof:0x9db9b0,column:0x40997d,beam:0xcea365,footing:0x926aae,stair:0x9386bb,landing:0xa48cc9};
Object.assign(palettes,{floor:0xd8c7a5,furniture:0xb49d7d,fixture:0xd9e3de,guard:0x91b4b7,site:0xc4c4ae,landscape:0x708b62});
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
 const sourceLocal=Boolean(e.previewOnly&&Number.isFinite(e.x)&&Number.isFinite(e.z));
 const coordinates=v=>sourceLocal?{x:v.x-e.x,z:v.z-e.z}:v;
 contour.forEach((v,i)=>{const p=coordinates(v);i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z);});
 shape.closePath();
 for(const hole of e.holes||[]){
  const h=new THREE.Path(),pts=[...hole],a=pts.reduce((sum,v,i)=>{const q=pts[(i+1)%pts.length];return sum+v.x*q.z-q.x*v.z;},0);
  if(a>0)pts.reverse();
  pts.forEach((v,i)=>i?h.lineTo(v.x,-v.z):h.moveTo(v.x,-v.z));
  h.closePath();shape.holes.push(h);
 }
 const geom=new THREE.ExtrudeGeometry(shape,{depth:e.dy,steps:1,bevelEnabled:false,curveSegments:1});
 geom.rotateX(-Math.PI/2);
 const mat=building?.manifest.presentation?coordinatedMaterial(e):new THREE.MeshStandardMaterial({color:palettes[e.kind]||0x8195a4,metalness:.03,roughness:.78,side:THREE.DoubleSide,transparent:true,opacity:e.kind==="roof"?.52:e.kind==="slab"?.75:.92});
 const m=new THREE.Mesh(geom,mat);m.position.set(sourceLocal?e.x:0,e.y-e.dy/2,sourceLocal?e.z:0);return [m];
}
function coordinatedMaterial(e,colour){
 const p=building?.manifest.presentation;
 const mat=new THREE.MeshStandardMaterial({color:colour||e.colour||(e.kind==='wall'&&p?p.wallColour:palettes[e.kind])||0x647b8a,roughness:e.kind==='window'?.22:.84,metalness:0,
  transparent:e.kind==='guard'&&e.colour==='#91b4b7',opacity:e.kind==='guard'&&e.colour==='#91b4b7'?.48:1,side:THREE.DoubleSide});
 if(p&&cutaway&&(['wall','door','window','column'].includes(e.kind)||roofAccessMode&&e.roofAccess&&e.kind==='auxiliary')){
  const l=building.levels.find(l=>l.id===e.level);mat.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),l.elevation+(roofAccessMode&&e.roofAccess?p.floorToFloor:0)+1.3)];
 }
 return mat;
}
function mergedBoxes(parts){
 const geometries=parts.map(p=>new THREE.BoxGeometry(p.dx,p.dy,p.dz).translate(p.x,p.y,p.z));
 const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());return geometry;
}
function openingMesh(e){
 const w=e.dx,h=e.dy,t=.045,parts=[
  {x:-w/2+t/2,y:0,z:0,dx:t,dy:h,dz:.09},{x:w/2-t/2,y:0,z:0,dx:t,dy:h,dz:.09},
  {x:0,y:h/2-t/2,z:0,dx:w,dy:t,dz:.09}];
 if(e.kind==='window')parts.push({x:0,y:-h/2+t/2,z:0,dx:w,dy:t,dz:.09},{x:0,y:0,z:0,dx:.035,dy:h,dz:.07});
 const geometry=mergedBoxes(parts),frame=new THREE.Mesh(geometry,coordinatedMaterial(e,e.kind==='window'?'#5a6b64':'#a57d55'));
 const meshes=[frame],graph=workspace.snapshot().models[e.level].floorGraph;
 const o=graph.openings.find(o=>e.id.endsWith(':'+o.id));
 if(e.kind==='window'){
  const glass=new THREE.Mesh(new THREE.BoxGeometry(w-.09,h-.09,.015),new THREE.MeshPhysicalMaterial({color:'#b7d4d4',roughness:.12,transparent:true,opacity:.22,metalness:.02,side:THREE.DoubleSide}));
  glass.material.clippingPlanes=frame.material.clippingPlanes;
  meshes.push(glass);
 }else if(o?.style!=='passage'){
  const leafWidth=w-.09,leaf=new THREE.BoxGeometry(leafWidth,h-.055,.04);
  if(o?.style==='sliding')leaf.translate(w-.06,0,.08);
  else{const a=Math.PI/2,sign=o?.swingSign||1;leaf.rotateY(-sign*a);leaf.translate(-w/2+.045+leafWidth/2*Math.cos(a),0,sign*leafWidth/2*Math.sin(a));}
  meshes.push(new THREE.Mesh(leaf,coordinatedMaterial(e,'#b58d60')));
 }
 for(const m of meshes){m.position.set(e.x,e.y,e.z);m.rotation.y=-(e.rotationDeg||0)*Math.PI/180;}
 return meshes;
}
function boxes(e){
 if(e.kind==='wall'){
  const proof=wallSolidCells(e,building.elements),geometry=mergedBoxes(proof.cells);
  const m=new THREE.Mesh(geometry,coordinatedMaterial(e));m.position.set(e.x,e.y,e.z);m.rotation.y=-(e.rotationDeg||0)*Math.PI/180;
  m.userData.wallVoidProof=proof;return[m];
 }
 if(building?.manifest.presentation&&['door','window'].includes(e.kind))return openingMesh(e);
 const parts=e.parts||e.steps||[e];
 return parts.map(p=>{
  const geom=new THREE.BoxGeometry(p.dx,p.dy,p.dz);
  const mat=building?.manifest.presentation?coordinatedMaterial(e,p.colour):new THREE.MeshStandardMaterial({color:palettes[e.kind]||0x647b8a,roughness:.75,transparent:e.kind==="window",opacity:e.kind==="window"?.78:1});
  const mesh=new THREE.Mesh(geom,mat);
  mesh.position.set(p.x,p.y,p.z);
  mesh.rotation.y=-(e.rotationDeg||0)*Math.PI/180;
  if(p.rotationZ)mesh.rotation.z=p.rotationZ*Math.PI/180;
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
   m.castShadow=true;m.receiveShadow=true;
   geometryGroup.add(m);hitMeshes.push(m);
  }
 }
 scene.add(geometryGroup);applyVisible();
}
function applyVisible(){
 if(!geometryGroup)return;
 for(const m of hitMeshes){
  const e=m.userData.element;
  m.visible=Boolean((floorFlags.get(e.level)!==false||e.contextLevels?.includes(activeLevel))&&(kindFlags.get(e.kind)!==false)&&(!e.roofPart||kindFlags.get('roof')!==false)&&(!['furniture','fixture'].includes(e.kind)||showFurniture));
  if(roofAccessMode)m.visible=m.visible&&Boolean(e.roofPart||e.kind==='roof')&&!e.roofCover;
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
   if(m.material.opacity<.98&&!building?.manifest.presentation)m.material.opacity=on?1:(m.userData.element.kind==="roof"?.52:.75);
  }
  m.userData.isSelected=on;
 }
 if(selectionOverlay){scene.remove(selectionOverlay);selectionOverlay.traverse?.(n=>{n.geometry?.dispose?.();n.material?.dispose?.();});selectionOverlay=null;}
 if(scene&&selectedId&&(activeLevel==='all'||picked?.level===activeLevel||picked?.contextLevels?.includes(activeLevel)||activeEdit?.level===activeLevel)){
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
 if(label)label.textContent=picked?("Selected: "+(picked.name||picked.kind)+" · "+picked.id):
  activeEdit?.kind==="node"&&selectedId?("Selected: floor-plan edit node · "+activeEdit.level+"/"+activeEdit.id):
  selectedId?("Selected: "+selectedId):"Select an element in 2D, 3D or the component schedule";
 showAADSelectionDetails(picked);
}
function showAADSelectionDetails(picked){
 const root=$("aad-selected-details");if(!root)return;
 root.replaceChildren();
 const line=(css,value)=>{const node=document.createElement(css==="head"?"strong":"span");
  node.className="aad-sel-"+css;node.textContent=value;root.append(node);};
 if(picked){
  const d=describeAADSelection(picked),floor=building.levels.find(l=>l.id===picked.level);
  line("head",d.name+" · "+d.discipline+" / "+picked.kind);
  line("meaning",d.meaning);
  line("hint",d.representationHint);
  line("meta","Element ID: "+picked.id+" · Storey: "+(floor?.name||picked.level)+" · IFC: "+(picked.ifcType||"not classified"));
  if(Number.isFinite(picked.x)&&Number.isFinite(picked.z))
   line("meta","World X/Y/Z: "+[picked.x,picked.y,picked.z].map(x=>Number(x).toFixed(3)).join(" / ")+" m");
  else if(picked.profile)line("meta","Plan polygon: "+picked.profile.length+" vertices (world X/Z)");
  line("meta","Evidence: "+d.evidence+(d.sourceId?" · source "+d.sourceId:"")+" · "+picked.status);
  if(picked.kind==="column"){
   const review=building.structuralAlignment?.columns.find(x=>x.elementId===picked.id);
   if(review)line("hint","Structural position NOT VERIFIED. Nearest drawn wall centreline: "+
    (review.distanceToWallCenterlineM??"unknown")+" m"+(review.nearestWallId?" ("+review.nearestWallId+")":"")+
    ". This column was assembled from the project structural grid, not traced to a verified DXF centre.");
  }
  if(picked.kind==="beam")line("hint","Beam position is generated between manifest grid axes. Its relationship to structural source coordinates needs registration.");
  return;
 }
 if(activeEdit?.kind==="node"&&selectedId){
  const state=workspace?.snapshot(),l=state?.manifest.levels.find(x=>x.id===activeEdit.level);
  const g=state?.models[activeEdit.level]?.floorGraph;
  const n=g?.nodes.find(n=>n.id===activeEdit.id);
  if(n&&l){
   const world=projectToWorld(n,l.transform);
   const joined=g.walls.filter(w=>w.a===n.id||w.b===n.id).map(w=>w.id);
   line("head","Editable junction node "+n.id+" · "+l.name);
   line("meaning","This is a wall-graph geometry control point, NOT automatically a concrete column, beam or IFC building component. It may be an intended column location but has no verified structural-grid assignment.");
   line("hint","The orange circle in 2D is the selected edit handle. The orange 3D dot is only a visual locator raised for visibility, not physical building material.");
   line("meta","Floor-local X/Z: "+n.x.toFixed(3)+" / "+n.z.toFixed(3)+" m · World X/Z: "+world.x.toFixed(3)+" / "+world.z.toFixed(3)+" m");
   line("meta","Connected wall IDs: "+(joined.join(", ")||"none")+" · Storey elevation "+l.elevation.toFixed(3)+" m");
   return;
  }
 }
 line("head","Nothing selected");
 line("meaning","Choose an object, editable node or schedule row to see what it means, where it is and whether the highlight represents actual geometry or a locator.");
}
function centerView(){
 if(!geometryGroup)return;
 const box=new THREE.Box3();
 for(const m of hitMeshes)if(m.visible){
  const b=new THREE.Box3().setFromObject(m);
  if(building?.manifest.presentation&&cutaway&&m.material.clippingPlanes?.length){b.max.y=Math.min(b.max.y,m.material.clippingPlanes[0].constant);}
  if(!b.isEmpty())box.union(b);
 }
 if(box.isEmpty())return;
 const center=box.getCenter(new THREE.Vector3()),span=box.getSize(new THREE.Vector3());
 // Fit the whole building even in the narrow half-width split viewport.
 const radius=Math.max(span.length()/2,3),node=$("viewer3d");
 camera.aspect=Math.max(1,node.clientWidth)/Math.max(1,node.clientHeight);
 const halfVertical=THREE.MathUtils.degToRad(camera.fov/2);
 const halfHorizontal=Math.atan(Math.tan(halfVertical)*camera.aspect);
 let distance=radius/Math.sin(Math.min(halfVertical,halfHorizontal))*1.12;
 orbit.target.copy(center);
 const direction=new THREE.Vector3(...(building?.manifest.presentation?.cameraDirection||[.8,.95,1.05])).normalize();
 if(building?.manifest.presentation){
  camera.position.copy(center).add(direction);camera.lookAt(center);const inverse=camera.quaternion.clone().invert();distance=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const p=new THREE.Vector3(x,y,z).sub(center).applyQuaternion(inverse);
   distance=Math.max(distance,p.z+Math.abs(p.x)/(Math.tan(halfHorizontal)*.88),p.z+Math.abs(p.y)/(Math.tan(halfVertical)*.88));
  }
 }
 camera.position.copy(center).add(direction.multiplyScalar(distance));
 camera.near=.05;camera.far=Math.max(200,distance*4);camera.updateProjectionMatrix();orbit.update();
}
function initRenderer(){
 const node=$("viewer3d");
 scene=new THREE.Scene();scene.background=new THREE.Color(0xeaf2f4);
 camera=new THREE.PerspectiveCamera(48,node.clientWidth/Math.max(100,node.clientHeight),.05,500);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
 renderer.localClippingEnabled=true;
 if(building?.manifest.presentation){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;scene.background=new THREE.Color('#ecece2');}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(node.clientWidth,node.clientHeight);
 renderer.outputColorSpace=THREE.SRGBColorSpace;node.append(renderer.domElement);
 orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.07;
 scene.add(new THREE.HemisphereLight(0xffffff,0x657c83,2.4));
 const directional=new THREE.DirectionalLight(0xfff6dd,1.8);directional.position.set(19,32,13);scene.add(directional);
 if(building?.manifest.presentation){directional.castShadow=true;directional.shadow.mapSize.set(2048,2048);directional.shadow.camera.left=-20;directional.shadow.camera.right=20;directional.shadow.camera.top=20;directional.shadow.camera.bottom=-20;directional.shadow.bias=-.0003;}
 const ground=new THREE.GridHelper(60,30,0x9ab3ba,0xcbdde1);ground.position.y=-.22;scene.add(ground);
 if(building?.manifest.presentation)ground.visible=false;
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
 const spans=[(e.name||e.kind)+" · "+e.id,"IFC: "+(e.ifcType||"NONE"),"Level: "+e.level,"Source: "+e.source,"Status: "+e.status];
 if(Number.isFinite(e.x))spans.push("World (X, Y, Z): ("+[e.x,e.y,e.z].map(v=>Number(v).toFixed(3)).join(", ")+") m");
 if(Number.isFinite(e.dx))spans.push("Metric size (L/H/T): "+[e.dx,e.dy,e.dz].map(v=>Number(v).toFixed(3)).join(" × ")+" m");
 if(e.profile)spans.push("Polygon vertices: "+e.profile.length+", stair voids: "+(e.holes?.length||0));
 if(e.provenance){
  spans.push("Evidence basis: "+e.provenance.basis+(e.provenance.scope?" ("+e.provenance.scope+")":""));
  if(e.provenance.sourceId)spans.push("Source ID: "+e.provenance.sourceId+(e.provenance.locator?" · locator: "+e.provenance.locator:""));
  if(e.provenance.rationale)spans.push("AI assumption: "+e.provenance.rationale);
 }
 if(e.host)spans.push("Hosted on: "+e.host);
 return spans.join("\n");
}
function selectElement(e){
 selectedId=e.id;
 if(e.level&&building.levels.some(l=>l.id===e.level)&&!e.contextLevels?.includes(activeLevel))setLevel(e.level);
 if(e.kind==="wall"||e.kind==="door"||e.kind==="window")activeEdit={level:e.level,kind:e.kind==="wall"?"wall":"opening",id:e.id.split(":").slice(2).join(":")};
 else activeEdit=null;
 refreshEditPanel();
 if(!activeEdit)$("selection").textContent=htmlText(e);
 drawPlan();paintSelection();
 revealSelectedAuditRow(e.id);
 paintSelection();
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
 for(const k of ["wall","column","beam","footing","slab","roof","door","window","stair","landing"]){
  const label=document.createElement("label"),c=document.createElement("input");c.type="checkbox";c.checked=true;c.dataset.kind=k;
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
 row.innerHTML="<span>Total modeled floor-plate area</span><strong>"+building.area.model.toFixed(2)+" m²</strong>";stat.append(row);
}
function initAADRegister(){
 if(auditInitialized)return;
 auditInitialized=true;
 const levels=$("aad-audit-storey");
 for(const l of building.levels){
  const opt=document.createElement("option");
  opt.value=l.id;opt.textContent=l.name+" ("+l.id.toUpperCase()+")";
  levels.append(opt);
 }
 for(const name of ["storey","discipline","kind","sort"]){
  $("aad-audit-"+name).addEventListener("change",addRows);
 }
 $("aad-audit-search").addEventListener("input",addRows);
 $("aad-audit-clear").addEventListener("click",()=>{
  for(const key of ["storey","discipline","kind"])$("aad-audit-"+key).value="all";
  $("aad-audit-sort").value="id";$("aad-audit-search").value="";addRows();
 });
}
function auditFilters(){
 return{level:$("aad-audit-storey").value,discipline:$("aad-audit-discipline").value,
  kind:$("aad-audit-kind").value,sort:$("aad-audit-sort").value,search:$("aad-audit-search").value};
}
function addRows(){
 const root=$("elements"),openBefore=new Set([...root.querySelectorAll("details[open][data-group-key]")]
   .map(node=>node.dataset.groupKey));
 const hadOldGroups=Boolean(root.querySelector("details[data-group-key]"));
 root.replaceChildren();rowsById.clear();
 const grouped=buildAADComponentGroups(building,auditFilters());
 $("aad-audit-count").textContent="Showing "+grouped.matching+" / "+grouped.total+" BIM components · "+
  grouped.groups.length+" storey groups. Storeys always follow building elevation; rows sort inside their element type.";
 if(!grouped.groups.length){
  const empty=document.createElement("p");empty.id="aad-audit-empty";empty.textContent="No components match these filters. Clear filters to restore the full register.";root.append(empty);return;
 }
 const captioned=(parent,tag,value)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;};
 const openRule=(key,defaultOpen)=>hadOldGroups?openBefore.has(key):defaultOpen;
 for(const [li,l] of grouped.groups.entries()){
  const levelEl=document.createElement("details");levelEl.className="aad-audit-level";levelEl.dataset.groupKey="L:"+l.level;
  levelEl.dataset.level=l.level;levelEl.open=openRule(levelEl.dataset.groupKey,li===0);
  captioned(levelEl,"summary",l.name+" · "+l.count+" components · Elevation "+Number(l.elevation).toFixed(3)+" m");
  for(const d of l.disciplines){
   const discEl=document.createElement("details");discEl.className="aad-audit-discipline";
   discEl.dataset.groupKey="D:"+l.level+":"+d.name;discEl.dataset.discipline=d.name;
   discEl.open=openRule(discEl.dataset.groupKey,true);
   captioned(discEl,"summary",d.name+" · "+d.count+" components");
   for(const t of d.types){
    const kindEl=document.createElement("details");kindEl.className="aad-audit-type";
    kindEl.dataset.groupKey="T:"+l.level+":"+d.name+":"+t.kind;kindEl.dataset.kind=t.kind;
    kindEl.open=openRule(kindEl.dataset.groupKey,t.kind==="wall"||t.kind==="column");
    captioned(kindEl,"summary",t.name+" · "+t.items.length+" items");
    const wrap=document.createElement("div");wrap.className="table-wrap";wrap.tabIndex=0;wrap.setAttribute("role","region");wrap.setAttribute("aria-label",t.name+" component table; scroll horizontally for more columns");
    const table=document.createElement("table");
    const head=document.createElement("thead");
    const heads=document.createElement("tr");
    for(const label of ["ID","Storey","IFC class","Type","Global X","Global Y","Global Z","Dimensions (m)","Evidence","Description"]){
     const th=document.createElement("th");th.textContent=label;th.scope="col";heads.append(th);
    }
    head.append(heads);table.append(head);
    const tbody=document.createElement("tbody");
    for(const e of t.items){
     const tr=document.createElement("tr");tr.dataset.elementId=e.id;tr.tabIndex=0;tr.setAttribute("role","button");
     tr.setAttribute("aria-selected",String(e.id===selectedId));
     tr.classList.toggle("aad-selected-row",e.id===selectedId);
     const dims=Number.isFinite(e.dx)?[e.dx,e.dy,e.dz].map(n=>n.toFixed(2)).join(" × "):
      e.profile?"Polygon / "+Number(e.dy).toFixed(2):"Steps "+(e.steps?.length||0);
     const trace=e.provenance?e.provenance.basis+(e.provenance.sourceId?" · "+e.provenance.sourceId:"")+
      (e.provenance.scope?" · "+e.provenance.scope:""):e.status;
     const desc=classifyAADComponent(e);
     for(const value of [e.id,e.level,e.ifcType,e.kind,Number.isFinite(e.x)?e.x.toFixed(3):"—",
       e.y.toFixed(3),Number.isFinite(e.z)?e.z.toFixed(3):"—",dims,trace,e.name||desc.meaning]){
      const td=document.createElement("td");td.textContent=value;tr.append(td);
     }
     tr.title=e.name+" · "+desc.meaning;
     tr.addEventListener("click",()=>selectElement(e));
     tr.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectElement(e);}});
     tbody.append(tr);rowsById.set(e.id,tr);
    }
    table.append(tbody);wrap.append(table);kindEl.append(wrap);discEl.append(kindEl);
   }
   levelEl.append(discEl);
  }
  root.append(levelEl);
 }
}
function revealSelectedAuditRow(id){
 let row=rowsById.get(id);
 if(!row){
  // The 2D/3D selection is authoritative: reset a hiding search/filter so the
  // matching schedule record is reachable, then open its nested groups.
  for(const k of ["storey","discipline","kind"])$("aad-audit-"+k).value="all";
  $("aad-audit-search").value="";addRows();row=rowsById.get(id);
 }
 if(!row)return;
 for(const details of [...row.closest("#elements").querySelectorAll("details")]){
  if(details.contains(row))details.open=true;
 }
 const holder=row.closest(".table-wrap");
 if(holder){const y=row.offsetTop-holder.offsetTop;holder.scrollTop=Math.max(0,y-holder.clientHeight/2);}
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
 const registration=building.structuralAlignment;
 if(registration){
  summary.push("Structural grid positioning: HOLD — "+registration.gridOrigin);
  for(const level of registration.levels)summary.push(level.level.toUpperCase()+": "+
   level.beyondReviewTolerance+"/"+level.columns+" column centres farther than "+
   registration.reviewToleranceM+" m from nearest architectural wall centreline.");
  summary.push("Wall proximity is only a review signal. The original structural DXF must be registered to the architectural datum; DO NOT auto-snap columns to walls.");
 }
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
 if(building.sourceStructuralReview){
  pts.push(...building.elements.filter(e=>e.previewOnly&&e.level==="gf").map(e=>({x:e.x,z:e.z})));
 }
 if(m29Evidence&&showM29SourceEdges&&(activeLevel==="all"||activeLevel==="gf")){
  for(const s of m29Evidence.sourceSegments)pts.push(s.a,s.b);
 }
 if(m29Evidence&&showM29UpperProjection&&activeLevel!=="all"&&activeLevel!=="gf"){
  for(const c of m29Evidence.upperFloorProjections.find(p=>p.level===activeLevel)?.elements||[])
   pts.push({x:c.x,z:c.z});
 }
 const minX=Math.min(...pts.map(p=>p.x))-1.1,minZ=Math.min(...pts.map(p=>p.z))-1.1,
       maxX=Math.max(...pts.map(p=>p.x))+1.1,maxZ=Math.max(...pts.map(p=>p.z))+1.1;
 doc.setAttribute("viewBox",[minX,minZ,maxX-minX,maxZ-minZ].join(" "));
 const el=(name,attrs={})=>{
  const node=document.createElementNS(svgNS,name);
  for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
  return node;
 };
 // DXF source architectural edge layer is read-only and belongs in this same SVG.
 // It cannot become editable floor-wall topology or IFC without separate evidence.
 if(m29Evidence&&showM29SourceEdges&&(activeLevel==="all"||activeLevel==="gf")){
  for(const s of m29Evidence.sourceSegments){
   const line=el("line",{x1:s.a.x,y1:s.a.z,x2:s.b.x,y2:s.b.z,
     class:"aad-m29-original-dxf-edge","data-dxf-handle":s.handle,
     "aria-label":"Source DXF architectural edge "+s.id+" (read-only)"});
   const desc=el("title");desc.textContent=s.id+" · nearest GF model wall "+
    s.nearestModeledWallId+" · source edge midpoint to model centreline "+
    s.midpointToWallCenterlineM+" m (not survey residual)";
   line.append(desc);doc.append(line);
  }
 }
 for(const {l,g,nodeMap,color} of outlines){
  if(roofAccessMode)continue;
  const faded=activeLevel==="all"?.64:1;
  if(activeLevel===l.id&&!building.manifest.presentation){
   try{for(const room of workspace.rooms(l.id)){
    if(room.area<.5)continue;
    const positions=room.nodes.map(id=>nodeMap.get(id)).filter(Boolean);
    if(positions.length!==room.nodes.length)continue;
    const path=el("polygon",{points:positions.map(p=>p.x+","+p.z).join(" "),class:"aad-room-polygon","data-room-id":room.id});
    doc.append(path);
    const worldCentroid=projectToWorld(room.centroid,l.transform);
    const title=el("text",{x:worldCentroid.x,y:worldCentroid.z,class:"aad-room-text"});
    title.textContent=room.area.toFixed(2)+" m²";doc.append(title);
   }}catch(e){$("aad-room-summary").textContent="Room calculation: "+e.message;}
  }
  for(const w of g.walls){
   const a=nodeMap.get(w.a),b=nodeMap.get(w.b);
   if(!a||!b)continue;
   const item=el("line",{x1:a.x,y1:a.z,x2:b.x,y2:b.z,stroke:color,"stroke-width":Math.max(.09,w.thickness),"stroke-linecap":"round",opacity:faded,class:"aad-wall"+(selectedId===building.projectId+":"+l.id+":"+w.id?" is-selected":"")});
   item.dataset.part=l.id+":"+w.id;
   item.addEventListener("click",evt=>{evt.stopPropagation();if(drawMode){recordDrawPoint(evt);return;}focusEditor(l.id,"wall",w.id);});
   doc.append(item);
  }
  for(const o of g.openings){
   const wall=g.walls.find(w=>w.id===o.wallId),a=nodeMap.get(wall.a),b=nodeMap.get(wall.b);
   const length=Math.hypot(b.x-a.x,b.z-a.z),from=o.offset/length,to=(o.offset+o.width)/length;
   const x1=a.x+(b.x-a.x)*from,z1=a.z+(b.z-a.z)*from,x2=a.x+(b.x-a.x)*to,z2=a.z+(b.z-a.z)*to;
   if(building.manifest.presentation){
    doc.append(el('line',{x1,y1:z1,x2,y2:z2,stroke:'#faf8ef','stroke-width':wall.thickness+.04,'pointer-events':'none'}));
    if(o.kind==='door'&&o.style!=='passage'){
     const ux=(b.x-a.x)/length,uz=(b.z-a.z)/length,sign=o.swingSign||1;
     if(o.style==='sliding')doc.append(el('line',{x1:x2-uz*.08,y1:z2+ux*.08,x2:x2+ux*o.width-uz*.08,y2:z2+uz*o.width+ux*.08,class:'aad-opening-swing'}));
     else{
      const endX=x1-uz*sign*o.width,endZ=z1+ux*sign*o.width;
      doc.append(el('path',{d:`M${x1} ${z1}L${endX} ${endZ}M${x2} ${z2}A${o.width} ${o.width} 0 0 ${sign>0?1:0} ${endX} ${endZ}`,class:'aad-opening-swing'}));
     }
    }
   }
   const item=el("line",{
    x1:a.x+(b.x-a.x)*from,y1:a.z+(b.z-a.z)*from,x2:a.x+(b.x-a.x)*to,y2:a.z+(b.z-a.z)*to,
    class:(o.kind==="door"?"aad-door":"aad-window")+(selectedId===building.projectId+":"+l.id+":"+o.id?" is-selected":""),
    "stroke-width":building.manifest.presentation?(o.kind==='door'?.045:.07):(o.kind==="door"?.21:.28)
   });
   item.dataset.part=l.id+":"+o.id;
   item.addEventListener("click",evt=>{evt.stopPropagation();if(drawMode){recordDrawPoint(evt);return;}focusEditor(l.id,"opening",o.id);});
   doc.append(item);
  }
  // WORLD_XZ column solids, the same exact assembly instances as 3D and table.
  for(const col of building.elements.filter(e=>e.kind==="column"&&e.level===l.id)){
   const roundColumn=Boolean(col.previewOnly&&col.provenance?.section?.startsWith("Ø"));
   const rect=el(roundColumn?"circle":"rect",{
    ...(roundColumn?{cx:col.x,cy:col.z,r:col.dx/2}:{x:col.x-col.dx/2,y:col.z-col.dz/2,width:col.dx,height:col.dz}),
    class:"aad-column"+(selectedId===col.id?" is-selected":""),
    ...(col.colour?{fill:col.colour,stroke:'#b37c2e','fill-opacity':.65}:{}),
    "data-element-id":col.id,"data-world-x":col.x,"data-world-z":col.z,
    "aria-label":"Column "+col.name+" plan footprint",tabindex:"0",role:"button"});
   rect.addEventListener("click",event=>{event.stopPropagation();if(drawMode){recordDrawPoint(event);return;}selectElement(col);});
   rect.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectElement(col);}});
   doc.append(rect);
  }
  if(building.sourceStructuralReview&&l.id==="gf"){
   for(const f of building.elements.filter(e=>e.kind==="footing"&&e.level==="gf"&&e.previewOnly)){
    const shape=el("rect",{x:f.x-f.dx/2,y:f.z-f.dz/2,width:f.dx,height:f.dz,
     class:"aad-source-footing"+(selectedId===f.id?" is-selected":""),
     "data-element-id":f.id,fill:"#9270ab","fill-opacity":".20",stroke:"#82619a",
     "stroke-width":".06",role:"button",tabindex:"0",
     "aria-label":f.name+" · source review engineering HOLD"});
    shape.addEventListener("click",ev=>{ev.stopPropagation();selectElement(f);});doc.append(shape);
   }
   for(const b of building.elements.filter(e=>e.kind==="beam"&&e.level==="gf"&&e.previewOnly)){
    const angle=(b.rotationDeg||0)*Math.PI/180,
     x1=b.x-Math.cos(angle)*b.dx/2,z1=b.z-Math.sin(angle)*b.dx/2,
     x2=b.x+Math.cos(angle)*b.dx/2,z2=b.z+Math.sin(angle)*b.dx/2;
    const line=el("line",{x1,y1:z1,x2,y2:z2,stroke:"#ab783c","stroke-width":b.dz,
     class:"aad-source-beam"+(selectedId===b.id?" is-selected":""),
     "data-element-id":b.id,"data-world-x":b.x,"data-world-z":b.z,
     role:"button",tabindex:"0","aria-label":b.name+" · M70 frozen source"});
    line.addEventListener("click",ev=>{ev.stopPropagation();selectElement(b);});doc.append(line);
   }
  }
  // Source-ground-floor column centres projected onto architectural FF/SF plans.
  // These ghost locations NEVER enter building.elements / structural IFC exports.
  if(m29Evidence&&showM29UpperProjection&&activeLevel===l.id&&l.id!=="gf"){
   for(const col of m29Evidence.upperFloorProjections.find(p=>p.level===l.id)?.elements||[]){
    const circle=el("circle",{cx:col.x,cy:col.z,r:.28,
     class:"aad-m29-upper-projection",
     stroke:col.insideArchitecturalEnvelope?"#238f96":"#bd654e",
     "data-source-column":col.sourceElementId,
     "data-plan-level":l.id,"data-inside-envelope":String(col.insideArchitecturalEnvelope),
     "aria-label":"Reference-only GF "+col.grid+" projected onto "+l.id+"; not a structural member"});
    const desc=el("title");
    desc.textContent="GF "+col.grid+" projected at ("+col.x.toFixed(3)+", "+col.z.toFixed(3)+
      ") · "+(col.insideArchitecturalEnvelope?"inside":"outside")+" assumed "+l.id+
      " architectural envelope · NOT a structural column";
    circle.append(desc);doc.append(circle);
   }
  }
  if(activeLevel===l.id&&!building.manifest.presentation){
   for(const n of g.nodes){
    const p=nodeMap.get(n.id),circle=el("circle",{cx:p.x,cy:p.z,r:selectedId===building.projectId+":"+l.id+":NODE:"+n.id?.23:.13,class:"aad-node"+(selectedId===building.projectId+":"+l.id+":NODE:"+n.id?" is-selected":""),"data-node":n.id,tabindex:"0",role:"button","aria-label":"Move node "+n.id});
    circle.addEventListener("click",evt=>{evt.stopPropagation();if(drawMode){recordDrawPoint(evt);return;}focusEditor(l.id,"node",n.id);});
    circle.addEventListener("pointerdown",evt=>{
     if(drawMode)return;
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
 if(building.manifest.presentation)drawPresentationPlan(doc,building,activeLevel,{grid:showPlanGrid,dimensions:showDimensions,furniture:showFurniture,selectedId,onSelect:selectElement,roofOnly:roofAccessMode});
 if(drawMode&&drawFirst&&activeLevel!=="all"){
  const l=state.manifest.levels.find(x=>x.id===activeLevel);
  const p=projectToWorld(drawFirst,l.transform);
  doc.append(el("circle",{cx:p.x,cy:p.z,r:.22,class:"aad-draw-first"}));
 }
 const ground=activeLevel==="all"?"All aligned storeys (select a floor to edit)":state.manifest.levels.find(l=>l.id===activeLevel).name+" · elevation "+state.manifest.levels.find(l=>l.id===activeLevel).elevation.toFixed(2)+" m";
 // Structural objects are 3D IFC components without authored 2D floor-graph
 // geometry. Display their world-coordinate locator instead of inventing one.
 const selected=building.elements.find(e=>e.id===selectedId);
 const hasPlan=selected&&(["wall","door","window","column"].includes(selected.kind)||selected.previewOnly&&["footing","beam"].includes(selected.kind)||building.manifest.presentation&&showFurniture&&['furniture','fixture','stair','landing','auxiliary'].includes(selected.kind)&&activeLevel!=='all');
 const position=selectedPosition(selected);
 if(position&&selected&&!hasPlan&&(activeLevel==="all"||activeLevel===selected.level)){
  const marker=el("g",{"data-plan-selection-marker":selected.id,role:"img","aria-label":"Selected element world-location indicator"});
  marker.append(el("circle",{cx:position.x,cy:position.z,r:.55,fill:"#ffe9bc","fill-opacity":".32",stroke:"#ef831b","stroke-width":".15"}));
  marker.append(el("circle",{cx:position.x,cy:position.z,r:.15,fill:"#ed7820"}));
  const tag=el("text",{x:position.x+.62,y:position.z-.45});
  tag.textContent=selected.ifcType+" · plan locator (not a drawn footprint)";
  marker.append(tag);const tooltip=el("title");tooltip.textContent=selected.name+" ("+selected.id+") · world location only; not physical orange geometry";marker.append(tooltip);doc.append(marker);
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

function refreshRooms(){
 if(!workspace)return;
 const body=$("aad-rooms");body.replaceChildren();let total=0,sum=0;
 for(const l of workspace.snapshot().manifest.levels){
  let rooms=[];try{rooms=workspace.rooms(l.id);}catch(e){$("aad-room-summary").textContent="Room face detection failed on "+l.id+": "+e.message;}
  for(const room of rooms){
   const tr=document.createElement("tr");
   for(const field of [l.name,room.id,room.area.toFixed(3),room.centroid.x.toFixed(3)+" / "+room.centroid.z.toFixed(3),room.boundaryStatus]){
    const td=document.createElement("td");td.textContent=field;tr.append(td);
   }
   tr.addEventListener("click",()=>{setLevel(l.id);status("Derived "+room.id+" is a room candidate, not approved IFC space");});
   body.append(tr);total++;sum+=room.area;
  }
 }
 $("aad-room-summary").textContent=total+" bounded room-face candidates on "+workspace.snapshot().manifest.levels.length+
 " storeys · total area "+sum.toFixed(3)+" m² (topological, not certified architectural net room areas)";
}
function setDrawMode(next){
 drawMode=Boolean(next);drawFirst=null;
 $("aad-draw-wall").classList.toggle("is-active",drawMode);
 $("aad-draw-wall").setAttribute("aria-pressed",String(drawMode));
 $("viewer2d").style.cursor=drawMode?"crosshair":"default";
 $("aad-topology-help").textContent=drawMode?
 "Draw mode: choose GF/FF/SF and click two points inside the plan. Existing walls and junctions snap/split automatically. Escape cancels.":
 "Use Draw connected wall, Split, Join or Host opening. Every operation validates one shared 2D/3D/IFC draft.";
 drawPlan();
}
function planLocalPoint(evt){
 const svg=$("viewer2d"),mat=svg.getScreenCTM();
 if(!mat)throw Error("Plan coordinate transform unavailable");
 const p=new DOMPoint(evt.clientX,evt.clientY).matrixTransform(mat.inverse());
 const level=workspace.snapshot().manifest.levels.find(l=>l.id===activeLevel);
 const dx=p.x-level.transform.x,dz=p.y-level.transform.z;
 const a=-level.transform.rotationDeg*Math.PI/180;
 return{x:Math.round((dx*Math.cos(a)-dz*Math.sin(a))*1000)/1000,
  z:Math.round((dx*Math.sin(a)+dz*Math.cos(a))*1000)/1000};
}
function recordDrawPoint(evt){
 if(!workspace||!drawMode||activeLevel==="all"){status("Choose a single storey before drawing a wall");return;}
 try{
  const point=planLocalPoint(evt);
  if(!drawFirst){drawFirst=point;drawPlan();
   $("aad-topology-help").textContent="Wall start ("+point.x+", "+point.z+")m. Click the connected end point.";
  }else{
   const first=drawFirst;setDrawMode(false);
   applyTopology(activeLevel,"addWall",{start:first,end:point,thickness:.15});
  }
 }catch(e){status("Wall drawing rejected: "+e.message);drawFirst=null;drawPlan();}
}
function applyTopology(level,action,args){
 if(!workspace||!level||level==="all")throw Error("Select GF, FF or SF before topology editing");
 const before=workspace.bundle();
 try{
  const out=workspace.topology(level,action,args);
  lastUndo=before;activeEdit=null;selectedId=null;
  persistDraft();refreshAll();setLevel(level);
  const created=out.result?.ids?.[0]||out.result?.id||out.result?.wallId||out.result?.nodeId||"";
  if(created){
   const element=building.elements.find(e=>e.id===building.projectId+":"+level+":"+created);
   if(element)selectElement(element);
  }
  const txt=action+" accepted on "+level.toUpperCase()+": "+JSON.stringify(out.result);
  $("edit-notice").textContent=txt;
  status("Live 2D, 3D, rooms and IFC synchronized · "+action+" · engineering HOLD");
  return{version:workspace.snapshot().version,result:out.result};
 }catch(e){
  $("edit-notice").textContent="Topology edit rejected: "+e.message;
  status("Topology rejected: "+e.message);
  throw e;
 }
}
function selectedGraphObject(){
 if(!workspace||!activeEdit)return null;
 const l=activeEdit.level,g=workspace.snapshot().models[l]?.floorGraph;
 if(!g)return null;
 return{level:l,kind:activeEdit.kind,
  wall:g.walls.find(w=>w.id===activeEdit.id),
  opening:g.openings.find(o=>o.id===activeEdit.id),graph:g};
}
function topologyButton(action){
 try{
  const picked=selectedGraphObject();
  if(!picked)throw Error("Select an editable wall or opening first");
  if(action==="splitWall"||action==="removeWall"||action==="addOpening"){
   if(!picked.wall)throw Error("Select a wall in the 2D plan first");
   const n=new Map(picked.graph.nodes.map(x=>[x.id,x])),a=n.get(picked.wall.a),b=n.get(picked.wall.b),
    length=Math.hypot(a.x-b.x,a.z-b.z);
   const args=action==="splitWall"?{wallId:picked.wall.id,offset:Math.round(length/2*1000)/1000}:
    action==="removeWall"?{wallId:picked.wall.id}:
    {wallId:picked.wall.id,kind:$("aad-add-window").dataset.activeKind||"door",width:1,
     offset:Math.max(0,Math.round((length-1)/2*1000)/1000)};
   return applyTopology(picked.level,action,args);
  }
  if(action==="removeOpening"){
   if(!picked.opening)throw Error("Select a door/window in the 2D plan first");
   return applyTopology(picked.level,action,{id:picked.opening.id});
  }
 }catch(e){$("aad-topology-help").textContent=e.message;return null;}
}

function refreshAll(){
 building=workspace.snapshot().assembly;
 renderModel();drawPlan();addStats();addRows();refreshRooms();runQa();refreshEditPanel();paintSelection();
 $("aad-edit-version").textContent="Working BIM draft v"+workspace.snapshot().version+(workspace.snapshot().lastEdit?" · unsent to source":"");
 $("aad-undo").disabled=!lastUndo;
}
function draftStorageKey(manifest){return "aad:unified:draft:"+manifest.projectId+(manifest.presentation?":"+(manifest.revision||"presentation-v1"):"");}
function persistDraft(){
 try{localStorage.setItem(draftStorageKey(workspace.snapshot().manifest),JSON.stringify(workspace.bundle()));}catch(_){}
}
function setLevel(level){
 activeLevel=level;drawFirst=null;
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
  camera.aspect=node.clientWidth/Math.max(200,node.clientHeight);camera.updateProjectionMatrix();centerView();}
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
 let reviewStructure=null;
 if(params.get("structure")==="source-review"){
  reviewStructure=await loadAADReviewedStructure(manifest,url,async path=>{
   const result=await fetch(path.href,{cache:"no-store"});
   if(!result.ok)throw Error("Structural source HTTP "+result.status+" / "+path.pathname);
   return result.json();
  });
 }
 if(reviewStructure&&manifest.structuralReview?.datumEvidence){
  const auditPath=new URL(manifest.structuralReview.datumEvidence,prefix);
  const sourcePath=new URL(manifest.structuralReview.sourceLedger,prefix);
  if(auditPath.origin!==location.origin||!auditPath.pathname.startsWith(prefix.pathname)||
     sourcePath.origin!==location.origin||!sourcePath.pathname.startsWith(prefix.pathname))
   throw Error("M29 source audit path not owned by this project");
  const [controlResp,sourceResp]=await Promise.all([
   fetch(auditPath.href,{cache:"no-store"}),fetch(sourcePath.href,{cache:"no-store"})]);
  if(!controlResp.ok||!sourceResp.ok)throw Error("M29 source audit HTTP failure");
  const [control,sourceRaw]=await Promise.all([controlResp.json(),sourceResp.json()]);
  if(control.schema!=="jp-cad://aad-m29-partial-dxf-audit-summary/1"||
     control.projectId!==manifest.projectId||control.constructionApproval!==false)
   throw Error("M29 source audit version or approval invalid");
  m29Evidence=deriveM29DatumEvidence(sourceRaw,manifest,models,reviewStructure);
  if(m29Evidence.summary.sourceEdgeCount!==control.sourceEdgeEvidence.edgeSegments)
   throw Error("M29 source audit counts drift");
  const layers=$("aad-m29-controls");layers.hidden=false;
  $("aad-m29-register-link").href=auditPath.href;
  const stats=m29Evidence.summary,by=stats.nearestWallMidpointDistanceM;
  $("aad-m29-summary").textContent=stats.sourceEdgeCount+" direct extracted DXF wall edges · "+
   stats.modeledGFWallCenterlines+" GF modeled wall centre-lines · median edge→wall "+
   by.p50.toFixed(3)+"m, P90 "+by.p90.toFixed(3)+"m. "+
   stats.upperFloorProjections.map(p=>p.level.toUpperCase()+": "+p.withinFootprint+
   "/23 GF column centres within current floor envelope").join(" · ");
  $("aad-m29-source-toggle").addEventListener("change",e=>{
   showM29SourceEdges=e.target.checked;drawPlan();});
  $("aad-m29-projection-toggle").addEventListener("change",e=>{
   showM29UpperProjection=e.target.checked;drawPlan();});
 }
 if(reviewStructure&&manifest.structuralReview?.fullSourceIndex){
  const indexURL=new URL(manifest.structuralReview.fullSourceIndex,prefix);
  if(indexURL.origin!==location.origin||!indexURL.pathname.startsWith(prefix.pathname))
   throw Error("M30 source index must reside in the same project directory");
  const r=await fetch(indexURL.href,{cache:"no-store"});
  if(!r.ok)throw Error("M30 source inventory HTTP "+r.status);
  const index=await r.json();
  if(index.schema!=="jp-cad://aad-m30-original-dxf-source-index/1"||
     index.projectId!==manifest.projectId||
     index.sourceToDesignGate.issueForConstruction!==false||
     index.sourceToDesignGate.upperFloorIFCConstructionMembers!==0||
     index.originals.architecture.modelspaceEntities!==371930||
     index.originals.structure.modelspaceEntities!==13834)
   throw Error("M30 source inventory is invalid or unsafe");
  m30Evidence=index;
  $("aad-m30-source").hidden=false;
  $("aad-m30-evidence-link").href=indexURL.href;
  $("aad-m30-summary").textContent=index.originals.architecture.modelspaceEntities.toLocaleString()+
   " architectural and "+index.originals.structure.modelspaceEntities.toLocaleString()+
   " structural model-space entities indexed from unchanged original DXFs. "+
   "GF/FF/SF source beam-plan sheets verified; model remains conceptual.";
  const select=$("aad-m30-floor"),detail=$("aad-m30-floor-evidence");
  const update=()=>{
   const floor=select.value;
   const item=index.upperFloorStructuralSheetEvidence.sourceNativeByFloor[floor];
   const name=floor==="gf"?"Ground":floor==="ff"?"First":"Second";
   detail.textContent=name+" floor original structural sheet\n"+
    "Plan-title native DXF handle: "+index.upperFloorStructuralSheetEvidence.sheetTitleHandles[floor]+"\n"+
    "Beam-section MTEXT source annotations: "+item.sheetBeamMTEXT+"\n"+
    "Native architectural/structural wall-layer lines in this sheet: "+item.wallLines+"\n"+
    "Native centerline layer lines: "+item.centerlineLines+"\n"+
    "Supported structural beams derived for IFC: NOT DETERMINED\n"+
    "Load-path / capacity: NOT VERIFIED\n"+
    "GF and FF beam sheet linework: 113 matching lines after 36,174 mm source-sheet translation\n"+
    "Second-floor relative to first: 104 matching lines, 9 FF-only and 3 SF-only.";
  };
  select.addEventListener("change",update);update();
 }
 workspace=createAADWorkspace(manifest,models,{reviewStructure});
 const storageKey=draftStorageKey(manifest);
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
 initAADRegister();
 $("building-subtitle").textContent=manifest.presentation?
  (manifest.presentation.outerBounds[2]-manifest.presentation.outerBounds[0]).toFixed(2)+' × '+(manifest.presentation.outerBounds[3]-manifest.presentation.outerBounds[1]).toFixed(2)+' m outer envelope · '+building.levels.map(l=>l.id.toUpperCase()).join(' + ')+' · '+Math.round(manifest.presentation.plinth*1000)+' mm plinth · '+Math.round(manifest.presentation.floorToFloor*1000)+' mm storeys · architectural coordination candidate':
  building.levels.length+" storeys · one world coordinate frame · "+building.area.model.toFixed(2)+"m² combined floor plates · "+building.elements.filter(e=>e.ifcType).length+" modeled IFC-typed components";
 const link=$("source-ledger");link.href=new URL(manifest.sourceLedger||"MODEL_QA_MANIFEST_v2.json",prefix).href;
 initRenderer();addStoreys();addStats();addRows();renderModel();setLevel("all");refreshRooms();centerView();runQa();
 try{const mode=localStorage.getItem("aad:unified:view-mode");setViewMode(mode||"split");}catch(_){setViewMode("split");}
 $("aad-edit-version").textContent=workspace.snapshot().version?"Recovered working draft v"+workspace.snapshot().version:"Canonical source · no edits";
 status((building.sourceStructuralReview?
    "M26 source-backed structural GF: 23 DXF columns, 21 drawn footings, 16 M70 beams · old synthetic 4×3 excluded · ":
    "Shared AAD building assembly ready · ")+building.diagnostics.length+
   " QA findings (ENGINEERING HOLD)");
 if(building.sourceStructuralReview){
  $("building-subtitle").textContent+=" · USER-APPROVED GF SOURCE / UPPER STOREYS NOT STRUCTURALLY VERIFIED";
 }
 if(manifest.presentation){
  $('aad-preset-roof').hidden=!Boolean(manifest.presentation.roofAccess);
  cutaway=true;$("aad-presentation-controls").hidden=false;setKindVisibility('roof',false);
  setLevel(manifest.presentation.defaultLevel||'gf');setViewMode(manifest.presentation.defaultView||'split');renderModel();drawPlan();centerView();
 }
}
for(const [id,stateKey]of [['aad-cutaway','cutaway'],['aad-dimensions','dimensions'],['aad-plan-grid','grid'],['aad-furniture','furniture']]){
 $(id).addEventListener('change',e=>{if(!building)return;const on=e.target.checked;if(stateKey==='cutaway')cutaway=on;if(stateKey==='dimensions')showDimensions=on;if(stateKey==='grid')showPlanGrid=on;if(stateKey==='furniture')showFurniture=on;renderModel();drawPlan();});
}
function setKindVisibility(kind,visible){kindFlags.set(kind,visible);const box=document.querySelector(`#component-types input[data-kind="${kind}"]`);if(box)box.checked=visible;}
for(const[id,level]of [['aad-preset-gf','gf'],['aad-preset-ff','ff'],['aad-preset-exterior','all']])$(id).addEventListener('click',()=>{
 if(!building)return;roofAccessMode=false;cutaway=level!=='all';$('aad-cutaway').checked=cutaway;setKindVisibility('roof',level==='all');setLevel(level);renderModel();drawPlan();centerView();
});
$('aad-preset-roof').addEventListener('click',()=>{if(!building?.manifest.presentation?.roofAccess)return;roofAccessMode=true;cutaway=true;$('aad-cutaway').checked=true;setKindVisibility('roof',true);setLevel('ff');setViewMode('building');renderModel();drawPlan();centerView();});
for(const[id,mode]of [['aad-view-3d','building'],['aad-view-plan','plan'],['aad-view-both','split']])$(id).addEventListener('click',()=>{if(building)setViewMode(mode);});
for(const[id,factor]of [['aad-plan-in',.78],['aad-plan-out',1.28]])$(id).addEventListener('click',()=>{
 const svg=$('viewer2d'),v=svg.viewBox.baseVal;svg.setAttribute('viewBox',[v.x+v.width*(1-factor)/2,v.y+v.height*(1-factor)/2,v.width*factor,v.height*factor].join(' '));
});
$('aad-plan-export').addEventListener('click',()=>{if(!building)return;const svg=$('viewer2d').cloneNode(true);svg.setAttribute('xmlns',svgNS);download(building.projectId+'_'+activeLevel+'_DIMENSIONED_PLAN.svg',new XMLSerializer().serializeToString(svg),'image/svg+xml');});
$('viewer2d').addEventListener('pointermove',ev=>{
 if(!building?.manifest.presentation)return;const svg=$('viewer2d'),p=svg.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());
 const x=Math.round(q.x*1000),y=Math.round((building.manifest.presentation.sourceYLength-q.y)*1000),cell=(building.manifest.presentation.grid?.minor||.1)*1000;$('aad-coordinate-readout').textContent=`${activeLevel.toUpperCase()} · X ${x} mm · Y ${y} mm · cell ${Math.floor(x/cell)},${Math.floor(y/cell)}`;
});
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


$("viewer2d").addEventListener("click",e=>{if(drawMode&&e.target===$("viewer2d"))recordDrawPoint(e);});
$("aad-draw-wall").addEventListener("click",()=>setDrawMode(!drawMode));
$("aad-split-wall").addEventListener("click",()=>topologyButton("splitWall"));
$("aad-delete-wall").addEventListener("click",()=>topologyButton("removeWall"));
$("aad-add-door").addEventListener("click",()=>{
 $("aad-add-window").dataset.activeKind="door";topologyButton("addOpening");
});
$("aad-add-window").addEventListener("click",()=>{
 $("aad-add-window").dataset.activeKind="window";topologyButton("addOpening");
});
$("aad-delete-opening").addEventListener("click",()=>topologyButton("removeOpening"));
$("aad-join-walls").addEventListener("click",()=>{
 try{applyTopology(activeLevel,"joinWalls",{firstId:$("aad-join-first").value.trim(),secondId:$("aad-join-second").value.trim()});}
 catch(e){$("aad-topology-help").textContent=e.message;}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawMode)setDrawMode(false);});
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
 try{localStorage.removeItem(draftStorageKey(workspace.snapshot().manifest));}catch(_){}
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
 getModelledHeadroomProof:()=>{
  const samples=building?.manifest.presentation?.headroomSamples||[];
  for(const m of hitMeshes)m.updateMatrixWorld(true);
  const rows=samples.map(s=>{const ignore=building.projectId+':'+s.level+':'+s.ignoreId;
   const candidates=hitMeshes.filter(m=>m.userData.element.id!==ignore&&['wall','floor','roof','stair','landing','auxiliary'].includes(m.userData.element.kind));
   const ray=new THREE.Raycaster(new THREE.Vector3(s.x,s.surfaceY+.001,s.z),new THREE.Vector3(0,1,0),0,12),hit=ray.intersectObjects(candidates,false)[0];
   return{id:s.id,clearanceM:hit?hit.distance+.001:null,obstructionId:hit?.object.userData.element.id||null};});
  return{scope:'MODELLED_ARCHITECTURAL_GEOMETRY_ONLY',finishedEngineeringVerified:false,samples:rows,minimumM:Math.min(...rows.filter(x=>x.clearanceM!==null).map(x=>x.clearanceM))};
 },
 getViewportProof:()=>{
  // Complete the current WebGL frame before a screenshot/export reads pixels.
  // This also prevents headless software rendering from capturing a prior preset.
  renderer.render(scene,camera);renderer.getContext().finish();
  const visible=[...new Map(hitMeshes.filter(m=>m.visible!==false).map(m=>[m.userData.element.id,m.userData.element])).values()];
  return{activeLevel,cutaway,roofAccessMode,visibleRoofAccess:visible.filter(e=>e.roofAccess).length,visibleWalls:visible.filter(e=>e.kind==='wall').length,
   visibleRoof:visible.some(e=>e.kind==='roof'),visibleFurniture:visible.filter(e=>e.kind==='furniture').length};
 },
 getOpeningVoidProof:(id)=>{
  const o=building?.elements.find(e=>e.id===id&&e.host);if(!o)throw Error('Unknown opening '+id);
  const wall=building.elements.find(e=>e.id===o.host),mesh=hitMeshes.find(m=>m.userData.element.id===wall.id);
  const a=(wall.rotationDeg||0)*Math.PI/180,normal=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
  mesh.updateMatrixWorld(true);const origin=new THREE.Vector3(o.x,o.y,o.z).addScaledVector(normal,.8),ray=new THREE.Raycaster(origin,normal.clone().negate(),0,1.6);
  return{openingId:id,host:wall.id,wallTriangleHitsThroughAperture:ray.intersectObject(mesh,false).length,solidVolume:mesh.userData.wallVoidProof?.solidVolume,grossVolume:mesh.userData.wallVoidProof?.grossVolume};
 },
 getCapabilities:()=>({schema:"jp-cad://aad-studio-capabilities/1",editor:"shared-multistorey",
   actions:["selectElementById","change","topology","getRooms","setLevel","getSnapshot","getDraft"],coordinates:"metres",ifc:"IFC4_CONCEPTUAL_ENGINEERING_HOLD",sourceReviewedStructure:Boolean(building?.sourceStructuralReview),topology:["addWall","splitWall","joinWalls","removeWall","addOpening","removeOpening"]}),
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
 topology:(args)=>{
  if(!args||!args.level||!args.action)throw Error("AAD topology requires storey, action and args");
  return applyTopology(args.level,args.action,args.args||{});
 },
 getRooms:(level)=>{
  if(!workspace)throw Error("AAD not loaded");
  if(level)return workspace.rooms(level);
  return Object.fromEntries(workspace.snapshot().manifest.levels.map(l=>[l.id,workspace.rooms(l.id)]));
 },
 setLevel:(level)=>{if(!building||!(level==="all"||building.levels.some(l=>l.id===level)))throw Error("Unknown AAD level");setLevel(level);},
 // Read-only coordinate proof for the model, actual THREE mesh, 2D and table.
 getViewCoordinateProof:(id)=>{
  const e=building?.elements.find(x=>x.id===id);
  if(!e)throw Error("Unknown AAD component "+id);
  const mesh=hitMeshes.find(m=>m.userData.element.id===id);
  const compositeCentre=e.parts?.length?hitMeshes.filter(m=>m.userData.element.id===id).reduce((b,m)=>b.union(new THREE.Box3().setFromObject(m)),new THREE.Box3()).getCenter(new THREE.Vector3()):null;
  const plan=[...document.querySelectorAll("#viewer2d [data-element-id]")].find(n=>n.dataset.elementId===id)||
   [...document.querySelectorAll("#viewer2d [data-part]")].find(n=>building.projectId+":"+n.dataset.part===id)||
   [...document.querySelectorAll('#viewer2d [data-presentation-id]')].find(n=>n.dataset.presentationId===id);
  const pointFromPlan=plan?plan.tagName.toLowerCase()==="g"?(()=>{const b=plan.getBBox();return{x:b.x+b.width/2,z:b.y+b.height/2,dx:b.width,dz:b.height};})():plan.tagName.toLowerCase()==="circle"?
   {x:Number(plan.getAttribute("cx")),z:Number(plan.getAttribute("cy")),
    dx:2*Number(plan.getAttribute("r")),dz:2*Number(plan.getAttribute("r"))}:
   plan.tagName.toLowerCase()==="line"?
   {x:(Number(plan.getAttribute("x1"))+Number(plan.getAttribute("x2")))/2,
    z:(Number(plan.getAttribute("y1"))+Number(plan.getAttribute("y2")))/2,
    dx:Math.hypot(Number(plan.getAttribute("x2"))-Number(plan.getAttribute("x1")),
     Number(plan.getAttribute("y2"))-Number(plan.getAttribute("y1"))),
    dz:Number(plan.getAttribute("stroke-width"))}:
   {x:Number(plan.getAttribute("x"))+Number(plan.getAttribute("width"))/2,
    z:Number(plan.getAttribute("y"))+Number(plan.getAttribute("height"))/2,
    dx:Number(plan.getAttribute("width")),dz:Number(plan.getAttribute("height"))}:null;
  const row=rowsById.get(id);
  return{elementId:id,kind:e.kind,model:{x:e.x,y:e.y,z:e.z,dx:e.dx,dz:e.dz},
   mesh:mesh?{x:compositeCentre?.x??mesh.position.x,y:compositeCentre?.y??mesh.position.y,z:compositeCentre?.z??mesh.position.z}:null,
   plan:pointFromPlan,
   table:row?{x:Number(row.cells[4].textContent),y:Number(row.cells[5].textContent),
    z:Number(row.cells[6].textContent)}:null};
 },
 getM30SourceEvidence:()=>m30Evidence?{
  schema:m30Evidence.schema,architectureIndexed:m30Evidence.originals.architecture.modelspaceEntities,
  structureIndexed:m30Evidence.originals.structure.modelspaceEntities,
  floorSheets:m30Evidence.upperFloorStructuralSheetEvidence.sourceNativeByFloor,
  upperFloorIFCMembersAdded:m30Evidence.sourceToDesignGate.upperFloorIFCConstructionMembers,
  constructionApproval:false,
  originalSHA256:{architecture:m30Evidence.originals.architecture.sha256,
   structure:m30Evidence.originals.structure.sha256}
 }:null,
 getM29DatumEvidence:()=>m29Evidence?{
  schema:m29Evidence.schema,summary:m29Evidence.summary,
  sourceEdgeCount:m29Evidence.sourceSegments.length,
  upperProjectionCounts:m29Evidence.upperFloorProjections.map(p=>({
   level:p.level,count:p.projectedCount,inside:p.withinFootprint,outside:p.outsideFootprint
  })),
  issuedForConstruction:false,sourceMode:"PARTIAL_DXF_GEOMETRY_NOT_SURVEY_REGISTRATION"
 }:null,
 getSnapshot:()=>workspace?workspace.snapshot():null,
 getDraft:()=>workspace?workspace.bundle():null
});
main().catch(e=>{status("Unable to assemble this project: "+e.message);$("qa-result").textContent="ERROR: "+e.message;});
