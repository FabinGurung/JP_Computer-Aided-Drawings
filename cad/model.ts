export type ElementKind = "slab"|"footing"|"wall"|"column"|"beam";
export type CadElement = {id:string;kind:ElementKind;level:string;x_mm:number;y_mm:number;z_mm:number;length_mm:number;width_mm:number;height_mm:number;material?:string};
export type CenterTopLink = {id:string;kind:"center_on_top";parent_id:string;child_id:string;offset_x_mm?:number;offset_y_mm?:number;offset_z_mm?:number};
export type SpanLink = {id:string;kind:"span_columns_x";from_id:string;to_id:string;child_id:string;offset_y_mm?:number;offset_z_mm?:number};
export type CadLink = CenterTopLink|SpanLink;
export type CadModel = {schema:"fabin-cad://canonical-boxes/0.1";project_id:string;units:"mm";authority:"DEMO_ONLY"|"DRAFT";elements:CadElement[];links?:CadLink[]};
export function validate(raw:unknown):CadModel {
 if(!raw||typeof raw!=="object")throw Error("Model must be an object");
 const o=raw as Partial<CadModel>;
 if(o.schema!=="fabin-cad://canonical-boxes/0.1"||o.units!=="mm"||!Array.isArray(o.elements)||!o.project_id)throw Error("Unsupported CAD model schema");
 if(o.authority!=="DEMO_ONLY"&&o.authority!=="DRAFT")throw Error("Draft-only policy required");
 const ids=new Set<string>();const types=["slab","footing","wall","column","beam"];
 for(const e of o.elements){
  if(!e||typeof e.id!=="string"||!/^[-A-Z0-9_]{3,80}$/.test(e.id)||ids.has(e.id))throw Error("Invalid or duplicate element ID");
  ids.add(e.id);if(!types.includes(e.kind)||!e.level)throw Error("Unsupported element type or level");
  for(const k of ["x_mm","y_mm","z_mm","length_mm","width_mm","height_mm"] as const){
   const value=e[k];if(!Number.isFinite(value)||(k.includes("length")||k.includes("width")||k.includes("height")?value<=0:Math.abs(value)>1e6))throw Error("Invalid dimension "+e.id+"."+k);
  }
 }
 if(o.links!==undefined){
  if(!Array.isArray(o.links))throw Error("links must be an array");
  const links=new Set<string>(),childLinks=new Set<string>();
  for(const link of o.links){
   if(!link||typeof link.id!=="string"||!/^[-A-Z0-9_]{3,80}$/.test(link.id)||links.has(link.id))throw Error("Invalid or duplicate link ID");
   links.add(link.id);
   if(!ids.has(link.child_id)||childLinks.has(link.child_id))throw Error("Missing or duplicate driven element "+link.child_id);
   childLinks.add(link.child_id);
   const refs=link.kind==="center_on_top"?[link.parent_id]:link.kind==="span_columns_x"?[link.from_id,link.to_id]:null;
   if(!refs||refs.some(id=>!ids.has(id)||id===link.child_id))throw Error("Invalid link dependencies "+link.id);
   for(const field of ["offset_x_mm","offset_y_mm","offset_z_mm"] as const){
    const value=(link as CenterTopLink)[field];
    if(value!==undefined&&(!Number.isFinite(value)||Math.abs(value)>1e6))throw Error("Invalid link offset "+field);
   }
  }
 }
 return structuredClone(o as CadModel);
}
export function encode(model:CadModel):string{return JSON.stringify(validate(model),null,2)+"\n";}
