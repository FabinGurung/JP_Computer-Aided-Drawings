import {PROJECTS,ALL_WORKSPACE_PROJECTS,CHAPTERS} from './project-workspace-config.mjs?v=1.4.0';
import {AAD_WORKSPACE_ENGINE_VERSION,validateEditionRegistries,describeEdition,nextEditionRequest} from './project-edition-contract.mjs?v=1.4.0';
import {NORMALIZED_PACKAGE_CATALOG} from './project-engineering-normalization.mjs';
import {validateControlTower,inspectAxisEvidence,reviewGate,modelLineage} from './cad-view-control-tower.mjs';
import {packageRecords,firstPackageId,packageById,renderPackages,renderPackageCards,renderPackageInspector,filterPackageRecords} from './project-site-packages.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=document.body.dataset.project,config=ALL_WORKSPACE_PROJECTS[slug],root=new URL('../../',location.href),params=new URL(location.href).searchParams;
if(!config)throw Error('Unknown public project');
validateEditionRegistries(ALL_WORKSPACE_PROJECTS);
if(slug==='harisharan-adhikari'&&location.hash==='#materials')location.replace('plinth/#materials');
if(slug==='narayani-parajuli'&&/^#(v02|v03|m40|m50|m60|m70|m80)$/.test(location.hash))location.replace('record.html'+location.hash);
let edition=config.editions.find(e=>e.id===params.get('edition'))||config.editions[0],phase=params.get('phase')||config.defaultLevel,layout=['split','plan','building','source'].includes(params.get('layout'))?params.get('layout'):'split',panel=params.get('panel')||'views',section=params.get('section')||'',api=null,epoch=0,engineKey='',mounted=false,applying=false;
let stage=params.get('package')||params.get('stage')||firstPackageId(slug),packageQuery='',packageFilter='all',packageMode='list';
if(panel==='views'&&section==='stages'){panel='packages';section='';}
const oldHashes={'#studio':'views','#panel-studio':'views','#register':'boq','#studio-register':'boq','#programme':'gantt','#sources':'sources','#panel-plans':'sources','#panel-visuals':'sources','#panel-qa':'sources','#project-versions':'sources','#scenarios':'sources'};
if(!params.has('panel')&&oldHashes[location.hash])panel=oldHashes[location.hash];if(!CHAPTERS.some(c=>c[0]===panel))panel='views';
document.title=config.name+' · Project workspace';
const towerPromise=fetch(new URL('data/cad/view-control-tower.v1.json',root))
 .then(async r=>{if(!r.ok)throw Error('Control tower contract not available');return validateControlTower(await r.json());})
 .catch(()=>null);
const modelByEdition=new Map();
let reviewIndex=0,reviewUpdateToken=0,currentLineage=null;
const axisCache=new Map();
async function readNativeAxisRegister(tower){
 const path=tower?.projects?.[slug]?.axisRegisterRef;
 if(!path)return null;
 if(!axisCache.has(path))axisCache.set(path,fetch(new URL(path,root)).then(async r=>{
   if(!r.ok)throw Error('Source axis register '+r.status);
   return await r.json();
 }).catch(()=>null));
 return axisCache.get(path);
}

async function readEditionModel(){
 if(!edition.manifest)return null;
 if(!modelByEdition.has(edition.manifest)){
  const url=new URL(edition.manifest,root);
  modelByEdition.set(edition.manifest,fetch(url).then(async r=>{if(!r.ok)throw Error('Model missing');return await r.json();}).catch(()=>null));
 }
 return modelByEdition.get(edition.manifest);
}
async function renderReviewNavigation(){
 const token=++reviewUpdateToken;
 const [tower,manifest]=await Promise.all([towerPromise,readEditionModel()]);
 const nativeRegister=await readNativeAxisRegister(tower);
 if(token!==reviewUpdateToken)return;
 const bar=$('pw-axis-proof'),dock=$('pw-dock');
 if(!tower){
  currentLineage=null;
  bar.textContent='Drawing source standard unavailable · machine-readable axis requirements not verified';
  bar.dataset.axisStatus='CONTRACT_UNAVAILABLE';
  dock.innerHTML='<p role="status">Review queue unavailable. This page cannot certify plan-derived quantities or structural axes.</p>';
  return;
 }
 const lineage=modelLineage(tower,{slug,editionId:edition.id,phase,panel,manifest,nativeRegister});currentLineage=lineage;
 const axis=inspectAxisEvidence(tower,manifest,{slug,editionId:edition.id,phase,nativeRegister});
 bar.dataset.axisStatus=lineage.axisStatus;
 bar.dataset.edition=edition.id;
 bar.dataset.chapter=panel;
 bar.dataset.phase=phase;
 bar.innerHTML='<span class="pw-axis-tag">'+(['DISPLAY_REVIEW_ONLY','SOURCE_MARKS_REGISTERED_REVIEW_ONLY'].includes(axis.status)?'AXIS REVIEW':'AXES HOLD')+'</span><strong>'+esc(axis.description)+'</strong><small>Applies to '+esc(edition.name)+' · '+esc(phase)+' · '+esc(panel)+'. Source/member references must be carried to every derived chapter. '+(axis.status==='DISPLAY_REVIEW_ONLY'?'Provisional markers only.':axis.status==='SOURCE_MARKS_REGISTERED_REVIEW_ONLY'?'Documented source marks only; 2D/3D source registration and engineering acceptance remain separate.':'No invented A1/B2 positions.')+'</small>'+(nativeRegister?'<a href="'+esc(new URL(tower.projects[slug].axisRegisterRef,root).href)+'" target="_blank" rel="noopener">Read project axis register</a>':'');
 const {gate,index,count}=reviewGate(tower,slug,reviewIndex);
 reviewIndex=index;
 const sourceLink=gate.sourceRef?new URL(gate.sourceRef,root).href:null;
 dock.dataset.reviewId=gate.id;
 dock.dataset.reviewCount=String(count);
 dock.innerHTML='<div class="pw-review-heading"><strong>Review route</strong><small>South · unresolved checkpoints</small></div>'+
 '<div class="pw-review-progress"><span class="pw-review-index">'+(index+1)+' / '+count+'</span><strong>'+esc(gate.id)+' · '+esc(gate.title)+'</strong><small class="pw-review-state">'+esc(gate.status)+'</small><p>'+esc(gate.detail)+'</p></div>'+
 '<div class="pw-review-controls"><button type="button" id="pw-review-prev" aria-label="Previous unique review checkpoint">← Previous</button><button type="button" id="pw-review-next" aria-label="Next unique review checkpoint">Next →</button>'+
 (sourceLink?'<a id="pw-review-evidence" href="'+esc(sourceLink)+'" target="_blank" rel="noopener">Inspect evidence</a>':'<button type="button" id="pw-review-evidence">Find source record</button>')+
 '<a class="pw-review-guide" href="'+esc(new URL('templates/project-workspace/control-tower/',root).href)+'">Drawing control tower</a></div>';
 $('pw-review-prev').onclick=()=>{reviewIndex=(index+count-1)%count;renderReviewNavigation();};
 $('pw-review-next').onclick=()=>{reviewIndex=(index+1)%count;renderReviewNavigation();};
 const open=$('pw-review-evidence');
 if(open?.tagName==='BUTTON')open.onclick=()=>{section='';choose('sources');};
}

$('project-app').innerHTML=`<header class="pw-top"><a class="pw-brand" href="${root}">CAD / Project Drawings</a><button class="pw-menu" id="pw-menu" aria-expanded="false" aria-controls="pw-rail">Versions & chapters</button><nav class="pw-top-links" aria-label="Site navigation"><a href="${new URL('projects/',root)}">All projects</a><a href="${new URL('guide/',root)}">Guide</a><select class="pw-project-select" id="pw-project" aria-label="Switch project">${Object.entries(PROJECTS).map(([s,c])=>`<option value="${s}" ${s===slug?'selected':''}>${esc(c.name)}</option>`).join('')}</select></nav></header><div class="pw-grid"><aside class="pw-rail" id="pw-rail"><div class="eyebrow">Project book</div><h2>${esc(config.name)}</h2><div class="pw-edition-card"><label>Design edition / source version<select id="pw-edition">${config.editions.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label><small id="pw-edition-basis"></small><div class="pw-edition-provenance" id="pw-edition-provenance" role="status" aria-live="polite"></div><button type="button" class="pw-new-edition" id="pw-new-edition" title="This records a local request only; publishing needs a reviewed PR">Request next design edition</button><a class="pw-edition-policy" href="${new URL('data/cad/design-edition-contract.v1.json',root)}" target="_blank" rel="noopener">Read the CAD edition rule</a></div><nav aria-label="Current chapter subsections"><div class="pw-current-sections-title">Current chapter · subsection tree</div><ol class="pw-tree">${CHAPTERS.map(([id,n,name])=>`<li data-west-chapter="${id}" data-current="false"><div class="pw-subnav" id="pw-sub-${id}"></div></li>`).join('')}</ol></nav><div class="pw-rail-foot">One edition → chapters → sections → floor phases.<br>Source revisions and release history live in Sources & records.<p><a href="${new URL('codes/pokhara/',root)}">Code reference</a> · <a href="${new URL('memory-wall/',root)}">CAD controls</a> · <a href="${new URL('projects/'+slug+'/memory-wall/',root)}">Project memory wall</a> · <a href="${new URL('memory-wall/pages/',root)}">Pages memory wall</a></p></div></aside><main class="pw-main" id="pw-main"><div class="pw-heading"><div><div class="pw-eyebrow">${esc(config.company)}</div><h1>${esc(config.name)}</h1><p id="pw-chapter-title"></p></div><span class="pw-status">${esc(config.status)}</span></div><nav class="pw-chapter-bar" role="tablist" aria-label="Workspace chapters">${CHAPTERS.map(([id,n,name])=>`<button role="tab" data-chapter="${id}" id="pw-tab-${id}" aria-selected="false" aria-controls="pw-body">${name}</button>`).join('')}</nav><div class="pw-toolbar" id="pw-toolbar"><label>Construction phase / floor<select id="pw-phase"></select></label><label>Drawing layout<select id="pw-layout"><option value="split">2D left · 3D right</option><option value="plan">2D plan only</option><option value="building">3D model only</option>${slug==='harisharan-adhikari'?'<option value="source">Original source plan</option>':''}</select></label><button id="pw-fit">Fit view</button><a id="pw-edit-direct" href="#" target="_blank" rel="noopener" hidden>Open editable model + history</a><button id="pw-edit-request-open" type="button">Record change request</button><p class="pw-scope" id="pw-scope"></p></div><details id="pw-change-request" class="pw-card" style="margin:12px 0;padding:16px" aria-label="Browser edit and source-aware change request workflow">
<summary style="font-weight:760;cursor:pointer">Edit or request a drawing change · local history</summary>
<p id="pw-edit-readiness" role="status">Checking whether this project has an editable shared AAD model…</p>
<p>For an admitted linked 2D/3D AAD model, open its editor above, select a wall or door/window, edit or delete it, then copy its exact machine-readable edit log. When a model is source-review-only or not yet admitted, record an instruction here without changing the drawings.</p>
<div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:10px 0">
<label>Change type <select id="pw-request-type"><option value="request-remove">Request deletion</option><option value="request-modify">Request modification</option><option value="request-add">Request addition</option><option value="question">Clarify source</option></select></label>
<label>Object/source ID <input id="pw-request-object" type="text" maxlength="180" placeholder="Wall/door/column ID, if known"></label>
</div>
<label style="display:block;font-weight:700" for="pw-request-note">Describe the requested change and reason</label>
<textarea id="pw-request-note" rows="3" maxlength="2000" style="width:100%;max-width:100%;padding:10px;border:1px solid #bed0db;border-radius:8px" placeholder="For example: Remove wall ID W14 from the first-floor layout; check the structural report first."></textarea>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
<button type="button" id="pw-request-record">Add to local request history</button>
<button type="button" id="pw-request-copy">Copy requests for ChatGPT</button>
<button type="button" id="pw-request-export">Download request JSON</button>
</div>
<ol id="pw-request-list" aria-label="Pending change requests" style="font-size:.86rem"></ol><label for="pw-request-export-preview" style="display:block;font-weight:700">Copyable request log</label><textarea id="pw-request-export-preview" readonly rows="4" style="width:100%;max-width:100%;font:12px/1.45 ui-monospace,monospace;padding:10px;border:1px solid #bfd1de;border-radius:8px"></textarea>
<p id="pw-request-status" aria-live="polite">No requests recorded. This does not edit GitHub or Google Drive.</p>
</details><div class="pw-context" role="status" id="pw-context">Preparing the selected project edition…</div><div class="pw-axis-proof" id="pw-axis-proof" role="status" aria-label="Source-evidenced column-axis and derived-data status">Checking axis/source lineage…</div><section id="pw-owner-revision" class="pw-card" hidden aria-label="Owner revision and chapter impact" style="margin:12px 0;padding:15px;border-left:4px solid #bb8440"></section><div class="pw-stage-shortcut" id="pw-stage-shortcut"><div><strong>Packages / Site Modules</strong><span>Open the original material workbenches and site package records</span></div><button type="button" id="pw-open-stages">Open site packages</button></div><div class="pw-work-area"><div class="pw-body" id="pw-body" role="tabpanel" tabindex="0"><iframe class="pw-frame" id="${slug==='ashok-adhikari'?'ashok-engine':'project-engine'}" title="${esc(config.name)} linked plan, model and component register" allow="fullscreen"></iframe><div id="pw-content" hidden></div></div><aside class="pw-inspector" id="pw-inspector" aria-label="East · contextual package inspector"></aside></div><nav class="pw-dock" id="pw-dock" aria-label="South · unique review checkpoint navigator"></nav><footer class="pw-footer"><span>Source-linked review workspace · engineering qualifications remain visible</span><span>Project workspace standard 1.3 · source control tower</span></footer></main></div>`;

/* Shared project-entry edit permissions: admit graph edits only when a current AAD manifest exists.
 * Review requests are not JSON Patch or approved geometry changes.
 * Works for Narayani/Ashok model editions and Harisharan/Ramachandra source-only rooms.
 */
let projectReviewRequests=[];
const requestKey=()=>["cad:aad:project-change-requests",slug,edition.id].join(":");
const requestBundle=()=>({
 schema:"jp-cad://aad-project-change-requests/1",
 projectSlug:slug,projectName:config.name,editionId:edition.id,editionBasis:edition.basis,
 editionPolicyVersion:AAD_WORKSPACE_ENGINE_VERSION,baselineSourceRef:edition.sourceRef??null,
 sourceEditionLifecycle:edition.lifecycle,requiresNewDesignEditionForGeometryChange:true,
 sourceManifestPath:edition.manifest?new URL(edition.manifest,root).pathname:null,
 reviewStatus:"PROPOSAL_ONLY_NOT_APPLIED_TO_GEOMETRY",
 engineeringApproval:"HOLD",
 requests:projectReviewRequests.map(x=>({...x}))
});
function requestHandover(){
 return "CAD_AAD_PROJECT_CHANGE_REQUEST_HANDOVER_V1\n"+
  "Review this project-scoped request log against current GitHub/Drive sources and do not treat it as applied geometry.\n"+
  "When an admitted AAD model is available, use its exported jp-cad://aad-edit-change-set/1 for actual working geometry operations.\n"+
  "For new owner-directed design geometry, create a NEW registered source-backed edition with predecessor. Keep selected baseline unchanged; UI/engine releases do not create new house editions.\n"+
  JSON.stringify(requestBundle(),null,2);
}
function requestStatus(message){
 $('pw-request-status').textContent=message;
}
function restoreRequestHistory(){
 projectReviewRequests=[];
 try{
  const source=JSON.parse(localStorage.getItem(requestKey())||"null");
  if(source?.schema==="jp-cad://aad-project-change-requests/1"&&
    source.projectSlug===slug&&source.editionId===edition.id&&Array.isArray(source.requests))
    projectReviewRequests=source.requests.slice(0,100);
 }catch(_){}
 renderRequestHistory();
}
function renderRequestHistory(){
 const list=$('pw-request-list');list.replaceChildren();
 for(const r of projectReviewRequests){
  const item=document.createElement('li');
  item.textContent=r.createdAt+" · "+r.action+" · "+(r.objectId||"unidentified object")+" · "+r.description;
  list.append(item);
 }
 $('pw-request-export-preview').value=requestHandover();
 requestStatus(projectReviewRequests.length+" local request(s) for "+edition.name+
  ". These are NOT implemented changes and do not modify original source files.");
}
function refreshProjectEditEntry(){
 const link=$('pw-edit-direct'),readiness=$('pw-edit-readiness');
 if(edition.manifest){
  const url=new URL('cad/aad/multistorey/',root);
  url.searchParams.set('manifest',new URL(edition.manifest,root).pathname);
  url.searchParams.set('workspace','standard');
  if(edition.structure)url.searchParams.set('structure',edition.structure);
  url.searchParams.set('phase',phase);
  url.searchParams.set('layout',layout);
  link.href=url.href;link.hidden=false;
  readiness.textContent="This edition has an admitted AAD manifest. Open the shared full-screen editor to select/edit/delete eligible WORKING graph items and export its change history. Protected/source-backed structure is not freely deletable.";
 }else{
  link.hidden=true;link.removeAttribute('href');
  readiness.textContent="SOURCE REVIEW HOLD: this edition has no admitted shared AAD editable manifest. Record a source-qualified change REQUEST below. Do not claim walls, beams or columns were deleted.";
 }
 restoreRequestHistory();
}

function renderEditionProvenance(){
 const d=describeEdition(edition),box=$('pw-edition-provenance');
 box.dataset.editionId=d.id;box.dataset.kind=d.kind;box.dataset.lifecycle=d.lifecycle;
 box.dataset.sourceRef=d.sourceRef||'';
 const kindText={'architectural-design':'Architecture snapshot','design-option':'Design option','source-family':'Original source family','template':'Fictional template'}[d.kind];
 const statusText={'RELEASED_REVIEW':'Released for architectural review','FROZEN_REVIEW':'Preserved review version','FROZEN_BASELINE':'Preserved baseline','SOURCE_REVIEW':'Source interpretation only','SOURCE_PENDING':'Public model pending','TEMPLATE_ONLY':'No admitted geometry'}[d.lifecycle];
 const predecessor=d.predecessorId?' · Previous: '+d.predecessorId:'';
 const source=d.sourceRef?'<a href="'+esc(new URL(d.sourceRef,root).href)+'" target="_blank" rel="noopener">Read registered source/model</a>':'<span>Public model not admitted</span>';
 const released=edition.releaseTag?'<a href="https://github.com/FabinGurung/jp-drawing-coordination/releases/tag/'+encodeURIComponent(edition.releaseTag)+'" target="_blank" rel="noopener">Verified architectural review milestone</a>':'';
 box.innerHTML='<strong>'+esc(kindText)+'</strong><span>'+esc(statusText+predecessor)+'</span><span>Shared engine '+esc(AAD_WORKSPACE_ENGINE_VERSION)+'</span>'+source+released;
 $('pw-new-edition').disabled=config.synthetic===true;
 $('pw-new-edition').title=config.synthetic?'Fictional template cannot produce a real building edition':'Records a local request; a reviewed source-backed GitHub PR is required for a published edition';
}
const frame=document.querySelector('iframe.pw-frame');
$('pw-edition').value=edition.id;$('pw-layout').value=layout;
const validPhase=()=>phase==='all'||edition.levels.some(l=>l.id===phase);
function phaseOptions(){if(!validPhase())phase=config.defaultLevel;const list=[{id:'all',name:'Whole building'},...edition.levels];$('pw-phase').innerHTML=list.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('');$('pw-phase').value=phase;$('pw-sub-views').innerHTML='<strong class="pw-tree-section">1.1 · Linked floor views</strong>'+list.map((l,i)=>`<button data-phase="${l.id}" aria-current="${l.id===phase&&!section}">1.1.${i+1} · ${esc(l.name)}</button>`).join('');$('pw-sub-views').querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{phase=b.dataset.phase;section='';choose('views');});}
function share(push=false){const u=new URL(location.href);u.searchParams.delete('stage');for(const [k,v] of Object.entries({edition:edition.id,panel,phase,layout,section,package:panel==='packages'?stage:''}))if(v)u.searchParams.set(k,v);else u.searchParams.delete(k);u.hash=panel;history[push?'pushState':'replaceState'](null,'',u);}
function closeMenu(){document.body.dataset.menu='closed';$('pw-menu').setAttribute('aria-expanded','false');}
function context(){if(applying)return;if(panel==='packages'){$('pw-context').innerHTML=`<strong>${esc(edition.name)}</strong><span>Packages / Site Modules</span><span>${packageRecords(slug).length} source-linked package records</span>`;return;}const s=api?.getState();if(s?.phase&&validPhase()&&(s.phase==='all'||edition.levels.some(l=>l.id===s.phase))){const changed=phase!==s.phase;phase=s.phase;$('pw-phase').value=phase;if(changed){phaseOptions();share();}}const label=edition.levels.find(l=>l.id===phase)?.name||'Whole building';$('pw-context').innerHTML=`<strong>${esc(edition.name)}</strong><span>${esc(label)}</span><span>${s?esc(s.componentCount)+' model components':'Source availability shown below'}</span>`;if(s?.levels&&slug==='harisharan-adhikari'){edition.levels=[{id:'substructure',name:'Through plinth beam'},...s.levels.map(l=>({id:l.id,name:l.name+(l.id==='fourth'?' / roof':'')}))];if($('pw-phase').options.length!==edition.levels.length+1)phaseOptions();}}

