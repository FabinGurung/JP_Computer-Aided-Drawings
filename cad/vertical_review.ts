/** M06: independent vertical observations. A provisional source-referenced 3D overlay is
 * intentionally NOT a promoted structural model or approved vertical design.
 */
import type {SemanticReview} from "./semantic_review";
export type SourceRef={id:string;record_id:string;kind:"SECTION"|"ELEVATION"|"SURVEY"|"OTHER";review:"USER_REVIEWED_NOT_AUTHORIZED"};
export type VerticalLevel={id:string;z_mm:number|null;source_ids:string[]};
export type VerticalSegment={grid:string;from_level:string;to_level:string;source_ids:string[]};
export type VerticalInput={schema:"fabin-cad://vertical-observations/0.1";status:"PROVISIONAL_NOT_FIELD_ISSUED";
 project_id:string;plan_source_sha256:string;plan_layout_sha256:string;
 datum_label:string;vertical_sources:SourceRef[];levels:VerticalLevel[];segments:VerticalSegment[];
};
export type ResolvedVertical={data:VerticalInput;solids:{grid:string;bottom_mm:number;top_mm:number;height_mm:number;shape:"circular"|"rectangular";x_mm:number;y_mm:number;width_mm:number;depth_mm:number;source_handle:string}[]};
function requireValue(condition:unknown,reason:string):asserts condition{if(!condition)throw Error("M06 vertical rejected: "+reason);}
const finite=(x:unknown):x is number=>typeof x==="number"&&Number.isFinite(x);
const ident=(x:unknown)=>typeof x==="string"&&/^[A-Za-z0-9_-]{2,80}$/.test(x);
const uniq=(xs:string[])=>new Set(xs).size===xs.length;
function isStringArray(x:unknown):x is string[]{return Array.isArray(x)&&x.every(s=>typeof s==="string");}
export function verticalTemplate(plan:SemanticReview):VerticalInput{
 return {schema:"fabin-cad://vertical-observations/0.1",status:"PROVISIONAL_NOT_FIELD_ISSUED",
  project_id:plan.project_id,plan_source_sha256:plan.source.file_sha256,plan_layout_sha256:plan.source.layout_sha256,
  datum_label:"UNVERIFIED_LOCAL_DATUM",vertical_sources:[],
  levels:[{id:"BASE",z_mm:null,source_ids:[]},{id:"L01",z_mm:null,source_ids:[]}],
  segments:plan.columns.map(c=>({grid:c.grid,from_level:"BASE",to_level:"L01",source_ids:[]}))};
}
export function resolveVertical(raw:unknown,plan:SemanticReview):ResolvedVertical{
 requireValue(raw&&typeof raw==="object"&&!Array.isArray(raw),"JSON object");
 const data=raw as Partial<VerticalInput>;
 requireValue(data.schema==="fabin-cad://vertical-observations/0.1"&&data.status==="PROVISIONAL_NOT_FIELD_ISSUED","input schema/status");
 requireValue(data.project_id===plan.project_id&&data.plan_source_sha256===plan.source.file_sha256&&data.plan_layout_sha256===plan.source.layout_sha256,"project ID/source revision mismatch");
 requireValue(typeof data.datum_label==="string"&&data.datum_label.length>0&&data.datum_label.length<=120,"datum label");
 requireValue(Array.isArray(data.vertical_sources)&&data.vertical_sources.length<=500,"source list");
 const sourceSet=new Set<string>();
 for(const s of data.vertical_sources){
  requireValue(s&&ident(s.id)&&!sourceSet.has(s.id),"duplicate source ID");
  requireValue(typeof s.record_id==="string"&&s.record_id.length>0&&s.record_id.length<=200
   &&!/https?:\/\/|[?#]|\.\.|[\\/]/i.test(s.record_id),"source must be an opaque indexed record ID, not URL/path");
  requireValue(["SECTION","ELEVATION","SURVEY","OTHER"].includes(s.kind)&&s.review==="USER_REVIEWED_NOT_AUTHORIZED","source review must be explicit and non-authoritative");
  sourceSet.add(s.id);
 }
 requireValue(Array.isArray(data.levels)&&data.levels.length>=2&&data.levels.length<=100,"levels list");
 const levelSet=new Map<string,VerticalLevel>();
 for(const l of data.levels){
  requireValue(l&&ident(l.id)&&!levelSet.has(l.id),"duplicate/invalid level");
  requireValue(finite(l.z_mm)&&l.z_mm>=-20000&&l.z_mm<=200000,"vertical coordinate unavailable or out of bounds");
  requireValue(isStringArray(l.source_ids)&&l.source_ids.length>0&&uniq(l.source_ids)&&l.source_ids.every(id=>sourceSet.has(id)),"levels need reviewed source identifiers");
  levelSet.set(l.id,l);
 }
 requireValue(Array.isArray(data.segments)&&data.segments.length>0&&data.segments.length<=2000,"column vertical segments");
 const planCols=new Map(plan.columns.map(c=>[c.grid,c]));
 const seen=new Set<string>(),intervals=new Map<string,{a:number;b:number}[]>();
 const solids:ResolvedVertical["solids"]=[];
 for(const segment of data.segments){
  requireValue(segment&&planCols.has(segment.grid)&&levelSet.has(segment.from_level)&&levelSet.has(segment.to_level)&&segment.from_level!==segment.to_level,"segment reference");
  const id=segment.grid+"/"+segment.from_level+"/"+segment.to_level;
  requireValue(!seen.has(id),"duplicate segment");seen.add(id);
  requireValue(isStringArray(segment.source_ids)&&segment.source_ids.length>0&&uniq(segment.source_ids)&&segment.source_ids.every(s=>sourceSet.has(s)),"segment source IDs");
  const lower=levelSet.get(segment.from_level)!.z_mm as number,upper=levelSet.get(segment.to_level)!.z_mm as number;
  requireValue(upper>lower&&upper-lower>=100&&upper-lower<=20000,"segment height positive 100..20,000mm");
  const previous=intervals.get(segment.grid)||[];
  requireValue(!previous.some(r=>lower<r.b&&upper>r.a),"overlapping vertical intervals for same column");
  previous.push({a:lower,b:upper});intervals.set(segment.grid,previous);
  const c=planCols.get(segment.grid)!;
  solids.push({grid:c.grid,bottom_mm:lower,top_mm:upper,height_mm:upper-lower,shape:c.shape,
    x_mm:c.x_mm,y_mm:c.y_mm,width_mm:c.width_mm,depth_mm:c.depth_mm,source_handle:c.source_handle});
 }
 requireValue(plan.qa.semantic_promotion==="BLOCKED"&&plan.qa.construction_gate==="NOT_FIELD_ISSUED","source geometry authority changed");
 return {data:structuredClone(data as VerticalInput),solids};
}
