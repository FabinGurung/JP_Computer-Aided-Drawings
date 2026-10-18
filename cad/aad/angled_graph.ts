/** Planar orthogonal + diagonal graph derivation.
 * Works from the SAME PlanGraph; source files and model facts are never sent to a server.
 * Angled walls remain conceptual architecture, not structurally approved connections.
 */
import type {Solid} from "./editable_model";
import type {PlanGraph,PlanNode,PlanZone,PlanIntersection,DerivedPlan} from "./floor_graph";
const r=(v:number)=>Math.round(v*1000)/1000;
type V={x:number;z:number};
const cr=(a:V,b:V)=>a.x*b.z-a.z*b.x;
const sub=(a:V,b:V):V=>({x:a.x-b.x,z:a.z-b.z});
const pos=(a:V,b:V,t:number):V=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const dist=(a:V,b:V)=>Math.hypot(a.x-b.x,a.z-b.z);
const key=(p:V)=>r(p.x)+":"+r(p.z);
const area=(vs:V[])=>vs.reduce((s,v,i)=>{const w=vs[(i+1)%vs.length]!;return s+v.x*w.z-w.x*v.z;},0)/2;
type WallSegment={id:string;a:V;b:V;thickness:number};
export function lineCrossings(a:V,b:V,c:V,d:V):Array<{t:number;u:number;p:V}>{
 const v=sub(b,a),w=sub(d,c),den=cr(v,w);
 if(Math.abs(den)<1e-9)return [];
 const t=cr(sub(c,a),w)/den,u=cr(sub(c,a),v)/den;
 if(t<-.0001||t>1.0001||u<-.0001||u>1.0001)return [];
 const tt=Math.min(1,Math.max(0,t)),uu=Math.min(1,Math.max(0,u));
 return [{t:tt,u:uu,p:pos(a,b,tt)}];
}
export function diagonalWallSolids(g:PlanGraph,H:number):Solid[]{
 const nodes=new Map(g.nodes.map(n=>[n.id,n]));
 const solids:Solid[]=[];
 const add=(id:string,name:string,kind:Solid["kind"],a:V,b:V,t:number,y:number,height:number)=>{
  const len=dist(a,b);if(len<.002||height<.002)return;
  const angle=Math.atan2(b.z-a.z,b.x-a.x)*180/Math.PI;
  solids.push({id,name,kind,x:r((a.x+b.x-len)/2),y:r(y),
    z:r((a.z+b.z-t)/2),dx:r(len),dy:r(height),dz:r(t),angleDeg:r(angle)});
 };
 for(const w of g.walls){
  const a=nodes.get(w.a)!,b=nodes.get(w.b)!,length=dist(a,b),unit=(t:number)=>pos(a,b,t/length);
  const openings=g.openings.filter(o=>o.wallId===w.id).sort((x,y)=>x.offset-y.offset);
  let start=0,seg=0;
  for(const op of openings){
   add(w.id+"-SEG-"+String(seg++).padStart(2,"0"),"Wall · "+w.id,"wall",unit(start),unit(op.offset),w.thickness,0,H-.18);
   add(w.id+"-OVER-"+op.id,"Wall above "+op.id,"wall",unit(op.offset),unit(op.offset+op.width),
     w.thickness,op.sill+op.height,H-.18-op.sill-op.height);
   if(op.sill>.002)add(w.id+"-UNDER-"+op.id,"Wall below "+op.id,"wall",unit(op.offset),unit(op.offset+op.width),
     w.thickness,0,op.sill);
   add(op.id,(op.kind==="door"?"Door":"Window")+" hosted by "+w.id,op.kind,
     unit(op.offset),unit(op.offset+op.width),.045,op.sill,op.height);
   start=op.offset+op.width;
  }
  add(w.id+"-SEG-"+String(seg).padStart(2,"0"),"Wall · "+w.id,"wall",unit(start),b,w.thickness,0,H-.18);
 }
 return solids;
}
export function deriveAngledPlan(g:PlanGraph,L:number,W:number,H:number):DerivedPlan{
 const ns=new Map(g.nodes.map(n=>[n.id,n]));
 const walls:WallSegment[]=g.walls.map(w=>({id:w.id,a:ns.get(w.a)!,b:ns.get(w.b)!,thickness:w.thickness}));
 const ts=walls.map(()=>[0,1]),intersections=new Map<string,{x:number;z:number;wallIds:Set<string>}>();
 for(let i=0;i<walls.length;i++)for(let j=i+1;j<walls.length;j++){
  const a=walls[i]!,b=walls[j]!;
  for(const h of lineCrossings(a.a,a.b,b.a,b.b)){
   ts[i]!.push(h.t);ts[j]!.push(h.u);
   const k=key(h.p);
   if(!intersections.has(k))intersections.set(k,{x:r(h.p.x),z:r(h.p.z),wallIds:new Set()});
   intersections.get(k)!.wallIds.add(a.id);intersections.get(k)!.wallIds.add(b.id);
  }
 }
 const adjacency=new Map<string,Array<{target:string;angle:number}>>();
 const points=new Map<string,V>();
 const edges=new Set<string>();
 const addEdge=(p:V,q:V)=>{
  const a=key(p),b=key(q);
  if(a===b)return;
  const edge=[a,b].sort().join("|");if(edges.has(edge))return;edges.add(edge);
  points.set(a,{x:r(p.x),z:r(p.z)});points.set(b,{x:r(q.x),z:r(q.z)});
  for(const [from,to,P,Q] of [[a,b,p,q],[b,a,q,p]] as const){
   if(!adjacency.has(from))adjacency.set(from,[]);
   adjacency.get(from)!.push({target:to,angle:Math.atan2(Q.z-P.z,Q.x-P.x)});
  }
 };
 walls.forEach((w,i)=>{
  const cuts=[...new Set(ts[i]!.map(t=>r(t)))].sort((a,b)=>a-b);
  for(let k=0;k<cuts.length-1;k++)addEdge(pos(w.a,w.b,cuts[k]!),pos(w.a,w.b,cuts[k+1]!));
 });
 for(const neighbors of adjacency.values())neighbors.sort((a,b)=>a.angle-b.angle);
 const used=new Set<string>(),faces:V[][]=[];
 let operations=0;
 for(const [from,neighbors] of adjacency)for(const neighbor of neighbors){
  const first=from+"→"+neighbor.target;if(used.has(first))continue;
  let u=from,v=neighbor.target;const verts:V[]=[];
  let closed=false;
  while(operations++<25000){
   const token=u+"→"+v;
   if(used.has(token))break;
   used.add(token);verts.push(points.get(u)!);
   const outs=adjacency.get(v)!;
   const back=outs.findIndex(e=>e.target===u);
   if(back<0)break;
   const next=outs[(back-1+outs.length)%outs.length]!;
   const nu=v,nv=next.target;
   if(nu===from&&nv===neighbor.target){closed=true;break;}
   u=nu;v=nv;
  }
  if(!closed||verts.length<3)continue;
  const a=area(verts);
  if(a<=.001||a>L*W+.1)continue;
  // Each positive face lies inside the explicitly verified outer rectangle.
  if(!verts.every(p=>p.x>=-.002&&p.x<=L+.002&&p.z>=-.002&&p.z<=W+.002))continue;
  faces.push(verts);
 }
 if(operations>=25000)throw Error("Floor graph face traversal exceeded safe limit");
 faces.sort((a,b)=>Math.min(...a.map(p=>p.x))-Math.min(...b.map(p=>p.x))||
                          Math.min(...a.map(p=>p.z))-Math.min(...b.map(p=>p.z)));
 const solids=diagonalWallSolids(g,H);
 const zones:PlanZone[]=faces.map((pointsIn,index)=>{
  const id="ROOM-"+String(index+1).padStart(2,"0"),a=area(pointsIn);
  const numerX=pointsIn.reduce((acc,p,i)=>{
   const q=pointsIn[(i+1)%pointsIn.length]!,c=p.x*q.z-q.x*p.z;return acc+(p.x+q.x)*c;},0);
  const numerZ=pointsIn.reduce((acc,p,i)=>{
   const q=pointsIn[(i+1)%pointsIn.length]!,c=p.x*q.z-q.x*p.z;return acc+(p.z+q.z)*c;},0);
  const cx=r(numerX/(6*a)),cz=r(numerZ/(6*a));
  const minX=Math.min(...pointsIn.map(p=>p.x)),maxX=Math.max(...pointsIn.map(p=>p.x));
  const minZ=Math.min(...pointsIn.map(p=>p.z)),maxZ=Math.max(...pointsIn.map(p=>p.z));
  const outline=pointsIn.map(p=>({x:r(p.x),z:r(p.z)}));
  solids.push({id:id+"-CELL-01",name:(g.labels[id]||"Room "+(index+1))+" · "+id,kind:"room",
    x:r(minX),y:.005,z:r(minZ),dx:r(maxX-minX),dy:.04,dz:r(maxZ-minZ),outline});
  return{id,name:g.labels[id]||"Room "+(index+1),area:r(a),x:cx,z:cz,
    cells:[{id:id+"-CELL-01",roomId:id,x:r(minX),z:r(minZ),width:r(maxX-minX),depth:r(maxZ-minZ)}]};
 });
 const sum=zones.reduce((acc,z)=>acc+z.area,0);
 let expected=L*W;
 if(g.perimeter?.length){
  const ws=new Map(g.walls.map(w=>[w.id,w])),first=ws.get(g.perimeter[0]!)!;
  const ordered=(start:string,next:string)=>{
   const chain=[start,next];
   for(const id of g.perimeter!.slice(1)){
    const w=ws.get(id)!,last=chain[chain.length-1]!;
    if(w.a===last)chain.push(w.b);else if(w.b===last)chain.push(w.a);else return null;
   }
   return chain[chain.length-1]===start?chain.slice(0,-1):null;
  };
  const ids=ordered(first.a,first.b)??ordered(first.b,first.a);
  if(!ids)throw Error("Unclosed source perimeter");
  expected=Math.abs(area(ids.map(id=>ns.get(id)!)));
 }
 if(Math.abs(sum-expected)>.1)throw Error("Room regions do not cover the enclosed floor: "+sum.toFixed(2)+" / "+expected.toFixed(2)+" m²");
 const junctions:PlanIntersection[]=[...intersections.entries()].map(([k,x])=>
  ({id:"J-"+k,x:x.x,z:x.z,wallIds:[...x.wallIds].sort()}));
 return {solids,zones,intersections:junctions};
}
/** Translates an angled partition and all directly shared junction nodes.
 * Enclosure and impossible overlaps remain rejected by validatePlanGraph.
 */
export function moveAngledWall(g:PlanGraph,id:string,dx:number,dz:number,L:number,W:number,H:number):PlanGraph{
 const w=g.walls.find(v=>v.id===id);if(!w)throw Error("Unknown wall "+id);
 const ids=new Set([w.a,w.b]);
 const nodes=g.nodes.map(n=>ids.has(n.id)?{...n,x:r(n.x+dx),z:r(n.z+dz)}:n);
 // The validator is the single authority, imported dynamically to avoid a module cycle.
 return {...g,nodes};
}
