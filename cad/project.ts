import {validate,type CadModel,type CadElement} from "./model";
import {resolveModel} from "./parametrics";

/** Public-neutral new project interchange. Source records are pointers, never file contents or credentials. */
export type CadProjectKind="residential"|"commercial"|"institutional"|"other";
export type SourceKind="IFC"|"DXF"|"DWG"|"PDF"|"SURVEY"|"OTHER";
export type Verification="UNVERIFIED"|"CHECKED";
export type ProjectSource={source_id:string;kind:SourceKind;external_record_id:string;verification:Verification};
export type ElementSemantic={element_id:string;discipline:"STRUCTURAL"|"ARCHITECTURAL";description:string;source_ids:string[];verification:Verification};
export type Level={id:string;elevation_mm:number};
export type ProjectPackage={
 schema:"fabin-cad://project-package/0.1";
 project:{id:string;name:string;kind:CadProjectKind;revision:string;coordinate_system:"LOCAL_CARTESIAN";units:"mm";datum_label:string};
 levels:Level[];
 source_refs:ProjectSource[];
 element_semantics:ElementSemantic[];
 model:CadModel;
};
const idPattern=/^[A-Z0-9][A-Z0-9_-]{2,63}$/;
const levelPattern=/^[A-Z0-9][A-Z0-9_-]{0,63}$/;
const string=(s:unknown,max=150)=>typeof s==="string"&&s.trim().length>0&&s.trim().length<=max;
function assert(test:unknown,message:string):asserts test {if(!test)throw Error("Project input rejected: "+message);}
export function validatePackage(raw:unknown):ProjectPackage{
 assert(raw&&typeof raw==="object","missing JSON object");
 const p=raw as Partial<ProjectPackage>;
 assert(p.schema==="fabin-cad://project-package/0.1","unsupported package version");
 const info=p.project;
 assert(info&&idPattern.test(info.id),"invalid stable project ID");
 assert(string(info.name)&&string(info.revision,60)&&string(info.datum_label,100),"missing project metadata");
 assert(["residential","commercial","institutional","other"].includes(info.kind),"invalid project kind");
 assert(info.units==="mm"&&info.coordinate_system==="LOCAL_CARTESIAN","only millimetre local Cartesian supported");
 assert(Array.isArray(p.levels)&&p.levels.length>0&&p.levels.length<=100,"invalid level count");
 const ids=new Set<string>();
 for(const level of p.levels){assert(level&&levelPattern.test(level.id)&&!ids.has(level.id)&&Number.isFinite(level.elevation_mm),"invalid or duplicate level");ids.add(level.id);}
 assert(Array.isArray(p.source_refs)&&p.source_refs.length<=500,"invalid source references");
 const sources=new Set<string>();
 for(const ref of p.source_refs){
  assert(ref&&idPattern.test(ref.source_id)&&!sources.has(ref.source_id),"invalid or repeated source ID");
  assert(["IFC","DXF","DWG","PDF","SURVEY","OTHER"].includes(ref.kind),"invalid source type");
  assert(string(ref.external_record_id,200)&&!/(https?:\/\/|[?#]|\.\.)/i.test(ref.external_record_id),"source must be stable opaque record ID, not URL or path");
  assert(["UNVERIFIED","CHECKED"].includes(ref.verification),"invalid source verification");
  sources.add(ref.source_id);
 }
 const model=validate(p.model);
 assert(model.project_id===info.id,"model/project ID mismatch");
 resolveModel(model); // Reject invalid dependency graphs before opening.
 for(const e of model.elements)assert(ids.has(e.level),"element level not declared: "+e.id);
 assert(Array.isArray(p.element_semantics)&&p.element_semantics.length<=model.elements.length,"invalid semantic annotations");
 const elements=new Set(model.elements.map(e=>e.id)),annotations=new Set<string>();
 for(const s of p.element_semantics){
  assert(s&&elements.has(s.element_id)&&!annotations.has(s.element_id),"annotation refers to unknown/duplicate element");
  assert(["STRUCTURAL","ARCHITECTURAL"].includes(s.discipline)&&string(s.description,240),"invalid semantic meaning");
  assert(["UNVERIFIED","CHECKED"].includes(s.verification)&&Array.isArray(s.source_ids),"invalid verification or source IDs");
  assert(s.source_ids.every(id=>sources.has(id)),"dangling source reference");
  annotations.add(s.element_id);
 }
 return structuredClone(p as ProjectPackage);
}

export type StarterInput={id:string;name:string;kind:CadProjectKind;length_mm:number;width_mm:number;storey_height_mm:number};
function element(id:string,kind:CadElement["kind"],level:string,x:number,y:number,z:number,l:number,w:number,h:number):CadElement{
 return {id,kind,level,x_mm:x,y_mm:y,z_mm:z,length_mm:l,width_mm:w,height_mm:h,material:"demonstration-only"};
}
export function createFrameStarter(input:StarterInput):ProjectPackage{
 assert(idPattern.test(input.id),"use 3–64 uppercase letters/digits/hyphens for project ID");
 assert(string(input.name)&&input.name.length<=120,"project name required");
 assert(["residential","commercial","institutional","other"].includes(input.kind),"invalid project category");
 const {length_mm:L,width_mm:W,storey_height_mm:H}=input;
 assert(Number.isFinite(L)&&L>=5000&&L<=60000&&Number.isFinite(W)&&W>=4000&&W<=40000,"plan dimensions outside M03 starter range");
 assert(Number.isFinite(H)&&H>=2400&&H<=7000,"storey height outside M03 range");
 const pad=600,foot=1200,col=350;
 const aX=pad,aY=pad,bX=L-pad-foot;
 const elements=[
  element("SLAB_GF","slab","GF",0,0,-200,L,W,200),
  element("FOOT_A","footing","FOUNDATION",aX,aY,-700,foot,foot,500),
  element("FOOT_B","footing","FOUNDATION",bX,aY,-700,foot,foot,500),
  element("COL_A","column","GF",aX+425,aY+425,-200,col,col,H),
  element("COL_B","column","GF",bX+425,aY+425,-200,col,col,H),
  element("BEAM_A_B","beam","ROOF",0,0,H-400,L,300,400)
 ];
 const model:CadModel={schema:"fabin-cad://canonical-boxes/0.1",project_id:input.id,units:"mm",authority:"DRAFT",elements,links:[
  {id:"HOST_COL_A",kind:"center_on_top",parent_id:"FOOT_A",child_id:"COL_A",offset_z_mm:0},
  {id:"HOST_COL_B",kind:"center_on_top",parent_id:"FOOT_B",child_id:"COL_B",offset_z_mm:0},
  {id:"BEAM_BETWEEN_COLS",kind:"span_columns_x",from_id:"COL_A",to_id:"COL_B",child_id:"BEAM_A_B"}
 ]};
 const project:ProjectPackage={schema:"fabin-cad://project-package/0.1",
  project:{id:input.id,name:input.name,kind:input.kind,revision:"DRAFT-0001",coordinate_system:"LOCAL_CARTESIAN",units:"mm",datum_label:"LOCAL_ORIGIN_UNVERIFIED"},
  levels:[{id:"FOUNDATION",elevation_mm:-700},{id:"GF",elevation_mm:0},{id:"ROOF",elevation_mm:H}],
  source_refs:[],element_semantics:elements.map(e=>({element_id:e.id,discipline:"STRUCTURAL",description:e.kind+" · starter geometry only",source_ids:[],verification:"UNVERIFIED"})),model};
 return validatePackage(project);
}
export function packageFromModel(model:CadModel,name="Imported canonical draft"):ProjectPackage{
 const checked=validate(model);
 const levels=[...new Set(checked.elements.map(e=>e.level))].map(id=>({id,elevation_mm:0}));
 const pkg:ProjectPackage={schema:"fabin-cad://project-package/0.1",
  project:{id:checked.project_id,name,kind:"other",revision:"DRAFT-IMPORT",coordinate_system:"LOCAL_CARTESIAN",units:"mm",datum_label:"LOCAL_ORIGIN_UNVERIFIED"},
  levels,source_refs:[],element_semantics:checked.elements.map(e=>({element_id:e.id,discipline:"STRUCTURAL",description:e.kind+" · imported geometry, semantics unverified",source_ids:[],verification:"UNVERIFIED"})),
  model:checked};
 return validatePackage(pkg);
}
export function encodePackage(pkg:ProjectPackage):string{return JSON.stringify(validatePackage(pkg),null,2)+"\n";}
