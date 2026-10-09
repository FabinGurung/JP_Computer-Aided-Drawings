/** Pure deterministic M02 dependency resolver: boxes are authored once, their placements are derived. */
import {validate,type CadModel,type CadElement,type CadLink} from "./model";
export function linkFor(model:CadModel,child_id:string):CadLink|undefined{return model.links?.find(l=>l.child_id===child_id);}
export function resolveModel(raw:CadModel):CadModel{
 const model=validate(raw),byId=new Map(model.elements.map(e=>[e.id,e])),byChild=new Map((model.links||[]).map(link=>[link.child_id,link]));
 const visiting=new Set<string>(),done=new Set<string>();
 function solve(id:string):CadElement {
  const child=byId.get(id);if(!child)throw Error("Unresolved element "+id);
  if(done.has(id))return child;
  if(visiting.has(id))throw Error("Dependency cycle at "+id);
  visiting.add(id);
  const link=byChild.get(id);
  if(link?.kind==="center_on_top"){
   const p=solve(link.parent_id);
   child.x_mm=p.x_mm+(p.length_mm-child.length_mm)/2+(link.offset_x_mm||0);
   child.y_mm=p.y_mm+(p.width_mm-child.width_mm)/2+(link.offset_y_mm||0);
   child.z_mm=p.z_mm+p.height_mm+(link.offset_z_mm||0);
  }else if(link?.kind==="span_columns_x"){
   const a=solve(link.from_id),b=solve(link.to_id);
   if(a.kind!=="column"||b.kind!=="column"||child.kind!=="beam")throw Error("Span requires columns and beam");
   const ax=a.x_mm+a.length_mm/2,bx=b.x_mm+b.length_mm/2;
   const ay=a.y_mm+a.width_mm/2,by=b.y_mm+b.width_mm/2;
   if(bx-ax<=50||Math.abs(ay-by)>200)throw Error("Span supports are misaligned or reversed");
   child.x_mm=ax;child.length_mm=bx-ax;
   child.y_mm=(ay+by)/2-child.width_mm/2+(link.offset_y_mm||0);
   child.z_mm=Math.min(a.z_mm+a.height_mm,b.z_mm+b.height_mm)-child.height_mm+(link.offset_z_mm||0);
  }
  visiting.delete(id);done.add(id);return child;
 }
 for(const e of model.elements)solve(e.id);
 return model;
}
export type SectionAxis="x"|"y";
export type SectionFace={element_id:string;kind:CadElement["kind"];x0_mm:number;x1_mm:number;z0_mm:number;z1_mm:number};
export function sectionFaces(raw:CadModel,axis:SectionAxis,offset_mm:number):SectionFace[]{
 if(!Number.isFinite(offset_mm))throw Error("Invalid section cut position");
 const {elements}=resolveModel(raw);
 return elements.flatMap(e=>{
  const cut=axis==="x"?e.x_mm:e.y_mm,size=axis==="x"?e.length_mm:e.width_mm;
  if(offset_mm<cut||offset_mm>cut+size)return [];
  const start=axis==="x"?e.y_mm:e.x_mm,extent=axis==="x"?e.width_mm:e.length_mm;
  return [{element_id:e.id,kind:e.kind,x0_mm:start,x1_mm:start+extent,z0_mm:e.z_mm,z1_mm:e.z_mm+e.height_mm}];
 });
}