let ownerRevision=null;
async function renderOwnerRevision(){
 const target=$('pw-owner-revision');
 if(!target)return;
 if(slug!=='ashok-adhikari'||edition.id!=='v3'){target.hidden=true;target.innerHTML='';return;}
 try{
  if(!ownerRevision){const r=await fetch(new URL('data/projects/ashok-adhikari/owner-revision-20261106.json',root));if(!r.ok)throw Error('revision record unavailable');ownerRevision=await r.json();}
  const section=ownerRevision.impacts[panel]||{};
  const rows=Object.entries(section.quantitative||{}).map(([k,v])=>'<tr><th scope="row">'+esc(k.replace(/([A-Z])/g,' $1'))+'</th><td>'+esc(v===null?'Not admitted':v)+'</td></tr>').join('');
  const items=[...(section.records||[]),...(section.affected||[]),...(section.dependencies||[]),...(section.tradeImpacts||[]),...(section.prior||[]),...(section.new||[])];
  const list=items.length?'<ul style="margin:8px 0 0 18px;padding:0">'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
  const table=rows?'<div style="overflow:auto;margin-top:8px"><table style="border-collapse:collapse;min-width:350px;font-size:13px"><thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">Quantity key</th><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">Value</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'';
  target.hidden=false;
  target.innerHTML='<div class="pw-eyebrow">OWNER REVISION · 06 NOV 2026 · '+esc(panel.toUpperCase())+'</div>'+
   '<h2 style="margin:5px 0 7px;font-size:17px">v3 architectural change coordination — NOT for construction</h2>'+
   '<p style="margin:4px 0"><strong>'+esc(section.status||ownerRevision.state)+'</strong> · '+esc(section.summary||'Owner change evidence under review.')+'</p>'+
   table+list+
   '<p style="font-size:12px;margin:10px 0 0">Original v1/v2 models and approved GF c016 / FF c012 visuals are preserved. Candidate sizes, bath accessibility, Bed 2 stair glazing, right setback, tender BOQ and dates remain gated. <a href="'+esc(new URL('data/projects/ashok-adhikari/owner-revision-20261106.json',root).href)+'" target="_blank" rel="noopener">Source-backed change record ↗</a></p>';
 }catch(e){target.hidden=false;target.textContent='Owner revision record could not load; retain v2 as the authoritative working reference. '+String(e.message||e);}
}

