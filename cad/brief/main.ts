/** M12.1: limited local language parser and interactive, UNVERIFIED 3D mass. */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
type Mass={length_mm:number;width_mm:number;storeys:number;height_mm:number};
type Parsed={data:Partial<Mass>;questions:string[];proof:string[]};
const get=<T extends HTMLElement>(id:string):T=>{const e=document.getElementById(id);if(!e)throw Error("Missing "+id);return e as T;};
const units:Record<string,number>={mm:1,cm:10,m:1000,meters:1000,metres:1000,ft:304.8,feet:304.8,foot:304.8,inches:25.4,inch:25.4};
const amount="([0-9]+(?:\\.[0-9]+)?)\\s*(mm|cm|meters|metres|m|ft|feet|foot|inches|inch)\\b";
function parse(text:string):Parsed{
 const data:Partial<Mass>={},proof:string[]=[];
 function field(name:"length_mm"|"width_mm"|"height_mm",patterns:string[],range:[number,number]){
  for(const raw of patterns){
   const match=new RegExp(raw,"i").exec(text);if(!match)continue;
   const value=Number(match[1]!)*(units[match[2]!.toLowerCase()]??NaN);
   if(Number.isFinite(value)&&value>=range[0]&&value<=range[1]){
    data[name]=Math.round(value*1000)/1000;proof.push(name+" ← "+match[0]);break;
   }
  }
 }
 field("length_mm",["\\b(?:length|depth)\\s*(?:of|is|:|=)?\\s*"+amount,"\\b"+amount+"\\s*(?:long|in\\s+length|deep)\\b"],[100,100000]);
 field("width_mm",["\\b(?:width|breadth)\\s*(?:of|is|:|=)?\\s*"+amount,"\\b"+amount+"\\s*(?:wide|in\\s+width)\\b"],[100,100000]);
 field("height_mm",["\\b(?:storey|story|floor|level)(?:\\s*-\\s*to\\s*-\\s*floor)?\\s+height\\s*(?:of|is|:|=)?\\s*"+amount,
   "\\b(?:each|every|per)\\s+(?:storey|story|floor|level)\\s*(?:is|of|height|:)?\\s*"+amount],[1800,8000]);
 const count=/\b(1[0-2]|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:storeys?|stories|floors?|levels?)\b/i.exec(text);
 if(count){
  const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
  const value=words[count[1]!.toLowerCase()]??Number(count[1]!);
  if(value>=1&&value<=12){data.storeys=value;proof.push("storeys ← "+count[0]);}
 }
 const needs:[keyof Mass,string][]=[["length_mm","What is the building length, with units?"],["width_mm","What is the building width, with units?"],["storeys","How many storeys?"],["height_mm","What is the floor-to-floor height, with units?"]];
 return {data,questions:needs.filter(x=>data[x[0]]===undefined).map(x=>x[1]),proof};
}
const holder=get<HTMLDivElement>("viewport");
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));holder.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color("#091a2a");
scene.add(new THREE.HemisphereLight(0xdffaff,0x253f59,2.4));
const sun=new THREE.DirectionalLight(0xffdec1,3);sun.position.set(10,20,11);scene.add(sun);
scene.add(new THREE.GridHelper(80,80,0x537287,0x28465c));
const content=new THREE.Group();scene.add(content);
const camera=new THREE.PerspectiveCamera(50,1,.03,600);const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;
let mass:Mass|null=null,chosen=-1,view:"3d"|"plan"|"elevation"="3d";const bodies:THREE.Mesh[]=[];
const colors=[0x6bdac2,0xffba7a,0x8dbaf9,0xc4a8f1,0xff9ea4,0xa0da9c];
function clear(){
 for(const child of [...content.children]){
  child.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.LineSegments){
   obj.geometry.dispose();const mat=obj.material;if(Array.isArray(mat))mat.forEach(m=>m.dispose());else mat.dispose();
  }});
  content.remove(child);
 }
 bodies.length=0;
}
function element(label:string,value:string){
 const row=document.createElement("div"),span=document.createElement("span"),strong=document.createElement("strong");
 span.textContent=label;strong.textContent=value;row.append(span,strong);return row;
}
function renderDetails(){
 const levels=get<HTMLElement>("levels"),facts=get<HTMLElement>("facts"),section=get<HTMLElement>("section");
 levels.replaceChildren();facts.replaceChildren();section.replaceChildren();if(!mass)return;
 const add=(label:string,n:number)=>{
  const b=document.createElement("button");b.textContent=label;b.type="button";
  if(chosen===n)b.className="active";b.addEventListener("click",()=>select(n));levels.append(b);
 };
 add("All levels", -1);
 for(let i=0;i<mass.storeys;i++)add("Level "+(i+1)+" · "+((i+1)*mass.height_mm/1000).toFixed(2)+" m top",i);
 for(const [name,value] of [["Length",String(mass.length_mm)+" mm"],["Width",String(mass.width_mm)+" mm"],
   ["Floor height",String(mass.height_mm)+" mm"],["Storeys",String(mass.storeys)],
   ["Shown",chosen===-1?"All":String(chosen+1)],["Validity","MASS ONLY"]])
  facts.append(element(name!,value!));
 const root=document.createElementNS("http://www.w3.org/2000/svg","svg");
 root.setAttribute("viewBox","0 0 440 206");root.setAttribute("role","img");
 root.setAttribute("aria-label","Envelope only, not a structural section");
 for(let i=0;i<mass.storeys;i++){
  const story=(163/mass.storeys),y=175-(i+1)*story;
  const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");
  for(const [key,value] of ([["x","20"],["y",String(y)],["width","250"],["height",String(story)],
   ["fill",chosen<0||chosen===i?"#21606b":"#10283e"],["stroke","#acc4d3"]] as [string,string][]))rect.setAttribute(key,value);
  root.append(rect);
  const t=document.createElementNS("http://www.w3.org/2000/svg","text");
  t.setAttribute("x","30");t.setAttribute("y",String(y+story/2+4));t.setAttribute("fill","#e7f7fb");t.setAttribute("font-size","12");
  t.textContent="Level "+(i+1)+" · "+Math.round((i+1)*mass.height_mm)+" mm";root.append(t);
 }
 section.append(root);
}
function select(n:number){
 if(!mass)return;chosen=n;
 for(let i=0;i<bodies.length;i++){
  const m=bodies[i]!;m.visible=n===-1||n===i;
  (m.material as THREE.MeshStandardMaterial).opacity=n===i?.46:.23;
 }renderDetails();
}
function create(){
 clear();if(!mass)return;
 const l=mass.length_mm/1000,w=mass.width_mm/1000,h=mass.height_mm/1000;
 for(let i=0;i<mass.storeys;i++){
  const g=new THREE.BoxGeometry(l,h,w);
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:.6,transparent:true,opacity:.25,depthWrite:false}));
  mesh.position.set(l/2,(i+.5)*h,-w/2);mesh.userData.floor=i;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:colors[i%colors.length]})));
  content.add(mesh);bodies.push(mesh);
 }
 select(-1);setView("3d");
}
function fit(){
 if(!mass)return;
 const l=mass.length_mm/1000,w=mass.width_mm/1000,h=mass.height_mm*mass.storeys/1000;
 const c=new THREE.Vector3(l/2,h/2,-w/2),d=Math.max(l,w,h,5);
 orbit.target.copy(c);
 camera.up.set(0,view==="plan"?0:1,view==="plan"?-1:0);
 if(view==="3d")camera.position.copy(c).add(new THREE.Vector3(d*1.45,d*1.1,d*1.45));
 if(view==="plan")camera.position.copy(c).add(new THREE.Vector3(.0001,d*2.6,0));
 if(view==="elevation")camera.position.copy(c).add(new THREE.Vector3(0,0,d*2.6));
 camera.lookAt(c);orbit.update();
}
function setView(next:typeof view){
 view=next;fit();
 for(const [id,val] of [["threeD","3d"],["plan","plan"],["elevation","elevation"]] as const)
  get<HTMLButtonElement>(id).classList.toggle("active",val===next);
 get<HTMLElement>("viewTitle").textContent=next.toUpperCase()+" · UNVERIFIED ENVELOPE";
}
function generate(){
 const parsed=parse(get<HTMLTextAreaElement>("brief").value),result=get<HTMLElement>("result");
 result.replaceChildren();
 const status=document.createElement("strong");
 status.textContent=parsed.questions.length?"More dimensions required; no model generated.":"3D geometric envelope ready · unverified.";
 result.append(status);
 if(parsed.questions.length){
  mass=null;clear();renderDetails();
  const ul=document.createElement("ul");
  parsed.questions.forEach(q=>{const li=document.createElement("li");li.textContent=q;ul.append(li);});
  result.append(ul);return;
 }
 mass=parsed.data as Mass;create();
 const note=document.createElement("p");note.className="sub";
 note.textContent="Evidence: "+parsed.proof.join(" · ")+". No structural or material dimensions were inferred.";
 result.append(note);
}
const raycaster=new THREE.Raycaster(),point=new THREE.Vector2();
renderer.domElement.addEventListener("pointerup",ev=>{
 const box=renderer.domElement.getBoundingClientRect();
 point.x=2*(ev.clientX-box.left)/box.width-1;point.y=1-2*(ev.clientY-box.top)/box.height;
 raycaster.setFromCamera(point,camera);
 const hit=raycaster.intersectObjects(bodies.filter(m=>m.visible),false);
 if(hit.length)select(Number(hit[0]!.object.userData.floor));
});
get<HTMLButtonElement>("render").onclick=generate;
get<HTMLButtonElement>("sample").onclick=()=>{
 get<HTMLTextAreaElement>("brief").value="A building 9 m long, 7 m wide, 2 floors with floor height 3 m.";
 generate();
};
for(const [id,val] of [["threeD","3d"],["plan","plan"],["elevation","elevation"]] as const)
 get<HTMLButtonElement>(id).onclick=()=>setView(val);
get<HTMLButtonElement>("fit").onclick=fit;
const resize=()=>{
 const w=Math.max(80,holder.clientWidth),h=Math.max(200,holder.clientHeight);
 camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
};
new ResizeObserver(resize).observe(holder);resize();
const frame=()=>{requestAnimationFrame(frame);orbit.update();renderer.render(scene,camera);};frame();
get<HTMLButtonElement>("sample").click();
