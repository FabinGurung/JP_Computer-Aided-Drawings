/** Reusable room templates / shared partitions for the same AAD model.
 * All entities are derivations from Draft; NEVER an independent SVG or 3D model.
 * Only orthogonal rectangular one-storey partitions in this first milestone.
 */
import type {Draft,Solid} from "./editable_model";
export type RoomKind="bedroom"|"living"|"study";
export type RoomView={id:string;kind:RoomKind;name:string;x:number;z:number;width:number;depth:number;area:number};
export const ROOM_TEMPLATES:Record<RoomKind,{name:string;furniture:string}> ={
 bedroom:{name:"Bedroom",furniture:"Bed"},
 living:{name:"Living room",furniture:"Sofa"},
 study:{name:"Study",furniture:"Desk"}
};
const round=(x:number)=>Math.round(x*1000)/1000;
export function roomBoundaryPositions(p:Draft):number[]{
 return p.roomCount===1?[]:p.roomCount===2?[p.roomSplit1]:[p.roomSplit1,p.roomSplit2];
}
export function deriveRooms(p:Draft):RoomView[]{
 const borders=[0,...roomBoundaryPositions(p),p.length];
 return Array.from({length:p.roomCount},(_,i)=>{
  const left=borders[i]!,right=borders[i+1]!;
  const width=right-left-(i===0?p.wallThickness/2:p.wallThickness/2)-(i===p.roomCount-1?p.wallThickness/2:p.wallThickness/2);
  const kind=p.roomTypes[i]!,name=ROOM_TEMPLATES[kind].name;
  return {id:"ROOM-"+String(i+1).padStart(2,"0"),kind,name,x:round(left+p.wallThickness/2),z:round(p.wallThickness/2),
   width:round(width),depth:round(p.width-p.wallThickness),area:round(width*(p.width-p.wallThickness))};
 });
}
export function deriveRoomSolids(p:Draft):Solid[]{
 const walls:Solid[]=[];
 const add=(id:string,name:string,kind:Solid["kind"],x:number,y:number,z:number,dx:number,dy:number,dz:number)=>{
  if(Math.min(dx,dy,dz)<=.001)throw Error("Invalid shared room geometry "+id);
  walls.push({id,name,kind,x:round(x),y:round(y),z:round(z),dx:round(dx),dy:round(dy),dz:round(dz)});
 };
 const H=p.height-.18,doorHeight=Math.min(2.12,H-.08),t=p.wallThickness;
 const width=p.interiorDoorWidth,z=p.interiorDoorZ;
 const splits=roomBoundaryPositions(p);
 for(const [index,x] of splits.entries()){
  const serial=String(index+1).padStart(2,"0"),wallX=x-t/2;
  add("PART-"+serial+"-N","Shared wall "+serial+" · north of door","wall",wallX,0,t,t,H,z-t);
  add("PART-"+serial+"-S","Shared wall "+serial+" · south of door","wall",wallX,0,z+width,t,H,p.width-t-z-width);
  add("PART-"+serial+"-HEAD","Shared wall "+serial+" · door head","wall",wallX,doorHeight,z,t,H-doorHeight,width);
  add("INT-DOOR-"+serial,"Interior door "+serial,"door",x-.025,0,z,.05,doorHeight,width);
 }
 for(const room of deriveRooms(p)){
  add(room.id,room.name+" · "+room.id,"room",room.x,.005,room.z,room.width,.045,room.depth);
 }
 // Reusable furnishing defined by room template. Bedroom retains the original
 // independently editable BED object from the base model; avoid duplication.
 for(const room of deriveRooms(p)){
  if(room.kind==="living" && room.width>2.1){
   add("FURN-"+room.id+"-SOFA","Sofa · "+room.id,"furniture",
    room.x+.30,.15,room.z+.55,Math.min(1.5,room.width-.55),.47,.72);
  }
  if(room.kind==="study" && room.width>1.75){
   add("FURN-"+room.id+"-DESK","Desk · "+room.id,"furniture",
    room.x+.25,.15,room.z+.45,Math.min(1.25,room.width-.45),.69,.66);
  }
 }
 return walls;
}
export function roomPreset(p:Draft,count:1|2|3):Draft{
 const width=p.length;
 const first=round(width*.5),second=round(width*.755);
 const next:Draft={...p,roomCount:count,roomSplit1:first,roomSplit2:second,
  roomTypes:[...p.roomTypes] as [RoomKind,RoomKind,RoomKind],
  interiorDoorZ:round((p.width-p.interiorDoorWidth)/2)};
 return next;
}
