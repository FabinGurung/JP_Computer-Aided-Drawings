/**
 * Harisharan rear-NINE scoped material ledger. Reference-only, NOT IFC/BBS.
 * The published takeoff owns coordinates and preliminary source interpretation.
 * This module does not alter original takeoff, column shape, or drawing revisions.
 */
import {assembly,calculate,unitMass} from './harisharan-takeoff.mjs';

export const REAR_NINE_CANDIDATE=Object.freeze(['A4','B4','E4','A5','B5','D5','A6','B6','C6']);
export const ALTERNATE_NINE_CANDIDATE=Object.freeze(['A1','B1','F1','A2','B2','F2','A3','B3','F3']);
export const REAR_DRAFT_SCHEMA='jp-cad://harisharan/rear-nine-scope-draft/1';
export const HARISHARAN_SCOPE_STATE='CANDIDATE_REAR_ORIENTATION_NOT_VERIFIED';
const numeric=(x,min,max,label)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw new Error('Invalid '+label);return x};
export const sourceNodeMap=source=>Object.fromEntries(assembly(source).nodes.map(n=>[n.id,n]));
export function draftDefaults(source){
 return {schema:REAR_DRAFT_SCHEMA,sourceLogicalId:source.logicalId,sourceRevision:source.revision,
  sourceFileSha256:source.sources.find(s=>s.id==='HAR-SRC-STR-001')?.sha256||null,
  label:'Rows 4–6 · candidate rear nine (orientation HOLD)',
  selectedNodeIds:[...REAR_NINE_CANDIDATE],includeBoundaryPlinth:true,
  settings:{columnTieDiameter:source.defaults.columnTieDiameter,
            columnTieSpacing:source.defaults.columnTieSpacing,footingMats:source.defaults.footingMats,
            rccCementKgM3:source.defaults.rccCementKgM3},
  overrides:{},fieldNotes:'',reviewer:null,approvedByEngineer:false,reviewStatus:'DRAFT_NOT_FOR_CONSTRUCTION'};
}
const hasOwn=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
export function validateDraft(raw,source){
 if(!raw||raw.schema!==REAR_DRAFT_SCHEMA||raw.sourceLogicalId!==source.logicalId||raw.sourceRevision!==source.revision)throw Error('Invalid draft or source-revision mismatch');
 if(raw.sourceFileSha256!==source.sources.find(s=>s.id==='HAR-SRC-STR-001')?.sha256)throw Error('Original structural source hash mismatch');
 if(!Array.isArray(raw.selectedNodeIds)||new Set(raw.selectedNodeIds).size!==raw.selectedNodeIds.length)throw Error('Invalid column selection');
 const validIds=new Set(assembly(source).nodes.map(n=>n.id));
 if(raw.selectedNodeIds.some(id=>!validIds.has(id)))throw Error('Unrecognized column ID');
 if(raw.selectedNodeIds.length!==9)throw Error('Select exactly nine columns to calculate this scoped study');
 if(typeof raw.includeBoundaryPlinth!=='boolean')throw Error('Invalid plinth boundary scope');
 if(raw.approvedByEngineer!==false)throw Error('This unapproved browser draft cannot claim approval');
 const allowedSettings=['columnTieDiameter','columnTieSpacing','footingMats','rccCementKgM3'];
 if(!raw.settings||Object.keys(raw.settings).some(k=>!allowedSettings.includes(k)))throw Error('Unexpected scenario option');
 if(![8,10].includes(raw.settings.columnTieDiameter))throw Error('Tie diameter must be source scenario 8 or 10 mm');
 numeric(raw.settings.columnTieSpacing,.075,.2,'tie spacing');
 if(![1,2].includes(raw.settings.footingMats))throw Error('Footing mats must be 1 or 2');
 numeric(raw.settings.rccCementKgM3,200,500,'RCC allowance');
 if(!raw.overrides||typeof raw.overrides!=='object'||Array.isArray(raw.overrides)||Object.keys(raw.overrides).length>400)throw Error('Invalid bar overrides');
 for(const [k,v] of Object.entries(raw.overrides)){
  if(!/^[A-Z0-9-]{3,60}$/.test(k)||!v||typeof v!=='object')throw Error('Invalid bar ID');
  if(Object.keys(v).some(f=>!['diameter','count','cut'].includes(f)))throw Error('Unexpected bar field');
  if(hasOwn(v,'diameter'))numeric(v.diameter,6,40,'bar diameter');
  if(hasOwn(v,'count')&&(!Number.isInteger(v.count)||v.count<1||v.count>2000))throw Error('Invalid bar count');
  if(hasOwn(v,'cut'))numeric(v.cut,.05,35,'bar cut length');
 }
 if(typeof raw.fieldNotes!=='string'||raw.fieldNotes.length>4000)throw Error('Invalid notes');
 if(raw.reviewer!==null)throw Error('Named reviewer/approval cannot be assigned by unauthenticated browser draft');
 return {...raw,selectedNodeIds:[...raw.selectedNodeIds],overrides:Object.fromEntries(Object.entries(raw.overrides).map(([k,v])=>[k,{...v}])),
  reviewer:null,approvedByEngineer:false,reviewStatus:'DRAFT_NOT_FOR_CONSTRUCTION'};
}
export function scopeMemberGraph(source,selectedNodeIds,includeBoundaryPlinth=true){
 const a=assembly(source),set=new Set(selectedNodeIds);
 const nodes=a.nodes.filter(n=>set.has(n.id));
 const straps=a.straps.filter(b=>set.has(b.a.id)&&set.has(b.b.id));
 const plinthInternal=a.plinth.filter(b=>set.has(b.a.id)&&set.has(b.b.id));
 const plinthBoundary=a.plinth.filter(b=>set.has(b.a.id)!==set.has(b.b.id));
 const plinth=includeBoundaryPlinth?[...plinthInternal,...plinthBoundary]:plinthInternal;
 return {allNodes:a.nodes,nodes,straps,plinthInternal,plinthBoundary,plinth,
  nodeIds:new Set(nodes.map(n=>n.id)),strapIds:new Set(straps.map(b=>b.id)),plinthIds:new Set(plinth.map(b=>b.id))};
}
export function scopeCalculation(source,draft){
 const d=validateDraft(draft,source);
 const graph=scopeMemberGraph(source,d.selectedNodeIds,d.includeBoundaryPlinth);
 const whole=calculate(source,d.settings);
 const rows=whole.steel.filter(r=>{
  if(r.id.startsWith('F-'))return graph.nodeIds.has(r.id.slice(2).replace(/-(X|Z)$/,''));
  if(r.id.startsWith('CT-'))return graph.nodeIds.has(r.id.slice(3));
  if(r.id.startsWith('C-'))return graph.nodeIds.has(r.id.slice(2).replace(/-(20|25)$/,''));
  const bm=r.id.replace(/-(20|16|8)$/,'');
  return graph.strapIds.has(bm)||graph.plinthIds.has(bm);
 }).map(r=>{
  const over=d.overrides[r.id]||{},diameter=over.diameter??r.diameter,count=over.count??r.count,cut=over.cut??r.cut;
  const kg=count*cut*unitMass(diameter);
  return {...r,sourceDiameter:r.diameter,sourceCount:r.count,sourceCut:r.cut,sourceKg:r.kg,
   diameter,count,cut,length:count*cut,kg,edited:hasOwn(d.overrides,r.id)};
 });
 const lookup=new Map(rows.map(x=>[x.id,x]));
 // Discard orphaned override IDs rather than quietly mixing another phase into the subtotal.
 const orphanOverrides=Object.keys(d.overrides).filter(id=>!lookup.has(id));
 if(orphanOverrides.length)throw Error('Draft contains a bar outside the selected scope: '+orphanOverrides[0]);
 const concrete=whole.concrete.filter(r=>
  (r.id.startsWith('PAD-')&&graph.nodeIds.has(r.id.slice(4)))||
  (r.id.startsWith('COL-')&&graph.nodeIds.has(r.id.slice(4)))||
  graph.strapIds.has(r.id)||graph.plinthIds.has(r.id));
 const padArea=graph.nodes.reduce((s,n)=>s+(n.footing==='F1'?2.55*2.55:2.1*2.7),0);
 const pcc=padArea*source.dimensions.pccDepth;
 const stageRows=[...new Set(rows.map(r=>r.stage))].map(stage=>({
  stage,count:rows.filter(r=>r.stage===stage).length,
  theoreticalSteelKg:rows.filter(r=>r.stage===stage).reduce((s,r)=>s+r.kg,0)
 }));
 const footingRcc=concrete.filter(x=>x.stage==='Footing envelope').reduce((s,r)=>s+r.volume,0);
 const columnRcc=concrete.filter(x=>x.stage==='Columns to plinth').reduce((s,r)=>s+r.volume,0);
 const strapRcc=concrete.filter(x=>x.stage==='Strap beams').reduce((s,r)=>s+r.volume,0);
 const plinthRcc=concrete.filter(x=>x.stage==='Plinth beams').reduce((s,r)=>s+r.volume,0);
 const rcc=footingRcc+columnRcc+strapRcc+plinthRcc;
 return {draft:d,graph,rows,concrete,stages:stageRows,
  scope:{columns:graph.nodes.length,footings:graph.nodes.length,strapBeams:graph.straps.length,
   plinthInternal:graph.plinthInternal.length,plinthBoundary:d.includeBoundaryPlinth?graph.plinthBoundary.length:0,
   plinthTotal:graph.plinth.length},
  volumes:{footingEnvelopeM3:footingRcc,columnM3:columnRcc,strapM3:strapRcc,plinthM3:plinthRcc,rccScenarioM3:rcc,pccPadOnlyM3:pcc},
  steelKg:rows.reduce((s,r)=>s+r.kg,0),
  steelDiameterKg:rows.reduce((o,r)=>(o[r.diameter]=(o[r.diameter]||0)+r.kg,o),{}),
  cementScenarioBags:null, // never promote estimating dosage to a mix/order quantity
  sourceNotAccepted:source.issues.map(i=>i.id),
  qa:{rearOrientation:'HOLD',footingGeometry:'HOLD',columnTies:'HOLD',strapLinks:'HOLD',plinthLinks:'HOLD',barCutLengths:'HOLD',
   soilAndSeismic:'HOLD',constructionRelease:'NOT_ISSUED'}
 };
}
