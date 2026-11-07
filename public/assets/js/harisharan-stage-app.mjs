import {STAGES,buildHarisharanStages,memberSegmentScenario} from './harisharan-seven-stages.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=3)=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('en-IN',{maximumFractionDigits:d,minimumFractionDigits:d}):'Not determined';
const configuredStage=document.body.dataset.harStage||'v02',stage=STAGES.find(x=>x.id===configuredStage);
if(!stage)throw Error('Unsupported Harisharan stage');
const root=new URL('../../',import.meta.url);
const route=id=>new URL('projects/harisharan-adhikari/stages/'+id+'/',root).href;
const sourceUrl=new URL('data/projects/harisharan-adhikari/takeoff.json',root);
const draftOwner='Harisharan / source qualified · not an approved fabrication BBS';
const params=new URLSearchParams(location.search);
const ui={
 member:params.get('member')||'',filter:params.get('filter')||'all',mats:params.get('mats')==='1'?1:2,
 ties:params.get('ties')==='10'?10:8,spacing:params.get('spacing')==='100'?.1:.125,
 dosage:350,lower:null,upper:null,showKeys:true
};
let source,model,errorMessage='';
function scenario(){return {footingMats:ui.mats,columnTieDiameter:ui.ties,columnTieSpacing:ui.spacing,rccCementKgM3:ui.dosage};}
function records(){return model.byStage[stage.id].filter(x=>stage.id!=='m70'||ui.filter==='all'||x.kind===ui.filter);}
function pick(record){if(!record)return;ui.member=record.id;ui.lower=null;ui.upper=null;history.replaceState({},'',shareUrl().href);paint();}
function shareUrl(){const u=new URL(location.href);u.searchParams.set('member',ui.member);if(ui.mats!==2)u.searchParams.set('mats',String(ui.mats));else u.searchParams.delete('mats');if(ui.ties!==8)u.searchParams.set('ties',String(ui.ties));else u.searchParams.delete('ties');if(ui.spacing!==.125)u.searchParams.set('spacing','100');else u.searchParams.delete('spacing');if(ui.filter!=='all')u.searchParams.set('filter',ui.filter);else u.searchParams.delete('filter');return u;}
function coordinates(node){return {x:65+node.x*43,y:600-node.z*19};}
function drawPlan(selected){
 const nodes=model.geometry.nodes,idx=new Map(nodes.map(n=>[n.id,n]));
 const line=(b,interactive)=>{
  const a=coordinates(idx.get(b.a)),c=coordinates(idx.get(b.b)),isActive=selected?.id===b.id;
  return '<g class="hs-plan-line'+(isActive?' active':'')+'"'+(interactive?' data-select-member="'+esc(b.id)+'" tabindex="0" role="button" aria-label="Select '+esc(b.id)+'"':'')+'>'+
    '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+c.x+'" y2="'+c.y+'" stroke="'+(b.id.startsWith('ST-')?'#b68a3f':'#2d8e8d')+'" stroke-width="'+(isActive?8:3)+'"'+(b.id.startsWith('ST-')?' stroke-dasharray="9 6"':'')+' />'+
    (interactive?'<line class="hs-hit" x1="'+a.x+'" y1="'+a.y+'" x2="'+c.x+'" y2="'+c.y+'" stroke="transparent" stroke-width="17"/>':'')+'</g>';
 };
 const phase=stage.id==='m70';
 const segments=phase?model.geometry.plinth.filter(b=>ui.filter!=='strap').map(b=>line(b,true)).join('')+model.geometry.straps.filter(b=>ui.filter!=='plinth-beam').map(b=>line(b,true)).join(''):model.geometry.plinth.map(b=>line(b,false)).join('');
 const nodeMarks=nodes.map(n=>{
   const p=coordinates(n);
   const memberId=stage.id==='v02'?'PCC-'+n.id:stage.id==='v03'?'F-'+n.id:stage.id==='m40'?'PAD-'+n.id:stage.id==='m50'?'DOWEL-'+n.id:'COL-'+n.id;
   const clickable=!phase&&stage.id!=='m80',active=!phase&&selected?.id===memberId;
   return '<g'+(clickable?' data-select-member="'+esc(memberId)+'" tabindex="0" role="button" aria-label="Select '+esc(memberId)+'"':'')+' class="hs-plan-node'+(active?' active':'')+'">'+
    '<circle cx="'+p.x+'" cy="'+p.y+'" r="'+(active?14:10)+'" fill="'+(active?'#196d65':'#eef7f4')+'" stroke="'+(active?'#196d65':'#6f9899')+'" stroke-width="2"/>'+
    '<text x="'+p.x+'" y="'+(p.y+3.5)+'" font-size="9" text-anchor="middle" font-weight="750" fill="'+(active?'white':'#234e55')+'">'+esc(n.id)+'</text></g>';
 }).join('');
 return '<svg class="hs-plan" role="img" aria-label="Source-based Harisharan substructure grid; plan Z up, no verified north bearing" viewBox="0 0 690 655">'+
  '<rect width="690" height="655" fill="#f9fcfb" />'+
  Array.from({length:6},(_,i)=>'<line x1="45" y1="'+(600-i*95)+'" x2="640" y2="'+(600-i*95)+'" stroke="#dbe9e6" stroke-dasharray="4 7"/><text x="18" y="'+(603-i*95)+'" fill="#496c72" font-size="11">'+(i+1)+'</text>').join('')+
  '<text x="20" y="23" fill="#476f74" font-size="12">Plan Z ↑ · geographic north not established</text>'+
  segments+nodeMarks+'<text x="20" y="640" fill="#647e83" font-size="11">A/B/right-side physical nodes (F→E→D→C toward row 6)</text></svg>';
}
function rowTable(rows){
 if(!rows?.length)return '<p class="hs-await">No source-admitted independent steel schedule for this selected item.</p>';
 return '<div class="hs-overflow"><table><thead><tr><th>Bar mark / family</th><th>Dia.</th><th>Count / sets</th><th>Length per bar/set</th><th>Theoretical weight</th><th>Source / release restriction</th></tr></thead><tbody>'+
 rows.map(r=>'<tr><td><strong>'+esc(r.id)+'</strong><small>'+esc(r.stage)+'</small></td><td class="number">Ø'+fmt(r.diameterMm,0)+'</td><td class="number">'+fmt(r.count,0)+'</td><td class="number">'+fmt(r.cutLengthM,3)+' m</td><td class="number">'+fmt(r.theoreticalKg,3)+' kg</td><td class="hs-note-cell"><strong>'+esc(r.governedBy)+'</strong><small>'+esc(r.qualification)+'</small>'+(r.originalSourceCount!==r.count?'<small>Original drawing count: '+fmt(r.originalSourceCount,0)+'</small>':'')+'</td></tr>').join('')+'</tbody></table></div>';
}
function modelSection(r){
 const g=r.geometry||{},height=g.grossHeightM??g.depthM??.6,width=g.widthM??.45,depth=g.depthM??.45;
 const ratio=Math.max(.16,Math.min(1,Number(height)||.45));
 // Geometric-extrusion cue, not a bending shape or approved cross-section drawing.
 const h=80+ratio*135,w=130;
 return '<svg role="img" aria-label="Source-based schematic extruded member: not a shop drawing" class="hs-axon" viewBox="0 0 440 300">'+
 '<rect width="440" height="300" fill="#f9fcfb"/>'+
 '<polygon points="112,'+(224-h)+' 242,'+(200-h)+' 310,'+(220-h)+' 180,'+(244-h)+'" fill="#b9ddd9" stroke="#417c7b" stroke-width="2"/>'+
 '<polygon points="112,'+(224-h)+' 180,'+(244-h)+' 180,245 112,223" fill="#a3cecc" stroke="#417c7b" stroke-width="2"/>'+
 '<polygon points="180,'+(244-h)+' 310,'+(220-h)+' 310,222 180,245" fill="#d6e9e6" stroke="#417c7b" stroke-width="2"/>'+
 '<polygon points="112,223 180,245 310,222 242,202" fill="#d7eae7" opacity=".35" stroke="#417c7b"/>'+
 (r.steelRows?.length?Array.from({length:4},(_,i)=>'<line x1="'+(125+i*35)+'" y1="'+(220-h-i*4)+'" x2="'+(125+i*35)+'" y2="'+(216-i*4)+'" stroke="#b16e3d" stroke-width="2.5" stroke-dasharray="5 6"/>').join(''):'')+
 '<text x="15" y="24" fill="#405e65" font-size="12" font-weight="700">'+esc(r.id)+'</text>'+
 '<text x="15" y="46" fill="#5c7b83" font-size="11">Section / cage = symbolic</text>'+
 '<text x="15" y="268" fill="#526c73" font-size="11">W '+fmt(width,3)+' m · D '+fmt(depth,3)+' m</text>'+
 '<text x="15" y="284" fill="#526c73" font-size="11">Modeled height '+fmt(height,3)+' m · not a BBS</text></svg>';
}
function meterElevSegment(r){
 if(r?.stage!=='m60')return '';
 const g=r.geometry;
 if(ui.lower===null)ui.lower=g.bottomElevationM;
 if(ui.upper===null)ui.upper=g.topElevationM;
 let scenario=null,err='';
 try{scenario=memberSegmentScenario(r,ui.lower,ui.upper)}catch(e){err=e.message}
 return '<section class="hs-section"><h3>2.3.1 · Column elevation slice (source-limited)</h3>'+
  '<p>You can inspect A1 from z=0 to the plinth level, or any segment strictly between footing top and plinth top. This changes only the measured volume/straight-bar reference, not the structural BBS.</p>'+
  '<div class="hs-slice"><label>From elevation (m; ground = 0)<input id="hs-lo" type="number" step=".01" min="'+g.bottomElevationM+'" max="'+g.topElevationM+'" value="'+ui.lower+'"/></label>'+
  '<label>To elevation (m; ground = 0)<input id="hs-hi" type="number" step=".01" min="'+g.bottomElevationM+'" max="'+g.topElevationM+'" value="'+ui.upper+'"/></label></div>'+
  '<p class="hs-elevation">Footing top '+fmt(g.bottomElevationM,2)+' m → Ground 0 m → Plinth top +'+fmt(g.topElevationM,2)+' m.</p>'+
  (err?'<p class="hs-warn">'+esc(err)+'</p>':'<p class="hs-metrics-inline">Segment '+fmt(scenario.segmentHeightM,3)+' m / '+fmt(scenario.heightFt,2)+' ft · Concrete geometry '+fmt(scenario.geometryConcreteM3,5)+' m³ · Straight vertical bar reference '+fmt(scenario.mainBarsTheoreticalKg,2)+' kg · **Ties/laps not apportioned or approved**.</p>')+'</section>';
}
function renderDetail(r){
 if(!r)return stage.id==='m80'?'<h2>M80 · Tank / services — source admission HOLD</h2><p class="hs-warn">ARC-02 site plan labels an underground water tank, septic tank and soak pit, but no engineer-admitted surveyed tank position, foundation connection, capacity, concrete section or base/wall/cover reinforcement schedule is present. Architectural siting does not authorize a structural takeoff. A Narayani tank is unrelated and must not be reused here.</p><h3>Required to complete this workbench</h3><ul><li>Actual site position, plan dimensions, depths, capacity and groundwater/soil constraints</li><li>Engineer-accepted section, base/wall/cover and reinforcement bar schedule</li><li>Concrete class/mix, waterproofing, drain/overflow and structural interfaces</li><li>Permits, code applicability, safety inspections and accepted issue/revision</li></ul><p>All tank material quantities remain <strong>unknown</strong>, not zero.</p>':
 '<div class="hs-await">Choose a source member from the plan or member list.</div>';
 const g=r.geometry,rows=r.steelRows,primary=r.stage==='v03'||r.stage==='m50'?false:true;
 const concreteLabel=r.stage==='v03'?'Linked M40 footing concrete reference':r.stage==='m50'?'Linked M60 column concrete reference':'Concrete geometric estimate';
 const steelLabel=r.stage==='m40'?'Linked V03 footing steel (NOT additive)':r.stage==='m50'?'M60 continuous bars — not a separate dowel quantity':r.stage==='v02'?'No independent PCC reinforcement scheduled':'Theoretical stage-owned steel (not a fabrication BBS)';
 const grade=r.stage==='v02'?'PCC mix not accepted':'Reported '+r.grade.concrete+' / '+r.grade.steel+'; no approved site batching mix';
 const isReference=r.stage==='v03'||r.stage==='m50';
 const mats=r.stage==='v03'||r.stage==='m40'?'Mesh layer assumption: '+ui.mats+' (report does not resolve top/bottom layers). ':'';
 const note=r.holds?.join(' • ')||'';
 const steelWeight=r.stage==='m50'?'Not independently quantified':r.stage==='m40'?fmt(r.theoreticalSteelKg,2)+' kg (V03 reference)':r.stage==='v02'?'Not source specified':fmt(r.theoreticalSteelKg,2)+' kg';
 const cement=r.cement;
 const barsLabel=(r.stage==='m50'||r.stage==='m40')?'Linked source rows (not to be added twice)':'Bars and reinforcement families';
 return '<h2>2.1 · '+esc(r.id)+' <span class="hs-status">'+esc(r.sourceStatus)+'</span></h2>'+
 '<p class="hs-lead">'+esc(r.kind)+' · '+esc(r.support?.id??(g.from&&g.to?g.from+' → '+g.to:'source geometry'))+
   ' · '+esc(grade)+'</p>'+
 '<div class="hs-detail-layout"><div class="hs-axon-wrap"><h3>2.1.1 · Spatial/section cue</h3>'+modelSection(r)+'</div>'+
 '<div class="hs-overview"><h3>2.1.2 · Measured source geometry</h3><dl class="hs-facts">'+
  Object.entries(g).filter(([k,v])=>['widthM','lengthM','depthM','footingMark','columnMark','bottomElevationM','topElevationM','grossHeightM','from','to','lengthCenterlineM','clearLengthM','pccThicknessM','elevationRelation'].includes(k)).map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(typeof v==='number'?fmt(v,4):v)+'</dd></div>').join('')+'</dl>'+
 '</div></div>'+
 '<div class="hs-metric-grid">'+
  '<div class="hs-metric"><span>'+esc(concreteLabel)+'</span><strong>'+fmt(r.concreteM3,5)+' m³</strong><small>'+esc(r.stage==='m40'?'600mm full prism envelope; sloped profile HOLD':'Geometric quantity; missing deductions may apply')+'</small></div>'+
  '<div class="hs-metric"><span>'+esc(steelLabel)+'</span><strong>'+esc(steelWeight)+'</strong><small>'+esc(mats)+'Provisional straight/equivalent bars only</small></div>'+
  '<div class="hs-metric"><span>Cement estimating scenario</span><strong>'+fmt(cement.planningBags,3)+' bags</strong><small>'+fmt(cement.planningKg,2)+' kg · '+esc(cement.status)+'</small></div>'+
  '<div class="hs-metric"><span>Site-approved cement / rebar</span><strong>UNKNOWN</strong><small>No accepted mix, BBS or field certification</small></div>'+
 '</div>'+
 '<section class="hs-section"><h3>2.2.1 · '+barsLabel+'</h3>'+
  '<p class="hs-lead">'+(isReference?'References are non-additive: do not count the same footing or column steel twice. ':'')+
  (r.stage==='v02'?'PCC source does not specify separate reinforcement for this blinding item. ':'')+
  'Bar weights use ϕ²/162 kg/m with scenario count and equivalent cut length; this is not a final shop BBS.</p>'+
  rowTable(rows)+'</section>'+
 meterElevSegment(r)+
 '<section class="hs-section"><h3>3.1.1 · Source / QA constraints</h3>'+
  '<div class="hs-warn"><strong>Engineering HOLD</strong><ul>'+r.holds.map(h=>'<li>'+esc(h)+'</li>').join('')+
  '</ul></div><p class="hs-lead">Drawing hash '+esc(r.source.sourceSha256?.slice(0,20))+'… · Governing report '+esc(r.source.governingId)+
  ' · original drawing and engineering report retained in Drive.</p></section>'+
 '<div class="hs-actions"><button type="button" id="hs-copy">Copy member link</button><button type="button" id="hs-export">Export member JSON</button></div>';
}
function selector(records,selected){
 if(stage.id==='m80')return '<p class="hs-await">No tank object is admitted. Do not substitute Narayani tank geometry.</p>';
 return '<div class="hs-list" role="group" aria-label="Select '+esc(stage.name)+'">'+records.map(r=>{
  const active=r.id===selected?.id,label=r.id.replace(/^(PCC-|F-|PAD-|DOWEL-|COL-)/,'');
  return '<button type="button" data-select-member="'+esc(r.id)+'" class="hs-member'+(active?' selected':'')+'" aria-pressed="'+active+'"><strong>'+esc(r.id)+'</strong><small>'+esc(r.kind)+
   (r.support?.footingType?' · '+esc(r.support.footingType):r.geometry.from?' · '+esc(r.geometry.from+'–'+r.geometry.to):'')+
   '</small></button>';
 }).join('')+'</div>';
}
function renderToolbar(selected){
 const g=stage.id;
 return '<div class="hs-options"><label>Footing mesh layers (unresolved)<select id="hs-mats"><option value="2"'+(ui.mats===2?' selected':'')+'>2 mats · STR-01 schedule</option><option value="1"'+(ui.mats===1?' selected':'')+'>1 mat · STR-02 section scenario</option></select></label>'+
 '<label>Column tie scenario<select id="hs-ties"><option value="8"'+(ui.ties===8?' selected':'')+'>Ø8 · STR-02</option><option value="10"'+(ui.ties===10?' selected':'')+'>Ø10 · STR-06</option></select></label>'+
 '<label>Tie spacing scenario<select id="hs-spacing"><option value="125"'+(ui.spacing===.125?' selected':'')+'>125 mm · STR-02</option><option value="100"'+(ui.spacing===.1?' selected':'')+'>100 mm · STR-06</option></select></label>'+
 '<label>RCC cement planning dosage (kg/m³; unapproved)<input type="number" min="200" max="500" step="5" id="hs-dose" value="'+ui.dosage+'"/></label></div>';
}
function renderNav(){
 return '<div class="hs-stage-tabs" role="navigation" aria-label="Seven Harisharan original-style workbenches">'+STAGES.map(x=>
 '<a class="'+(x.id===stage.id?'selected':'')+'" href="'+route(x.id)+'">'+esc(x.short)+'<small>'+esc(x.status)+'</small></a>').join('')+'</div>';
}
function paint(){
 const r=records();let selected=r.find(x=>x.id===ui.member);
 if(!selected&&r.length){selected=r[0];ui.member=selected.id;}
 if(!r.length)ui.member='';
 $('hs-stage-body').innerHTML='<section class="hs-panel hs-primary" id="hs-plan-section"><div class="hs-panel-heading"><h2>1 · Project plan / selected members</h2><p>'+esc(stage.summary)+'</p></div>'+
 '<div class="hs-plan-grid"><div class="hs-plan-wrap">'+drawPlan(selected)+'</div><aside class="hs-side"><label>1.1 · Search member<input type="search" id="hs-search" placeholder="A1, B4, PB-A1-B1, ST-A1-B1" autocomplete="off"></label>'+
 (stage.id==='m70'?'<label>Beam network filter<select id="hs-kind"><option value="all">Both · 39 runs</option><option value="plinth-beam"'+(ui.filter==='plinth-beam'?' selected':'')+'>27 tie/plinth beams</option><option value="strap"'+(ui.filter==='strap'?' selected':'')+'>12 transverse straps</option></select></label>':'')+
 '<p class="hs-count">'+r.length+' selectable source'+(r.length===1?' member':' members')+' · '+esc(stage.scope)+'</p>'+
 '<div id="hs-members">'+selector(r,selected)+'</div></aside></div></section>'+
 '<section class="hs-panel" id="hs-inspector"><div class="hs-panel-heading"><h2>2 · Selected member: full source-derived detail</h2><p>Every displayed measurement belongs to the selected element. Quantities marked reference must not be added twice.</p></div>'+renderDetail(selected)+'</section>'+
 '<section class="hs-panel" id="hs-assumptions"><h2>3 · Scenario parameters & release checks</h2><p class="hs-warn">No structural approval, fabrication cutting list or cement mix has been issued by this module. M25 is the report’s grade, but its cement kg/m³ is only a working estimate. Report and drawings disagree on reinforcement details.</p>'+
 renderToolbar(selected)+
 '<details><summary>3.1 · Report and original source hierarchy</summary><div><p><strong>Governing:</strong> HAR-SRC-RPT-001 · M25, Fe500, plinth Ø8 @125mm, strap 4-legged Ø8 @100mm; original STR-05/STR-06 stored for QA. Original source revision '+esc(source.revision)+'.</p>'+
 '<p>18 physical columns, 12 transverse straps, 27 tie/plinth runs. Footing F1 2550×2550×600 at B-row; F2 2700×2100×600 at other nodes. The selected rear block is row 4–6; grid right nodes E4/D5/C6.</p></div></details>'+
 '<details><summary>3.2 · Strict material non-duplication</summary><div><p>V02 owns pad-only PCC. V03 owns footing steel; M40 owns footing concrete and <em>references</em> V03 steel. M60 owns column steel and RCC; M50 is a <em>non-additive</em> starter/continuity reference. M70 owns plinth and strap RCC/steel. M80 is unadmitted. Never sum V03+M40 steel, M50+M60 steel, or linked cement references twice.</p></div></details>'+
 '</section>';
 $('hs-context').textContent=selected?selected.id+' · '+selected.kind+' · '+fmt(selected.concreteM3,3)+' m³ geometric RCC/PCC':'No admitted source element';
 bind(selected);
}
function bind(selected){
 for(const el of document.querySelectorAll('[data-select-member]')){
  const choose=()=>{const target=model.byStage[stage.id].find(x=>x.id===el.dataset.selectMember);if(target){ui.member=target.id;ui.lower=null;ui.upper=null;paint();history.replaceState({},'',shareUrl().href);}};
  el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
 }
 const search=$('hs-search');if(search)search.oninput=e=>{
  const q=e.target.value.trim().toLowerCase(),box=$('hs-members');
  for(const btn of box.querySelectorAll('.hs-member'))btn.hidden=!btn.textContent.toLowerCase().includes(q);
 };
 const kind=$('hs-kind');if(kind)kind.onchange=e=>{ui.filter=e.target.value;ui.member='';paint();history.replaceState({},'',shareUrl().href);};
 const inputMap=[['hs-mats','mats',Number],['hs-ties','ties',Number],['hs-spacing','spacing',v=>Number(v)/1000],['hs-dose','dosage',Number]];
 for(const [id,key,convert] of inputMap){
  const field=$(id);
  if(!field)continue;
  field.onchange=e=>{const prev=ui[key];ui[key]=convert(e.target.value);
   try{model=buildHarisharanStages(source,scenario());errorMessage='';paint();history.replaceState({},'',shareUrl().href);}
   catch(err){ui[key]=prev;errorMessage=err.message;paint();$('hs-error').textContent='Scenario rejected: '+errorMessage;}
  };
 }
 for(const [id,key] of [['hs-lo','lower'],['hs-hi','upper']]){
  const field=$(id);if(field)field.onchange=e=>{const value=Number(e.target.value);if(!Number.isFinite(value))return;ui[key]=value;paint();};
 }
 const copy=$('hs-copy');if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(shareUrl().href);copy.textContent='Member link copied';}catch(e){copy.textContent='Use address bar to copy link';}};
 const exp=$('hs-export');if(exp&&selected)exp.onclick=()=>{
  const safe={schema:'jp-cad://harisharan/site-member-export/1',exportedAt:new Date().toISOString(),
   status:'NOT_FOR_CONSTRUCTION',sourceRevision:source.revision,governingReport:'HAR-SRC-RPT-001',stage:stage.id,
   member:selected,sourceCaveat:'No approved BBS/mix/dowel/tank quantities; original sources and private Drive records remain authoritative'};
  const blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='harisharan-'+selected.id.toLowerCase()+'-source-qualified.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),700);
 };
}
async function boot(){
 $('hs-stage-nav').innerHTML=renderNav();
 $('hs-title').textContent=stage.short+' — '+stage.name;
 $('hs-summary').textContent=stage.summary;
 $('hs-authority').textContent=stage.authority+' · '+stage.status;
 $('hs-authority').insertAdjacentHTML('afterend','<p class="hs-context"><a href="'+new URL('projects/harisharan-adhikari/review/?stage='+stage.id,root).href+'">Open R1–R4 source review, linked 2D/3D study and provisional BOQ downloads</a> · NOT FOR CONSTRUCTION</p>');
 try{
  const response=await fetch(sourceUrl,{cache:'no-store'});if(!response.ok)throw Error('Project source not found ('+response.status+')');
  source=await response.json();model=buildHarisharanStages(source,scenario());
  if(!model.byStage[stage.id].some(r=>r.id===ui.member))ui.member=model.byStage[stage.id][0]?.id||'';
  paint();
  window.HarisharanStageWorkspace={getState:()=>({
   stage:stage.id,selectedId:ui.member,recordCount:model.byStage[stage.id].length,summary:model.summary[stage.id],
   total:model.totals,scenario:scenario(),readOnly:true,issueForConstruction:false
  }),getMember:id=>model.byStage[stage.id].find(r=>r.id===id)||null};
 }catch(e){$('hs-stage-body').innerHTML='<div class="hs-panel hs-warn">The source stage failed to load: '+esc(e.message)+'. No material quantity is published.</div>';}
}
boot();