/* M29 — native, read-only architectural DXF edge vs modeled wall audit and
 * ground-floor source-column projection into existing upper-storey plan envelopes.
 * Provenance is partial DXF extraction. Projections are NOT upper-storey columns.
 * Distances compare original wall EDGE midpoints to modeled wall CENTRELINES;
 * neither the median nor the overlay is surveying/control-point registration.
 */
const rounded=n=>Math.round(n*1e6)/1e6;
const finite=(n,where)=>{if(!Number.isFinite(n))throw Error("M29 nonfinite "+where);return n;};
const toWorld=(p,t)=>{const a=(t.rotationDeg||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return{x:p.x*c-p.z*s+t.x,z:p.x*s+p.z*c+t.z};};
const segDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;if(den<1e-12)return Math.hypot(p.x-a.x,p.z-a.z);const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/den));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);};
const pointInPolygon=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a.z>p.z)!==(b.z>p.z))&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)hit=!hit;}return hit;};
function floorEdges(model,level){
 const g=model.floorGraph,nodes=new Map(g.nodes.map(n=>[n.id,toWorld(n,level.transform)]));
 return g.walls.map(w=>({id:w.id,a:nodes.get(w.a),b:nodes.get(w.b)}));
}
function perimeter(model,level){
 const g=model.floorGraph,nodes=new Map(g.nodes.map(n=>[n.id,toWorld(n,level.transform)])),
 walls=new Map(g.walls.map(w=>[w.id,w])),first=walls.get(g.perimeter[0]);
 if(!first)throw Error("M29 missing first perimeter wall");
 let cursor=first.a;
 const shape=g.perimeter.map(id=>{const w=walls.get(id),p=nodes.get(cursor);
  if(!w||!p)throw Error("M29 open perimeter "+id);
  cursor=w.a===cursor?w.b:w.b===cursor?w.a:null;
  return p;
 });
 if(cursor!==first.a)throw Error("M29 perimeter fails to close "+level.id);
 return shape;
}
export function deriveM29DatumEvidence(raw,manifest,models,review){
 if(raw?.schema!=="jp-cad://aad-source-gf-review/1"||
    manifest?.projectId!==raw.projectId||review?.projectId!==raw.projectId||
    !review.elements||!models?.gf||manifest.levels?.[0]?.id!=="gf")
   throw Error("M29 source or project mismatch");
 const origin=raw.registration?.originArchitecturalMM;
 if(raw.registration.units!=="source-mm"||raw.registration.scale!==1||
    raw.registration.rotationDeg!==0||!origin)throw Error("M29 unsupported DXF coordinate transform");
 const ax=(x,y)=>({x:rounded((finite(x,"arch x")-origin.x)/1000),
                    z:rounded((origin.y-finite(y,"arch y"))/1000)});
 const sourceSegments=[];
 for(const [id,x1,y1,x2,y2] of raw.architectureLines){
  sourceSegments.push({id:"LINE:"+id,handle:id,sourceType:"LINE",a:ax(x1,y1),b:ax(x2,y2)});
 }
 for(const [handle,points] of raw.architecturePolylines||[]){
  for(let i=0;i<points.length-1;i++)sourceSegments.push({
   id:"LWPOLYLINE:"+handle+":"+i,handle,sourceType:"LWPOLYLINE",
   a:ax(...points[i]),b:ax(...points[i+1])
  });
 }
 if(sourceSegments.length!==74||raw.architectureLines.length!==32)
  throw Error("M29 partial architectural DXF source count drift");
 const walls=floorEdges(models.gf,manifest.levels[0]);
 const evidence=sourceSegments.map(s=>{
  const p={x:(s.a.x+s.b.x)/2,z:(s.a.z+s.b.z)/2};
  const matches=walls.map(w=>({id:w.id,distanceM:segDistance(p,w.a,w.b)}))
   .sort((a,b)=>a.distanceM-b.distanceM);
  const best=matches[0];
  if(!best)throw Error("M29 no modeled walls");
  return {...s,nearestModeledWallId:best.id,
   midpointToWallCenterlineM:rounded(best.distanceM)};
 });
 const distances=evidence.map(s=>s.midpointToWallCenterlineM).sort((a,b)=>a-b);
 const nth=q=>distances[Math.floor(q*(distances.length-1))];
 const columns=review.elements.filter(e=>e.kind==="column"&&e.level==="gf");
 if(columns.length!==23)throw Error("M29 requires the 23 owner-reviewed GF source columns");
 const projection=manifest.levels.slice(1).map(l=>{
  const poly=perimeter(models[l.id],l);
  const elements=columns.map(c=>({
   sourceElementId:c.id,grid:c.provenance.grid,x:c.x,z:c.z,
   insideArchitecturalEnvelope:pointInPolygon(c,poly),
   status:"2D_PROJECTION_ONLY_NOT_A_SOURCE_UPPER_COLUMN"
  }));
  return {level:l.id,elevationM:l.elevation,sourcePlanTransform:{...l.transform},
    projectedCount:elements.length,withinFootprint:elements.filter(c=>c.insideArchitecturalEnvelope).length,
    outsideFootprint:elements.filter(c=>!c.insideArchitecturalEnvelope).length,elements};
 });
 return {schema:"jp-cad://aad-m29-partial-dxf-datum-projection/1",
  projectId:manifest.projectId,reviewOnly:true,constructionApproval:false,
  limits:[
   "Partial architectural DXF edge sample: 32 LINE plus 42 LWPOLYLINE edges (12 source polylines), not a complete architectural graph.",
   "Nearest modeled wall CENTRELINE vs source DXF wall EDGE midpoint distances are not signed errors or common survey-control registration.",
   "FF/SF polygon transforms are original area-calibrated draft assumptions; source columns projected through them are NOT real upper-storey columns or design load paths.",
   "Do not modify DXF, frozen M70/M60/M40/V03, upper-storey structure, IFC member counts or construction approval."
  ],
  summary:{
   sourceEdgeCount:sourceSegments.length,sourceLineCount:raw.architectureLines.length,
   sourcePolylineCount:raw.architecturePolylines.length,sourcePolylineEdges:sourceSegments.length-raw.architectureLines.length,
   modeledGFWallCenterlines:walls.length,nearestWallMidpointDistanceM:{
    min:rounded(distances[0]),p50:rounded(nth(.5)),p90:rounded(nth(.9)),
    max:rounded(distances[distances.length-1]),within150mm:distances.filter(x=>x<=.15).length,
    within300mm:distances.filter(x=>x<=.3).length,over1m:distances.filter(x=>x>1).length
   },
   upperFloorProjections:projection.map(p=>({level:p.level,withinFootprint:p.withinFootprint,
    outsideFootprint:p.outsideFootprint,sourceColumnCount:p.projectedCount}))
  },
  sourceSegments:evidence,upperFloorProjections:projection};
}
