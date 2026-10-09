import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {TransformControls} from "three/addons/controls/TransformControls.js";
import {validate,encode,type CadElement,type CadModel} from "./model";
import {resolveModel,linkFor,sectionFaces,type SectionAxis} from "./parametrics";
import {createFrameStarter,validatePackage,packageFromModel,encodePackage,type ProjectPackage,type CadProjectKind} from "./project";
import {validateDxfReview,type CadDxfReview,type OverlayEntity} from "./dxf_overlay";
import {validateSemanticReview,type SemanticReview,type ReviewedColumn} from "./semantic_review";
const el=<T extends Element>(id:string)=>{const e=document.querySelector<T>("#"+id);if(!e)throw Error("Missing "+id);return e;};
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
let ifcGroup:THREE.Group|null=null,dxfReviewGroup:THREE.Group|null=null,activeDxfReview:CadDxfReview|null=null,semanticGroup:THREE.Group|null=null,activeSemanticReview:SemanticReview|null=null,selectedReviewGrid:string|null=null,model:CadModel,resolved:CadModel,original:CadModel,activePackage:ProjectPackage,selected:string|null=null,mode:"select"|"move"="select";
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
 const semantic=activePackage?.element_semantics.find(s=>s.element_id===e?.id);
 el<HTMLElement>("selectedName").textContent=e?e.id+" · "+e.kind+(semantic?" · "+semantic.verification:""):"Click an element in the model";
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
const getBox=()=>{
 const bounds=new THREE.Box3().setFromObject(draftGroup);
 if(semanticGroup&&semanticGroup.children.length)return new THREE.Box3().setFromObject(semanticGroup);
 if(dxfReviewGroup&&dxfReviewGroup.children.length)return new THREE.Box3().setFromObject(dxfReviewGroup);
 return bounds;
};
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
 el("viewName").textContent=activeSemanticReview?"Verified source footprints · elevation unknown":view==="3d"?"3D perspective":view==="plan"?"Ground floor plan":view==="front"?"Front elevation":"Side elevation";
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
 const blob=new Blob([encode(draft)],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=model.project_id+"-geometry-draft.json";link.click();URL.revokeObjectURL(url);
};

