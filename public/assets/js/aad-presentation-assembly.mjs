/* Source-owned visual coordination layer; reusable for any project manifest.
 * Inference is explicit per object. Structural display proxies are never
 * exported as designed IfcColumns. No fallback member grid is fabricated. */
export function presentationElements(manifest,levels){
 const p=manifest.presentation;if(!p)return[];
 const allowed=new Set(['floor','roof','furniture','fixture','column','stair','landing','guard','site','landscape','auxiliary']);
 const seen=new Set(),ids=new Set(levels.map(l=>l.id));
 return(p.elements||[]).map(e=>{
  if(!e.id||seen.has(e.id)||!ids.has(e.level)||!allowed.has(e.kind))throw Error('Invalid presentation object '+e.id);
  seen.add(e.id);
  if(!e.status||!e.source||!e.provenance?.basis)throw Error('Missing presentation provenance '+e.id);
  for(const v of [e.x,e.y,e.z,e.dx,e.dy,e.dz])if(!Number.isFinite(v))throw Error('Non-finite presentation geometry '+e.id);
  if(Math.min(e.dx,e.dy,e.dz)<=0)throw Error('Nonpositive presentation envelope '+e.id);
  for(const part of e.parts||[])if(![part.x,part.y,part.z,part.dx,part.dy,part.dz].every(Number.isFinite)||Math.min(part.dx,part.dy,part.dz)<=0)throw Error('Invalid presentation part '+e.id);
  const structural=['column','guard'].includes(e.kind);
  if(structural&&e.ifcType!=='IfcBuildingElementProxy')throw Error('Unverified coordination objects must be IFC proxies');
  const result={rotationDeg:0,profile:null,holes:[],steps:null,host:null,...e,id:manifest.projectId+':'+e.level+':'+e.id};
  if(e.parts?.length){
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],ry=-(e.rotationDeg||0)*Math.PI/180;
   for(const part of e.parts){
    const a=(part.rotationZ||0)*Math.PI/180;
    for(const x of [-part.dx/2,part.dx/2])for(const y of [-part.dy/2,part.dy/2])for(const z of [-part.dz/2,part.dz/2]){
     const xx=x*Math.cos(a)-y*Math.sin(a),yy=x*Math.sin(a)+y*Math.cos(a);
     const point=[part.x+xx*Math.cos(ry)+z*Math.sin(ry),part.y+yy,part.z-xx*Math.sin(ry)+z*Math.cos(ry)];
     for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],point[i]);hi[i]=Math.max(hi[i],point[i]);}
    }
   }
   result.declaredEnvelope={x:e.x,y:e.y,z:e.z,dx:e.dx,dy:e.dy,dz:e.dz};
   for(const[i,axis]of ['x','y','z'].entries()){result[axis]=Math.round((lo[i]+hi[i])/2*1e6)/1e6;result['d'+axis]=Math.round((hi[i]-lo[i])*1e6)/1e6;}
  }
  return result;
 });
}
