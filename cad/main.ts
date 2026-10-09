import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {TransformControls} from "three/addons/controls/TransformControls.js";
import {validate,encode,type CadElement,type CadModel} from "./model";
import {resolveModel,linkFor,sectionFaces,type SectionAxis} from "./parametrics";
const el=<T extends Element>(id:string)=>{const e=document.getElementById(id);if(!e)throw Error("Missing "+id);return e as T;};
const container=el<HTMLDivElement>("viewport"),status=el<HTMLDivElement>("status"),tree=el<HTMLDivElement>("modelTree");
const setStatus=(s:string)=>{status.textContent=s;};
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.localClippingEnabled=true;container.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color("#0c1b2a");
scene.add(new THREE.HemisphereLight(0xcde7ff,0x273d52,2.6));
const sun=new THREE.DirectionalLight(0xffe7bd,3.2);sun.position.set(6,13,9);scene.add(sun);
const grid=new THREE.GridHelper(30,30,0x45637b,0x274157);grid.position.y=-0.005;scene.add(grid);
const axes=new THREE.AxesHelper(2);axes.position.set(-1,0,1);scene.add(axes);
const draftGroup=new THREE.Group();draftGroup.name="DRAFT_MODEL";scene.add(draftGroup);
let ifcGroup:THREE.Group|null=null,model:CadModel,resolved:CadModel,original:CadModel,selected:string|null=null,mode:"select"|"move"="select";
let undo:CadModel[]=[],redo:CadModel[]=[],clipped=false,view:"3d"|"plan"|"front"|"side"="3d";
const meshes=new Map<string,THREE.Mesh>();
const clipPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),2.2);
const width=()=>Math.max(100,container.clientWidth),height=()=>Math.max(100,container.clientHeight);
const persp=new THREE.PerspectiveCamera(50,width()/height(),.03,500);
const ortho=new THREE.OrthographicCamera(-10,10,10,-10,.03,500);
let camera:THREE.Camera=persp;
persp.position.set(15,12,14);const orbit=new OrbitControls(persp,renderer.domElement);orbit.target.set(4.5,1.2,-3.5);
orbit.enableDamping=true;orbit.dampingFactor=.07;
const transform=new TransformControls(persp,renderer.domElement);transform.setTranslationSnap(.1);transform.setSize(.82);
scene.add(transform.getHelper());
const liveElement=():CadElement|undefined=>resolved?.elements.find(e=>e.id===selected);
transform.addEventListener("dragging-changed",(event)=>{orbit.enabled=!Boolean((event as {value?:unknown}).value);});
transform.addEventListener("mouseUp",()=>{
 const current=liveElement(),mesh=current&&meshes.get(current.id);if(!current||!mesh)return;
 const snap=(x:number)=>Math.round(x*1000/100)*100;
 if(linkFor(model,current.id)){setStatus("Driven element: edit the parent footing instead.");draw();return;}
 const changed={...current,x_mm:snap(mesh.position.x-current.length_mm/2000),y_mm:snap(-mesh.position.z-current.width_mm/2000),z_mm:snap(mesh.position.y-current.height_mm/2000)};
 commit(changed);
});
const colors:Record<string,number>={slab:0x547b9c,footing:0xa98072,wall:0xb3c2d1,column:0x68c9b3,beam:0xe1b86d};
function draw(){
 resolved=resolveModel(model);
 for(const old of draftGroup.children){old.traverse(obj=>{
  if(obj instanceof THREE.Mesh){obj.geometry.dispose();(obj.material as THREE.Material).dispose();}
  if(obj instanceof THREE.LineSegments){obj.geometry.dispose();(obj.material as THREE.Material).dispose();}
 });}
 meshes.clear();draftGroup.clear();
 for(const e of resolved.elements){
  const shape=new THREE.BoxGeometry(e.length_mm/1000,e.height_mm/1000,e.width_mm/1000);
  const material=new THREE.MeshStandardMaterial({color:colors[e.kind]||0xaac0ce,roughness:.7,metalness:.02,transparent:true,opacity:e.kind==="wall"?.62:.94,clippingPlanes:clipped?[clipPlane]:[],side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(shape,material);
  mesh.position.set((e.x_mm+e.length_mm/2)/1000,(e.z_mm+e.height_mm/2)/1000,-(e.y_mm+e.width_mm/2)/1000);
  mesh.userData={id:e.id};mesh.name=e.id;
  const lines=new THREE.LineSegments(new THREE.EdgesGeometry(shape),new THREE.LineBasicMaterial({color:0x96c8df,transparent:true,opacity:.38,clippingPlanes:clipped?[clipPlane]:[]}));
  mesh.add(lines);
  draftGroup.add(mesh);meshes.set(e.id,mesh);
 }
 highlight();drawTree();renderSection();
}
function drawTree(){
 tree.replaceChildren();
 const grouped=new Map<string,CadElement[]>();
 for(const e of resolved.elements){const key=e.level+" · "+e.kind.toUpperCase();const a=grouped.get(key)||[];a.push(e);grouped.set(key,a);}
 for(const [key,entries] of grouped){
  const heading=document.createElement("div");heading.className="group";heading.textContent=key;tree.append(heading);
  for(const e of entries){const btn=document.createElement("button");btn.type="button";btn.textContent=e.id;btn.className=e.id===selected?"selected":"";btn.onclick=()=>select(e.id);tree.append(btn);}
 }
}
function highlight(){
 for(const [id,mesh] of meshes){const mat=mesh.material as THREE.MeshStandardMaterial;mat.emissive.setHex(id===selected?0x36564e:0x000000);mat.emissiveIntensity=id===selected?1:0;}
 transform.detach();
 if(mode==="move"&&selected&&!linkFor(model,selected)){const mesh=meshes.get(selected);if(mesh)transform.attach(mesh);}
}
function renderInspector(){
 const e=liveElement();el<HTMLElement>("selectedName").textContent=e?e.id+" · "+e.kind:"Click an element in the model";
 const link=e?linkFor(model,e.id):undefined;
 for(const k of ["x","y","z","length","width","height"] as const){
  const input=el<HTMLInputElement>(k);
  input.value=e?String(e[(k+"_mm") as keyof CadElement]):"";
  input.readOnly=Boolean(link&&(k==="x"||k==="y"||k==="z"||(k==="length"&&link.kind==="span_columns_x")));
 }
 el<HTMLElement>("constraintStatus").textContent=link?link.kind==="center_on_top"?"Linked to "+link.parent_id+" · position follows footing":"Span driven by "+link.from_id+" and "+link.to_id+" · length is computed":"Independent geometry · editable placement";
 el<HTMLInputElement>("elementId").value=e?.id||"";el<HTMLInputElement>("elementType").value=e?.kind||"";
}
function select(id:string|null){selected=id&&meshes.has(id)?id:null;highlight();drawTree();renderInspector();renderSection();setStatus(selected?"Selected "+selected+" · draft only":"Select any building object to inspect.");}
function commit(next:CadElement){
 if(!model.elements.some(e=>e.id===next.id))return;
 const candidate=structuredClone(model),i=candidate.elements.findIndex(e=>e.id===next.id);
 const source=candidate.elements[i]!,link=linkFor(candidate,next.id);
 if(link){source.width_mm=next.width_mm;source.height_mm=next.height_mm;if(link.kind!=="span_columns_x")source.length_mm=next.length_mm;}
 else candidate.elements[i]=next;
 candidate.authority="DRAFT";
 try{validate(candidate);resolveModel(candidate);}catch(error){setStatus("Rejected: "+String(error));draw();return;}
 undo.push(structuredClone(model));if(undo.length>50)undo.shift();redo=[];
 model=candidate;draw();select(next.id);setStatus("Draft updated: "+next.id+" · Undo available. No engineering sources changed.");
}
function restore(next:CadModel){const candidate=validate(next);resolveModel(candidate);model=candidate;draw();select(selected);setStatus("Draft history restored.");}
const getBox=()=>new THREE.Box3().setFromObject(draftGroup);
function fit(modeName= view){
 const bounds=getBox(),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 if(bounds.isEmpty())return;const span=Math.max(size.x,size.y,size.z,6),dist=span*1.75;
 if(modeName==="3d"){
  camera=persp;persp.position.copy(center).add(new THREE.Vector3(dist,dist*.8,dist));persp.lookAt(center);persp.updateProjectionMatrix();
 }else{
  const aspect=width()/height(),extent=span*.85;
  ortho.left=-extent*aspect;ortho.right=extent*aspect;ortho.top=extent;ortho.bottom=-extent;ortho.updateProjectionMatrix();
  camera=ortho;
  if(modeName==="plan"){ortho.position.copy(center).add(new THREE.Vector3(0,dist,0));ortho.up.set(0,0,-1);}
  if(modeName==="front"){ortho.position.copy(center).add(new THREE.Vector3(0,0,dist));ortho.up.set(0,1,0);}
  if(modeName==="side"){ortho.position.copy(center).add(new THREE.Vector3(dist,0,0));ortho.up.set(0,1,0);}
  ortho.lookAt(center);
 }
 orbit.object=camera;orbit.target.copy(center);orbit.update();transform.camera=camera;
}
function viewMode(newView:typeof view){
 view=newView;fit();
 for(const key of ["3d","Plan","Front","Side"]){
  const id="view"+key;el<HTMLButtonElement>(id).classList.toggle("active",key.toLowerCase()===view);
 }
 el("viewName").textContent=view==="3d"?"3D perspective":view==="plan"?"Ground floor plan":view==="front"?"Front elevation":"Side elevation";
}

const SVG_NS="http://www.w3.org/2000/svg";
function renderSection(){
 const svg=el<SVGSVGElement>("sectionSvg");svg.replaceChildren();
 if(!model)return;
 const axis=el<HTMLSelectElement>("sectionAxis").value as SectionAxis;
 const slider=el<HTMLInputElement>("sectionPosition");const offset=Number(slider.value);
 el<HTMLElement>("sectionReadout").textContent=axis.toUpperCase()+" = "+offset.toLocaleString()+" mm";
 const faces=sectionFaces(model,axis,offset);
 const all=resolved.elements;
 const minX=Math.min(...all.map(e=>axis==="y"?e.x_mm:e.y_mm));
 const maxX=Math.max(...all.map(e=>axis==="y"?e.x_mm+e.length_mm:e.y_mm+e.width_mm));
 const minZ=Math.min(...all.map(e=>e.z_mm));
 const maxZ=Math.max(...all.map(e=>e.z_mm+e.height_mm));
 const scale=Math.min(740/Math.max(maxX-minX,1),215/Math.max(maxZ-minZ,1));
 const node=(tag:string,atts:Record<string,string>)=>{const n=document.createElementNS(SVG_NS,tag);for(const [key,value] of Object.entries(atts))n.setAttribute(key,value);svg.appendChild(n);return n;};
 node("line",{x1:"24",y1:"252",x2:"785",y2:"252",stroke:"#68849a","stroke-width":"1"});
 for(const face of faces){
  const x=30+(face.x0_mm-minX)*scale,y=247-(face.z1_mm-minZ)*scale;
  const rect=node("rect",{x:String(x),y:String(y),width:String(Math.max((face.x1_mm-face.x0_mm)*scale,1)),height:String(Math.max((face.z1_mm-face.z0_mm)*scale,1)),fill:face.kind==="column"?"#49b9a7":face.kind==="footing"?"#ae8776":face.kind==="beam"?"#dbad60":"#6d8eaa",opacity:".8",stroke:face.element_id===selected?"#fff4b2":"#cadeed","stroke-width":face.element_id===selected?"2.5":"1","data-element-id":face.element_id});
  const title=document.createElementNS(SVG_NS,"title");title.textContent=face.element_id+" · "+(face.x1_mm-face.x0_mm)+" × "+(face.z1_mm-face.z0_mm)+" mm";rect.appendChild(title);
 }
 node("text",{x:"24",y:"270",fill:"#a5bdd1","font-size":"13"}).textContent="SECTION "+axis.toUpperCase()+" · "+faces.length+" intersected objects · millimetres · draft only";
}
el<HTMLSelectElement>("sectionAxis").onchange=()=>{
 const axis=el<HTMLSelectElement>("sectionAxis").value;
 const slider=el<HTMLInputElement>("sectionPosition");
 slider.max=axis==="y"?"7000":"9000";slider.value="875";renderSection();
};
el<HTMLInputElement>("sectionPosition").oninput=renderSection;

el<HTMLButtonElement>("view3d").onclick=()=>viewMode("3d");
el<HTMLButtonElement>("viewPlan").onclick=()=>viewMode("plan");
el<HTMLButtonElement>("viewFront").onclick=()=>viewMode("front");
el<HTMLButtonElement>("viewSide").onclick=()=>viewMode("side");
el<HTMLButtonElement>("resetCamera").onclick=()=>fit();
el<HTMLButtonElement>("modeSelect").onclick=()=>{mode="select";transform.detach();el("modeSelect").classList.add("active");el("modeMove").classList.remove("active");};
el<HTMLButtonElement>("modeMove").onclick=()=>{mode="move";highlight();el("modeMove").classList.add("active");el("modeSelect").classList.remove("active");if(selected&&linkFor(model,selected))setStatus("Driven object locked: move its parent footing.");};
el<HTMLButtonElement>("toggleClip").onclick=()=>{
 clipped=!clipped;el("toggleClip").classList.toggle("active",clipped);
 draw();setStatus(clipped?"Section clipping enabled; adjust cut height.":"Full geometry visible.");
};
el<HTMLInputElement>("sectionDepth").oninput=()=>{clipPlane.constant=Number(el<HTMLInputElement>("sectionDepth").value);};
el<HTMLFormElement>("elementForm").onsubmit=event=>{
 event.preventDefault();const current=liveElement();if(!current)return;
 const next={...current};
 for(const k of ["x","y","z","length","width","height"] as const){
  const input=el<HTMLInputElement>(k);
  if(!input.readOnly)next[(k+"_mm") as "x_mm"]=Number(input.value);
 }
 commit(next);
};
el<HTMLButtonElement>("undo").onclick=()=>{const p=undo.pop();if(p){redo.push(structuredClone(model));restore(p);}};
el<HTMLButtonElement>("redo").onclick=()=>{const p=redo.pop();if(p){undo.push(structuredClone(model));restore(p);}};
el<HTMLButtonElement>("downloadJson").onclick=()=>{
 const draft=structuredClone(model);draft.authority="DRAFT";
 const blob=new Blob([encode(draft)],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="open-architecture-draft-m01.json";link.click();URL.revokeObjectURL(url);
};
el<HTMLButtonElement>("resetDemo").onclick=()=>{undo.push(structuredClone(model));redo=[];restore(original);fit();};
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
renderer.domElement.addEventListener("pointerup",event=>{
 if(mode==="move")return;
 const bounds=renderer.domElement.getBoundingClientRect();pointer.set(((event.clientX-bounds.left)/bounds.width)*2-1,-((event.clientY-bounds.top)/bounds.height)*2+1);
 ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...meshes.values()],false)[0];
 if(hit){const id=(hit.object.userData as {id?:string}).id;if(id)select(id);}
});
const resize=()=>{renderer.setSize(width(),height());persp.aspect=width()/height();persp.updateProjectionMatrix();if(view!=="3d")fit();};
new ResizeObserver(resize).observe(container);
function animate(){requestAnimationFrame(animate);orbit.update();renderer.render(scene,camera);}animate();
el<HTMLInputElement>("importIfc").addEventListener("change",async event=>{
 const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file)return;
 if(!file.name.toLowerCase().endsWith(".ifc")){setStatus("Only IFC files accepted.");return;}
 if(file.size>60*1024*1024){setStatus("M01 limit is 60 MB. Use a smaller IFC or backend conversion.");return;}
 setStatus("Parsing IFC in browser; this does not edit canonical draft…");
 try{
  const {readIfc}=await import("./ifc");
  const base=new URL(import.meta.env.BASE_URL,location.origin);
  const wasmBase=new URL("cad/",base).href;
  const result=await readIfc(await file.arrayBuffer(),wasmBase);
  if(ifcGroup){scene.remove(ifcGroup);ifcGroup.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();(obj.material as THREE.Material).dispose();}});}
  ifcGroup=result.group;scene.add(ifcGroup);setStatus("IFC loaded read-only: "+result.count+" mesh parts. Draft model unchanged.");
  if(result.count===0)setStatus("IFC parsed but returned no renderable geometry; draft model unchanged.");
 }catch(err){setStatus("IFC import failed: "+String(err));}
});
async function boot(){
 try{
  const url=new URL("cad/demo.json",new URL(import.meta.env.BASE_URL,location.origin));
  const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
  model=validate(await r.json());resolveModel(model);original=structuredClone(model);draw();fit();renderInspector();
  setStatus("M02 demo loaded · "+model.elements.length+" linked boxes · not construction/engineering authority");
 }catch(err){setStatus("Canonical model load failed: "+String(err));}
}
void boot();
