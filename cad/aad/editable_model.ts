/** Synthetic AAD one-bay model v0.2.
 * All 2D/3D projections are derived from this same validated draft.
 * Hosted openings mutate their wall segmentation; no detached door/window geometry.
 * No structural connectivity or engineering approval is inferred from the synthetic frame.
 */
import {deriveFrameGraph,columnAt} from "./frame_connectivity";
import {deriveRoomSolids,type RoomKind} from "./room_layout";
import {type PlanGraph,validatePlanGraph,derivePlanGraph} from "./floor_graph";
export type FrameGrid={west:number;east:number;north:number;south:number};
export type Category="column"|"beam"|"slab"|"wall"|"door"|"window"|"furniture"|"room";
export type Solid={id:string;name:string;kind:Category;x:number;y:number;z:number;dx:number;dy:number;dz:number};
export type ColumnSection={x:number;z:number};
export type Draft={
 schema:string;length:number;width:number;height:number;door:number;window:number;bed:boolean;
 doorX:number;windowX:number;wallThickness:number;
 bedX:number;bedZ:number;bedLength:number;bedWidth:number;
 columnSizes:Record<string,ColumnSection>;beamDepths:Record<string,number>;
 grid:FrameGrid;beamWidths:Record<string,number>;
 roomCount:1|2|3;roomSplit1:number;roomSplit2:number;roomTypes:[RoomKind,RoomKind,RoomKind];
 interiorDoorZ:number;interiorDoorWidth:number;
 floorGraph:PlanGraph|null;projectNote:string;
};
export const SCHEMA="jp-cad://linked-one-bay-demo/0.5";
export const PREVIOUS_V04_SCHEMA="jp-cad://linked-one-bay-demo/0.4";
export const PREVIOUS_V03_SCHEMA="jp-cad://linked-one-bay-demo/0.3";
export const PREVIOUS_SCHEMA="jp-cad://linked-one-bay-demo/0.2";
export const LEGACY_SCHEMA="jp-cad://linked-one-bay-demo/0.1";
export const COLUMN_IDS=["C-NW","C-NE","C-SW","C-SE"] as const;
export const BEAM_IDS=["B-N","B-S","B-W","B-E"] as const;
export const DEFAULT_DRAFT:Draft={
 schema:SCHEMA,length:8,width:6,height:3,door:.95,window:1.4,bed:true,
 doorX:3.525,windowX:3.3,wallThickness:.16,
 bedX:1.92,bedZ:1.8,bedLength:1.95,bedWidth:1.45,
 columnSizes:{},beamDepths:{},grid:{west:.28,east:.28,north:.28,south:.28},beamWidths:{},
 roomCount:1,roomSplit1:4.4,roomSplit2:6.24,roomTypes:["bedroom","living","study"],interiorDoorZ:2.55,interiorDoorWidth:.9,
 floorGraph:null,projectNote:"Synthetic one-bay teaching model. No private drawing input."
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
  columnSizes:{},beamDepths:{},grid:{...DEFAULT_DRAFT.grid},beamWidths:{},
  roomCount:1,roomSplit1:round(L*.55),roomSplit2:round(L*.78),roomTypes:["bedroom","living","study"],
  interiorDoorZ:round(W*.5-.45),interiorDoorWidth:.9
 };
}
export function validateDraft(candidate:unknown):Draft{
 const c=record(candidate,"Model");
 const oldKeys=["schema","length","width","height","door","window","bed"];
 const newKeys=["roomCount","roomSplit1","roomSplit2","roomTypes","interiorDoorZ","interiorDoorWidth"];
 const graphKeys=["floorGraph","projectNote"];
 let raw:Record<string,unknown>=c;
 if(c.schema===LEGACY_SCHEMA){
  if(!sameKeys(c,oldKeys)||typeof c.bed!=="boolean")throw Error("Malformed legacy v0.1 model");
  raw=legacyUpgrade(c) as unknown as Record<string,unknown>;
 }
 if(raw.schema===PREVIOUS_SCHEMA){
  const legacyKeys=Object.keys(DEFAULT_DRAFT).filter(k=>k!=="grid"&&k!=="beamWidths"&&!newKeys.includes(k)&&!graphKeys.includes(k));
  if(!sameKeys(raw,legacyKeys)||typeof raw.bed!=="boolean")throw Error("Malformed legacy v0.2 model");
  const L=Number(raw.length),W=Number(raw.width);
  raw={...raw,schema:SCHEMA,grid:{...DEFAULT_DRAFT.grid},beamWidths:{},
    roomCount:1,roomSplit1:round(L*.55),roomSplit2:round(L*.78),roomTypes:["bedroom","living","study"],
    interiorDoorZ:round(W*.5-.45),interiorDoorWidth:.9,floorGraph:null,projectNote:DEFAULT_DRAFT.projectNote};
 }
 if(raw.schema===PREVIOUS_V03_SCHEMA){
  const oldV03=Object.keys(DEFAULT_DRAFT).filter(k=>!newKeys.includes(k)&&!graphKeys.includes(k));
  if(!sameKeys(raw,oldV03)||typeof raw.bed!=="boolean")throw Error("Malformed legacy v0.3 model");
  const L=Number(raw.length),W=Number(raw.width);
  raw={...raw,schema:SCHEMA,roomCount:1,roomSplit1:round(L*.55),roomSplit2:round(L*.78),
     roomTypes:["bedroom","living","study"],interiorDoorZ:round(W*.5-.45),interiorDoorWidth:.9,
     floorGraph:null,projectNote:DEFAULT_DRAFT.projectNote};
 }
 if(raw.schema===PREVIOUS_V04_SCHEMA){
  const oldV04=Object.keys(DEFAULT_DRAFT).filter(k=>!graphKeys.includes(k));
  if(!sameKeys(raw,oldV04)||typeof raw.bed!=="boolean")throw Error("Malformed legacy v0.4 model");
  raw={...raw,schema:SCHEMA,floorGraph:null,projectNote:DEFAULT_DRAFT.projectNote};
 }
 if(raw.schema!==SCHEMA||!sameKeys(raw,Object.keys(DEFAULT_DRAFT))||typeof raw.bed!=="boolean")
  throw Error("Unsupported model version or unrecognized fields");
 const L=numberAt(raw.length,"length",4,18),W=numberAt(raw.width,"width",4,14);
 const H=numberAt(raw.height,"height",2.4,5);
 if(typeof raw.projectNote!=="string"||raw.projectNote.length>1400)throw Error("Project note must be under 1400 characters");
 const floorGraph=raw.floorGraph===null?null:validatePlanGraph(raw.floorGraph,L,W,H);
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
 const roomCount=numberAt(raw.roomCount,"room count",1,3);
 if(!Number.isInteger(roomCount))throw Error("Room count must be 1, 2, or 3");
 const roomTypesRaw=raw.roomTypes;
 if(!Array.isArray(roomTypesRaw)||roomTypesRaw.length!==3||!roomTypesRaw.every(x=>x==="bedroom"||x==="living"||x==="study"))throw Error("Invalid reusable room types");
 const roomTypes=[...roomTypesRaw] as [RoomKind,RoomKind,RoomKind];
 const roomSplit1=numberAt(raw.roomSplit1,"first room split",0,18);
 const roomSplit2=numberAt(raw.roomSplit2,"second room split",0,18);
 const interiorDoorWidth=numberAt(raw.interiorDoorWidth,"interior door width",.75,1.3);
 const interiorDoorZ=numberAt(raw.interiorDoorZ,"interior door position",wallThickness+.45,W-interiorDoorWidth-wallThickness-.45);
 if(roomCount>=2){
  if(roomSplit1<2||roomSplit1>L-2)throw Error("Two-room split must leave 2 m at both ends");
  if(raw.bed && roomSplit1>bedX-.05 && roomSplit1<bedX+bedLength+.08)
   throw Error("First room wall would intersect the bed; move furniture first");
 }
 if(roomCount===3 && (roomSplit2-roomSplit1<1.75||L-roomSplit2<1.75))
  throw Error("Three rooms need at least 1.75 m per additional room");

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
 // Inset lines must leave room for the entire section inside the draft
 // footprint, including the adjusted beam width at perimeter lines.
 for(const id of COLUMN_IDS){
  const sec=columnSizes[id]??{x:.28,z:.28};
  const xInset=id.endsWith("W")?grid.west:grid.east;
  const zInset=id.startsWith("C-N")?grid.north:grid.south;
  if(sec.x/2>xInset+1e-6||sec.z/2>zInset+1e-6)
   throw Error("Column section extends outside the modeled room: "+id);
 }
 for(const id of BEAM_IDS){
  const width=beamWidths[id]??.28;
  const inset=id==="B-N"?grid.north:id==="B-S"?grid.south:id==="B-W"?grid.west:grid.east;
  if(width/2>inset+1e-6)throw Error("Beam width exceeds perimeter grid clearance: "+id);
 }
 return {schema:SCHEMA,length:L,width:W,height:H,door,window,bed:raw.bed,
  doorX,windowX,wallThickness,bedX,bedZ,bedLength,bedWidth,columnSizes,beamDepths,beamWidths,grid,
  roomCount:roomCount as 1|2|3,roomSplit1,roomSplit2,roomTypes,interiorDoorZ,interiorDoorWidth,
  floorGraph,projectNote:raw.projectNote};
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
 n.interiorDoorZ=round(Math.max(n.wallThickness+.45,Math.min(n.interiorDoorZ,n.width-n.interiorDoorWidth-n.wallThickness-.45)));
 if(n.roomCount>1){
  n.roomSplit1=round(Math.min(n.length-2,Math.max(2,n.roomSplit1)));
  if(n.bed && n.roomSplit1<n.bedX+n.bedLength+.08)n.roomSplit1=round(n.bedX+n.bedLength+.12);
 }
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
 if(p.floorGraph){result.push(...derivePlanGraph(p.floorGraph,L,W,H).solids);return result;}
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
 result.push(...deriveRoomSolids(p));
 return result;
}
