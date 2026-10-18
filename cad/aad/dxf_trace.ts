/** Bounded browser-local ASCII DXF LINE/LWPOLYLINE intake.
 * The only output is provisional graph linework; no automatic DWG conversion
 * and no claims about door, window, column, or structural membership.
 */
import type {PlanGraph,PlanNode,PlanWall} from "./floor_graph";
export type DxfSegment={layer:string;ax:number;az:number;bx:number;bz:number};
export type DxfTrace={segments:DxfSegment[];units:string;unitsCode:number;scaleToMeters:number;warnings:string[];layers:string[];ignored:number};
const r=(n:number)=>Math.round(n*1000)/1000;
const units:Record<number,[string,number]>={1:["inches",.0254],2:["feet",.3048],4:["millimeters",.001],5:["centimeters",.01],6:["meters",1],7:["kilometers",1000],0:["unitless (assumed millimeters)",.001]};
type Pair={code:number;value:string};
export function parseAsciiDxf(text:string):DxfTrace{
 if(text.length>15_000_000)throw Error("DXF exceeds the 15 MB local intake limit");
 if(text.includes("\u0000"))throw Error("Binary DXF is not supported. Export an ASCII DXF without changing the original.");
 const raw=text.replace(/\r/g,"").split("\n");
 if(raw.length%2===1&&raw[raw.length-1]==="")raw.pop();
 const pairs:Pair[]=[];
 for(let i=0;i<raw.length-1;i+=2){
  const c=Number(raw[i]!.trim());if(!Number.isInteger(c)||c<0||c>1071)throw Error("Invalid ASCII DXF group at line "+(i+1));
  pairs.push({code:c,value:raw[i+1]!.trim()});
 }
 const warnings:string[]=[],segments:DxfSegment[]=[];
 let unit=0;
 for(let i=0;i<pairs.length;i++)if(pairs[i]!.code===9&&pairs[i]!.value==="$INSUNITS"){
  const next=pairs[i+1];if(next?.code===70)unit=Number(next.value);
 }
 const factor=units[unit]?.[1]??.001;
 if(!units[unit])warnings.push("Unrecognized DXF unit code "+unit+"; assumed millimeters");
 if(unit===0)warnings.push("Unitless DXF: millimeters assumed. Verify measured reference before adoption.");
 let section="",i=0,ignored=0;
 const number=(v:string,label:string)=>{const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>1e10)throw Error("Invalid coordinate "+label);return n*factor;};
 const point=(p:Record<number,string>,c1:number,c2:number)=>{
  if(p[c1]===undefined||p[c2]===undefined)throw Error("Missing DXF group "+c1+"/"+c2);
  return {x:r(number(p[c1]!,String(c1))),z:r(number(p[c2]!,String(c2)))};
 };
 const add=(layer:string,a:{x:number;z:number},b:{x:number;z:number})=>{
  if(Math.hypot(b.x-a.x,b.z-a.z)<.15)return;
  if(segments.length>=5000)throw Error("DXF has over 5000 linework segments; isolate the architectural wall layer first.");
  segments.push({layer,ax:a.x,az:a.z,bx:b.x,bz:b.z});
 };
 while(i<pairs.length){
  const p=pairs[i]!;
  if(p.code===0&&p.value==="SECTION"){section=pairs[i+1]?.value==="ENTITIES"?"ENTITIES":"OTHER";i+=2;continue;}
  if(p.code===0&&p.value==="ENDSEC"){section="";i++;continue;}
  if(section!=="ENTITIES"||p.code!==0){i++;continue;}
  const entity=p.value;i++;
  const data:Pair[]=[];
  while(i<pairs.length&&pairs[i]!.code!==0)data.push(pairs[i++]!);
  const layer=data.find(x=>x.code===8)?.value||"0";
  const info:Record<number,string>={};
  for(const d of data)info[d.code]=d.value;
  if(entity==="LINE"){
   add(layer,point(info,10,20),point(info,11,21));
  }else if(entity==="LWPOLYLINE"){
   const xy:{x:number;z:number}[]=[];let x:string|undefined;
   let curved=false;
   for(const d of data){
    if(d.code===10)x=d.value;
    if(d.code===20&&x!==undefined){xy.push({x:r(number(x,"poly X")),z:r(number(d.value,"poly Y"))});x=undefined;}
    if(d.code===42&&Math.abs(Number(d.value))>.00001)curved=true;
   }
   if(curved){ignored++;warnings.push("Curved polyline was skipped (bulge/arc not a straight wall).");continue;}
   for(let j=0;j<xy.length-1;j++)add(layer,xy[j]!,xy[j+1]!);
   if((Number(info[70]??0)&1)!==0&&xy.length>2)add(layer,xy[xy.length-1]!,xy[0]!);
  }else if(!["ENDSEC","EOF"].includes(entity)){
   ignored++;
  }
 }
 const layers=[...new Set(segments.map(x=>x.layer))].sort();
 if(!segments.length)warnings.push("No usable LINE/LWPOLYLINE entity found in ENTITIES section.");
 if(ignored)warnings.push(ignored+" non-straight or unsupported entities not admitted as walls");
 return {segments,units:units[unit]?.[0]||"unknown (assumed millimeters)",unitsCode:unit,scaleToMeters:factor,warnings:[...new Set(warnings)],layers,ignored};
}
/** Provisional wall-centerline conversion for one explicit CAD layer.
 * No inferred missing walls: the existing validator will reject an open plan.
 */
export function traceDxfLayer(source:DxfTrace,layer:string):{graph:PlanGraph;length:number;width:number;sourceSegments:number}{
 const picked=source.segments.filter(e=>e.layer===layer);
 if(picked.length<4||picked.length>90)throw Error("Choose one wall centerline layer containing 4–90 segments");
 const xs=picked.flatMap(s=>[s.ax,s.bx]),zs=picked.flatMap(s=>[s.az,s.bz]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 const length=r(maxX-minX),width=r(maxZ-minZ);
 if(length<4||length>18||width<4||width>14)throw Error("DXF extents "+length+" × "+width+" m exceed editable 4–18 × 4–14 m envelope; review scale/layer selection");
 const nodes:PlanNode[]=[],walls:PlanWall[]=[];
 const node=(x:number,z:number)=>{
  const X=r(x-minX),Z=r(z-minZ);
  const old=nodes.find(n=>Math.hypot(n.x-X,n.z-Z)<.003);if(old)return old.id;
  const id="N-DXF-"+String(nodes.length+1).padStart(3,"0");
  nodes.push({id,x:X,z:Z});return id;
 };
 for(const seg of picked){
  const a=node(seg.ax,seg.az),b=node(seg.bx,seg.bz);
  if(a===b)continue;
  walls.push({id:"W-DXF-"+String(walls.length+1).padStart(3,"0"),a,b,thickness:.16});
 }
 return{graph:{nodes,walls,openings:[],labels:{}},length,width,sourceSegments:picked.length};
}
