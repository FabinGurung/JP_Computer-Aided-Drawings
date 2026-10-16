/** CAD/AAD M12.3 preview: ONE semantic model -> linked 2D plan and 3D solids.
 * All dimensions are synthetic user inputs; no construction/engineering authority.
 * Language parsing is intentionally limited and never presented as a general LLM.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {type Category,type Draft,type Solid,DEFAULT_DRAFT,validateDraft,deriveSolids,fitToEnvelope} from "./editable_model";
const defaults:Draft=DEFAULT_DRAFT;
const elem=<T extends Element>(id:string):T=>{
 const x=document.querySelector<T>("#"+id);
 if(!x)throw Error("Missing UI element: "+id);
 return x;
};
const svg=elem<SVGSVGElement>("plan");
const holder=elem<HTMLDivElement>("canvas3d");
const note=elem<HTMLElement>("message");
const tree=elem<HTMLElement>("tree");
const info=elem<HTMLElement>("inspect");
const partPanel=elem<HTMLElement>("componentEditor");
const partHint=elem<HTMLElement>("partHint");
const partMessage=elem<HTMLElement>("partMessage");
const partInputs=["partA","partB","partC","partD"] as const;
let model:Draft=validateDraft(defaults);
let solids:Solid[]=[];
let selected:string|null=null;
let showRoof=false,showWalls=true,showDimensions=true;
const validate=validateDraft;
const geometry=deriveSolids;

// Render the SVG plan independently: unsupported WebGL must never blank BOTH views.
let renderer:THREE.WebGLRenderer|null=null;
let controls:OrbitControls|null=null;
let rendererFailure:string|null=null;
let isContextLost=false;
const threeStatus=elem<HTMLElement>("threeStatus");
const planStatus=elem<HTMLElement>("planStatus");
const diagnostics=elem<HTMLElement>("diagnostics");
const retry3d=elem<HTMLButtonElement>("retry3d");
const ready=(node:HTMLElement,label:string)=>{node.textContent=label;node.setAttribute("data-state","ready");};
const failed=(node:HTMLElement,label:string)=>{node.textContent=label;node.setAttribute("data-state","error");};
function initWebGL(){
 rendererFailure=null;isContextLost=false;
 try{
  renderer?.dispose();
  const old=holder.querySelector("canvas");old?.remove();
  const r=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"default"});
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  r.outputColorSpace=THREE.SRGBColorSpace;
  r.domElement.style.width="100%";r.domElement.style.height="100%";
  r.domElement.style.display="block";
  holder.prepend(r.domElement);
  r.domElement.addEventListener("webglcontextlost",(e)=>{e.preventDefault();isContextLost=true;rendererFailure="WebGL context lost";failed(threeStatus,"3D unavailable · graphics context lost");retry3d.hidden=false;},false);
  r.domElement.addEventListener("webglcontextrestored",()=>{initWebGL();resize();fit();},false);
  r.domElement.addEventListener("pointerdown",onPointerDown);
  r.domElement.addEventListener("pointerup",onPointerUp);
  renderer=r;
  controls?.dispose();controls=new OrbitControls(camera,r.domElement);
  controls.enableDamping=true;controls.dampingFactor=.08;
  controls.maxPolarAngle=Math.PI*.49;controls.minDistance=2;controls.maxDistance=110;
  retry3d.hidden=true;
  ready(threeStatus,"3D model loading…");
 }catch(error){
  renderer=null;controls=null;
  rendererFailure=error instanceof Error?error.message:String(error);
  failed(threeStatus,"Unable to display 3D · use the working 2D plan");
  retry3d.hidden=false;
 }
 diagnostics.textContent=rendererFailure?"3D renderer: "+rendererFailure:"3D renderer: initialized";
}
const scene=new THREE.Scene();scene.background=new THREE.Color("#f7fafc");
scene.add(new THREE.HemisphereLight(0xe3f9ff,0x233c49,2.5));
const light=new THREE.DirectionalLight(0xffe5c8,3.1);light.position.set(-4,12,9);scene.add(light);
const grid=new THREE.GridHelper(34,34,0xa9bdd2,0xe1e8ef);grid.position.y=-.03;scene.add(grid);
const group=new THREE.Group();scene.add(group);
const camera=new THREE.PerspectiveCamera(48,1,.04,400);

const objects=new Map<string,THREE.Mesh>();
const palette:Record<Category,number>={column:0x5fc6b0,beam:0xd0a365,slab:0x8495b8,wall:0x9bb3c5,door:0xcc9b65,window:0x70b9eb,furniture:0x8b87d9};
let firstRender=true;

function dispose(){
 group.traverse(item=>{
  if(item instanceof THREE.Mesh||item instanceof THREE.LineSegments){
   item.geometry.dispose();
   const mat=item.material;
   if(Array.isArray(mat))mat.forEach(m=>m.dispose());else mat.dispose();
  }
 });
 group.clear();objects.clear();
}
function threeView(){
 dispose();
 for(const e of solids){
  const glass=e.kind==="window";
  const material=new THREE.MeshStandardMaterial({
   color:palette[e.kind],roughness:glass?.12:.7,
   metalness:glass?.1:0,transparent:glass,opacity:glass?.48:1,
   side:THREE.DoubleSide
  });
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(e.dx,e.dy,e.dz),material);
  mesh.position.set(e.x+e.dx/2,e.y+e.dy/2,e.z+e.dz/2);
  mesh.name=e.id;mesh.userData.id=e.id;
  mesh.visible=(e.kind!=="slab"||showRoof)&&(e.kind!=="wall"||showWalls);
  if(e.kind==="beam"||e.kind==="column"||e.kind==="door"||e.kind==="window"){
   const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({color:e.kind==="window"?0x286f9c:0x173443,transparent:true,opacity:.65}));
   mesh.add(edges);
  }
  if(e.kind==="furniture"){
   const pillow=new THREE.Mesh(new THREE.BoxGeometry(.42,.07,1.13),
     new THREE.MeshStandardMaterial({color:0xe9dfca,roughness:.9}));
   pillow.position.set(-.59,.235,0);
   mesh.add(pillow);
  }
  group.add(mesh);objects.set(e.id,mesh);
 }
 highlight();
}
function fit(){
 const L=model.length,W=model.width,H=model.height;
 const radius=Math.max(L,W,H);
 const center=new THREE.Vector3(L/2,H*.43,W/2);
 if(controls)controls.target.copy(center);
 camera.position.set(L/2+radius*1.25,H+radius*.78,W/2+radius*1.23);
 camera.lookAt(center);controls?.update();
}
function svgNode(tag:string,attributes:Record<string,string|number>={},text?:string):SVGElement{
 const e=document.createElementNS("http://www.w3.org/2000/svg",tag);
 for(const [k,v] of Object.entries(attributes))e.setAttribute(k,String(v));
 if(text!==undefined)e.textContent=text;
 return e;
}
function textNode(x:number,y:number,text:string,size=13,anchor="middle"){
 return svgNode("text",{x,y,"font-size":size,"font-family":"ui-sans-serif,system-ui","text-anchor":anchor,fill:"#244453"},text);
}
function planView(){
 try{
 svg.replaceChildren();
 const scale=Math.min(465/model.length,420/model.width);
 const left=(600-model.length*scale)/2,top=110+(440-model.width*scale)/2;
 svg.append(svgNode("rect",{x:0,y:0,width:600,height:620,fill:"#f1f5f2"}));
 for(let x=0;x<=600;x+=25)svg.append(svgNode("path",{d:"M"+x+" 0V620",stroke:"#dfe8e6","stroke-width":.55}));
 for(let y=0;y<=620;y+=25)svg.append(svgNode("path",{d:"M0 "+y+"H600",stroke:"#dfe8e6","stroke-width":.55}));
 svg.append(svgNode("rect",{x:left,y:top,width:model.length*scale,height:model.width*scale,fill:"#fdfdf9",stroke:"#82939b","stroke-width":2}));
 const order:Category[]=["wall","beam","door","window","furniture","column"];
 for(const kind of order){
  for(const e of solids.filter(v=>v.kind===kind)){
   // Vertical plan traces of wall heads and jambs should collapse to their
   // shared footprint; stable segment IDs still refer to the same 3D solids.
   if(e.id==="W-NSILL"||e.id==="W-NHEAD"||e.id==="W-SHEAD")continue;
   const selectedNow=e.id===selected;
   const item=svgNode("rect",{
    x:left+e.x*scale,y:top+e.z*scale,width:Math.max(3,e.dx*scale),height:Math.max(3,e.dz*scale),
    fill:kind==="beam"?"none":"#"+palette[kind].toString(16).padStart(6,"0"),
    "fill-opacity":kind==="wall"?.78:1,
    stroke:selectedNow?"#ef692c":kind==="beam"?"#d0a365":"#385261",
    "stroke-width":selectedNow?4:kind==="beam"?1.6:kind==="furniture"?1.2:.6,
    "stroke-dasharray":kind==="beam"?"5 4":"none",
    role:"button",tabindex:"0","aria-label":"Select "+e.name,"data-part":e.id
   });
   item.addEventListener("click",()=>select(e.id));
   item.addEventListener("keydown",event=>{if((event as KeyboardEvent).key==="Enter")select(e.id);});
   svg.append(item);
  }
 }
 if(showDimensions){
 const ext=18;
 svg.append(svgNode("path",{d:"M"+left+" "+(top-ext)+"V"+(top-37)+" M"+(left+model.length*scale)+" "+(top-ext)+"V"+(top-37)+" M"+left+" "+(top-30)+"H"+(left+model.length*scale),stroke:"#456575","stroke-width":1.5,fill:"none"}));
 svg.append(textNode(left+model.length*scale/2,top-38,model.length.toFixed(2)+" m",14));
 svg.append(svgNode("path",{d:"M"+(left-18)+" "+top+"H"+(left-34)+" M"+(left-18)+" "+(top+model.width*scale)+"H"+(left-34)+" M"+(left-28)+" "+top+"V"+(top+model.width*scale),stroke:"#456575","stroke-width":1.5,fill:"none"}));
 const side=textNode(left-41,top+model.width*scale/2,model.width.toFixed(2)+" m",13);
 side.setAttribute("transform","rotate(-90 "+(left-41)+" "+(top+model.width*scale/2)+")");svg.append(side);
 }
 svg.append(textNode(300,29,"LINKED PLAN · ONE-BAY DEMONSTRATION",15));
 svg.append(textNode(300,52,"Select any outline, column, door, window or bed",11));
 svg.append(textNode(300,597,"N ↑        SOUTH ENTRY BELOW        ALL DIMENSIONS IN METRES",11));
 if(selected){
  const e=solids.find(x=>x.id===selected);
  if(e){svg.append(textNode(300,577,e.name+" · "+e.id,12));}
 }
 ready(planStatus,"2D plan ready · "+solids.length+" linked model components");
 }catch(error){
  failed(planStatus,"Unable to display 2D plan");
  diagnostics.textContent="2D plan: "+(error instanceof Error?error.message:String(error));
 }
}
function highlight(){
 for(const [id,mesh] of objects){
  const mat=mesh.material as THREE.MeshStandardMaterial;
  mat.emissive.setHex(id===selected?0x70401d:0x000000);
  mat.emissiveIntensity=id===selected?.8:0;
 }
}
type EditableKey="columnX"|"columnZ"|"beamDepth"|"windowX"|"windowWidth"|"doorX"|"doorWidth"|"wallThickness"|"bedX"|"bedZ"|"bedLength"|"bedWidth";
type PartField={key:EditableKey;label:string;value:number;min:number;max:number};
const partApply=elem<HTMLButtonElement>("applyPart");
const partReset=elem<HTMLButtonElement>("resetPart");
function partFieldsFor(e:Solid):{fields:PartField[];hint:string}{
 const L=model.length,W=model.width;
 const field=(key:EditableKey,label:string,value:number,min:number,max:number):PartField=>({key,label,value,min,max});
 switch(e.kind){
  case "column":{
   const sec=model.columnSizes[e.id]??{x:.28,z:.28};
   return {hint:"Change the selected column section around its fixed center. The frame alignment remains illustrative, not structurally verified.",
    fields:[field("columnX","Section X (m)",sec.x,.20,.50),field("columnZ","Section Z (m)",sec.z,.20,.50)]};
  }
  case "beam":
   return {hint:"Change only this beam's depth. The top face remains aligned with the roof; geometry is preliminary.",
    fields:[field("beamDepth","Beam depth (m)",model.beamDepths[e.id]??.30,.20,.65)]};
  case "window":
   return {hint:"Move or widen the hosted north window. Both wall jambs, sill and head regenerate from the same opening.",
    fields:[field("windowX","From west end (m)",model.windowX,.35,L-model.window-.35),
    field("windowWidth","Opening width (m)",model.window,.8,Math.min(2.4,L-model.windowX-.35))]};
  case "door":
   return {hint:"Move or widen the south doorway. The wall jambs and overhead segment regenerate with the opening.",
    fields:[field("doorX","From west end (m)",model.doorX,.35,L-model.door-.35),
    field("doorWidth","Opening width (m)",model.door,.75,Math.min(1.6,L-model.doorX-.35))]};
  case "wall":
   return {hint:"Perimeter walls are a connected group. This editor changes their common thickness, not a detached wall segment.",
    fields:[field("wallThickness","Linked wall thickness (m)",model.wallThickness,.10,.28)]};
  case "furniture":{
   const pad=model.wallThickness+.12;
   return {hint:"Move and resize this illustrative bed; the 2D footprint and 3D solid update together.",
    fields:[field("bedX","From west end (m)",model.bedX,pad,L-model.bedLength-pad),
     field("bedZ","From north side (m)",model.bedZ,pad,W-model.bedWidth-pad),
     field("bedLength","Bed length (m)",model.bedLength,.8,Math.min(2.8,L-model.bedX-pad)),
     field("bedWidth","Bed width (m)",model.bedWidth,.65,Math.min(2.2,W-model.bedZ-pad))]};
  }
  default:return {hint:"Roof slab sizing follows the overall room model. Choose a column, beam, wall, opening or bed to adjust it.",fields:[]};
 }
}
function renderComponentEditor(){
 const e=solids.find(x=>x.id===selected);
 partPanel.hidden=!e;
 if(!e)return;
 const spec=partFieldsFor(e);
 partHint.textContent=spec.hint;
 for(const [index,id] of partInputs.entries()){
  const el=elem<HTMLInputElement>(id),wrapper=elem<HTMLElement>(id+"Wrap");
  const field=spec.fields[index];
  wrapper.hidden=!field;
  if(!field)continue;
  const label=wrapper.querySelector("span");if(label)label.textContent=field.label;
  el.value=String(field.value);el.min=String(field.min);el.max=String(field.max);el.step=".01";
 }
 partApply.hidden=!spec.fields.length;
 partReset.hidden=!spec.fields.length;
}
function editSelected(reset=false){
 const e=solids.find(x=>x.id===selected);
 if(!e)return;
 const {fields}=partFieldsFor(e);
 if(!fields.length)return;
 const values=new Map<EditableKey,number>();
 try{
  for(const [i,field] of fields.entries()){
   const raw=elem<HTMLInputElement>(partInputs[i]!).value;
   if(!raw.trim())throw Error("Enter a measurement for "+field.label);
   values.set(field.key,Number(raw));
  }
  const next:Draft={...model,columnSizes:{...model.columnSizes},beamDepths:{...model.beamDepths}};
  if(e.kind==="column"){
   if(reset)delete next.columnSizes[e.id];
   else next.columnSizes[e.id]={x:values.get("columnX")!,z:values.get("columnZ")!};
  }else if(e.kind==="beam"){
   if(reset)delete next.beamDepths[e.id];
   else next.beamDepths[e.id]=values.get("beamDepth")!;
  }else if(e.kind==="window"){
   next.windowX=reset?Number(((next.length-next.window)/2).toFixed(3)):values.get("windowX")!;
   if(!reset)next.window=values.get("windowWidth")!;
  }else if(e.kind==="door"){
   next.doorX=reset?Number(((next.length-next.door)/2).toFixed(3)):values.get("doorX")!;
   if(!reset)next.door=values.get("doorWidth")!;
  }else if(e.kind==="wall"){
   next.wallThickness=reset?.16:values.get("wallThickness")!;
  }else if(e.kind==="furniture"){
   const pad=next.wallThickness+.12;
   next.bedX=reset?Math.max(pad,Number((next.length*.24).toFixed(3))):values.get("bedX")!;
   next.bedZ=reset?Math.max(pad,Number((next.width*.3).toFixed(3))):values.get("bedZ")!;
   if(!reset){next.bedLength=values.get("bedLength")!;next.bedWidth=values.get("bedWidth")!;}
   if(reset){next.bedLength=1.95;next.bedWidth=1.45;}
  }
  const verified=validate(next);
  setModel(verified,(reset?"Reset ":"Updated ")+e.name+" · linked plan and 3D regenerated.");
  partMessage.textContent=(reset?"Reset":"Applied")+" · "+e.id;
 }catch(error){
  partMessage.textContent=error instanceof Error?error.message:"Cannot apply component change";
 }
}
partApply.onclick=()=>editSelected();
partReset.onclick=()=>editSelected(true);

function select(id:string|null){
 selected=id&&solids.some(x=>x.id===id)?id:null;
 highlight();planView();drawTree();
 const chosen=solids.find(x=>x.id===selected);
 if(!chosen){info.textContent="Click a component in either view.";partMessage.textContent="";renderComponentEditor();return;}
 info.replaceChildren();
 const title=document.createElement("strong");title.textContent=chosen.name;info.append(title);
 for(const value of ["ID: "+chosen.id,"Type: "+chosen.kind,"Footprint: "+chosen.dx.toFixed(2)+" × "+chosen.dz.toFixed(2)+" m","Vertical: "+chosen.dy.toFixed(2)+" m","Origin: ("+chosen.x+", "+chosen.y+", "+chosen.z+") m"]){
  const line=document.createElement("div");line.textContent=value;info.append(line);
 }
 renderComponentEditor();
}
function drawTree(){
 tree.replaceChildren();
 const groups:{label:string;category:Category}[]=[
  {label:"Columns (4)",category:"column"},{label:"Beams (4)",category:"beam"},
  {label:"Roof slab (1)",category:"slab"},{label:"Walls and infill",category:"wall"},
  {label:"Door",category:"door"},{label:"Window",category:"window"},
  {label:"Furniture",category:"furniture"}];
 for(const {label,category} of groups){
  const heading=document.createElement("div");heading.style.cssText="font-size:10px;color:#86b9c9;padding:9px 4px 2px;font-weight:800;letter-spacing:.05em;text-transform:uppercase";heading.textContent=label;tree.append(heading);
  for(const e of solids.filter(x=>x.kind===category)){
   const b=document.createElement("button");b.type="button";b.className="item"+(selected===e.id?" active":"");
   const name=document.createElement("b"),id=document.createElement("span");
   name.textContent=e.name;id.textContent=e.id;b.append(name,id);
   b.onclick=()=>select(e.id);tree.append(b);
  }
 }
}
function render(){
 solids=geometry(model);
 if(selected&&!solids.some(e=>e.id===selected))selected=null;
 threeView();planView();drawTree();select(selected);
 elem<HTMLElement>("area").textContent=(model.length*model.width).toFixed(1)+" m²";
 elem<HTMLElement>("totalHeight").textContent=model.height.toFixed(2)+" m";
 elem<HTMLElement>("columnCount").textContent=String(solids.filter(x=>x.kind==="column").length);
 elem<HTMLElement>("beamCount").textContent=String(solids.filter(x=>x.kind==="beam").length);
 if(firstRender){fit();firstRender=false;}
}
function syncInputs(){
 for(const key of ["length","width","height","door","window"] as const){
  elem<HTMLInputElement>(key).value=String(model[key]);
 }
 elem<HTMLInputElement>("bed").checked=model.bed;
}
function setModel(next:Draft,message:string){
 const verified=validate(next);
 const prior=model;model=verified;
 try{
  syncInputs();render();
  note.textContent=message+(rendererFailure?" (3D unavailable; 2D plan remains active.)":"");
 }catch(error){
  model=prior;syncInputs();render();
  note.textContent="Could not update drawings: "+(error instanceof Error?error.message:String(error));
 }
}
function numericChange(){
 try{
  const update={...model};
  for(const key of ["length","width","height","door","window"] as const){
   const field=elem<HTMLInputElement>(key);
   if(!field.value)throw Error("Complete all measurements before applying");
   update[key]=Number(field.value);
  }
  update.bed=elem<HTMLInputElement>("bed").checked;
  setModel(fitToEnvelope(update),"Linked model updated. Plan and 3D use the same elements.");
 }catch(error){note.textContent=error instanceof Error?error.message:"Cannot apply dimensions";}
}
function quotedValue(text:string,key:"length"|"width"|"height"):number|undefined{
 const names:Record<typeof key,string>={length:"(?:length|long)",width:"(?:width|wide)",height:"(?:height|high|tall)"};
 const measure="([0-9]+(?:\\.[0-9]+)?)\\s*(m|metres?|meters?|ft|feet)\\b";
 const direct=new RegExp("\\b"+key+"\\s*(?:is|of|:|=)?\\s*"+measure,"i").exec(text);
 const backwards=new RegExp("\\b"+measure+"\\s*"+names[key]+"\\b","i").exec(text);
 const hit=direct||backwards;
 if(!hit)return undefined;
 const meters=Number(hit[1])* (/^(ft|feet)$/i.test(hit[2]!)?.3048:1);
 return round(meters);
}
function interpret(input:string){
 const t=input.trim();
 if(t.length<7||t.length>1200){note.textContent="Please provide a short instruction with explicit dimensions.";return;}
 if(/\b(two|three|four|[2-9])\s*(?:storeys?|stories|floors?)\b/i.test(t)){
  note.textContent="This product demo has one storey only. Multi-storey is a separate milestone.";return;
 }
 const next={...model};let count=0;
 for(const key of ["length","width","height"] as const){
  const parsed=quotedValue(t,key);
  if(parsed!==undefined){next[key]=parsed;count++;}
 }
 if(/\b(?:remove|delete|without|no)\s+(?:the\s+)?bed\b/i.test(t)){next.bed=false;count++;}
 else if(/\b(?:add|include|with)\s+(?:a\s+|the\s+)?bed\b/i.test(t)){next.bed=true;count++;}
 if(!count){note.textContent="Recognized prototype commands: '8 m long', '6 m wide', '3 m high', 'remove bed' or 'add bed'. General AI interpretation is not yet connected.";return;}
 try{setModel(fitToEnvelope(next),"Applied "+count+" explicit instruction"+(count===1?"":"s")+". All views are regenerated from one model.");}
 catch(error){note.textContent=error instanceof Error?error.message:"Unsupported dimensions";}
}
for(const key of ["length","width","height","door","window"]){
 elem<HTMLInputElement>(key).addEventListener("change",numericChange);
}
elem<HTMLInputElement>("bed").onchange=numericChange;
elem<HTMLInputElement>("roof").onchange=event=>{showRoof=(event.target as HTMLInputElement).checked;threeView();};
elem<HTMLInputElement>("walls").onchange=event=>{showWalls=(event.target as HTMLInputElement).checked;threeView();};
elem<HTMLInputElement>("dimensions").onchange=event=>{showDimensions=(event.target as HTMLInputElement).checked;planView();};
elem<HTMLButtonElement>("applyText").onclick=()=>interpret(elem<HTMLTextAreaElement>("instruction").value);
elem<HTMLButtonElement>("fit").onclick=fit;
elem<HTMLButtonElement>("clearSelect").onclick=()=>select(null);
elem<HTMLButtonElement>("reset").onclick=()=>{firstRender=true;setModel({...defaults},"Reset to synthetic one-bay starter model.");};
elem<HTMLButtonElement>("download").onclick=()=>{
 const bytes=JSON.stringify(model,null,2)+"\n";
 const blob=new Blob([bytes],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=url;link.download="aad-linked-one-bay-draft.json";
 document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
 note.textContent="Saved shared draft model JSON locally (no engineering approval).";
};
elem<HTMLInputElement>("upload").onchange=async event=>{
 const input=event.target as HTMLInputElement;
 const file=input.files?.[0];if(!file)return;
 try{
  if(file.size>20000)throw Error("Draft JSON exceeds 20 KB");
  const next=validate(JSON.parse(await file.text()));
  setModel(next,"Loaded draft. Both views share the imported validated model.");
 }catch(error){note.textContent=error instanceof Error?error.message:"Invalid draft JSON";}
 input.value="";
};
const picker=new THREE.Raycaster(),pointer=new THREE.Vector2();
let downX=0,downY=0;
function onPointerDown(event:PointerEvent){downX=event.clientX;downY=event.clientY;}
function onPointerUp(event:PointerEvent){
 if(!renderer)return;
 if(Math.hypot(event.clientX-downX,event.clientY-downY)>5)return;
 const rect=renderer.domElement.getBoundingClientRect();
 pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
 picker.setFromCamera(pointer,camera);
 const hits=picker.intersectObjects([...objects.values()].filter(v=>v.visible),true);
 if(hits.length){
  let o:THREE.Object3D|null=hits[0]!.object;
  while(o&&!o.userData.id)o=o.parent;
  if(o?.userData.id)select(String(o.userData.id));
 }
};
const resize=()=>{
 const w=Math.max(100,holder.clientWidth),h=Math.max(180,holder.clientHeight);
 camera.aspect=w/h;camera.updateProjectionMatrix();
 // Crucial: false previously left the physical drawing buffer and CSS box
 // at different sizes on high-DPI screens; explicitly synchronize both.
 renderer?.setSize(w,h,false);
 if(renderer){renderer.domElement.style.width=w+"px";renderer.domElement.style.height=h+"px";}
};
new ResizeObserver(resize).observe(holder);
let frame=0;
function animate(){
 requestAnimationFrame(animate);controls?.update();
 if(!renderer||isContextLost)return;
 try{
  renderer.render(scene,camera);
  if(frame++%90===0 && solids.length){
   // Distinguish a live scene from a canvas that merely exists.
   const gl=renderer.getContext();
   const pixels=new Uint8Array(4),palette=new Set<string>();
   const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
   for(let ix=1;ix<=7;ix++)for(let iy=1;iy<=7;iy++){
    gl.readPixels(Math.floor(w*ix/8),Math.floor(h*iy/8),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    palette.add(pixels[0]+","+pixels[1]+","+pixels[2]);
   }
   const visible=palette.size>=3 && renderer.info.render.triangles>0;
   if(visible){ready(threeStatus,"3D model ready · orbit and select elements");retry3d.hidden=true;}
   else{failed(threeStatus,"3D graphics not visible · try reload");retry3d.hidden=false;diagnostics.textContent="Graphics pixels: "+palette.size+" colors; triangles: "+renderer.info.render.triangles;}
  }
 }catch(error){rendererFailure=error instanceof Error?error.message:String(error);failed(threeStatus,"Unable to display 3D · 2D plan remains editable");retry3d.hidden=false;diagnostics.textContent=rendererFailure;}
}
retry3d.onclick=()=>{initWebGL();resize();fit();};
syncInputs();render();initWebGL();resize();fit();animate();
