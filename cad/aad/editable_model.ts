/** Synthetic AAD one-bay model v0.2.
 * All 2D/3D projections are derived from this same validated draft.
 * Hosted openings mutate their wall segmentation; no detached door/window geometry.
 * No structural connectivity or engineering approval is inferred from the synthetic frame.
 */
import {deriveFrameGraph,columnAt} from "./frame_connectivity";
export type FrameGrid={west:number;east:number;north:number;south:number};
export type Category="column"|"beam"|"slab"|"wall"|"door"|"window"|"furniture";
export type Solid={id:string;name:string;kind:Category;x:number;y:number;z:number;dx:number;dy:number;dz:number};
export type ColumnSection={x:number;z:number};
export type Draft={
 schema:string;length:number;width:number;height:number;door:number;window:number;bed:boolean;
 doorX:number;windowX:number;wallThickness:number;
 bedX:number;bedZ:number;bedLength:number;bedWidth:number;
 columnSizes:Record<string,ColumnSection>;beamDepths:Record<string,number>;
 grid:FrameGrid;beamWidths:Record<string,number>;
};
export const SCHEMA="jp-cad://linked-one-bay-demo/0.3";
export const PREVIOUS_SCHEMA="jp-cad://linked-one-bay-demo/0.2";
export const LEGACY_SCHEMA="jp-cad://linked-one-bay-demo/0.1";
export const COLUMN_IDS=["C-NW","C-NE","C-SW","C-SE"] as const;
export const BEAM_IDS=["B-N","B-S","B-W","B-E"] as const;
export const DEFAULT_DRAFT:Draft={
 schema:SCHEMA,length:8,width:6,height:3,door:.95,window:1.4,bed:true,
 doorX:3.525,windowX:3.3,wallThickness:.16,
 bedX:1.92,bedZ:1.8,bedLength:1.95,bedWidth:1.45,
 columnSizes:{},beamDepths:{},grid:{west:.28,east:.28,north:.28,south:.28},beamWidths:{}
};
const round=(v:number)=>Math.round(v*1000)/1000;
function numberAt(v:unknown,name:string,min:number,max:number):number{
 if(typeof v!=="number"||!Number.isFinite(v)||v<min-1e-7||v>max+1e-7)
  throw Error(name+" must be between "+min+" and "+max+" m");
 return round(v);
}
const sameKeys=(value:Record<string,unknown>,keys:string[])=>Object.keys(value).sort().join("|")===keys.sort().join("|");
function record(v:unknown,name:string):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v))throw Error(name+" must be an object");
 return v as Record<string,unknown>;
}
function legacyUpgrade(c:Record<string,unknown>):Draft{
 const L=numberAt(c.length,"length",4,18),W=numberAt(c.width,"width",4,14);
 const door=numberAt(c.door,"door",.75,1.6),window=numberAt(c.window,"window",.8,2.4);
 return {
  ...DEFAULT_DRAFT,schema:SCHEMA,length:L,width:W,height:numberAt(c.height,"height",2.4,5),
  door,window,bed:c.bed as boolean,
  doorX:round((L-door)/2),windowX:round((L-window)/2),
  bedX:round(Math.max(.65,L*.24)),bedZ:round(Math.max(.85,W*.3)),
  columnSizes:{},beamDepths:{},grid:{...DEFAULT_DRAFT.grid},beamWidths:{}
 };
}
export function validateDraft(candidate:unknown):Draft{
 const c=record(candidate,"Model");
 const oldKeys=["schema","length","width","height","door","window","bed"];
 let raw:Record<string,unknown>=c;
 if(c.schema===LEGACY_SCHEMA){
  if(!sameKeys(c,oldKeys)||typeof c.bed!=="boolean")throw Error("Malformed legacy v0.1 model");
  raw=legacyUpgrade(c) as unknown as Record<string,unknown>;
 }
 if(raw.schema===PREVIOUS_SCHEMA){
  const legacyKeys=Object.keys(DEFAULT_DRAFT).filter(k=>k!=="grid"&&k!=="beamWidths");
  if(!sameKeys(raw,legacyKeys)||typeof raw.bed!=="boolean")throw Error("Malformed legacy v0.2 model");
  raw={...raw,schema:SCHEMA,grid:{...DEFAULT_DRAFT.grid},beamWidths:{}};
 }
 if(raw.schema!==SCHEMA||!sameKeys(raw,Object.keys(DEFAULT_DRAFT))||typeof raw.bed!=="boolean")
  throw Error("Unsupported model version or unrecognized fields");
 const L=numberAt(raw.length,"length",4,18),W=numberAt(raw.width,"width",4,14);
 const H=numberAt(raw.height,"height",2.4,5);
 const door=numberAt(raw.door,"door",.75,1.6),window=numberAt(raw.window,"window",.8,2.4);
 const wallThickness=numberAt(raw.wallThickness,"wall thickness",.10,.28);
 const doorX=numberAt(raw.doorX,"door position",.35,L-door-.35);
 const windowX=numberAt(raw.windowX,"window position",.35,L-window-.35);
 const bedLength=numberAt(raw.bedLength,"bed length",.8,2.8);
 const bedWidth=numberAt(raw.bedWidth,"bed width",.65,2.2);
 const bedMin=wallThickness+.12;
 const bedX=numberAt(raw.bedX,"bed X",bedMin,L-bedLength-bedMin);
 const bedZ=numberAt(raw.bedZ,"bed Z",bedMin,W-bedWidth-bedMin);
 const sections=record(raw.columnSizes,"column sections");
 const depths=record(raw.beamDepths,"beam depths");
 const widths=record(raw.beamWidths,"beam widths");
 const gridRaw=record(raw.grid,"frame grid");
 if(!sameKeys(gridRaw,["west","east","north","south"]))throw Error("Frame grid needs west, east, north, south offsets");
 const grid:FrameGrid={west:numberAt(gridRaw.west,"west grid",.2,1.2),east:numberAt(gridRaw.east,"east grid",.2,1.2),north:numberAt(gridRaw.north,"north grid",.2,1.2),south:numberAt(gridRaw.south,"south grid",.2,1.2)};
 if(L-grid.west-grid.east<1.6||W-grid.north-grid.south<1.6)throw Error("Connected gridlines require at least 1.6 m between column centers");
 const columnSizes:Record<string,ColumnSection>={};
 const beamDepths:Record<string,number>={};
 const beamWidths:Record<string,number>={};
 for(const [id,obj] of Object.entries(sections)){
  if(!COLUMN_IDS.includes(id as typeof COLUMN_IDS[number]))throw Error("Unknown column ID "+id);
  const v=record(obj,id);
  if(!sameKeys(v,["x","z"]))throw Error("Invalid column section "+id);
  columnSizes[id]={x:numberAt(v.x,id+" X section",.20,.50),z:numberAt(v.z,id+" Z section",.20,.50)};
 }
 for(const [id,val] of Object.entries(depths)){
  if(!BEAM_IDS.includes(id as typeof BEAM_IDS[number]))throw Error("Unknown beam ID "+id);
  beamDepths[id]=numberAt(val,id+" beam depth",.20,.65);
 }
 for(const [id,val] of Object.entries(widths)){
  if(!BEAM_IDS.includes(id as typeof BEAM_IDS[number]))throw Error("Unknown beam width ID "+id);
  beamWidths[id]=numberAt(val,id+" beam width",.18,.50);
 }
 return {schema:SCHEMA,length:L,width:W,height:H,door,window,bed:raw.bed,
  doorX,windowX,wallThickness,bedX,bedZ,bedLength,bedWidth,columnSizes,beamDepths,beamWidths,grid};
}
/** When overall dimensions shrink, slide hosted objects inside the new bounds;
    do not silently scale a column section or detach opening infills. */