function cleanImportedIfc(){
 if(!ifcGroup)return;
 scene.remove(ifcGroup);
 ifcGroup.traverse(obj=>{if(obj instanceof THREE.Mesh){
  obj.geometry.dispose();(obj.material as THREE.Material).dispose();
 }});
 ifcGroup=null;
}
function activateProject(pkg:ProjectPackage,message:string){
 const good=validatePackage(pkg),candidate=validate(good.model);
 resolveModel(candidate);
 cleanImportedIfc();
 clearSemanticReview();
 clearDxfReview();
 activePackage=good;
 model=candidate;
 original=structuredClone(candidate);
 undo=[];redo=[];selected=null;view="3d";
 const slider=el<HTMLInputElement>("sectionPosition");
 const e=model.elements.find(x=>x.kind==="column")||model.elements[0]!;
 const cut=e.y_mm+e.width_mm/2;
 slider.min=String(Math.min(0,...model.elements.map(x=>x.y_mm)));
 slider.max=String(Math.max(...model.elements.map(x=>x.y_mm+x.width_mm)));
 slider.value=String(Math.min(Number(slider.max),Math.max(Number(slider.min),cut)));
 el<HTMLSelectElement>("sectionAxis").value="y";
 el<HTMLElement>("activeProject").textContent=good.project.name+" · "+good.project.id+" · "+good.project.revision;
 el<HTMLElement>("projectInputStatus").textContent="Local draft · "+good.model.elements.length+" elements · "+good.model.links?.length+" links · "+good.source_refs.length+" source pointers";
 draw();viewMode("3d");renderInspector();
 setStatus(message);
}
function downloadData(text:string,fileName:string){
 const blob=new Blob([text],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=fileName;a.click();URL.revokeObjectURL(url);
}
el<HTMLFormElement>("projectForm").onsubmit=event=>{
 event.preventDefault();
 try{
  const input={
   id:el<HTMLInputElement>("newProjectId").value.trim().toUpperCase(),
   name:el<HTMLInputElement>("newProjectName").value.trim(),
   kind:el<HTMLSelectElement>("newProjectKind").value as CadProjectKind,
   length_mm:Number(el<HTMLInputElement>("newProjectLength").value),
   width_mm:Number(el<HTMLInputElement>("newProjectWidth").value),
   storey_height_mm:Number(el<HTMLInputElement>("newProjectHeight").value)
  };
  const pkg=createFrameStarter(input);
  activateProject(pkg,"M03 new project created: "+pkg.project.id+" · starter geometry unverified");
 }catch(error){setStatus(String(error));el<HTMLElement>("projectInputStatus").textContent=String(error);}
};
el<HTMLInputElement>("loadProjectFile").onchange=async event=>{
 const input=event.currentTarget as HTMLInputElement,file=input.files?.[0];
 if(!file)return;
 try{
  if(!file.name.toLowerCase().endsWith(".json")||file.size>4*1024*1024)throw Error("Only JSON packages up to 4 MB are supported");
  const raw:unknown=JSON.parse(await file.text());
  const data=raw as {schema?:string};
  const pkg=data.schema==="fabin-cad://canonical-boxes/0.1"?packageFromModel(validate(raw)):validatePackage(raw);
  activateProject(pkg,"M03 project loaded locally: "+pkg.project.id+" · project draft only");
 }catch(error){setStatus("Project open rejected: "+String(error));el<HTMLElement>("projectInputStatus").textContent="Import failed. Current project preserved.";}
 finally{input.value="";}
};
el<HTMLButtonElement>("downloadProject").onclick=()=>{
 try{
  const draft=structuredClone(model);draft.authority="DRAFT";
  const pkg=validatePackage({...activePackage,model:draft});
  downloadData(encodePackage(pkg),pkg.project.id+"-cad-project.json");
  setStatus("Project package prepared for local download · no upload performed.");
 }catch(error){setStatus("Cannot export project: "+String(error));}
};

el<HTMLButtonElement>("resetDemo").onclick=()=>{undo.push(structuredClone(model));redo=[];restore(original);fit();};

const coords=(p:number[])=>new THREE.Vector3(p[0]!/1000,.025,-p[1]!/1000);
const pointGeometry=(points:number[][])=>new THREE.BufferGeometry().setFromPoints(points.map(coords));
function pointsOf(e:OverlayEntity):number[][]{
 if(e.kind==="LINE"||e.kind==="LWPOLYLINE")return e.points_mm;
 const c=e.points_mm[0]!,r=e.radius_mm!;
 const start=e.kind==="ARC"?e.start_angle_deg!:0,end=e.kind==="ARC"?e.end_angle_deg!:360;
 const delta=((end-start)%360+360)%360||360;
 return Array.from({length:Math.max(12,Math.ceil(delta/6))+1},(_,i)=>{
  const a=(start+delta*i/Math.max(12,Math.ceil(delta/6)))*Math.PI/180;
  return [c[0]!+r*Math.cos(a),c[1]!+r*Math.sin(a)];
 });
}
function clearDxfReview(){
 if(dxfReviewGroup){
  scene.remove(dxfReviewGroup);
  dxfReviewGroup.traverse(obj=>{
   if(obj instanceof THREE.Line){obj.geometry.dispose();(obj.material as THREE.Material).dispose();}
  });
  dxfReviewGroup=null;
 }
 activeDxfReview=null;
 draftGroup.visible=true;el<HTMLElement>("sectionSvg").closest(".section-view")?.removeAttribute("hidden");
 el<HTMLElement>("dxfReviewStatus").textContent="No DXF review layer loaded.";
 el<HTMLElement>("dxfReviewLayers").replaceChildren();
}
function displayDxfReview(review:CadDxfReview){
 const data=validateDxfReview(review),group=new THREE.Group();group.name="DXF_REVIEW_ONLY";
 const byLayer=new Map<string,number>();
 for(const item of data.entities){
  const points=pointsOf(item);
  if(points.length<2)continue;
  const color=/wall|column|foot|beam/i.test(item.layer)?0xffb86f:0x77d4ee;
  const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:.9});
  const geom=pointGeometry(points);
  const line=item.kind==="LWPOLYLINE"&&item.closed?new THREE.LineLoop(geom,material):new THREE.Line(geom,material);
  line.name=item.layer+"/"+item.handle;line.userData={cad_source_handle:item.handle,source_id:data.source.source_id,verified:false};
  group.add(line);byLayer.set(item.layer,(byLayer.get(item.layer)||0)+1);
 }
 clearSemanticReview();clearDxfReview();dxfReviewGroup=group;activeDxfReview=data;scene.add(group);
 draftGroup.visible=false;el<HTMLElement>("sectionSvg").closest(".section-view")?.setAttribute("hidden","");
 const list=el<HTMLElement>("dxfReviewLayers");
 for(const [layer,count] of [...byLayer.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15)){
  const d=document.createElement("div");d.textContent=layer+" · "+count;list.appendChild(d);
 }
 el<HTMLElement>("dxfReviewStatus").textContent=
 "Source "+data.source.source_id+" · "+data.entities.length+" native entities · "+
 byLayer.size+" layers · millimetres · geometry overlay only (not approved BIM).";
 viewMode("plan");el<HTMLElement>("viewName").textContent="Source DXF plan · review";setStatus("DXF geometry loaded in isolated review overlay. Source file unchanged; no semantic promotion.");
}
el<HTMLInputElement>("loadDxfReview").onchange=async event=>{
 const input=event.currentTarget as HTMLInputElement,file=input.files?.[0];
 if(!file)return;
 try{
  if(!file.name.toLowerCase().endsWith(".json")||file.size>15*1024*1024)throw Error("Select a converted DXF review JSON of 15MB or less");
  displayDxfReview(validateDxfReview(JSON.parse(await file.text())));
 }catch(error){setStatus(String(error));el<HTMLElement>("dxfReviewStatus").textContent="Import rejected; prior overlay preserved.";}
 finally{input.value="";}
};
el<HTMLButtonElement>("clearDxfReview").onclick=()=>{clearDxfReview();viewMode(view);setStatus("DXF review overlay cleared. Canonical project geometry preserved.");};


