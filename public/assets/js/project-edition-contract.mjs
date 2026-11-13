// CAD-owned edition hierarchy. Shared by all four project workspaces and their memory posters.
// This controls UI/source lineage, not construction/engineering approval.
export const AAD_WORKSPACE_ENGINE_VERSION='1.4.0';
export const EDITION_KINDS=Object.freeze(['architectural-design','design-option','source-family','template']);
export const EDITION_LIFECYCLES=Object.freeze(['RELEASED_REVIEW','FROZEN_REVIEW','FROZEN_BASELINE','SOURCE_REVIEW','SOURCE_PENDING','TEMPLATE_ONLY']);
export const EDITION_SNAPSHOT_POLICIES=Object.freeze(['IMMUTABLE_MODEL_PATH','PROJECT_CONTROLLED_SOURCE','SOURCE_POINTER','NO_REAL_DESIGN']);
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateEditionRegistries(projects){
 if(!projects||typeof projects!=='object')throw Error('AAD edition registry missing');
 const summaries=[];
 for(const [slug,project] of Object.entries(projects)){
  if(!slugPattern.test(slug)||!project||!Array.isArray(project.editions)||project.editions.length===0)throw Error('Invalid CAD edition project: '+slug);
  if(project.workspaceEngineVersion!==AAD_WORKSPACE_ENGINE_VERSION)throw Error('Project '+slug+' not inheriting current workspace engine');
  const seen=new Set(),immutableSources=new Set();
  project.editions.forEach((edition,index)=>{
   if(!slugPattern.test(edition.id)||seen.has(edition.id))throw Error('Duplicate/invalid edition id: '+slug+'/'+edition.id);
   seen.add(edition.id);
   if(!EDITION_KINDS.includes(edition.kind))throw Error('Missing edition type: '+slug+'/'+edition.id);
   if(!EDITION_LIFECYCLES.includes(edition.lifecycle))throw Error('Missing lifecycle: '+slug+'/'+edition.id);
   if(!EDITION_SNAPSHOT_POLICIES.includes(edition.snapshotPolicy))throw Error('Missing snapshot policy: '+slug+'/'+edition.id);
   if(!Array.isArray(edition.levels)||!edition.levels.length||!edition.name||!edition.basis)throw Error('Incomplete edition: '+slug+'/'+edition.id);
   const floorIDs=edition.levels.map(l=>l.id);
   if(new Set(floorIDs).size!==floorIDs.length)throw Error('Duplicate floor: '+slug+'/'+edition.id);
   if(edition.predecessorId!==null&&typeof edition.predecessorId!=='string')throw Error('Missing predecessor: '+slug+'/'+edition.id);
   if(edition.predecessorId!==null&&!project.editions.slice(index+1).some(x=>x.id===edition.predecessorId))
    throw Error('Predecessor must appear later in edition book: '+slug+'/'+edition.id+' -> '+edition.predecessorId);
   if(edition.snapshotPolicy==='IMMUTABLE_MODEL_PATH'){
    if(edition.kind!=='architectural-design'||!edition.manifest||edition.sourceRef!==edition.manifest)
     throw Error('Immutable edition requires its own admitted model path: '+slug+'/'+edition.id);
    if(immutableSources.has(edition.manifest))throw Error('Immutable model reused by distinct editions: '+slug+'/'+edition.id);
    immutableSources.add(edition.manifest);
   }
   if(edition.snapshotPolicy==='NO_REAL_DESIGN'&&(!project.synthetic||edition.manifest||edition.engine))
    throw Error('Template may not contain real project geometry: '+slug+'/'+edition.id);
   if(edition.lifecycle==='SOURCE_PENDING'&&edition.manifest)throw Error('Pending project has fabricated model: '+slug+'/'+edition.id);
   if(edition.kind==='source-family'&&edition.snapshotPolicy==='IMMUTABLE_MODEL_PATH')throw Error('Current source pointer is not a frozen edition: '+slug+'/'+edition.id);
  });
  summaries.push({slug,engineVersion:project.workspaceEngineVersion,editionIds:project.editions.map(e=>e.id),current:project.editions[0].id,synthetic:Boolean(project.synthetic)});
 }
 return summaries;
}
export function describeEdition(edition){
 return {
  id:edition.id,name:edition.name,kind:edition.kind,lifecycle:edition.lifecycle,
  snapshotPolicy:edition.snapshotPolicy,
  predecessorId:edition.predecessorId,
  sourceRef:edition.sourceRef??null,
  hasAdmittedModel:Boolean(edition.manifest||edition.engine),
  retainsOriginalSource:true
 };
}
export function nextEditionRequest({projectSlug,projectName,selectedEdition,phase,requests=[]}){
 if(!selectedEdition?.id||!projectSlug)throw Error('Selected project baseline is required');
 return {
  schema:'jp-cad://aad-new-design-edition-request/1',
  policyVersion:AAD_WORKSPACE_ENGINE_VERSION,
  projectSlug,projectName,
  baselineEditionId:selectedEdition.id,
  baselineSourceRef:selectedEdition.sourceRef??null,
  baselineSnapshotPolicy:selectedEdition.snapshotPolicy,
  phase,
  status:'LOCAL_OWNER_REQUEST_NOT_APPLIED',
  action:'REVIEW_SOURCES_AND_CREATE_NEW_VERSIONED_EDITION_IF_DESIGN_GEOMETRY_CHANGES',
  preservesPreviousEdition:true,
  requests:requests.map(x=>({...x})),
  instructions:'Work with actual authenticated sources; admit new source-backed geometry in a NEW project-owned manifest; register a new west-rail edition with predecessor; run CAD CI/Pages/readback. A UI-only change is an engine release, NOT a new design edition.'
 };
}