export function fitToEnvelope(d:Draft):Draft{
 const n={...d,grid:{...d.grid}};
 n.grid.west=Math.max(.2,Math.min(n.grid.west,n.length-1.8-n.grid.east));
 n.grid.east=Math.max(.2,Math.min(n.grid.east,n.length-1.8-n.grid.west));
 n.grid.north=Math.max(.2,Math.min(n.grid.north,n.width-1.8-n.grid.south));
 n.grid.south=Math.max(.2,Math.min(n.grid.south,n.width-1.8-n.grid.north));
 n.doorX=round(Math.max(.35,Math.min(n.doorX,n.length-n.door-.35)));
 n.windowX=round(Math.max(.35,Math.min(n.windowX,n.length-n.window-.35)));
 const margin=n.wallThickness+.12;
 n.bedX=round(Math.max(margin,Math.min(n.bedX,n.length-n.bedLength-margin)));
 n.bedZ=round(Math.max(margin,Math.min(n.bedZ,n.width-n.bedWidth-margin)));
 return n;
}
export function deriveSolids(input:Draft):Solid[]{
 const p=validateDraft(input),result:Solid[]=[];
 const add=(id:string,name:string,kind:Category,x:number,y:number,z:number,dx:number,dy:number,dz:number)=>{
  if(Math.min(dx,dy,dz)<=0)throw Error("Invalid model geometry "+id);
  result.push({id,name,kind,x:round(x),y:round(y),z:round(z),dx:round(dx),dy:round(dy),dz:round(dz)});
 };
 const L=p.length,W=p.width,H=p.height,wall=p.wallThickness,outerH=H-.18;
 // Orthogonal frame graph is the single authority for column centers,
 // beam clear spans and the four derived connection points.
 const frame=deriveFrameGraph(p);
 for(const joint of frame.joints){
  const sec=columnAt(p,joint.column);
  add(joint.column,"Column · "+joint.column.slice(2),"column",
      joint.x-sec.x/2,0,joint.z-sec.z/2,sec.x,H-.16,sec.z);
 }
 for(const span of frame.spans){
  const start=frame.joints.find(j=>j.id===span.start)!;
  const end=frame.joints.find(j=>j.id===span.end)!;
  const startSec=columnAt(p,start.column),endSec=columnAt(p,end.column);
  const depth=p.beamDepths[span.id]??.3,beamWidth=p.beamWidths[span.id]??.28;
  const axisX=span.axis==="x";
  const x=axisX?start.x+startSec.x/2:start.x-beamWidth/2;
  const z=axisX?start.z-beamWidth/2:start.z+startSec.z/2;
  const dx=axisX?span.clearLength:beamWidth,dz=axisX?beamWidth:span.clearLength;
  add(span.id,"Beam · "+span.id.slice(2),"beam",x,H-.16-depth,z,dx,depth,dz);
  // Axis faces terminate against both column faces; never use fixed spans.
  if(axisX&&Math.abs(x+dx-(end.x-endSec.x/2))>.002)throw Error("Beam end disconnected: "+span.id);
  if(!axisX&&Math.abs(z+dz-(end.z-endSec.z/2))>.002)throw Error("Beam end disconnected: "+span.id);
 }
 add("SLAB-ROOF","Roof slab · one bay","slab",0,H-.16,0,L,.16,W);
 const wl=p.windowX,wr=L-wl-p.window,dr=p.doorX,drR=L-dr-p.door;
 const sill=.9,head=Math.min(2.06,outerH-.1),dh=Math.min(2.12,outerH-.08);
 add("W-NL","North wall · left","wall",0,0,0,wl,outerH,wall);
 add("W-NR","North wall · right","wall",wl+p.window,0,0,wr,outerH,wall);
 add("W-NSILL","North wall · under window","wall",wl,0,0,p.window,sill,wall);
 add("W-NHEAD","North wall · over window","wall",wl,head,0,p.window,outerH-head,wall);
 add("WINDOW-N","North window · glass","window",wl,sill,.05,p.window,head-sill,.06);
 add("W-SL","South wall · left","wall",0,0,W-wall,dr,outerH,wall);
 add("W-SR","South wall · right","wall",dr+p.door,0,W-wall,drR,outerH,wall);
 add("W-SHEAD","South wall · above door","wall",dr,dh,W-wall,p.door,outerH-dh,wall);
 add("DOOR-S","South entry door","door",dr,0,W-wall/2,p.door,dh,.04);
 add("W-W","West wall","wall",0,0,wall,wall,outerH,W-2*wall);
 add("W-E","East wall","wall",L-wall,0,wall,wall,outerH,W-2*wall);
 if(p.bed)add("BED","Bed · movable furniture","furniture",p.bedX,.15,p.bedZ,p.bedLength,.40,p.bedWidth);
 return result;
}