function resizeFrame(){try{const d=frame.contentDocument;if(d?.body&&frame.src&&frame.offsetWidth){const h=Math.max(680,Math.ceil(d.querySelector('main').getBoundingClientRect().height)+12);if(Math.abs(frame.clientHeight-h)>3)frame.style.height=h+'px';}}catch{}}
function syncEngine(){if(!api)return;applying=true;const wanted=phase;api.setPanel(panel==='boq'?'boq':section==='scenarios'?'scenarios':section==='evidence'?'sources':panel);api.setLevel(wanted);api.setLayout(layout);applying=false;context();setTimeout(resizeFrame,50);}
async function ensureEngine(){if(!edition.manifest&&!edition.engine)return false;const key=edition.id;if(key===engineKey&&api){syncEngine();return true;}if(key===engineKey&&mounted)return true;api=null;mounted=true;engineKey=key;const token=++epoch;const u=edition.engine==='harisharan'?new URL('workspace/',location.href):new URL('cad/aad/multistorey/',root);u.searchParams.set('embed','1');u.searchParams.set('workspace','standard');if(edition.manifest)u.searchParams.set('manifest',new URL(edition.manifest,root).pathname);if(edition.structure)u.searchParams.set('structure',edition.structure);frame.src=u.href;
 for(let i=0;i<150&&token===epoch;i++){await new Promise(r=>setTimeout(r,300));const candidate=frame.contentWindow?.ProjectDrawing;if(candidate?.getState()?.ready){api=candidate;mounted=false;syncEngine();frame.contentDocument.addEventListener('project-drawing-state',()=>{context();resizeFrame();});new ResizeObserver(resizeFrame).observe(frame.contentDocument.body);return true;}}
 if(token===epoch){$('pw-context').textContent='The drawing engine could not load. Source records remain available.';$('pw-context').classList.add('pw-error');mounted=false;engineKey='';}return false;}
