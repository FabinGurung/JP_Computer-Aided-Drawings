/** v0.5 experimental orthogonal floor graph, in meters.
 * A single semantic graph owns shared wall nodes, hosted openings, wall meshes,
 * connected intersections, and auto-detected floor zones in both views.
 * Not an arbitrary-angle DXF parser, certified BIM authoring, or structural model.
 */
import type {Draft,Solid} from "./editable_model";
export type PlanNode={id:string;x:number;z:number};
export type PlanWall={id:string;a:string;b:string;thickness:number};
export type PlanOpening={id:string;wallId:string;kind:"door"|"window";offset:number;width:number;sill:number;height:number};
export type PlanGraph={nodes:PlanNode[];walls:PlanWall[];openings:PlanOpening[];labels:Record<string,string>};
export type PlanCell={id:string;roomId:string;x:number;z:number;width:number;depth:number};
export type PlanZone={id:string;name:string;area:number;x:number;z:number;cells:PlanCell[]};
export type PlanIntersection={id:string;x:number;z:number;wallIds:string[]};
export type DerivedPlan={solids:Solid[];zones:PlanZone[];intersections:PlanIntersection[]};
const round=(v:number)=>Math.round(v*1000)/1000;
const close=(a:number,b:number)=>Math.abs(a-b)<0.0011;
const rec=(v:unknown,name:string):Record<string,unknown>=>{
 if(!v||typeof v!=="object"||Array.isArray(v))throw Error(name+" must be an object");
 return v as Record<string,unknown>;
};
const keys=(o:Record<string,unknown>,arr:string[])=>Object.keys(o).sort().join("|")===arr.sort().join("|");
const value=(v:unknown,name:string,min:number,max:number)=>{
 if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error(name+" must be between "+min+" and "+max+" m");
 return round(v);
};
const idCheck=(v:unknown,name:string)=>{
 if(typeof v!=="string"||!/^[A-Za-z][A-Za-z0-9_-]{0,35}$/.test(v))throw Error("Invalid "+name);
 return v;
};
export function validatePlanGraph(raw:unknown,L:number,W:number,H:number):PlanGraph{
 const r=rec(raw,"Free-form plan");
 if(!keys(r,["nodes","walls","openings","labels"]))throw Error("Unknown free-form graph fields");
 if(!Array.isArray(r.nodes)||r.nodes.length<4||r.nodes.length>72)throw Error("Plan needs 4–72 nodes");
 if(!Array.isArray(r.walls)||r.walls.length<4||r.walls.length>90)throw Error("Plan needs 4–90 connected walls");
 if(!Array.isArray(r.openings)||r.openings.length>90)throw Error("Too many openings");
 const nodes:PlanNode[]=r.nodes.map((obj,i)=>{
  const n=rec(obj,"Node "+i);if(!keys(n,["id","x","z"]))throw Error("Unknown node fields");
  return{id:idCheck(n.id,"node ID"),x:value(n.x,"node X",0,L),z:value(n.z,"node Z",0,W)};
 });
 const ns=new Map(nodes.map(n=>[n.id,n]));if(ns.size!==nodes.length)throw Error("Duplicate node IDs");
 const coords=new Set(nodes.map(n=>n.x+","+n.z));if(coords.size!==nodes.length)throw Error("Duplicate node coordinates; reuse a shared node");
 const walls:PlanWall[]=r.walls.map((obj,i)=>{
  const w=rec(obj,"Wall "+i);if(!keys(w,["id","a","b","thickness"]))throw Error("Unknown wall fields");
  const id=idCheck(w.id,"wall ID"),a=idCheck(w.a,"node reference"),b=idCheck(w.b,"node reference");
  if(a===b||!ns.has(a)||!ns.has(b))throw Error("Wall "+id+" references disconnected nodes");
  const A=ns.get(a)!,B=ns.get(b)!;
  if(!close(A.x,B.x)&&!close(A.z,B.z))throw Error("Only orthogonal walls supported: "+id);
  if(Math.abs(A.x-B.x)+Math.abs(A.z-B.z)<.45)throw Error("Wall too short: "+id);
  return {id,a,b,thickness:value(w.thickness,"wall thickness",.09,.40)};
 });
 const ws=new Map(walls.map(w=>[w.id,w]));if(ws.size!==walls.length)throw Error("Duplicate wall IDs");
 // Prevent a wall being duplicated or partially overlapping another on a line.
 for(let i=0;i<walls.length;i++)for(let j=i+1;j<walls.length;j++){
  const a=walls[i]!,b=walls[j]!,p=ns.get(a.a)!,q=ns.get(a.b)!,r=ns.get(b.a)!,s=ns.get(b.b)!;
  const v=close(p.x,q.x),v2=close(r.x,s.x);
  if(v!==v2)continue;
  if(v&&close(p.x,r.x)&&Math.min(Math.max(p.z,q.z),Math.max(r.z,s.z))-Math.max(Math.min(p.z,q.z),Math.min(r.z,s.z))>.002)
   throw Error("Overlapping walls: "+a.id+" and "+b.id);
  if(!v&&close(p.z,r.z)&&Math.min(Math.max(p.x,q.x),Math.max(r.x,s.x))-Math.max(Math.min(p.x,q.x),Math.min(r.x,s.x))>.002)
   throw Error("Overlapping walls: "+a.id+" and "+b.id);
 }
 const openings:PlanOpening[]=r.openings.map((obj,i)=>{
  const o=rec(obj,"Opening "+i);if(!keys(o,["id","wallId","kind","offset","width","sill","height"]))throw Error("Unknown opening fields");
  const id=idCheck(o.id,"opening ID"),wallId=idCheck(o.wallId,"host wall");
  const wall=ws.get(wallId);if(!wall)throw Error("Opening "+id+" has no host wall");
  if(o.kind!=="door"&&o.kind!=="window")throw Error("Unknown opening type");
  const a=ns.get(wall.a)!,b=ns.get(wall.b)!;
  const span=Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
  const width=value(o.width,"opening width",.45,Math.min(3.2,span-.30));
  const offset=value(o.offset,"opening offset",.15,span-width-.15);
  const sill=value(o.sill,"opening sill",0,H-1.05);
  const height=value(o.height,"opening height",.5,H-sill-.08);
  if(o.kind==="door"&&sill!==0)throw Error("Doors start at floor level");
  return {id,wallId,kind:o.kind,offset,width,sill,height};
 });
 if(new Set(openings.map(o=>o.id)).size!==openings.length)throw Error("Duplicate opening IDs");
 for(const w of walls){const openingsFor=openings.filter(o=>o.wallId===w.id).sort((a,b)=>a.offset-b.offset);
  for(let i=1;i<openingsFor.length;i++)if(openingsFor[i]!.offset<openingsFor[i-1]!.offset+openingsFor[i-1]!.width+.15)
   throw Error("Hosted openings overlap in "+w.id);
 }
 // Require explicit enclosing perimeter edges; do not infer walls across a missing boundary.
 const segmentCovers=(side:"N"|"S"|"W"|"E")=>{
  const horizontal=side==="N"||side==="S",constant=side==="N"?0:side==="S"?W:side==="W"?0:L;
  const ranges=walls.flatMap(w=>{const a=ns.get(w.a)!,b=ns.get(w.b)!;
   if(horizontal&&close(a.z,b.z)&&close(a.z,constant))return [[Math.min(a.x,b.x),Math.max(a.x,b.x)]];
   if(!horizontal&&close(a.x,b.x)&&close(a.x,constant))return [[Math.min(a.z,b.z),Math.max(a.z,b.z)]];
   return [] as number[][];
  }).sort((a,b)=>a[0]!-b[0]!);
  let cursor=0;
  for(const span of ranges){if(span[0]!>cursor+.002)return false;cursor=Math.max(cursor,span[1]!);}
  return cursor>=(horizontal?L:W)-.002;
 };
 if(!(["N","S","W","E"] as const).every(segmentCovers))throw Error("Plan needs four closed exterior wall boundaries");
 const labelR=rec(r.labels,"room labels"),labels:Record<string,string>={};
 for(const [key,label] of Object.entries(labelR)){
  if(!/^ROOM-[0-9]{2,3}$/.test(key)||typeof label!=="string"||label.trim().length<1||label.length>60)throw Error("Invalid room label");
  labels[key]=label.trim();
 }
 return {nodes,walls,openings,labels};
}
export function makeEditablePlan(L:number,W:number,t=.16):PlanGraph{
 const half=round(L*.52),third=round(W*.47);
 return{
  nodes:[
   {id:"N-NW",x:0,z:0},{id:"N-NE",x:L,z:0},{id:"N-SE",x:L,z:W},{id:"N-SW",x:0,z:W},
   {id:"N-PN",x:half,z:0},{id:"N-PS",x:half,z:W},{id:"N-TE",x:L,z:third},{id:"N-TW",x:half,z:third}
  ],
  walls:[
   {id:"EXT-N-1",a:"N-NW",b:"N-PN",thickness:t},{id:"EXT-N-2",a:"N-PN",b:"N-NE",thickness:t},
   {id:"EXT-E-1",a:"N-NE",b:"N-TE",thickness:t},{id:"EXT-E-2",a:"N-TE",b:"N-SE",thickness:t},
   {id:"EXT-S-1",a:"N-SE",b:"N-PS",thickness:t},{id:"EXT-S-2",a:"N-PS",b:"N-SW",thickness:t},
   {id:"EXT-W",a:"N-SW",b:"N-NW",thickness:t},
   {id:"W-PART-1",a:"N-PN",b:"N-PS",thickness:t},
   {id:"W-PART-2",a:"N-TW",b:"N-TE",thickness:t}
  ],
  openings:[
   {id:"D-INTER-1",wallId:"W-PART-1",kind:"door",offset:round(W*.27),width:.85,sill:0,height:2.1},
   {id:"D-INTER-2",wallId:"W-PART-2",kind:"door",offset:round((L-half)*.25),width:.85,sill:0,height:2.1},
   {id:"D-ENTRY",wallId:"EXT-S-1",kind:"door",offset:.8,width:1,sill:0,height:2.15},
   {id:"W-NORTH",wallId:"EXT-N-1",kind:"window",offset:.7,width:1.25,sill:.9,height:1.2}
  ],
  labels:{"ROOM-01":"Room 1","ROOM-02":"Room 2","ROOM-03":"Room 3"}
 };
}
export function shiftWallLine(graph:PlanGraph,wallId:string,position:number,L:number,W:number,H:number):PlanGraph{
 const wall=graph.walls.find(w=>w.id===wallId);if(!wall)throw Error("Unknown wall "+wallId);
 const a=graph.nodes.find(n=>n.id===wall.a)!,b=graph.nodes.find(n=>n.id===wall.b)!;
 const vertical=close(a.x,b.x),old=vertical?a.x:a.z,bound=vertical?L:W;
 if(old<.001||old>bound-.001)throw Error("Exterior boundary cannot be moved; change overall dimensions");
 const target=round(Math.max(.4,Math.min(bound-.4,position)));
 if(Math.abs(target-old)<.015)return graph;
 const nodes=graph.nodes.map(n=>({
  ...n,[vertical?"x":"z"]:close(vertical?n.x:n.z,old)?target:vertical?n.x:n.z
 }));
 return validatePlanGraph({...graph,nodes},L,W,H);
}
const dedupe=(nums:number[])=>[...new Set(nums.map(round))].sort((a,b)=>a-b);
export function derivePlanGraph(graph:PlanGraph,L:number,W:number,H:number):DerivedPlan{
 const g=validatePlanGraph(graph,L,W,H),nodes=new Map(g.nodes.map(n=>[n.id,n]));
 const solids:Solid[]=[];
 const add=(id:string,name:string,kind:Solid["kind"],x:number,y:number,z:number,dx:number,dy:number,dz:number)=>{
  if(Math.min(dx,dy,dz)<.002)throw Error("Invalid floor model geometry "+id);
  solids.push({id,name,kind,x:round(x),y:round(y),z:round(z),dx:round(dx),dy:round(dy),dz:round(dz)});
 };
 const wallBounds=g.walls.map(w=>{const a=nodes.get(w.a)!,b=nodes.get(w.b)!,vertical=close(a.x,b.x);
  return {...w,vertical,constant:vertical?a.x:a.z,start:vertical?Math.min(a.z,b.z):Math.min(a.x,b.x),end:vertical?Math.max(a.z,b.z):Math.max(a.x,b.x)};
 });
 for(const w of wallBounds){
  const group=g.openings.filter(o=>o.wallId===w.id).sort((a,b)=>a.offset-b.offset);
  const span=w.end-w.start,place=(partId:string,pos:number,len:number,y:number,height:number)=>{
   if(len<.002||height<.002)return;
   const x=w.vertical?w.constant-w.thickness/2:w.start+pos;
   const z=w.vertical?w.start+pos:w.constant-w.thickness/2;
   add(partId,"Wall · "+w.id,"wall",x,y,z,w.vertical?w.thickness:len,height,w.vertical?len:w.thickness);
  };
  let last=0,index=0;
  for(const opening of group){
   place(w.id+"-SEG-"+String(index++).padStart(2,"0"),last,opening.offset-last,0,H-.18);
   place(w.id+"-OVER-"+opening.id,opening.offset,opening.width,opening.sill+opening.height,H-.18-opening.sill-opening.height);
   if(opening.sill>.002)place(w.id+"-UNDER-"+opening.id,opening.offset,opening.width,0,opening.sill);
   const coord=w.start+opening.offset;
   const x=w.vertical?w.constant-.022:coord,z=w.vertical?coord:w.constant-.022;
   add(opening.id,(opening.kind==="door"?"Door":"Window")+" hosted by "+w.id,opening.kind,x,opening.sill,z,
     w.vertical?.044:opening.width,opening.height,w.vertical?opening.width:.044);
   last=opening.offset+opening.width;
  }
  place(w.id+"-SEG-"+String(index).padStart(2,"0"),last,span-last,0,H-.18);
 }
 // Orthogonal intersections include exact shared endpoints, T-junctions, and
 // crossing segments. They are derived; original node identity remains intact.
 const pts=new Map<string,{x:number;z:number;wallIds:Set<string>}>();
 for(const a of wallBounds)for(const b of wallBounds){
  if(a.id>=b.id||a.vertical===b.vertical)continue;
  const v=a.vertical?a:b,h=a.vertical?b:a;
  const x=v.constant,z=h.constant;
  if(x>=h.start-.001&&x<=h.end+.001&&z>=v.start-.001&&z<=v.end+.001){
   const key=round(x)+":"+round(z);if(!pts.has(key))pts.set(key,{x,z,wallIds:new Set()});
   pts.get(key)!.wallIds.add(a.id);pts.get(key)!.wallIds.add(b.id);
  }
 }
 const intersections=[...pts.entries()].sort((a,b)=>a[1].x-b[1].x||a[1].z-b[1].z).map(([key,p])=>({id:"J-"+key,x:p.x,z:p.z,wallIds:[...p.wallIds].sort()}));
 const xs=dedupe([0,L,...g.nodes.map(n=>n.x)]),zs=dedupe([0,W,...g.nodes.map(n=>n.z)]);
 if((xs.length-1)*(zs.length-1)>1800)throw Error("Floor graph too complex to detect rooms");
 const cells=new Map<string,PlanCell>(),cellKey=(i:number,k:number)=>i+","+k;
 for(let i=0;i<xs.length-1;i++)for(let k=0;k<zs.length-1;k++){
  const dx=xs[i+1]!-xs[i]!,dz=zs[k+1]!-zs[k]!;
  if(dx<.005||dz<.005)continue;
  cells.set(cellKey(i,k),{id:"CELL-"+i+"-"+k,roomId:"",x:xs[i]!,z:zs[k]!,width:round(dx),depth:round(dz)});
 }
 const blocks=(a:PlanCell,b:PlanCell)=>{
  if(close(a.x+a.width,b.x)||close(b.x+b.width,a.x)){
   const x=close(a.x+a.width,b.x)?b.x:a.x;
   const z=(Math.max(a.z,b.z)+Math.min(a.z+a.depth,b.z+b.depth))/2;
   return wallBounds.some(w=>w.vertical&&close(w.constant,x)&&z>w.start-.0005&&z<w.end+.0005);
  }
  const z=close(a.z+a.depth,b.z)?b.z:a.z;
  const x=(Math.max(a.x,b.x)+Math.min(a.x+a.width,b.x+b.width))/2;
  return wallBounds.some(w=>!w.vertical&&close(w.constant,z)&&x>w.start-.0005&&x<w.end+.0005);
 };
 const seen=new Set<string>();const regions:PlanCell[][]=[];
 for(const [key,c] of cells){
  if(seen.has(key))continue;
  const region:PlanCell[]=[],stack=[key];seen.add(key);
  while(stack.length){
   const id=stack.pop()!,here=cells.get(id)!;region.push(here);
   const ij=id.split(",");const ii=Number(ij[0]??0),kk=Number(ij[1]??0);
   for(const candidate of [cellKey(ii-1,kk),cellKey(ii+1,kk),cellKey(ii,kk-1),cellKey(ii,kk+1)]){
    if(seen.has(candidate)||!cells.has(candidate)||blocks(here,cells.get(candidate)!))continue;
    seen.add(candidate);stack.push(candidate);
   }
  }
  if(region.length)regions.push(region);
 }
 regions.sort((a,b)=>Math.min(...a.map(c=>c.x))-Math.min(...b.map(c=>c.x))||
    Math.min(...a.map(c=>c.z))-Math.min(...b.map(c=>c.z)));
 const zones:PlanZone[]=regions.map((pieces,index)=>{
  const id="ROOM-"+String(index+1).padStart(2,"0"),area=pieces.reduce((sum,c)=>sum+c.width*c.depth,0);
  const cx=pieces.reduce((sum,c)=>sum+(c.x+c.width/2)*c.width*c.depth,0)/area;
  const cz=pieces.reduce((sum,c)=>sum+(c.z+c.depth/2)*c.width*c.depth,0)/area;
  for(let i=0;i<pieces.length;i++){
   const c=pieces[i]!,cellId=id+"-CELL-"+String(i+1).padStart(2,"0");
   c.roomId=id;
   add(cellId,(g.labels[id]||"Room "+(index+1))+" · "+id,"room",c.x,.005,c.z,c.width,.04,c.depth);
  }
  return {id,name:g.labels[id]||"Room "+(index+1),area:round(area),x:round(cx),z:round(cz),cells:pieces};
 });
 return {solids,zones,intersections};
}
