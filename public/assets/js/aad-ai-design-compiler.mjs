/* AAD AI-authoring adapter · pure deterministic machine-readable design compiler.
 *
 * ChatGPT or any AI authors an explicit design spec, never a GitHub-hosted LLM.
 * The compiler creates project-only manifests and linked floor graphs; the
 * same shared AAD engine performs all 2D/3D/IFC authoring and validation.
 */
import {addConnectedWall,addHostedOpening} from "./aad-topology.mjs";
import {assembleBuilding,verifyAssembly} from "./aad-building-core.mjs";
import {writeIFC4,checkIfcReferences} from "./aad-building-ifc4.mjs";
import {checkAADAuthoring,normalizeAADComponentEvidence} from "./aad-ai-authoring-qa.mjs";
import {checkAADArchitecturalConstraints} from "./aad-ai-spatial-qa.mjs";
const round=n=>Math.round(n*1000)/1000;
const finite=(n,k)=>{if(typeof n!=="number"||!Number.isFinite(n))throw Error(k+" must be a finite number");return n;};
const positive=(n,k)=>{finite(n,k);if(n<=0)throw Error(k+" must be positive");return n;};
const word=(v,k,max=140)=>{if(typeof v!=="string"||!v.trim()||v.length>max)throw Error("Invalid "+k);return v.trim();};
const array=(a,k,min=0,max=200)=>{if(!Array.isArray(a)||a.length<min||a.length>max)throw Error(k+" expects "+min+"–"+max+" entries");return a;};
const coord=(p,k)=>{array(p,k,2,2);const x=finite(p[0],k+" X"),z=finite(p[1],k+" Z");
 if(Math.abs(x)>80||Math.abs(z)>80)throw Error(k+" outside 80m local AAD draft bounds");return{x:round(x),z:round(z)};
};
const length=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const det=(a,b)=>a.x*b.z-a.z*b.x;
const vec=(a,b)=>({x:b.x-a.x,z:b.z-a.z});
const signed=pts=>pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+det(p,q);},0)/2;
const intersect=(a,b,c,d)=>{
 const ab=vec(a,b),cd=vec(c,d),den=det(ab,cd),ca=vec(a,c);
 if(Math.abs(den)<1e-9){if(Math.abs(det(ca,ab))>1e-8)return false;
  const tc=((c.x-a.x)*ab.x+(c.z-a.z)*ab.z)/(length(a,b)**2);
  const td=((d.x-a.x)*ab.x+(d.z-a.z)*ab.z)/(length(a,b)**2);
  return Math.max(0,Math.min(tc,td))<Math.min(1,Math.max(tc,td))-1e-7;}
 const t=det(ca,cd)/den,u=det(ca,ab)/den;
 return t>1e-6&&t<1-1e-6&&u>1e-6&&u<1-1e-6;
};
const normalizeOutline=(raw,label)=>{
 const pts=array(raw,label,3,80).map((p,i)=>coord(p,label+"["+i+"]"));
 if(pts.length>3&&length(pts[0],pts.at(-1))<.001)pts.pop(); // tolerate explicit closure
 if(pts.length<3)throw Error("Outline needs 3 distinct points");
 for(let i=0;i<pts.length;i++)if(length(pts[i],pts[(i+1)%pts.length])<.25)
  throw Error("Degenerate outline edge "+label+"/"+i);
 for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
  if(j===i+1||(i===0&&j===pts.length-1))continue;
  if(intersect(pts[i],pts[(i+1)%pts.length],pts[j],pts[(j+1)%pts.length]))
   throw Error("Self-intersecting or overlapping perimeter on "+label);
 }
 const area=signed(pts);if(area<1)throw Error("Outline must be counterclockwise and area >=1m2");
 return{pts,area:round(area)};
};
function makeFloor(level){
 const outline=normalizeOutline(level.outline,"outline "+level.id);
 const id=n=>String(n+1).padStart(2,"0");
 const nodes=outline.pts.map((p,i)=>({id:"N"+id(i),x:p.x,z:p.z}));
 const walls=nodes.map((p,i)=>({id:"EXT-"+id(i),a:p.id,b:nodes[(i+1)%nodes.length].id,
  thickness:round(positive(level.exteriorWallThickness??.23,"exteriorWallThickness")),
  source:"AI_GENERATED_FROM_APPROVED_DESIGN_SPEC",status:"CONCEPTUAL_NOT_SOURCE_MEASURED"}));
 const graph={nodes,walls,perimeter:walls.map(w=>w.id),openings:[],labels:{}};
 const aliases=new Map(walls.map(w=>[w.id,[w.id]]));
 const openingIds=[];
 for(const [i,item] of array(level.partitions||[],"partitions "+level.id,0,140).entries()){
  const key=word(item.id||"partition-"+(i+1),"partition id",60);
  if(aliases.has(key))throw Error("Duplicate wall alias "+key);
  const before={start:coord(item.start,key+" start"),end:coord(item.end,key+" end"),
    thickness:positive(item.thickness??.15,key+" thickness")};
  const result=addConnectedWall(graph,before);
  if(!result.ids.length)throw Error("Partition did not create any walls "+key);
  aliases.set(key,result.ids);
 }
 const resolveHost=x=>{
  const alias=word(x.host,"opening wall host",60),matches=aliases.get(alias);
  if(!matches)throw Error("Unknown opening host alias "+alias);
  if(matches.length>1&&!Number.isInteger(x.segment))
   throw Error("Host alias "+alias+" produced "+matches.length+" segments; specify 0-based segment");
  const idx=x.segment??0;
  if(!Number.isInteger(idx)||idx<0||idx>=matches.length)throw Error("Invalid host segment for "+alias);
  return matches[idx];
 };
 for(const item of array(level.openings||[],"openings "+level.id,0,120)){
  const host=resolveHost(item),kind=word(item.kind,"opening kind");
  const opening=addHostedOpening(graph,{wallId:host,kind,offset:finite(item.offset,"opening offset"),
   width:positive(item.width,"opening width"),sill:finite(item.sill??(kind==="door"?0:.9),"opening sill"),
   height:positive(item.height??(kind==="door"?2.1:1.2),"opening height")},level.height);
  openingIds.push(opening.id);
 }
 for(const [i,item] of array(level.roomLabels||[],"roomLabels "+level.id,0,100).entries()){
  const name=word(item,"room label",80);graph.labels["LABEL-"+id(i)]=name;
 }
 const floor={
  schema:"jp-cad://linked-one-bay-demo/0.5",
  height:level.height,length:Math.max(...outline.pts.map(p=>p.x))-Math.min(...outline.pts.map(p=>p.x)),
  width:Math.max(...outline.pts.map(p=>p.z))-Math.min(...outline.pts.map(p=>p.z)),
  roomCount:Math.max(1,Object.keys(graph.labels).length),
  source:"AI_GENERATED_STRUCTURED_SPEC",sourceStatus:"CONCEPTUAL_UNVERIFIED",
  floorGraph:graph
 };
 return{floor,area:outline.area,aliases:Object.fromEntries(aliases),openingIds};
}
function validateStructure(s){
 const columns=s?.columns,beams=s?.beams,slabs=s?.slabs;
 if(!columns||!beams||!slabs)throw Error("Explicit conceptual column, beam and slab assumptions required");
 const grids=(a,k)=>array(a,k,2,12).map((x,i)=>finite(x,k+"["+i+"]"));
 const gridX=grids(columns.gridX,"gridX"),gridZ=grids(columns.gridZ,"gridZ");
 for(const v of [gridX,gridZ])for(let i=1;i<v.length;i++)if(v[i]<=v[i-1]+.2)throw Error("Unsorted column grid axes");
 return{
 columns:{gridX,gridZ,coordinateFrame:"WORLD_XZ_METRES",sizeX:positive(columns.sizeX,"column sizeX"),sizeZ:positive(columns.sizeZ,"column sizeZ"),
 source:"AI_CONCEPTUAL_NOT_STRUCTURALLY_DESIGNED"},
 beams:{widthX:positive(beams.widthX,"beam widthX"),widthZ:positive(beams.widthZ,"beam widthZ"),
 depth:positive(beams.depth,"beam depth"),source:"AI_CONCEPTUAL_NOT_STRUCTURALLY_DESIGNED"},
 slabs:{thickness:positive(slabs.thickness,"slab thickness"),
 roofThickness:positive(slabs.roofThickness??slabs.thickness,"roof thickness"),
 source:"AI_CONCEPTUAL_NOT_STRUCTURALLY_DESIGNED"}
 };
}
export function compileAADDesign(spec){
 if(spec?.schema!=="jp-cad://aad-ai-design/1")throw Error("Unsupported AI design specification schema");
 const project=spec.project||{},slug=word(project.slug,"project slug",54),projectId=word(project.id,"project id",48);
 if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug))throw Error("Project slug must be URL-safe kebab case");
 if(!/^[A-Za-z0-9_-]{3,48}$/.test(projectId))throw Error("Project ID must satisfy AAD core ID rules");
 const projectName=word(project.name,"project name");
 if(spec.units!=="m")throw Error("AAD design specification requires metres, not unconverted units");
 const p=spec.publication||{};
 if(p.mode!=="synthetic-demo"&&p.mode!=="owner-approved-public")throw Error("Public publication mode must be explicit");
 if(p.publicApproved!==true)throw Error("AI design has no explicit public publication permission");
 if(p.mode==="synthetic-demo"&&spec.evidence?.kind!=="synthetic")throw Error("Synthetic demo must identify synthetic evidence");
 if(p.mode==="owner-approved-public"&&!word(p.approvalReference,"publication approval reference",240))
  throw Error("Owner-approved design needs a publication approval reference");
 const struct=validateStructure(spec.structural),levels=array(spec.levels,"levels",2,12);
 const ids=new Set(),sourceModels={},levelItems=[],qa=[],madeFloors={};
 const sorted=[...levels].sort((a,b)=>a.elevation-b.elevation);
 for(const level of sorted){
  if(!/^[a-z][a-z0-9_-]{0,31}$/.test(level.id)||ids.has(level.id))throw Error("Duplicate or invalid storey ID");
  ids.add(level.id);finite(level.elevation,"storey elevation");positive(level.height,"storey height");
  if(level.height>8)throw Error("Storey height exceeds conceptual bound");
  const made=makeFloor(level),{floor,area}=made,filename="aad-"+level.id+"-model.json";
  madeFloors[level.id]=made;
  sourceModels[level.id]=floor;
  const shift=level.transform||{x:0,z:0,rotationDeg:0};
  levelItems.push({id:level.id,name:word(level.name,"storey name"),elevation:round(level.elevation),
   height:round(level.height),model:filename,sourceArea:area,
   sourceAreaBasis:"AI_POLYGON_SHOELACE_CALCULATED_NOT_SURVEYED",
   transform:{x:finite(shift.x,"floor shift X"),z:finite(shift.z,"floor shift Z"),
    rotationDeg:finite(shift.rotationDeg,"floor rotation")},status:"AI_CONCEPTUAL_GEOMETRY_NOT_VERIFIED"});
  qa.push({code:"AI_SHOELACE_AREA",level:level.id,m2:area,status:"CALCULATED_NOT_SOURCE_VERIFIED"});
 }
 const authoring=checkAADAuthoring(spec,levelItems);
 for(const level of levelItems){
  const input=levels.find(x=>x.id===level.id),made=madeFloors[level.id],
   graph=made.floor.floorGraph,base=authoring.levels.find(p=>p.level===level.id);
  level.geometryProvenance=base;
  const evidence=(raw,key)=>normalizeAADComponentEvidence(raw,base,authoring.sources,level.id+"/"+key,p.mode);
  for(const wall of graph.walls)wall.provenance=evidence(undefined,"wall/"+wall.id);
  for(const opening of graph.openings)opening.provenance=evidence(undefined,"opening/"+opening.id);
  const exterior=input.exteriorWallProvenance||{};
  if(typeof exterior!=="object"||Array.isArray(exterior))throw Error("Invalid exteriorWallProvenance");
  for(const [alias,source] of Object.entries(exterior)){
   if(!/^EXT-[0-9]{2}$/.test(alias)||!made.aliases[alias])throw Error("Unknown exterior wall provenance alias "+alias);
   for(const id of made.aliases[alias])graph.walls.find(w=>w.id===id).provenance=evidence(source,alias);
  }
  for(const [i,item] of (input.partitions||[]).entries()){
   const alias=item.id||"partition-"+(i+1),ids=made.aliases[alias];
   if(!ids)throw Error("Missing partition alias "+alias);
   for(const id of ids)graph.walls.find(w=>w.id===id).provenance=evidence(item.provenance,alias);
  }
  for(const [i,item] of (input.openings||[]).entries()){
   const id=made.openingIds[i],o=graph.openings.find(v=>v.id===id);
   if(!o)throw Error("Missing hosted opening provenance "+i);
   o.provenance=evidence(item.provenance,"opening/"+id);
  }
 }
 const structuralInput=spec.structural?.componentProvenance||{};
 const componentNames=["columns","beams","slabs","roof","stairs","landing"];
 if(typeof structuralInput!=="object"||Array.isArray(structuralInput)||
    Object.keys(structuralInput).some(k=>!componentNames.includes(k)))
  throw Error("Unknown structural componentProvenance key");
 const assumed={basis:"ai-inferred",rationale:"Illustrative structural component dimensions; no engineering or field verification"};
 const componentEvidence=Object.fromEntries(componentNames.map(kind=>[
  kind,normalizeAADComponentEvidence(structuralInput[kind],assumed,authoring.sources,"structural/"+kind,p.mode)
 ]));
 struct.columns.provenance=componentEvidence.columns;struct.beams.provenance=componentEvidence.beams;
 struct.slabs.provenance=componentEvidence.slabs;struct.slabs.roofProvenance=componentEvidence.roof;

 const manifest={
  schema:"jp-cad://aad-building/1",projectId,name:projectName,revision:"AI-DESIGN-01",
  coordinateSystem:{axes:"CAD_X_PLAN__CAD_Z_PLAN__Y_ELEVATION",units:"m",
   worldOrigin:"AI design local datum; NOT SURVEYED",ifcAxisConversion:"AAD X,Z,Y -> IFC X,Y,Z"},
  levels:levelItems,structural:struct,sourceAuthority:{type:"AI_STRUCTURED_DESIGN_INPUT",
   evidence:spec.evidence||{kind:"AI_AUTHORED",status:"NOT_VERIFIED"},
   sources:authoring.sources,
   sourceAreaBasis:"AI_POLYGON_SHOELACE_CALCULATED_NOT_SURVEYED"},
  assumptions:[
   {code:"GEOMETRY",decision:"Coordinates and room arrangement provided in AI-authored design specification",status:"CONCEPTUAL_OWNER_REVIEW"},
   {code:"STRUCTURE",decision:"Column/beam/slab dimensions provided explicitly as illustrative assumptions",status:"ENGINEERING_HOLD"},
   {code:"ROOMS",decision:"Room labels do not constitute physically validated IFC spaces",status:"SEMANTIC_ONLY"}
  ],
  restrictions:{engineeringApproval:"HOLD",issueForConstruction:false,
   surveyAlignment:"NOT_SURVEYED",bimStage:"CONCEPTUAL_GEOMETRY_WORKING_DRAFT",
   publicationApprovalReference:p.mode==="synthetic-demo"?"SYNTHETIC_ONLY":p.approvalReference}
 };
 if(spec.stairs){
  const stairs=spec.stairs,opening=stairs.opening||{};
  manifest.stairs={opening:{x:finite(opening.x,"stair X"),z:finite(opening.z,"stair Z"),
   width:positive(opening.width,"stair width"),depth:positive(opening.depth,"stair depth")},
   risers:positive(stairs.risers,"stair risers"),source:"AI_CONCEPTUAL_STAIR_NOT_CODE_CHECKED",
   provenance:componentEvidence.stairs,landingProvenance:componentEvidence.landing};
  qa.push({code:"STAIR_DIMENSIONS_ASSUMED",status:"ENGINEERING_HOLD"});
 }
 const architecturalChecks=checkAADArchitecturalConstraints(spec,levelItems,sourceModels,authoring.sources);
 const assembly=assembleBuilding(manifest,sourceModels);
 const trace=assembly.elements.filter(e=>e.ifcType).map(e=>({id:e.id,kind:e.kind,level:e.level,provenance:e.provenance||null}));
 if(trace.some(e=>!e.provenance))throw Error("AAD component provenance missing from BIM assembly");
 const checks=verifyAssembly(assembly);
 if(!checks.valid)throw Error("Design conflicts with assembled AAD building: "+JSON.stringify(checks.errors));
 const file=writeIFC4(assembly),parsed=checkIfcReferences(file.text);
 if(parsed.counts.IFCBUILDINGSTOREY!==levels.length)throw Error("IFC level count mismatch");
 const warnings=checks.assumptions.map(e=>({...e}));
 return{slug,projectId,projectName,manifest,models:sourceModels,assembly,ifc:file.text,
  ifcFile:file.filename,
  qa:{schema:"jp-cad://aad-ai-design-qa/1",stage:"AI_CONCEPTUAL_ENGINEERING_HOLD",
   designSpecSha256:null,areas:qa,sourceAreaTotal:assembly.area.source,modeledAreaTotal:assembly.area.model,
   topology:assembly.counts,ifcParsedEntities:parsed.lines,ifcTypeCounts:parsed.counts,warnings,
   geometryProvenance:authoring.levels,authoringConstraints:[...authoring.checks,...architecturalChecks],
   componentProvenance:trace,
   explicitPublicApproval:true,publicationMode:p.mode,issueForConstruction:false}};
}