function emptyViews(){return `<div class="pw-card"><h2>1 · Views · ${esc(edition.name)}</h2><p>${esc(edition.basis)}</p><div class="pw-empty-grid"><div class="pw-empty"><strong>2D plan</strong><p>Current private CAD sources have not been admitted as a public plan.</p></div><div class="pw-empty"><strong>3D model</strong><p>No admitted public geometry for this phase. An empty view does not imply zero work.</p></div></div><p><a href="?panel=sources#sources" data-open="sources">Open source and access records →</a></p></div>`;}
async function sources(){let groups=config.sourceGroups.map(g=>({...g,links:[...g.links]}));if(slug==='harisharan-adhikari'){const r=await fetch(new URL('data/projects/harisharan-adhikari/building.json',root));if(r.ok){const d=await r.json();groups.find(g=>g.harisharanSources).links=d.levels.map(l=>({title:l.name+' · original plan',href:new URL('data/projects/harisharan-adhikari/'+l.sourceSvg,root).href,image:true}));}}
 return `<div class="pw-card"><h2>5 · Sources & records</h2><p>${esc(edition.basis)}</p><p><a href="${new URL('data/cad/design-edition-contract.v1.json',root)}" target="_blank" rel="noopener">CAD design-edition and source-version contract</a> · Shared engine ${AAD_WORKSPACE_ENGINE_VERSION}</p><details class="pw-help"><summary>Design editions, checkpoints and interface releases</summary><p>A design edition names a project alternative or accepted design baseline. Source revisions identify evidence; checkpoints, software releases and document archives record its history. They do not become additional design editions.</p></details></div>`+groups.map((g,i)=>`<section class="pw-card" id="pw-source-${i}"><h2>${esc(g.title)}</h2><div class="pw-resource-grid">${g.links.map(l=>`<article class="pw-resource">${l.action?`<button data-engine-section="${l.action}">${esc(l.title)}</button>`:`<a href="${esc(new URL(l.href,location.href).href)}" target="_blank" rel="noopener">${esc(l.title)} ↗</a>${l.image?`<a href="${esc(new URL(l.href,location.href).href)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(new URL(l.href,location.href).href)}" alt="${esc(l.title)}"></a>`:''}`}<p>${esc(l.note||'Existing source evidence. Publication is not engineering approval.')}</p></article>`).join('')}</div></section>`).join('');}
