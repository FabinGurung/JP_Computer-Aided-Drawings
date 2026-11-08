/* A7/A9 governed, read-only CAD project review control.
 * Structured JSON is the source; this module validates and renders, never fabricates axes.
 */
export const REQUIRED_CHAPTERS=Object.freeze(['views','boq','gantt','packages','sources']);
const STATES=new Set(['REVIEW_ONLY','HOLD','NOT_ADMITTED','VERIFIED_SOURCE']);
function insist(ok,message){if(!ok)throw Error('CAD control tower contract: '+message);}
export function validateControlTower(t){
 insist(t?.schema==='jp-cad://control-tower/view-lineage/1.0','unknown schema');
 insist(t.axisContract?.mode==='REGISTERED_SOURCE_OR_FAIL_CLOSED','missing fail-closed axis requirement');
 insist(t.axisContract?.requiredForNewPlanRevision===true,'axes cannot be optional on new review plans');
 insist(JSON.stringify(t.axisContract.displayIn)===JSON.stringify(REQUIRED_CHAPTERS),'axis context must cover all five chapters');
 insist(t.principles?.find(p=>p.id==='ONE_MEANING_PER_REGION')?.south?.includes('NOT a second chapter'),'south must have a distinct role');
 insist(Object.keys(t.chapterContracts||{}).sort().join('|')===REQUIRED_CHAPTERS.slice().sort().join('|'),'all chapter contracts required');
 insist(t.projects&&Object.keys(t.projects).length>=4,'project gate queue missing');
 for(const [slug,p] of Object.entries(t.projects)){
  insist(Array.isArray(p.gates)&&p.gates.length>0,slug+' has no issue trail');
  insist(new Set(p.gates.map(x=>x.id)).size===p.gates.length,slug+' has duplicate issue IDs');
  insist(p.gateIds?.join('|')===p.gates.map(x=>x.id).join('|'),slug+' queue differs from stable IDs');
  for(const g of p.gates){
   insist(g.id&&g.title&&g.detail&&STATES.has(g.status),slug+' incomplete review gate');
   insist(!g.sourceRef||!g.sourceRef.includes('..'),slug+' noncanonical source reference');
  }
 }
 return t;
}
export function inspectAxisEvidence(t,manifest,{slug,editionId}={}){
 const standard=t.axisContract,project=t.projects[slug];
 const known=manifest?.presentation?.columnAxisGrid;
 if(!manifest||!known){
  return{status:'AXES_NOT_ADMITTED',axisIds:[],description:'No governed A/B/C × 1/2/3 column-axis registry for this selected edition; new plan-derived engineering quantities remain blocked.',sourceStatus:project?.axisEvidence||'UNKNOWN',floorRegistration:false,units:'mm',editionId};
 }
 const x=known.letterAxes||[],z=known.numberAxes||[];
 insist(known.schema==='jp-cad://review-column-axes/1','nonstandard axis schema');
 insist(x.length>0&&z.length>0,'empty axis family');
 insist(new Set(x.map(v=>v.label)).size===x.length,'duplicated letter axes');
 insist(new Set(z.map(v=>v.label)).size===z.length,'duplicated number axes');
 insist(known.levels?.length>=1,'no floor mapping');
 const candidates=(manifest.presentation.elements||[]).filter(e=>e.kind==='column'&&known.levels.includes(e.level)&&e.axisReference);
 insist(candidates.length>0,'no source-referenced column markers');
 const ids=[...new Set(candidates.map(e=>e.axisReference))].sort();
 for(const id of ids)insist(x.some(a=>id.startsWith(a.label))&&z.some(a=>id.endsWith(a.label)),'orphan marker '+id);
 return{status:'DISPLAY_REVIEW_ONLY',axisIds:ids,description:x.map(a=>a.label).join('–')+' / '+z.map(a=>a.label).join('–')+' · '+candidates.length+' proposed display markers, '+known.levels.length+' floors; NOT verified structural member axes.',sourceStatus:known.status,sourceRef:standard.displayRules[0],floorRegistration:known.levels.join('/'),units:known.units||'mm',editionId};
}
export function reviewGate(t,slug,index=0){
 const p=t.projects[slug]||t.projects['example-empty'];insist(p,'missing template fallback');
 const at=((index%p.gates.length)+p.gates.length)%p.gates.length;
 return{gate:p.gates[at],index:at,count:p.gates.length,project:p};
}
export function modelLineage(t,{slug,editionId,phase,panel,manifest}={}){
 insist(REQUIRED_CHAPTERS.includes(panel),'invalid chapter');
 const axes=inspectAxisEvidence(t,manifest,{slug,editionId});
 const reviewed=manifest?.release?.reviewOnly||manifest?.representation==='ARCHITECTURAL_REVIEW_ONLY';
 return{schema:t.schema,projectSlug:slug,editionId,phase,chapter:panel,axisStatus:axes.status,axisIds:axes.axisIds,axisLabel:axes.description,axisSourceStatus:axes.sourceStatus,modelRevision:manifest?.revision||null,reviewOnly:Boolean(reviewed),constructionApproved:false,sourceAuthority:t.authority.originals};
}
