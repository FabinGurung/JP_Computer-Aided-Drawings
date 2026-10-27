/* Reusable wall subtraction contract. Coordinates are local wall metres.
 * Subdivide into disjoint rectangular solids so door/window apertures are real
 * empty space, including openings touching the bottom of a wall. */
export function wallSolidCells(wall,openings){
 const L=wall.dx,H=wall.dy,T=wall.dz;
 const angle=(wall.rotationDeg||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const cuts=openings.filter(o=>o.host===wall.id).map(o=>{
  const at=(o.x-wall.x)*c+(o.z-wall.z)*s+L/2;
  return{a:Math.max(0,at-o.dx/2),b:Math.min(L,at+o.dx/2),
   low:Math.max(0,o.y-o.dy/2-(wall.y-H/2)),high:Math.min(H,o.y+o.dy/2-(wall.y-H/2))};
 }).filter(o=>o.b>o.a&&o.high>o.low);
 const xs=[...new Set([0,L,...cuts.flatMap(o=>[o.a,o.b])])].sort((a,b)=>a-b),cells=[];
 for(let i=0;i<xs.length-1;i++){
  const a=xs[i],b=xs[i+1],mid=(a+b)/2;
  const intervals=cuts.filter(o=>mid>o.a-1e-7&&mid<o.b+1e-7).sort((a,b)=>a.low-b.low);
  let bottom=0;
  for(const o of intervals){
   if(o.low>bottom+1e-7)cells.push({x:(a+b)/2-L/2,y:(bottom+o.low)/2-H/2,z:0,dx:b-a,dy:o.low-bottom,dz:T});
   bottom=Math.max(bottom,o.high);
  }
  if(H>bottom+1e-7)cells.push({x:(a+b)/2-L/2,y:(bottom+H)/2-H/2,z:0,dx:b-a,dy:H-bottom,dz:T});
 }
 return{cells,openingCount:cuts.length,solidVolume:cells.reduce((v,p)=>v+p.dx*p.dy*p.dz,0),grossVolume:L*H*T};
}