async function choose(next,push=true){panel=next;section=(panel==='sources'||panel==='views')?section:'';if(panel==='packages'&&!packageById(slug,stage))stage=firstPackageId(slug);share(push);closeMenu();$('pw-edition-basis').textContent=edition.basis;$('pw-chapter-title').textContent=CHAPTERS.find(c=>c[0]===panel)[2]+' / '+edition.name;document.querySelectorAll('[data-west-chapter]').forEach(n=>{n.dataset.current=String(n.dataset.westChapter===panel);});document.querySelectorAll('[data-chapter]').forEach(b=>{const on=b.dataset.chapter===panel;b.setAttribute(b.getAttribute('role')==='tab'?'aria-selected':'aria-current',String(on));if(b.classList.contains('pw-link'))on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');});phaseOptions();renderEditionProvenance();refreshProjectEditEntry();$('pw-sub-sources').innerHTML=config.sourceGroups.map((g,i)=>`<button data-source="${i}">${esc(g.title)}</button><small>5.${i+1}.1 · Source evidence entries</small>`).join('');$('pw-sub-sources').querySelectorAll('button').forEach(b=>b.onclick=async()=>{section='';await choose('sources');$('pw-source-'+b.dataset.source)?.scrollIntoView({block:'start'});});$('pw-sub-boq').innerHTML='<small>2.1 · Phase measurements<br>2.1.1 · Measurement source/units<br>2.2 · Component register<br>2.2.1 · Floor member rows</small>';$('pw-sub-gantt').innerHTML='<small>3.1 · Activity sequence<br>3.1.1 · Calendar and durations<br>3.2 · Dependencies and basis<br>3.2.1 · Source planning assumptions</small>';$('pw-sub-packages').innerHTML='<strong class="pw-tree-section">4.1 · Original workbenches</strong>'+(packageRecords(slug).length?packageRecords(slug).map((r,i)=>`<button data-rail-package="${esc(r.id)}" aria-current="${panel==='packages'&&stage===r.id}">4.1.${i+1} · ${esc(r.title)}</button>`).join(''):'<small>4.1.1 · No original admitted modules</small>')+'<details class="pw-stage-tree"><summary>4.2 · Engineering normalization</summary>'+NORMALIZED_PACKAGE_CATALOG.map(x=>`<button data-normal-slot="${esc(x.id)}">${esc(x.number)} · ${esc(x.title)}</button>`).join('')+'</details>';$('pw-sub-packages').querySelectorAll('[data-rail-package]').forEach(b=>b.onclick=()=>{stage=b.dataset.railPackage;choose('packages');});$('pw-sub-packages').querySelectorAll('[data-normal-slot]').forEach(b=>b.onclick=async()=>{await choose('packages');const node=$('package-slot-'+b.dataset.normalSlot);if(node){node.open=true;node.scrollIntoView({block:'start'});}});
 const enginePanel=(panel==='views'||panel==='boq'||panel==='gantt'&&slug==='harisharan-adhikari'||panel==='sources'&&['evidence','scenarios'].includes(section))&&Boolean(edition.manifest||edition.engine);frame.hidden=!enginePanel;$('pw-content').hidden=enginePanel;$('pw-stage-shortcut').hidden=!['views','boq'].includes(panel);$('pw-toolbar').hidden=panel==='packages'||panel==='sources'&&!enginePanel;$('pw-layout').closest('label').hidden=panel!=='views';$('pw-fit').hidden=panel!=='views';const phaseInfo=edition.levels.find(l=>l.id===phase);$('pw-scope').textContent=phaseInfo?.note||(panel==='gantt'?config.programme:panel==='boq'?config.quantities:'Same phase and selected object in the plan, model and register.');
 if(enginePanel){await ensureEngine();syncEngine();}else{$('pw-content').innerHTML=panel==='packages'?renderPackages({slug,root,editionId:edition.id,selected:stage,query:packageQuery,filter:packageFilter,mode:packageMode,escape:esc}):panel==='sources'?await sources():panel==='views'?emptyViews():panel==='boq'?`<section class="pw-card"><h2>2 · Quantities / BOQ</h2><p>${esc(config.quantities)}</p><p class="pw-note">Measurement values are pending. No zero quantities or prices are implied.</p><a href="?panel=sources#sources" data-open="sources">Open existing estimate and source records →</a></section>`:`<section class="pw-card"><h2>3 · Programme / Gantt</h2><p>${esc(config.programme)}</p><div class="pw-note">Schedule not admitted · start date unknown · no live scheduling integration claimed</div></section>`;context();}
 $('pw-content').querySelectorAll('[data-package-id]').forEach(b=>b.onclick=()=>{stage=b.dataset.packageId;choose('packages');});if(panel==='packages'){const refresh=()=>{const rows=packageRecords(slug);$('pw-package-cards').innerHTML=renderPackageCards({records:rows,selected:stage,query:packageQuery,filter:packageFilter,escape:esc});$('pw-package-cards').querySelectorAll('[data-package-id]').forEach(b=>b.onclick=()=>{stage=b.dataset.packageId;choose('packages');});$('pw-package-result-count').textContent=String(filterPackageRecords(rows,packageQuery,packageFilter).length);};$('pw-package-search').oninput=()=>{packageQuery=$('pw-package-search').value;refresh();};$('pw-package-filter').onchange=()=>{packageFilter=$('pw-package-filter').value;refresh();};$('pw-content').querySelectorAll('[data-package-mode]').forEach(b=>b.onclick=()=>{packageMode=b.dataset.packageMode;$('pw-package-cards').classList.toggle('grid',packageMode==='grid');$('pw-content').querySelectorAll('[data-package-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});const preview=$('pw-package-preview');if(preview)preview.ontoggle=()=>{const iframe=preview.querySelector('[data-package-preview-src]');if(preview.open&&iframe&&!iframe.src)iframe.src=iframe.dataset.packagePreviewSrc;};}$('pw-content').querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{e.preventDefault();choose(b.dataset.open);});$('pw-content').querySelectorAll('[data-engine-section]').forEach(b=>b.onclick=()=>{section=b.dataset.engineSection;choose('sources');});$('pw-inspector').innerHTML=renderPackageInspector({slug,root,editionId:edition.id,selected:stage,panel,phase,escape:esc});await renderReviewNavigation();const cp=$('pw-copy-package');if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(cp.dataset.copyPackage);cp.textContent='Link copied';}catch{cp.textContent='Copy unavailable — use browser share';}};await renderOwnerRevision();return true;}
document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>{section='';choose(b.dataset.chapter);});const chapterTabs=[...document.querySelectorAll('.pw-chapter-bar button')];chapterTabs.forEach((b,i)=>b.onkeydown=e=>{const count=chapterTabs.length,n=e.key==='ArrowRight'?(i+1)%count:e.key==='ArrowLeft'?(i+count-1)%count:e.key==='Home'?0:e.key==='End'?count-1:null;if(n!==null){e.preventDefault();chapterTabs[n].focus();section='';choose(chapterTabs[n].dataset.chapter);}});
$('pw-phase').onchange=()=>{phase=$('pw-phase').value;share();phaseOptions();refreshProjectEditEntry();syncEngine();context();renderReviewNavigation();$('pw-scope').textContent=edition.levels.find(l=>l.id===phase)?.note||config.quantities;};$('pw-layout').onchange=()=>{layout=$('pw-layout').value;share();refreshProjectEditEntry();api?.setLayout(layout);setTimeout(resizeFrame,50);};$('pw-fit').onclick=()=>api?.fit();
$('pw-new-edition').onclick=()=>{
 if(config.synthetic)return;
 const handover=nextEditionRequest({projectSlug:slug,projectName:config.name,selectedEdition:edition,phase,requests:projectReviewRequests});
 $('pw-change-request').open=true;
 $('pw-request-type').value='request-modify';
 if(!$('pw-request-note').value.trim())$('pw-request-note').value='Please create a NEW source-backed design edition from '+edition.id+' without overwriting the previous edition. Proposed design change: ';
 $('pw-request-export-preview').value=JSON.stringify(handover,null,2);
 requestStatus('New design-edition instruction prepared locally. Describe your specific change, record it and copy/export the request history for review. Nothing has been published or changed in GitHub.');
 $('pw-change-request').scrollIntoView({block:'start',behavior:'smooth'});
 $('pw-request-note').focus();
};
$('pw-edit-request-open').onclick=()=>{
 const area=$('pw-change-request');area.open=true;area.scrollIntoView({block:'start',behavior:'smooth'});
};
$('pw-request-record').onclick=()=>{
 const note=$('pw-request-note').value.trim(),id=$('pw-request-object').value.trim();
 if(note.length<10){requestStatus("Describe the proposed change in at least ten characters; nothing recorded.");return;}
 if(projectReviewRequests.length>=100){requestStatus("Export existing request history before adding more.");return;}
 const action=$('pw-request-type').value;
 if(!["request-remove","request-modify","request-add","question"].includes(action))return;
 const request={
  id:"request-"+String(projectReviewRequests.length+1).padStart(4,'0'),
  createdAt:new Date().toISOString(),action,phase,objectId:id||null,description:note,
  applied:false,status:"REVIEW_REQUIRED_NOT_APPLIED"
 };
 projectReviewRequests.push(request);
 try{localStorage.setItem(requestKey(),JSON.stringify(requestBundle()));}catch(_){}
 $('pw-request-note').value='';renderRequestHistory();
};
$('pw-request-copy').onclick=async()=>{
 const value=requestHandover();
 try{await navigator.clipboard.writeText(value);requestStatus("Copied local project change request log to clipboard; source unchanged.");}
 catch(_){$('pw-request-export-preview').focus();$('pw-request-export-preview').select();requestStatus("Clipboard unavailable. Select/copy the request log below manually.");}
};
$('pw-request-export').onclick=()=>{
 const json=JSON.stringify(requestBundle(),null,2);
 const file=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(file);
 const a=document.createElement('a');a.href=url;a.download=slug+"_"+edition.id+"_AAD_CHANGE_REQUESTS.json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 requestStatus("Downloaded proposal-only request history. Nothing has been written to GitHub or Drive.");
};
$('pw-open-stages').onclick=()=>{stage=stage||firstPackageId(slug);choose('packages');};$('pw-edition').onchange=()=>{edition=config.editions.find(e=>e.id===$('pw-edition').value);reviewIndex=0;engineKey='';mounted=false;epoch++;section='';choose(panel);};$('pw-project').onchange=()=>location.assign(new URL('projects/'+$('pw-project').value+'/',root));$('pw-menu').onclick=()=>{const open=document.body.dataset.menu!=='open';document.body.dataset.menu=open?'open':'closed';$('pw-menu').setAttribute('aria-expanded',String(open));};addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});addEventListener('popstate',()=>{const p=new URL(location.href).searchParams;edition=config.editions.find(e=>e.id===p.get('edition'))||config.editions[0];$('pw-edition').value=edition.id;phase=p.get('phase')||config.defaultLevel;layout=p.get('layout')||'split';$('pw-layout').value=layout;section=p.get('section')||'';stage=p.get('package')||p.get('stage')||firstPackageId(slug);const next=p.get('panel')==='views'&&section==='stages'?'packages':p.get('panel')||'views';if(next==='packages')section='';choose(next,false);});
frame.addEventListener('load',resizeFrame);window.ProjectWorkspace={getState:()=>({slug,edition:edition.id,phase,layout,panel,section,stage,package:stage,ready:!!api}),getDrawing:()=>api,getLineage:()=>currentLineage?JSON.parse(JSON.stringify(currentLineage)):null,getReviewGate:()=>document.getElementById('pw-dock')?.dataset.reviewId||null,getChangeRequests:()=>requestBundle(),getEditableManifest:()=>edition.manifest||null};choose(panel,false);

addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='project-workspace-section'&&['scenarios','evidence'].includes(e.data.section)){section=e.data.section;choose('sources');}});

addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='project-workspace-panel'&&['views','boq'].includes(e.data.panel)){section='';choose(e.data.panel);}});
