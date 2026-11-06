import {assembly} from '../../../assets/js/harisharan-takeoff.mjs';
import {draftDefaults,validateDraft,scopeCalculation,scopeMemberGraph,REAR_NINE_CANDIDATE,ALTERNATE_NINE_CANDIDATE,REAR_DRAFT_SCHEMA,GOVERNING_REPORT} from '../../../assets/js/harisharan-rear-nine.mjs';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nfmt=(n,d=2)=>Number(n).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});
const storageKey='harisharan-rear-nine-draft-2:INTAKE-20260826-HARISHARAN'; // pre-report v1 draft stays separate; no silent migration
let source,draft,scope,stageFilter='ALL',error='',savedLabel='Not yet saved';
const setError=e=>{error=String(e||'');if($('error-message'))$('error-message').textContent=error;};
function persist(){
 if(!source||draft.selectedNodeIds.length!==9){savedLabel='Select nine columns to save';return;}
 try{const clean=validateDraft(draft,source);localStorage.setItem(storageKey,JSON.stringify(clean));savedLabel='Saved locally on this browser · NOT synced to Drive or GitHub';setError('');}
 catch(e){savedLabel='Not saved · '+e.message;setError(e.message);}
 if($('saved-label'))$('saved-label').textContent=savedLabel;
}
function initialDraft(){
 const fallback=draftDefaults(source);
 try{const raw=localStorage.getItem(storageKey);if(raw){return validateDraft(JSON.parse(raw),source);}}
 catch(e){savedLabel='Local draft rejected; source data restored';setError(e.message);}
 return fallback;
}
function setGroup(which){
 draft.selectedNodeIds=[...(which==='rear'?REAR_NINE_CANDIDATE:ALTERNATE_NINE_CANDIDATE)];
 draft.label=which==='rear'?'User-circled upper block rows 4–6 · report member IDs (geographic direction unverified)':'Rows 1–3 · alternate unconfirmed block';
 draft.overrides={};persist();render();
}
function updateNode(id){
 const old=new Set(draft.selectedNodeIds);
 if(old.has(id))old.delete(id);
 else if(old.size<9)old.add(id);
 else{setError('Nine columns selected. Unselect one before choosing a replacement.');return;}
 draft.selectedNodeIds=[...old];
 draft.overrides={};
 if(old.size===9)persist();else savedLabel='Selection incomplete: '+old.size+'/9 · finish selection to calculate';
 render();
}
const sourceStage=(id)=>{if(id.startsWith('F-'))return 'Footings';if(id.startsWith('C-'))return 'Column verticals';if(id.startsWith('CT-'))return 'Column ties';if(id.startsWith('ST-'))return 'Strap beams';if(id.startsWith('PB-'))return 'Plinth beams';return 'Other';};
function mapSvg(){
 const all=assembly(source),selected=new Set(draft.selectedNodeIds),graph=scopeMemberGraph(source,draft.selectedNodeIds,draft.includeBoundaryPlinth);
 const px=n=>97+n.x*32.5,py=n=>416-n.z*11.8;
 const lines=(list,color,dash,shift=0)=>list.map(b=>'<line x1="'+px(b.a)+'" y1="'+(py(b.a)+shift)+'" x2="'+px(b.b)+'" y2="'+(py(b.b)+shift)+'" stroke="'+color+'" stroke-width="3"'+(dash?' stroke-dasharray="'+dash+'"':'')+' opacity=".9" />').join('');
 const bg=all.nodes.map(n=>'<circle cx="'+px(n)+'" cy="'+py(n)+'" r="14" fill="'+(selected.has(n.id)?'#147b72':'#e2e9e9')+'" stroke="'+(selected.has(n.id)?'#0b514e':'#91a9ae')+'" stroke-width="2" data-node="'+n.id+'" role="button" tabindex="0" aria-label="Toggle column '+n.id+'"/><text x="'+px(n)+'" y="'+(py(n)+3.5)+'" text-anchor="middle" pointer-events="none" font-size="10" font-weight="800" fill="'+(selected.has(n.id)?'white':'#4d666b')+'">'+n.id+'</text>');
 return '<svg viewBox="0 0 550 460" role="img" aria-label="Diagram of the eighteen source grid nodes; nine candidate columns selected. No surveyed north alignment.">'+
 '<rect width="550" height="460" fill="#f9fdfb"/>'+
 Array.from({length:6},(_,i)=>'<line x1="56" y1="'+(416-i*59)+'" x2="520" y2="'+(416-i*59)+'" stroke="#d5e3e1" stroke-dasharray="4 5" />').join('')+
 graph.plinthBoundary.filter(b=>draft.includeBoundaryPlinth).map(b=>'<line x1="'+px(b.a)+'" y1="'+py(b.a)+'" x2="'+px(b.b)+'" y2="'+py(b.b)+'" stroke="#13736a" stroke-width="3" stroke-dasharray="6 5"/>').join('')+
 lines(graph.plinthInternal,'#158476','')+lines(graph.straps,'#b67b2d','6 4',-5)+
 bg.join('')+'<text x="16" y="22" font-size="12" fill="#596b6f">Source X / plan Z · orientation unverified</text>'+
 '<text x="18" y="442" font-size="11" fill="#596b6f">Row 1</text><text x="18" y="121" font-size="11" fill="#596b6f">Row 6</text></svg>';
}
function metric(label,value,unit,sub){return '<div class="metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(unit)+' · '+esc(sub)+'</small></div>';}
function summaryScope(){
 if(!scope)return '<div class="alert">Select exactly nine columns to calculate the scoped source scenario. No quantities are accepted while the selection is incomplete.</div>';
 const v=scope.volumes;
 return '<div class="metrics">'+metric('Columns / footing pads',scope.scope.columns+' / '+scope.scope.footings,'members','source IDs, not approvals')+
 metric('Strap spans',scope.scope.strapBeams,'connected beams','transverse only')+
 metric('Plinth spans',scope.scope.plinthTotal,'connected beams',scope.scope.plinthBoundary+' boundary to outside nodes')+
 metric('Provisional steel',nfmt(scope.steelKg/1000,3),'tonnes','linear-bar subtotal, not BBS')+
 metric('Footing envelopes',nfmt(v.footingEnvelopeM3,3),'m³','full-prism scenario / sloped profile HOLD')+
 metric('All selected RCC',nfmt(v.rccScenarioM3,3),'m³','footing + columns + strap + plinth; NOT approved')+
 metric('Footing PCC',nfmt(v.pccPadOnlyM3,3),'m³','pad footprint only; excludes unverified soling')+
 metric('Cement procurement','—','unknown','grade/mix conflict HAR-01')+'</div>'+
 '<div class="notice"><strong>Boundary accounting:</strong> '+scope.scope.plinthInternal+' internal plinth spans and '+scope.scope.plinthBoundary+' crossing into adjacent rows are '+(draft.includeBoundaryPlinth?'included':'separated / excluded')+'. Do not count those boundary spans again in the next work package.</div>';
}
function memberSummary(){
 if(!scope)return '';
 const d=scope.graph;
 const names=d.nodes.map(n=>'<tr><td class="id">'+esc(n.id)+'</td><td>'+esc(n.type)+'</td><td>'+esc(n.footing)+'</td><td class="num">'+nfmt(n.x,3)+'</td><td class="num">'+nfmt(n.z,3)+'</td><td>'+esc(n.id==='B4'?'C1: 6Ø25 + 6Ø20':n.type==='C2'||n.type==='C3'||n.type==='C4'?'12Ø20, source-stage assumption':'source review')+'</td></tr>').join('');
 const beams=(list,group)=>list.map(b=>'<tr><td class="id">'+esc(b.id)+'</td><td>'+esc(group)+'</td><td>'+esc(b.a.id+' ↔ '+b.b.id)+'</td><td class="num">'+nfmt(b.length,3)+'</td></tr>').join('');
 return '<h3>1.2.1 · Nine columns and their footing IDs</h3><div class="table-scroll"><table><thead><tr><th>Column</th><th>Type</th><th>Footing</th><th>X · m</th><th>Plan Z · m</th><th>Drawing-scenario vertical steel</th></tr></thead><tbody>'+names+'</tbody></table></div>'+
 '<details><summary>1.2.2 · Connected strap and plinth beams ('+(d.straps.length+d.plinth.length)+')</summary><div class="detail-inner"><div class="table-scroll"><table><thead><tr><th>Beam ID</th><th>Boundary type</th><th>Connects</th><th>CL · m</th></tr></thead><tbody>'+
 beams(d.straps,'strap: internal')+beams(d.plinthInternal,'plinth: internal')+(draft.includeBoundaryPlinth?beams(d.plinthBoundary,'plinth: boundary to next scope'):'')+
 '</tbody></table></div><p class="small muted">Transverse strap spans and longitudinal plinth spans are source-grid interpretations; intermediate right-column positions (E4 and D5) remain PDF-scaled candidates.</p></div></details>';
}
function groupRows(){
 if(!scope)return '';
 const rows=scope.rows.filter(r=>stageFilter==='ALL'||sourceStage(r.id)===stageFilter);
 return '<div class="table-scroll"><table><thead><tr><th>Source bar ID</th><th>Work package</th><th>Diameter mm</th><th>Bar count</th><th>Cut length m</th><th>Net kg</th><th>Reference / unapproved details</th></tr></thead><tbody>'+
 rows.map(r=>'<tr'+(r.edited?' style="background:#fff8e9"':'')+'><td class="id">'+esc(r.id)+(r.edited?' <span class="approved-badge">DRAFT EDIT</span>':'')+'</td><td>'+esc(sourceStage(r.id))+'</td>'+
 '<td><input type="number" step="1" min="6" max="40" data-bar-id="'+esc(r.id)+'" data-bar-field="diameter" value="'+esc(r.diameter)+'" aria-label="'+esc(r.id)+' diameter in millimetres"></td>'+
 '<td><input type="number" step="1" min="1" max="2000" data-bar-id="'+esc(r.id)+'" data-bar-field="count" value="'+esc(r.count)+'" aria-label="'+esc(r.id)+' bar count"></td>'+
 '<td><input type="number" step="0.001" min="0.05" max="35" data-bar-id="'+esc(r.id)+'" data-bar-field="cut" value="'+nfmt(r.cut,3).replace(/,/g,'')+'" aria-label="'+esc(r.id)+' cut length in metres"></td>'+
 '<td class="num">'+nfmt(r.kg,2)+'</td><td class="source-note">'+esc(r.ref)+' · '+esc(r.note)+'<div>Source: '+r.sourceCount+' × '+nfmt(r.sourceCut,3)+'m, Ø'+r.sourceDiameter+'</div></td></tr>').join('')+'</tbody></table></div>'+
 '<p class="editor-note">Editing count, diameter or cut length changes <strong>only a local unapproved draft</strong>. Cutting shape, development, anchorage, laps, bends, exact ties, workmanship and actual stock are unresolved. Edits never rewrite the original structural schedule.</p>';
}
function stagesSummary(){
 if(!scope)return '';
 return '<div class="table-scroll"><table><thead><tr><th>Stage</th><th>Bar lines</th><th>Provisional net kg</th></tr></thead><tbody>'+
 scope.stages.map(r=>'<tr><td>'+esc(r.stage)+'</td><td class="num">'+r.count+'</td><td class="num">'+nfmt(r.theoreticalSteelKg,2)+'</td></tr>').join('')+
 '<tr><th>Total · selected scope</th><th class="num">'+scope.rows.length+'</th><th class="num">'+nfmt(scope.steelKg,2)+'</th></tr></tbody></table></div>';
}
function render(){
 try{scope=draft.selectedNodeIds.length===9?scopeCalculation(source,draft):null;setError('');}catch(e){scope=null;setError(e.message);}
 const nodes=assembly(source).nodes;
 $('app').innerHTML='<section class="panel" id="governing-report"><h2>0.1 · Governing analysis report</h2>'+
 '<div class="notice"><strong>User-selected governing source:</strong> HAR-SRC-RPT-001 · 2083 · M25 concrete / Fe500 steel. The highlighted tie-beam drawing identifies the upper three rows (6–4); original actual column marks are A4/B4/E4, A5/B5/D5 and A6/B6/C6. The letter C visible on the plan is a third visual bay, not necessarily the unique report column ID at every row.</div>'+
 '<p><strong>Report beam rules:</strong> tie/plinth 300 × 350 mm, top and bottom each 2Ø20 + 1Ø16, Ø8 links @125 mm throughout; strap 450 × 800 mm, 8Ø20 top / 4Ø20 bottom, four-leg Ø8 @100 mm throughout. All corresponding tie-beam draft counts follow the report; the former STR-05 100/150 counts are preserved in source comparison fields.</p>'+
 '<p class="alert"><strong>Unresolved procurement HOLD:</strong> report says footing Ø16 @150 both ways but does not independently resolve top/bottom mat count; column tie size/spacing, bar shapes, anchorage, laps and site mix acceptance remain open. A report selected as governing is not a signed cut-and-bend instruction.</p></section>'+
 '<section class="panel" id="section-plan"><h2>1 · Nine-column selection</h2><p class="alert"><strong>User-confirmed nine-column block:</strong> the circled plan shows rows 6, 5 and 4. Unique right-column report marks are C6, D5 and E4. The geographic north/rear datum and structural issue-for-construction status have not been independently verified. You can select an alternate nine for comparison, not construction.</p>'+
 '<div class="layout"><div class="map-frame">'+mapSvg()+'<div class="legend"><span><i class="swatch" style="background:#147b72"></i>Selected column / pad</span><span><i class="swatch" style="background:#158476"></i>Plinth</span><span><i class="swatch" style="background:#b67b2d"></i>Strap</span><span>Dashed teal = boundary plinth</span></div></div>'+
 '<aside class="controls"><label>Preserved structural source<select disabled><option>HAR-SRC-STR-001 · Sept 2026</option></select></label><label>Review group<select id="group-select"><option value="rear"'+(draft.selectedNodeIds.join(',')===REAR_NINE_CANDIDATE.join(',')?' selected':'')+'>Rows 4–6 · candidate rear</option><option value="front"'+(draft.selectedNodeIds.join(',')===ALTERNATE_NINE_CANDIDATE.join(',')?' selected':'')+'>Rows 1–3 · opposite group</option><option value="custom">Custom nine IDs</option></select></label>'+
 '<div class="small">Selected: <strong>'+draft.selectedNodeIds.length+' / 9</strong>. Tap nodes or check IDs to choose a group; drawn member labels are not independently surveyed.</div><div class="check-grid">'+nodes.map(n=>'<label title="'+esc(n.type+' / '+n.footing)+'"><input type="checkbox" data-node-choice="'+esc(n.id)+'"'+(draft.selectedNodeIds.includes(n.id)?' checked':'')+'>'+esc(n.id)+'</label>').join('')+'</div>'+
 '<label><input id="include-boundary" type="checkbox" style="width:auto"'+(draft.includeBoundaryPlinth?' checked':'')+'> Include row-3 boundary plinth beams</label></aside></div></section>'+
 '<section class="panel"><h2>1.1 · Scope and material estimate</h2>'+summaryScope()+'</section>'+
 '<section class="panel" id="section-members"><h2>1.2 · Members, foundations and connections</h2>'+memberSummary()+'</section>'+
 '<section class="panel" id="section-bars"><h2>2 · Editable rebar calculation lines</h2><p class="alert"><strong>Quantity scenario, not fabrication BBS.</strong> Existing structural drawing choices conflict. Steel masses below exclude complete development/laps, anchorage, chairs, exact fabrication bends and project-specific approvals.</p>'+
 '<div class="grid-two"><label>2.1.1 · Column tie diameter scenario<select id="tie-dia"><option value="8"'+(draft.settings.columnTieDiameter===8?' selected':'')+'>STR-02 · Ø8</option><option value="10"'+(draft.settings.columnTieDiameter===10?' selected':'')+'>STR-06 · Ø10</option></select></label>'+
 '<label>2.1.2 · Tie spacing scenario<select id="tie-spacing"><option value=".125"'+(draft.settings.columnTieSpacing===.125?' selected':'')+'>125 mm · STR-02</option><option value=".1"'+(draft.settings.columnTieSpacing===.1?' selected':'')+'>100 mm · STR-06</option></select></label>'+
 '<label>2.1.3 · Footing mesh mats<select id="mats"><option value="2"'+(draft.settings.footingMats===2?' selected':'')+'>Top + bottom · STR-01 schedule</option><option value="1"'+(draft.settings.footingMats===1?' selected':'')+'>Lower-only section interpretation · HOLD</option></select></label>'+
 '<label>2.1.4 · Source-study RCC cement allowance (kg/m³)<input id="dosage" type="number" min="200" max="500" step="5" value="'+draft.settings.rccCementKgM3+'"></label></div>'+
 '<p class="small muted">RCC dosage setting is kept to reproduce the existing estimate; <strong>cement procurement remains unknown</strong> until a mix design and grade conflict are resolved.</p>'+
 '<div class="editor-toolbar"><label>2.2.1 · Bar group <select id="stage-filter">'+['ALL','Footings','Column verticals','Column ties','Strap beams','Plinth beams'].map(g=>'<option value="'+esc(g)+'"'+(stageFilter===g?' selected':'')+'>'+esc(g==='ALL'?'All selected bar rows':g)+'</option>').join('')+'</select></label><button id="reset-overrides">Restore published bar assumptions</button></div>'+
 '<div id="bar-table">'+groupRows()+'</div><h3>2.3.1 · Steel subtotal by stage</h3>'+stagesSummary()+'</section>'+
 '<section class="panel" id="section-qa"><h2>3.1 · Engineering QA and unresolved sources</h2><p class="alert">Do not cut or install reinforcement, select concrete grade, construct footings or authorize pours from this draft. A qualified structural engineer must accept the source revision and approve a complete BBS/design. Source report and drawings conflict.</p>'+
 '<details open><summary>3.1.1 · Original project source conflicts ('+source.issues.length+')</summary><div class="detail-inner"><ol class="qa-list">'+source.issues.map(q=>'<li><strong>'+esc(q.id)+' · '+esc(q.title)+'</strong><div>'+esc(q.detail)+'</div></li>').join('')+'</ol></div></details>'+
 '<details><summary>3.1.2 · Work-package release checklist</summary><div class="detail-inner"><ul><li>Rear-versus-front orientation and exact nine column IDs verified on accepted structural plan</li><li>Columns, pad types and every transverse/longitudinal connection accepted by structural engineer</li><li>Footing sloped profiles, founding/levels, design loads and soil bearing independently checked</li><li>M20/M25 grade and approved site mix/test design reconciled</li><li>Footing mat conflict, column tie Ø8/Ø10 and spacing, strap/plinth link details resolved</li><li>Full bar shapes, cover, bend deductions, hooks, development, laps, chairs and stock cutting list approved</li><li>Signed drawings/permits, inspector release and site QA evidence attached in governed Drive</li></ul><p class="state">ALL OPEN · no construction approval issued by this browser.</p></div></details></section>'+
 '<section class="panel" id="section-save"><h2>3.2 · Editable draft / evidence handoff</h2>'+
 '<p>Edits are saved <strong>only to this browser</strong>. Export JSON to submit the scoped proposal to your governed project Drive for review; importing a file restores a draft only if its original source fingerprint matches. A public GitHub Pages page cannot safely write shared project engineering records without a separate authenticated backend.</p>'+
 '<label>3.2.1 · Field observations / reviewer questions<textarea id="field-notes" maxlength="4000" placeholder="Record measurements or conflicts; do not insert personal information here.">'+esc(draft.fieldNotes)+'</textarea></label>'+
 '<div class="buttons"><button id="save-local" class="primary">Save editable draft here</button><button id="export-json">Export draft JSON</button><button id="import-json">Import draft JSON</button><input hidden id="import-file" type="file" accept=".json,application/json"><button id="reset-draft" class="danger">Reset browser draft</button></div>'+
 '<p id="saved-label" class="small muted">'+esc(savedLabel)+'</p><p id="error-message" role="alert">'+esc(error)+'</p>'+
 '<p class="small">Source logical ID: <code>'+esc(source.logicalId)+'</code> · Source revision: <code>'+esc(source.revision)+'</code> · Original structural SHA256: <code>'+esc(draft.sourceFileSha256)+'</code>. Approval status: <span class="state">DRAFT_NOT_FOR_CONSTRUCTION</span>.</p></section>';
 bind();
}
function recalcAfterChange(){
 if(draft.selectedNodeIds.length===9)persist();
 render();
}
function bind(){
 $('group-select').onchange=e=>{if(e.target.value!=='custom')setGroup(e.target.value);};
 $('include-boundary').onchange=e=>{draft.includeBoundaryPlinth=e.target.checked;draft.overrides={};recalcAfterChange();};
 document.querySelectorAll('[data-node-choice]').forEach(el=>{el.onchange=()=>updateNode(el.dataset.nodeChoice)});
 document.querySelectorAll('[data-node]').forEach(el=>{
  el.addEventListener('click',()=>updateNode(el.dataset.node));
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();updateNode(el.dataset.node)}});
 });
 for(const [id,key,parser] of [['tie-dia','columnTieDiameter',Number],['tie-spacing','columnTieSpacing',Number],['mats','footingMats',Number],['dosage','rccCementKgM3',Number]]){
 $(''+id).onchange=e=>{draft.settings[key]=parser(e.target.value);if(id==='tie-dia')draft.settings.columnTieSpacing=draft.settings.columnTieDiameter===8?.125:.1;draft.overrides={};recalcAfterChange();};
 }
 $('stage-filter').onchange=e=>{stageFilter=e.target.value;render();};
 $('reset-overrides').onclick=()=>{draft.overrides={};recalcAfterChange();};
 document.querySelectorAll('[data-bar-id]').forEach(el=>el.onchange=e=>{
  const id=el.dataset.barId,field=el.dataset.barField,v=Number(el.value);
  const existing=draft.overrides[id]||{},next={...existing,[field]:v};
  draft.overrides[id]=next;
  try{const c=scopeCalculation(source,draft);scope=c;persist();render();}
  catch(err){delete draft.overrides[id];render();setError('Bar edit rejected: '+err.message);}
 });
 $('field-notes').onchange=e=>{draft.fieldNotes=e.target.value;persist();};
 $('save-local').onclick=()=>{draft.fieldNotes=$('field-notes').value;persist();};
 $('export-json').onclick=()=>{
  if(!scope){setError('Select exactly nine source columns and resolve invalid draft fields before export.');return;}
  try{const data=validateDraft({...draft,fieldNotes:$('field-notes').value},source);
  const safe={...data,exportedAt:new Date().toISOString(),documentStatus:'UNAPPROVED / FOR ENGINEERING REVIEW ONLY',
  sourceNote:'No live Google Drive or GitHub update; private import and engineer approval required.'};
  const blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='harisharan-nine-columns-draft-'+data.selectedNodeIds.join('-')+'.json';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setError(e.message);}
 };
 $('import-json').onclick=()=>$('import-file').click();
 $('import-file').onchange=async e=>{try{
  const file=e.target.files?.[0];if(!file)return;if(file.size>500000)throw Error('Draft file exceeds 500KB');
  const raw=JSON.parse(await file.text());draft=validateDraft(raw,source);persist();render();
  }catch(err){setError('Import rejected: '+err.message);}finally{e.target.value=''}};
 $('reset-draft').onclick=()=>{if(!confirm('Reset only this browser draft to the current published source study?'))return;localStorage.removeItem(storageKey);draft=draftDefaults(source);stageFilter='ALL';savedLabel='Source defaults restored';render();};
}
try{
 const res=await fetch('../../../data/projects/harisharan-adhikari/takeoff.json',{cache:'no-store'});
 if(!res.ok)throw Error('Cannot load project takeoff source ('+res.status+')');
 source=await res.json();
 if(!source.sources.some(s=>s.id==='HAR-SRC-STR-001'))throw Error('Structural source ID missing');
 draft=initialDraft();
 render();
 window.HarisharanRearNine={getState:()=>({selectedIds:[...draft.selectedNodeIds],scope:scope?.scope||null,steelKg:scope?.steelKg||null,sourceRevision:source.revision,savedLabel}),schema:REAR_DRAFT_SCHEMA};
}catch(e){
 $('app').innerHTML='<div class="panel alert">Source load failure: '+esc(e.message)+'. No calculated quantities have been published from an unverified source.</div>';
}