/* M05: Native semantic identities, traced to CAD block geometry. No invented 3D. */
function clearSemanticReview(){
 if(semanticGroup){
  scene.remove(semanticGroup);
  semanticGroup.traverse(obj=>{
   if(obj instanceof THREE.Line){obj.geometry.dispose();(obj.material as THREE.Material).dispose();}
  });
  semanticGroup=null;
 }
 activeSemanticReview=null;selectedReviewGrid=null;
 draftGroup.visible=true;
 el<HTMLElement>("sectionSvg").closest(".section-view")?.removeAttribute("hidden");
 el<HTMLElement>("semanticReviewStatus").textContent="No reviewed column layout loaded.";
 el<HTMLElement>("semanticColumns").replaceChildren();
 el<HTMLElement>("semanticSelection").textContent="Select a source footprint.";
}
function selectReviewed(grid:string){
 const review=activeSemanticReview;
 const col=review?.columns.find(c=>c.grid===grid);
 if(!col)return;
 selectedReviewGrid=grid;
 if(semanticGroup)for(const obj of semanticGroup.children){
  if(obj instanceof THREE.Line)(obj.material as THREE.LineBasicMaterial).color.setHex(obj.userData.grid===grid?0xffc658:0x6fdaed);
 }
 const details=el<HTMLElement>("semanticSelection");
 details.textContent=grid+" · "+col.column_type+" · "+col.shape+
  " · "+col.width_mm+"×"+col.depth_mm+" mm"+
  " · centre ("+col.x_mm+", "+col.y_mm+") mm"+
  " · DXF handle "+col.source_handle+" · residual "+col.residual_mm+" mm."+
  " Height/elevation not verified. Not field-issued.";
 el<HTMLElement>("semanticColumns").querySelectorAll<HTMLButtonElement>("button").forEach(b=>{
  b.classList.toggle("selected",b.dataset.grid===grid);
 });
}
function showSemanticReview(review:SemanticReview){
 const data=validateSemanticReview(review);
 const group=new THREE.Group();group.name="M05_SEMANTIC_2D_ONLY";
 const coords=(x:number,y:number)=>new THREE.Vector3(x/1000,.035,-y/1000);
 for(const c of data.columns){
  let points:THREE.Vector3[];
  if(c.shape==="circular"){
   points=Array.from({length:48},(_,i)=>{const a=2*Math.PI*i/48;return coords(c.x_mm+c.width_mm/2*Math.cos(a),c.y_mm+c.depth_mm/2*Math.sin(a));});
  }else{
   points=[[c.x_mm-c.width_mm/2,c.y_mm-c.depth_mm/2],
    [c.x_mm+c.width_mm/2,c.y_mm-c.depth_mm/2],
    [c.x_mm+c.width_mm/2,c.y_mm+c.depth_mm/2],
    [c.x_mm-c.width_mm/2,c.y_mm+c.depth_mm/2]].map(p=>coords(p[0]!,p[1]!));
  }
  const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
     new THREE.LineBasicMaterial({color:0x6fdaed,linewidth:2}));
  line.userData={grid:c.grid,source_handle:c.source_handle};
  line.name=c.grid+" / "+c.source_handle;
  group.add(line);
 }
 clearSemanticReview();clearDxfReview();
 semanticGroup=group;activeSemanticReview=data;scene.add(group);
 draftGroup.visible=false;
 el<HTMLElement>("sectionSvg").closest(".section-view")?.setAttribute("hidden","");
 const list=el<HTMLElement>("semanticColumns");
 for(const c of data.columns){
  const b=document.createElement("button");b.type="button";b.dataset.grid=c.grid;
  b.textContent=c.grid+" · "+c.column_type+" · "+(c.shape==="circular"?"Ø":"")+c.width_mm+" mm";
  b.onclick=()=>selectReviewed(c.grid);list.appendChild(b);
 }
 el<HTMLElement>("semanticReviewStatus").textContent=data.project_id+" · "+data.columns.length+
  " CAD-reconciled 2D columns · max deviation "+data.alignment.maximum_residual_mm+
  " mm · source-handle audit PASS · 3D height/elevation HOLD.";
 viewMode("plan");selectReviewed(data.columns[0]!.grid);
 setStatus("M05 source-based 2D column footprints loaded. These are not 3D columns, structural approval or construction drawings.");
}
el<HTMLInputElement>("loadSemanticReview").onchange=async event=>{
 const input=event.currentTarget as HTMLInputElement,file=input.files?.[0];if(!file)return;
 try{
  if(!file.name.toLowerCase().endsWith(".json")||file.size>2*1024*1024)throw Error("Select the source-reviewed JSON file (2MB maximum)");
  showSemanticReview(validateSemanticReview(JSON.parse(await file.text())));
 }catch(error){setStatus(String(error));el<HTMLElement>("semanticReviewStatus").textContent="M05 import rejected; previous review kept.";
 }finally{input.value="";}
};
el<HTMLButtonElement>("clearSemanticReview").onclick=()=>{
 clearSemanticReview();viewMode("plan");setStatus("M05 semantic source review cleared; draft model preserved.");
};

const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
ray.params.Line.threshold=.14;
renderer.domElement.addEventListener("pointerup",event=>{
 if(mode==="move")return;
 const bounds=renderer.domElement.getBoundingClientRect();pointer.set(((event.clientX-bounds.left)/bounds.width)*2-1,-((event.clientY-bounds.top)/bounds.height)*2+1);
 ray.setFromCamera(pointer,camera);
 if(semanticGroup){const sourceHit=ray.intersectObjects(semanticGroup.children,false)[0];
  if(sourceHit){const key=(sourceHit.object.userData as {grid?:string}).grid;if(key)selectReviewed(key);}return;}
 if(dxfReviewGroup)return;
 const hit=ray.intersectObjects([...meshes.values()],false)[0];
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
  activateProject(packageFromModel(validate(await r.json()),"M02 demonstration"),"M02 demo loaded · 11 source-backed synthetic objects · no engineering authority");
 }catch(err){setStatus("Canonical model load failed: "+String(err));}
}
void boot();
