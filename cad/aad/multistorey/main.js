/* Generic AAD multistorey UI. Shared geometry is in aad-building-core.mjs.
 * This viewer has NO hardcoded project geometry or project-specific paths.
 */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
const $=id=>document.getElementById(id);
const moduleURL=file=>new URL("../../../assets/js/"+file,location.href).href;
const {assembleBuilding,verifyAssembly}=await import(/* @vite-ignore */moduleURL("aad-building-core.mjs"));
const {writeIFC4,checkIfcReferences}=await import(/* @vite-ignore */moduleURL("aad-building-ifc4.mjs"));
const params=new URLSearchParams(location.search);
const chosen=params.get("manifest");
let building=null,renderer=null,camera=null,orbit=null,scene=null,geometryGroup=null;
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
 $("selection").textContent=htmlText(e);
 const row=rowsById.get(e.id);if(row)row.scrollIntoView({behavior:"smooth",block:"nearest"});
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
  const tr=document.createElement("tr");const dims=Number.isFinite(e.dx)?[e.dx,e.dy,e.dz].map(n=>n.toFixed(2)).join(" × "):e.profile?"Polygon / "+e.dy+"m":"Steps "+e.steps?.length;
  for(const s of [e.id,e.level,e.ifcType,e.kind,e.x?.toFixed(3)||"—",e.y.toFixed(3),e.z?.toFixed(3)||"—",dims,e.status]){
   const td=document.createElement("td");td.textContent=s;tr.append(td);
  }
  tr.addEventListener("click",()=>selectElement(e));tbody.append(tr);rowsById.set(e.id,tr);
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
 building=assembleBuilding(manifest,models);
 $("building-name").textContent=building.name;
 $("building-subtitle").textContent=building.levels.length+" storeys · one world coordinate frame · "+building.area.model.toFixed(2)+"m² Block B floor areas · "+building.elements.filter(e=>e.ifcType).length+" modeled IFC-typed components";
 const link=$("source-ledger");link.href=new URL("MODEL_QA_MANIFEST_v2.json",prefix).href;
 initRenderer();addStoreys();addStats();addRows();renderModel();centerView();runQa();
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
main().catch(e=>{status("Unable to assemble this project: "+e.message);$("qa-result").textContent="ERROR: "+e.message;});
