export type ElementKind = "slab"|"footing"|"wall"|"column"|"beam";
export type CadElement = {id:string;kind:ElementKind;level:string;x_mm:number;y_mm:number;z_mm:number;length_mm:number;width_mm:number;height_mm:number;material?:string};
export type CadModel = {schema:"fabin-cad://canonical-boxes/0.1";project_id:string;units:"mm";authority:"DEMO_ONLY"|"DRAFT";elements:CadElement[]};
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
    if(!Number.isFinite(e[k])||(k.includes("length")||k.includes("width")||k.includes("height")?e[k]<=0:Math.abs(e[k])>1e6))throw Error("Invalid dimension "+e.id+"."+k);
  }
 }
 return structuredClone(o as CadModel);
}
export function encode(model:CadModel):string {return JSON.stringify(validate(model),null,2)+"\n";}
