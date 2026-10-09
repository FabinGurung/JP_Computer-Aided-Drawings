/** Safe portable read-only CAD review object. No asserted BIM semantics or approval. */
export type OverlayEntity={handle:string;layer:string;kind:"LINE"|"LWPOLYLINE"|"CIRCLE"|"ARC";points_mm:number[][];closed:boolean;radius_mm?:number;start_angle_deg?:number;end_angle_deg?:number};
export type CadDxfReview={schema:"fabin-cad://dxf-review-overlay/0.1";status:"SOURCE_GEOMETRY_REVIEW_ONLY";source:{source_id:string;file_sha256:string;dxf_version:string;units:"mm";region_global_mm:number[];local_origin_global_mm:number[]};entities:OverlayEntity[];qa:{selected_count:number;by_kind:Record<string,number>;outside_region:Record<string,number>;unsupported_or_bulge:Record<string,number>;modelspace_entity_count:number;semantic_gate:"NO_AUTOMATIC_BIM_PROMOTION"}};
const finite=(x:unknown)=>typeof x==="number"&&Number.isFinite(x);
function check(condition:unknown,msg:string):asserts condition{if(!condition)throw Error("DXF review rejected: "+msg);}
export function validateDxfReview(raw:unknown):CadDxfReview{
 check(raw&&typeof raw==="object","not a JSON object");
 const data=raw as Partial<CadDxfReview>;
 check(data.schema==="fabin-cad://dxf-review-overlay/0.1"&&data.status==="SOURCE_GEOMETRY_REVIEW_ONLY","not a DXF review package");
 const src=data.source;
 check(src?.units==="mm"&&typeof src.source_id==="string"&&/^[A-Za-z0-9_-]{3,80}$/.test(src.source_id),"invalid identity/units");
 check(typeof src.file_sha256==="string"&&/^[0-9a-f]{64}$/.test(src.file_sha256),"missing source SHA-256");
 check(Array.isArray(src.region_global_mm)&&src.region_global_mm.length===4&&src.region_global_mm.every(finite),"invalid source region");
 check(Array.isArray(src.local_origin_global_mm)&&src.local_origin_global_mm.length===2&&src.local_origin_global_mm.every(finite),"invalid source origin");
 check(Array.isArray(data.entities)&&data.entities.length<=20000,"too many elements");
 const handles=new Set<string>();
 for(const e of data.entities){
  check(e&&typeof e.handle==="string"&&/^[0-9a-fA-F]{1,24}$/.test(e.handle)&&!handles.has(e.handle),"invalid/duplicate DXF handle");
  handles.add(e.handle);
  check(typeof e.layer==="string"&&e.layer.length>0&&e.layer.length<=160,"invalid layer");
  check(["LINE","LWPOLYLINE","CIRCLE","ARC"].includes(e.kind),"unsupported DXF entity type");
  check(Array.isArray(e.points_mm)&&e.points_mm.length>=1&&e.points_mm.length<=2000,"invalid point list");
  check(e.points_mm.every(p=>Array.isArray(p)&&p.length===2&&p.every(x=>finite(x)&&Math.abs(x)<1000000)),"invalid XY coordinate");
  check(typeof e.closed==="boolean","invalid closed flag");
  if(e.kind==="LINE")check(e.points_mm.length===2&&!e.closed,"LINE requires two endpoints");
  if(e.kind==="LWPOLYLINE")check(e.points_mm.length>=2,"LWPOLYLINE requires two or more points");
  if(["ARC","CIRCLE"].includes(e.kind)){
   check(e.points_mm.length===1&&finite(e.radius_mm)&&e.radius_mm>0&&e.radius_mm<=200000,"invalid radius or centre");
   if(e.kind==="ARC")check(finite(e.start_angle_deg)&&finite(e.end_angle_deg),"missing arc angles");
  }
 }
 check(data.qa?.selected_count===data.entities.length&&data.qa.semantic_gate==="NO_AUTOMATIC_BIM_PROMOTION","integrity/authority status mismatch");
 return structuredClone(data as CadDxfReview);
}
