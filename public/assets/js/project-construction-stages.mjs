// CAD-owned publication catalogue. Work packages are NOT design editions or engineering approvals.
// The frozen Narayani module bytes remain under public/stages and are never copied here.
export const CONSTRUCTION_STAGES=Object.freeze([
 {id:'groundworks',name:'Soling / PCC',short:'Ground preparation',scope:'Groundwork and blinding'},
 {id:'footing-rebar',name:'Footing reinforcement',short:'Footing steel',scope:'Footing bars, cut schedules and BBS'},
 {id:'footing-rcc',name:'Footing RCC',short:'Footing concrete',scope:'Footing concrete and materials'},
 {id:'dowels',name:'Starters / dowels',short:'Starters & dowels',scope:'Column starters, dowels and embedded works'},
 {id:'columns',name:'Columns',short:'Column work',scope:'Column lifts and vertical reinforcement'},
 {id:'plinth',name:'Plinth beams',short:'Plinth beams',scope:'Plinth beams and reinforcement'},
 {id:'upper-floors',name:'Slabs / upper floors',short:'Upper levels',scope:'Upper-storey members and slabs'},
 {id:'tank',name:'Tanks / services',short:'Tanks & services',scope:'Tank geometry, bars and services'}
]);
const NARAYANI={
 groundworks:{code:'V02 · v0.8',href:'stages/v02/',status:'FROZEN',note:'Original interactive PCC/blinding plan, material selector, order builder and sections. A separate soling module has not been verified.'},
 'footing-rebar':{code:'V03 · v0.4',href:'stages/v03/',status:'FROZEN',note:'Original footing reinforcement plan, bars, vendor order builder and section explorer. Source qualifications remain.'},
 'footing-rcc':{code:'M40 · v0.3',href:'stages/m40/',status:'FROZEN',note:'Original footing RCC spatial plan, concrete/material selectors, orders and sections.'},
 dowels:{code:'M50 · v0.5',href:'stages/m50/',status:'FROZEN',note:'Original starter/dowel plan, BBS selection, fabrication order and detail views.'},
 columns:{code:'M60 · v0.1',href:'stages/m60/',status:'FROZEN',note:'Original first-lift column plans, reinforcement/material selections and section views.'},
 plinth:{code:'M70 · v0.5',href:'stages/m70/',status:'FROZEN',note:'Original plinth beam network, selectors, lap and stock tools, steel inventory and sections.'},
 tank:{code:'M80 · v0.4',href:'stages/m80/',status:'ENGINEERING HOLD',note:'Preserved detailed tank model, PCC/RCC, base/wall/cover reinforcement, BBS and stock planning. CODAL_NOT_VERIFIED — not approved for fabrication.'}
};
const HARISHARAN={
 'footing-rebar':{code:'Through-plinth study',href:'projects/harisharan-adhikari/plinth/',status:'PROVISIONAL STUDY',note:'Shared basic reinforcement ledger and source calculations; not a complete fabrication BBS.'},
 'footing-rcc':{code:'Through-plinth study',href:'projects/harisharan-adhikari/plinth/',status:'PROVISIONAL STUDY',note:'Shared footing-to-plinth RCC/PCC and cement allowance analysis; not a verified concrete order.'},
 columns:{code:'Phase quantities',href:'projects/harisharan-adhikari/?panel=boq&phase=substructure',mode:'link',status:'PHASE SUMMARY',note:'Source-based substructure quantities only. Column ties, laps and anchorage are not fully detailed.'},
 plinth:{code:'Through-plinth study',href:'projects/harisharan-adhikari/plinth/',status:'PROVISIONAL STUDY',note:'Preserved plinth rebar/cement calculation module. Missing reinforcement extras remain qualified.'},
 'upper-floors':{code:'Per-floor ledger',href:'projects/harisharan-adhikari/?panel=boq&phase=first',mode:'link',status:'PHASE SUMMARY',note:'Per-floor columns, beams, stairs and slab material estimates exist. Detailed upper-floor BBS remains incomplete.'}
};
const ASHOK={
 'upper-floors':{code:'Architectural / MEP coordination',href:'projects/ashok-adhikari/?panel=views&phase=ff',mode:'link',status:'COORDINATION ONLY',note:'Existing linked architectural/MEP floor view, not a structural slab or reinforcement stage.'}
};
export const PROJECT_STAGE_EVIDENCE=Object.freeze({
 'narayani-parajuli':NARAYANI,
 'harisharan-adhikari':HARISHARAN,
 'ashok-adhikari':ASHOK,
 'ramachandra-devkota':{}
});
const INTRO={
 'narayani-parajuli':'The seven frozen V02–M80 work packages are preserved as original detailed viewers. They remain work-package records, not alternative design editions.',
 'harisharan-adhikari':'The through-plinth material workbench and phase-level estimates are available. They do not supply a complete approved reinforcement BBS.',
 'ashok-adhikari':'Architectural and MEP coordination is published. Stage-specific structural reinforcement, materials and fabrication orders are not admitted.',
 'ramachandra-devkota':'REV02 is the current source family, but public stage-specific geometry, quantities and approved work packages have not been admitted.'
};
export function availableConstructionStages(slug){
 return CONSTRUCTION_STAGES.filter(s=>Boolean(PROJECT_STAGE_EVIDENCE[slug]?.[s.id]?.href));
}
export function stageEvidence(slug,id){return PROJECT_STAGE_EVIDENCE[slug]?.[id]||null;}
export function preferredConstructionStage(slug){return availableConstructionStages(slug)[0]?.id||CONSTRUCTION_STAGES[0].id;}
export function renderConstructionStages({slug,root,editionId,stageId,escape}){
 const e=escape,items=PROJECT_STAGE_EVIDENCE[slug]||{},selected=CONSTRUCTION_STAGES.find(s=>s.id===stageId)||CONSTRUCTION_STAGES[0],record=items[selected.id],available=availableConstructionStages(slug);
 const href=(path)=>{
  const u=new URL(path,root);
  if(slug==='ashok-adhikari'&&path.includes('ashok-adhikari/?'))u.searchParams.set('edition',editionId);
  return u.href;
 };
 const projectView=new URL('projects/'+slug+'/',root);projectView.searchParams.set('edition',editionId);projectView.searchParams.set('panel','views');
 const cards=CONSTRUCTION_STAGES.map((s,i)=>{
  const entry=items[s.id],active=s.id===selected.id;
  return '<button type="button" class="pw-stage-item" data-stage-select="'+e(s.id)+'" aria-current="'+String(active)+'"><span class="pw-stage-number">'+String(i+1).padStart(2,'0')+'</span><span class="pw-stage-item-copy"><strong>'+e(s.name)+'</strong><small>'+e(entry?.code||'Not admitted as a detailed stage')+'</small></span><span class="pw-stage-dot" aria-hidden="true">'+(entry?'●':'○')+'</span></button>';
 }).join('');
 const opening='<section class="pw-card pw-stage-intro"><div><div class="pw-eyebrow">01 · Views / construction workbenches</div><h2>Construction stages & member details</h2><p>'+e(INTRO[slug])+'</p><p class="pw-stage-disclaimer">Stage packages, engineering revisions and design editions have different identities. Publication never overrides a source qualification or engineering HOLD.</p></div><div class="pw-stage-count"><strong>'+available.length+' / '+CONSTRUCTION_STAGES.length+'</strong><span>Stage links available</span></div></section>';
 let body;
 if(record){
  const link=href(record.href),status=record.status;
  body='<div class="pw-stage-heading"><div><div class="pw-eyebrow">'+e(record.code)+' · '+e(status)+'</div><h3>'+e(selected.name)+'</h3><p>'+e(record.note)+'</p></div><div class="pw-stage-actions"><a href="'+e(link)+'" target="_blank" rel="noopener">Open original workbench ↗</a><a href="'+e(projectView.href)+'">Return to linked 2D / 3D views</a></div></div>';
  if(record.mode!=='link')body+='<iframe class="pw-stage-frame" title="'+e(selected.name)+' · retained workbench" src="'+e(link)+'" loading="eager"></iframe>';
  else body+='<div class="pw-stage-await">This opens the existing project view; no separate construction-stage geometry or detailed fabrication package is claimed.</div>';
 }else{
  const specific=slug==='narayani-parajuli'&&selected.id==='upper-floors'?'Upper-floor architecture is present, but source-verified upper-floor reinforcement work packages are held.':'A dedicated source-verified stage workbench has not been admitted for this project and construction stage.';
  body='<div class="pw-stage-heading"><div><div class="pw-eyebrow">SOURCE ADMISSION PENDING</div><h3>'+e(selected.name)+'</h3><p>'+e(specific)+'</p><p>Not available is not a quantity of zero, and this status is not a statement that the original engineering documents do not exist.</p></div><div class="pw-stage-actions"><a href="'+e(projectView.href)+'">Return to linked 2D / 3D views</a></div></div>';
 }
 let previous='';
 if(slug==='narayani-parajuli')previous='<p class="pw-stage-legacy"><a href="'+e(new URL('projects/narayani-parajuli/record.html',root).href)+'" target="_blank" rel="noopener">Open preserved seven-module Narayani project hub ↗</a></p>';
 return opening+'<div class="pw-stage-layout"><nav class="pw-stage-list" aria-label="Construction work packages"><h3>1.2 · Work packages</h3>'+cards+'</nav><section class="pw-stage-detail" aria-live="polite">'+body+previous+'</section></div>';
}
