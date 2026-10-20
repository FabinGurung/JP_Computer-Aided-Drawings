/* Reusable AAD connected-plan topology + room-face engine.
 * Works only on editable floorGraph data; no Narayani assumptions.
 * Interior wall drafting + exterior/interior host splitting is atomic in
 * aad-unified-workspace.mjs, followed by IFC/whole-building QA.
 */
const EPS=1e-7,SNAP=.025,round=n=>Math.round(n*1000)/1000;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const area=ps=>ps.reduce((v,p,i)=>{const q=ps[(i+1)%ps.length];return v+p.x*q.z-q.x*p.z},0)/2;
const pointOn=(p,a,b)=>{const d={x:b.x-a.x,z:b.z-a.z},l=d.x*d.x+d.z*d.z,t=l>EPS?((p.x-a.x)*d.x+(p.z-a.z)*d.z)/l:0;
 return{t,point:{x:a.x+t*d.x,z:a.z+t*d.z},distance:distance(p,{x:a.x+t*d.x,z:a.z+t*d.z})};};
const cross=(a,b)=>a.x*b.z-a.z*b.x;
const vector=(a,b)=>({x:b.x-a.x,z:b.z-a.z});
const along=(a,b,t)=>({x:round(a.x+(b.x-a.x)*t),z:round(a.z+(b.z-a.z)*t)});
const nodeMap=g=>new Map(g.nodes.map(n=>[n.id,n]));
const wallMap=g=>new Map(g.walls.map(w=>[w.id,w]));
const unique=(g,prefix)=>{let n=1;const all=new Set([...g.nodes,...g.walls,...g.openings].map(o=>o.id));while(all.has(prefix+String(n).padStart(4,"0")))n++;return prefix+String(n).padStart(4,"0");};
const finite=(n,k)=>{if(typeof n!=="number"||!Number.isFinite(n))throw Error(k+" must be finite");return n;};
const metric=(x,k)=>round(finite(x,k));
const onSegment=(p,a,b,tol=SNAP)=>{const v=pointOn(p,a,b);return v.t>=-EPS&&v.t<=1+EPS&&v.distance<=tol;};
const polygonOf=g=>{
 const nodes=nodeMap(g),walls=wallMap(g),ids=g.perimeter||[],w=walls.get(ids[0]);
 if(!w)throw Error("Exterior perimeter is unavailable");
 let cursor=w.a;const out=[];
 for(const id of ids){const line=walls.get(id);if(!line)throw Error("Missing exterior perimeter wall");
  out.push(nodes.get(cursor));cursor=line.a===cursor?line.b:line.b===cursor?line.a:null;
  if(!cursor)throw Error("Disconnected perimeter");}
 if(cursor!==w.a)throw Error("Exterior perimeter does not close");return out;
};
const inPolygon=(p,poly)=>{
 if(poly.some((q,i)=>onSegment(p,q,poly[(i+1)%poly.length],.002)))return true;
 let found=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a.z>p.z)!==(b.z>p.z) && p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)found=!found;
 }
 return found;
};
const intersection=(a,b,c,d)=>{
 const r=vector(a,b),s=vector(c,d),det=cross(r,s),diff=vector(a,c);
 if(Math.abs(det)<EPS){
  if(Math.abs(cross(diff,r))<.00001){
   const m=pointOn(c,a,b),n=pointOn(d,a,b);
   if(Math.max(Math.min(m.t,n.t),0)<Math.min(Math.max(m.t,n.t),1)-.00001)
    return{overlap:true};
  }
  return null;
 }
 const t=cross(diff,s)/det,u=cross(diff,r)/det;
 if(t<-.00001||t>1.00001||u<-.00001||u>1.00001)return null;
 return{t:Math.max(0,Math.min(1,t)),u:Math.max(0,Math.min(1,u)),point:along(a,b,t)};
};
function splitByPoint(g,wallId,p){
 const w=wallMap(g).get(wallId);if(!w)throw Error("Missing wall "+wallId);
 const nodes=nodeMap(g),a=nodes.get(w.a),b=nodes.get(w.b),v=pointOn(p,a,b),length=distance(a,b),splitLength=v.t*length;
 if(v.distance>.03||v.t<-.00001||v.t>1.00001)throw Error("Split point is outside "+wallId);
 if(splitLength<.25)return a.id;if(length-splitLength<.25)return b.id;
 for(const o of g.openings.filter(o=>o.wallId===w.id)){
  if(o.offset<splitLength-.0001&&o.offset+o.width>splitLength+.0001)
   throw Error("Cannot split "+wallId+" through existing "+o.id+" opening");
 }
 const location=along(a,b,v.t),near=g.nodes.find(n=>distance(n,location)<.007);
 const nid=near?.id||unique(g,"AIN-");
 if(!near)g.nodes.push({id:nid,x:location.x,z:location.z});
 const originalEnd=w.b;w.b=nid;
 const other={id:unique(g,"AIS-"),a:nid,b:originalEnd,thickness:w.thickness,source:"AI_EDITED_HOST_SPLIT",status:"DRAFT_ENGINEERING_HOLD"};
 g.walls.push(other);
 for(const o of g.openings.filter(o=>o.wallId===w.id)){
  if(o.offset>=splitLength-.0001){o.wallId=other.id;o.offset=round(o.offset-splitLength);}
 }
 if(g.perimeter.includes(w.id)){
  const i=g.perimeter.indexOf(w.id),prev=wallMap(g).get(g.perimeter[(i+g.perimeter.length-1)%g.perimeter.length]);
  // Detect direction of traversal across the original perimeter line.
  const reverse=prev.a===originalEnd||prev.b===originalEnd;
  g.perimeter.splice(i,1,...(reverse?[other.id,w.id]:[w.id,other.id]));
 }
 return nid;
}
function normalizeEnd(g,raw){
 const p={x:metric(raw.x,"X"),z:metric(raw.z,"Z")};
 const nearby=g.nodes.find(n=>distance(n,p)<=SNAP);
 if(nearby)return nearby.id;
 const nodes=nodeMap(g);
 for(const w of [...g.walls]){
  const a=nodes.get(w.a),b=nodes.get(w.b),v=pointOn(p,a,b);
  if(v.distance<=SNAP&&v.t>=0&&v.t<=1)return splitByPoint(g,w.id,v.point);
 }
 const id=unique(g,"AIN-");g.nodes.push({id,...p});return id;
}
function auditNewSegment(g,a,b,ignoreIds=new Set()){
 const map=nodeMap(g),start=map.get(a),end=map.get(b),len=distance(start,end);
 if(len<.25)throw Error("New wall must be at least 0.25 m long");
 for(const w of g.walls){
  if(ignoreIds.has(w.id))continue;
  const c=map.get(w.a),d=map.get(w.b),v=intersection(start,end,c,d);
  if(v?.overlap)throw Error("Overlapping wall detected at "+w.id);
  if(v&&v.t>.00005&&v.t<.99995&&v.u>.00005&&v.u<.99995)
   throw Error("Unconnected crossing: split host "+w.id+" first");
 }
}
export function addConnectedWall(g,arg){
 if(!arg||!arg.start||!arg.end)throw Error("Start and end plan coordinates required");
 const start={x:metric(arg.start.x,"start X"),z:metric(arg.start.z,"start Z")},
       end={x:metric(arg.end.x,"end X"),z:metric(arg.end.z,"end Z")};
 const thickness=metric(arg.thickness??.15,"wall thickness");
 if(thickness<.06||thickness>.8)throw Error("Wall thickness out of bounds");
 if(distance(start,end)<.25)throw Error("Wall must be at least 0.25 m long");
 const oldPerimeter=polygonOf(g);
 if(!inPolygon(start,oldPerimeter)||!inPolygon(end,oldPerimeter))throw Error("Wall endpoints must be in the storey footprint");
 const original=g.walls.map(w=>({...w})),originalNodes=nodeMap(g),junctions=[];
 for(const w of original){
  const a=originalNodes.get(w.a),b=originalNodes.get(w.b),v=intersection(start,end,a,b);
  if(!v)continue;
  if(v.overlap)throw Error("New wall cannot overlap existing "+w.id);
  junctions.push({t:v.t,point:v.point,wallId:w.id});
 }
 const startId=normalizeEnd(g,start),endId=normalizeEnd(g,end),ids=[startId];
 const sorted=junctions.sort((a,b)=>a.t-b.t);
 for(const j of sorted){
  // A source wall might have already been split by the endpoints. Find the
  // piece containing the junction rather than using stale wall IDs.
  const nmap=nodeMap(g);
  const host=g.walls.find(w=>{
   const a=nmap.get(w.a),b=nmap.get(w.b);
   return onSegment(j.point,a,b,.003);
  });
  if(host)ids.push(splitByPoint(g,host.id,j.point));
 }
 ids.push(endId);
 const ordered=[...new Set(ids.map(id=>id))].sort((a,b)=>{
  const nodes=nodeMap(g),pa=nodes.get(a),pb=nodes.get(b);
  return pointOn(pa,start,end).t-pointOn(pb,start,end).t;
 });
 const created=[];
 for(let i=0;i<ordered.length-1;i++){
  const a=ordered[i],b=ordered[i+1];if(a===b)continue;
  const map=nodeMap(g),mid=along(map.get(a),map.get(b),.5);
  if(!inPolygon(mid,polygonOf(g)))throw Error("Wall exits the exterior footprint");
  auditNewSegment(g,a,b);
  const wall={id:unique(g,"AIW-"),a,b,thickness,source:"AI_AUTHORED_PLAN_TOPOLOGY",status:"DRAFT_ENGINEERING_HOLD"};
  g.walls.push(wall);created.push(wall.id);
 }
 if(!created.length)throw Error("No wall segment created");
 return{ids:created,startNode:startId,endNode:endId,intersections:Math.max(0,ordered.length-2)};
}
export function splitConnectedWall(g,arg){
 const w=wallMap(g).get(arg?.wallId),nodes=nodeMap(g);
 if(!w)throw Error("Wall ID required");
 const a=nodes.get(w.a),b=nodes.get(w.b),length=distance(a,b);
 let position;
 if("offset" in arg){const d=metric(arg.offset,"split offset");position=along(a,b,d/length);}
 else if(arg.point)position={x:metric(arg.point.x,"split X"),z:metric(arg.point.z,"split Z")};
 else throw Error("Split requires wall offset or plan point");
 const id=splitByPoint(g,w.id,position);
 if(id===w.a||id===w.b)throw Error("Split must stay 0.25 m clear of endpoints");
 return{nodeId:id,wallIds:g.walls.filter(v=>v.id===w.id||v.a===id||v.b===id).map(v=>v.id)};
}
export function joinConnectedWalls(g,arg){
 const w1=wallMap(g).get(arg?.firstId),w2=wallMap(g).get(arg?.secondId);
 if(!w1||!w2||w1.id===w2.id)throw Error("Choose two distinct existing walls");
 if(g.perimeter.includes(w1.id)||g.perimeter.includes(w2.id))throw Error("Exterior wall joining is reserved for surveyed geometry revisions");
 if(Math.abs(w1.thickness-w2.thickness)>.002)throw Error("Wall thickness mismatch");
 const shared=[w1.a,w1.b].find(x=>x===w2.a||x===w2.b);
 if(!shared)throw Error("Walls do not share a junction node");
 const out1=w1.a===shared?w1.b:w1.a,out2=w2.a===shared?w2.b:w2.a,n=nodeMap(g),
  pa=n.get(out1),pj=n.get(shared),pb=n.get(out2);
 const d1=vector(pa,pj),d2=vector(pj,pb);
 if(Math.abs(cross(d1,d2))>distance(pa,pj)*distance(pj,pb)*.002||d1.x*d2.x+d1.z*d2.z<0)
  throw Error("Only collinear, forward-contiguous walls may be joined");
 const l1=distance(pa,pj),l2=distance(pj,pb);
 // Preserve opening world positions even for reverse-oriented old hosts.
 for(const o of g.openings.filter(o=>o.wallId===w1.id||o.wallId===w2.id)){
  const old=o.wallId===w1.id?w1:w2,oa=n.get(old.a),ob=n.get(old.b);
  const start=along(oa,ob,o.offset/distance(oa,ob)),finish=along(oa,ob,(o.offset+o.width)/distance(oa,ob));
  const t1=pointOn(start,pa,pb).t,t2=pointOn(finish,pa,pb).t;
  if(t2<t1-.00001)throw Error("Reverse-oriented hosted opening cannot be joined without reorientation");
  o.wallId=w1.id;o.offset=round(t1*(l1+l2));
 }
 w1.a=out1;w1.b=out2;g.walls.splice(g.walls.indexOf(w2),1);
 if(!g.walls.some(w=>w.a===shared||w.b===shared))g.nodes.splice(g.nodes.findIndex(v=>v.id===shared),1);
 return{wallId:w1.id,removedWallId:w2.id,joinedLength:round(l1+l2)};
}
export function removeConnectedWall(g,arg){
 const id=arg?.wallId,w=wallMap(g).get(id);
 if(!w)throw Error("Wall ID required");
 if(g.perimeter.includes(id))throw Error("Exterior perimeter cannot be deleted from working draft");
 if(g.openings.some(o=>o.wallId===id))throw Error("Remove or rehost openings before deleting wall "+id);
 g.walls.splice(g.walls.indexOf(w),1);
 for(const nid of [w.a,w.b]){
  if(nid.startsWith("AIN-")&&!g.walls.some(line=>line.a===nid||line.b===nid)){
   g.nodes.splice(g.nodes.findIndex(n=>n.id===nid),1);
  }
 }
 return{removedWallId:id};
}
export function addHostedOpening(g,arg,storeyHeight){
 const wall=wallMap(g).get(arg?.wallId);
 if(!wall)throw Error("Existing host wall required");
 const kind=arg.kind;
 if(kind!=="door"&&kind!=="window")throw Error("Use door or window");
 const offset=metric(arg.offset,"opening offset"),width=metric(arg.width,"opening width"),
       sill=metric(arg.sill??(kind==="door"?0:.9),"opening sill"),
       height=metric(arg.height??(kind==="door"?2.1:1.2),"opening height");
 const ns=nodeMap(g),length=distance(ns.get(wall.a),ns.get(wall.b));
 if(offset<0||width<.3||offset+width>length+.00001||height<.3||sill<0||sill+height>storeyHeight+.001)
  throw Error("Opening outside host wall or storey height");
 for(const x of g.openings.filter(o=>o.wallId===wall.id)){
  if(Math.max(offset,x.offset)<Math.min(offset+width,x.offset+x.width)-.005)
   throw Error("Hosted openings cannot overlap: "+x.id);
 }
 const id=unique(g,kind==="door"?"AID-":"AIWIN-");
 g.openings.push({id,wallId:wall.id,kind,offset,width,sill,height,
  source:"AI_AUTHORED_HOSTED_OPENING",status:"DRAFT_ENGINEERING_HOLD"});
 return{id,wallId:wall.id};
}
export function removeHostedOpening(g,arg){
 const index=g.openings.findIndex(o=>o.id===arg?.id);
 if(index<0)throw Error("Hosted opening ID required");
 const [removed]=g.openings.splice(index,1);return{removedOpeningId:removed.id,wallId:removed.wallId};
}
export function derivePlanRooms(g){
 const nodes=nodeMap(g),adj=new Map();
 for(const w of g.walls){
  const a=nodes.get(w.a),b=nodes.get(w.b);if(!a||!b)continue;
  for(const [u,v] of [[a,b],[b,a]]){
   if(!adj.has(u.id))adj.set(u.id,[]);
   adj.get(u.id).push({to:v.id,angle:Math.atan2(v.z-u.z,v.x-u.x)});
  }
 }
 for(const edges of adj.values())edges.sort((a,b)=>a.angle-b.angle);
 const seen=new Set(),faces=[],poly=polygonOf(g);
 for(const [id,edges] of adj)for(const ed of edges){
  const seed=id+"|"+ed.to;if(seen.has(seed))continue;
  let a=id,b=ed.to,route=[],closed=false;
  for(let limit=0;limit<Math.max(g.walls.length*2+3,20);limit++){
   const key=a+"|"+b;if(seen.has(key))break;
   seen.add(key);route.push(a);
   const spokes=adj.get(b)||[],back=spokes.findIndex(e=>e.to===a);
   if(back<0)break;
   // Pick immediate clockwise edge from the reversed incoming direction.
   const next=spokes[(back-1+spokes.length)%spokes.length];
   a=b;b=next.to;
   if(a===id&&b===ed.to){closed=true;break;}
  }
  if(!closed||route.length<3)continue;
  const points=route.map(v=>nodes.get(v)),square=area(points);
  if(square<=.1)continue;
  const center={x:points.reduce((s,p)=>s+p.x,0)/points.length,z:points.reduce((s,p)=>s+p.z,0)/points.length};
  if(!inPolygon(center,poly))continue;
  faces.push({id:"ROOM-"+String(faces.length+1).padStart(3,"0"),nodes:route,
   area:round(square),centroid:{x:round(center.x),z:round(center.z)},
   boundaryStatus:"GRAPH_DERIVED_NOT_SURVEYED",name:"Unclassified room "+(faces.length+1)});
 }
 return faces;
}
