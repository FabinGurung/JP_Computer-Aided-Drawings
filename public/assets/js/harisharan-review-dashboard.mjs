import {STAGES,buildHarisharanStages} from './harisharan-seven-stages.mjs';
import {REVIEW_HOLDS,CSV_SCHEMAS,safeCsv,buildReviewLedger,REVIEW_AUTHORITY,REVIEW_REVISION,STAGE_NAMES} from './harisharan-review-data.mjs';
const root=new URL('../../',import.meta.url);
const sourceUrl=new URL('data/projects/harisharan-adhikari/takeoff.json',root);
const projectUrl=new URL('projects/harisharan-adhikari/',root);
const $=(id)=>document.getElementById(id);
const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=(x,d=3)=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('en-IN',{maximumFractionDigits:d}):'Unknown';
const params=new URLSearchParams(location.search);
const state={stage:STAGES.some(x=>x.id===params.get('stage'))?params.get('stage'):'m70',member:params.get('member')||'',mats:params.get('mats')==='1'?1:2,tieDia:params.get('ties')==='10'?10:8,tiePitch:params.get('ties')==='10'?.1:.125};
let source,model,ledger;
const selected=()=>model.byStage[state.stage].find(x=>x.id===state.member)||model.byStage[state.stage][0]||null;
const pct=(v,max)=>max>0?Math.max(0,Math.min(100,100*v/max)):0;
const q=(v)=>Number.isFinite(v)?Number(v.toFixed(4)):null;
const point2=(n)=>({x:72+n.x*28,y:45+n.z*18});
const point3=(n,elev)=>({x:194+n.x*23-n.z*6.1,y:46+n.x*7+n.z*8.7-elev*27});
function scenarios(){return{footingMats:state.mats,columnTieDiameter:state.tieDia,columnTieSpacing:state.tiePitch,rccCementKgM3:350}}
function linked(id){const u=new URL(location.href);u.searchParams.set('stage',state.stage);u.searchParams.set('member',id||'');u.searchParams.set('mats',String(state.mats));u.searchParams.set('ties',String(state.tieDia));return u.toString()}
const centerNode=(r)=>r?.support??model.geometry.nodes.find(n=>n.id===r?.geometry?.from);
function supportMark(r){return r?.support?.id??r?.geometry?.from??''}
const svgButton=(id,markup,extra='')=>'<g role="button" tabindex="0" class="pick'+(selected()?.id===id?' active':'')+'" data-member="'+esc(id)+'" aria-label="Select '+esc(id)+'" '+extra+'>'+markup+'</g>';
function plan2D(){
 const nodes=model.geometry.nodes,items=model.byStage[state.stage],mBySupport=new Map(items.filter(x=>x.support).map(x=>[x.support.id,x.id]));
 const lines=model.geometry.plinth.concat(model.geometry.straps);
 const byId=new Map(nodes.map(x=>[x.id,x]));
 let html='<svg viewBox="0 0 490 555" class="review-svg" role="img" aria-label="Source-coordinate two-dimensional footing and beam grid; click to select member">';
 html+='<rect width="490" height="555" fill="#f9fcfc"/>';
 for(let z=0;z<=25;z+=5){const y=45+z*18;html+='<line x1="58" y1="'+y+'" x2="446" y2="'+y+'" class="gridline"/><text x="15" y="'+(y+4)+'" class="gridlabel">Z '+z+'</text>';}
 for(let x=0;x<=12;x+=3){const xx=72+x*28;html+='<line x1="'+xx+'" y1="30" x2="'+xx+'" y2="515" class="gridline"/>';}
 for(const b of lines){const a=byId.get(b.a),c=byId.get(b.b);if(!a||!c)continue;const p=point2(a),q=point2(c),id=b.id,active=id===selected()?.id;
  // PB and ST share several plan centrelines at different elevations. Offset only
  // their 2D HIT/DISPLAY LANES; endpoints/engineering source coordinates stay intact.
  const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1,lane=state.stage==='m70'?(id.startsWith('ST-')?11:-11):0;
  const px=p.x-dy/len*lane,py=p.y+dx/len*lane,qx=q.x-dy/len*lane,qy=q.y+dx/len*lane;
  const stroke=id.startsWith('ST-')?'#9b8e75':'#aabdc3';
  const hit='<line x1="'+px+'" y1="'+py+'" x2="'+qx+'" y2="'+qy+'" stroke="'+(active?'#b24f2a':stroke)+'" stroke-width="'+(active?8:4)+'" stroke-linecap="round"/>';
  html+=state.stage==='m70'?svgButton(id,hit+'<line x1="'+px+'" y1="'+py+'" x2="'+qx+'" y2="'+qy+'" stroke="transparent" stroke-width="16"/><circle cx="'+((px+qx)/2)+'" cy="'+((py+qy)/2)+'" r="9" fill="transparent" pointer-events="all"/>'):hit;
 }
 for(const n of nodes){const p=point2(n),id=mBySupport.get(n.id),active=id===selected()?.id;
  const circle='<rect x="'+(p.x-7)+'" y="'+(p.y-7)+'" width="14" height="14" rx="3" fill="'+(active?'#b24f2a':'#2e6f72')+'" stroke="white" stroke-width="2"/><text x="'+(p.x+10)+'" y="'+(p.y-9)+'" class="nodeid">'+esc(n.id)+'</text>';
  html+=id?svgButton(id,circle):'<g>'+circle+'</g>';
 }
 return html+'<text x="20" y="538" class="viewnote">Plan X/Z in m · source-calibrated, not surveyed · overlapping ST/PB drawn in separate display-only lanes</text></svg>';
}
function axon3D(){
 const byId=new Map(model.geometry.nodes.map(n=>[n.id,n]));
 let html='<svg viewBox="0 0 570 420" class="review-svg" role="img" aria-label="Linked source-coordinate axonometric with provisional vertical levels; click structural member">';
 html+='<rect width="570" height="420" fill="#f9fcfc"/><path d="M20 335 L200 405 L550 300 M42 85 L20 335" fill="none" stroke="#e6eded" stroke-width="2"/>';
 const items=model.byStage[state.stage];
 const memberBySupport=new Map(items.filter(x=>x.support).map(x=>[x.support.id,x.id]));
 const beams=model.geometry.plinth.concat(model.geometry.straps);
 for(const b of beams){const a=byId.get(b.a),c=byId.get(b.b);if(!a||!c)continue;
  const id=b.id,isStrap=id.startsWith('ST-'),elev=isStrap?-1.1:.38,p=point3(a,elev),q=point3(c,elev);
  const active=id===selected()?.id,mark='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+q.x+'" y2="'+q.y+'" stroke="'+(active?'#b24f2a':isStrap?'#afa28e':'#87b3b7')+'" stroke-width="'+(active?9:isStrap?7:5)+'" stroke-linecap="round"/>';
  html+=state.stage==='m70'?svgButton(id,mark+'<line x1="'+p.x+'" y1="'+p.y+'" x2="'+q.x+'" y2="'+q.y+'" stroke="transparent" stroke-width="20"/><circle cx="'+((p.x+q.x)/2)+'" cy="'+((p.y+q.y)/2)+'" r="12" fill="transparent" pointer-events="all"/>'):mark;
 }
 for(const n of model.geometry.nodes){const base=point3(n,-.9),top=point3(n,.55),id=memberBySupport.get(n.id),active=id===selected()?.id;
  const footing=point3(n,-1.5);
  let mark='<polygon points="'+(footing.x-11)+','+(footing.y-4)+' '+(footing.x+12)+','+(footing.y-4)+' '+(footing.x+20)+','+(footing.y+6)+' '+(footing.x-3)+','+(footing.y+6)+'" fill="'+(active?'#f0c0a2':'#e1d8cb')+'" stroke="#b7aa96"/>';
  mark+='<line x1="'+base.x+'" y1="'+base.y+'" x2="'+top.x+'" y2="'+top.y+'" stroke="'+(active?'#b24f2a':'#487d7c')+'" stroke-width="'+(active?10:7)+'" stroke-linecap="round"/>';
  mark+='<circle cx="'+top.x+'" cy="'+top.y+'" r="'+(active?6:3)+'" fill="#f9fcfc" stroke="#336c71"/>';
  if(id)html+=svgButton(id,mark+'<line x1="'+base.x+'" y1="'+base.y+'" x2="'+top.x+'" y2="'+top.y+'" stroke="transparent" stroke-width="20"/>');
  else html+='<g>'+mark+'</g>';
 }
 html+='<text x="15" y="20" class="viewnote">Source-coordinate axonometric · below-plinth members only</text><text x="15" y="405" class="viewnote">Columns -0.90 to +0.55 m · footing/strap prism cues provisional · NOT fabrication 3D</text></svg>';
 return html;
}
function recordsTable(){
 const records=model.byStage[state.stage];
 if(!records.length)return '<p class="review-warning"><strong>No admitted M80 structural object.</strong> ARC-02 depicts an underground water-tank siting candidate with septic tank and soak pit. Structural tank footprint, depth, capacity, approved position, bars and quantities remain UNKNOWN, not zero.</p>';
 return '<div class="review-member-list" role="group" aria-label="Selectable source members">'+records.map(r=>'<button type="button" data-member="'+esc(r.id)+'" class="review-member'+(selected()?.id===r.id?' active':'')+'"><span>'+esc(r.id)+'</span><small>'+esc(r.kind)+'</small></button>').join('')+'</div>';
}
function details(){
 const r=selected();
 if(!r)return '<p class="review-warning">No engineer-admitted tank structure. Architectural location label is evidence to reconcile, not a structural design or BOQ item.</p>';
 const concreteOwnership=['v02','m40','m60','m70'].includes(r.stage);
 const steelOwnership=['v03','m60','m70'].includes(r.stage);
 const bars=r.steelRows||[];
 const geo=Object.entries(r.geometry||{}).filter(([k,v])=>['widthM','lengthM','depthM','from','to','clearLengthM','lengthCenterlineM','bottomElevationM','topElevationM','columnMark','footingMark'].includes(k)).map(([k,v])=>'<span><b>'+esc(k)+'</b>: '+esc(typeof v==='number'?fmt(v,3):v)+'</span>').join(' ');
 return '<div class="member-detail"><h3>'+esc(r.id)+' <small>'+esc(r.sourceStatus)+'</small></h3>'+
 '<p>'+geo+'</p><div class="review-metrics">'+
 '<div>Owned concrete / PCC<strong>'+fmt(concreteOwnership?r.concreteM3:null,5)+' m³</strong></div>'+
 '<div>Owned theoretical rebar<strong>'+fmt(steelOwnership?r.theoreticalSteelKg:null,3)+' kg</strong></div>'+
 '<div>Planning cement only<strong>'+fmt(concreteOwnership?r.cement.planningBags:null,3)+' bags</strong></div>'+
 '<div>Accepted procurement quantity<strong>UNKNOWN</strong></div></div>'+
 '<div class="review-table-scroll"><table><thead><tr><th>Bar family</th><th>Ø (mm)</th><th>Count</th><th>Equivalent cut (m)</th><th>Theoretical kg</th><th>Role</th></tr></thead><tbody>'+
 bars.map(b=>'<tr><td>'+esc(b.id)+'</td><td>'+fmt(b.diameterMm,0)+'</td><td>'+fmt(b.count,0)+'</td><td>'+fmt(b.cutLengthM,3)+'</td><td>'+fmt(b.theoreticalKg,3)+'</td><td>'+esc(b.role)+'</td></tr>').join('')+
 '</tbody></table></div><p class="review-warning">Straight/equivalent bar quantities are <strong>NOT a shop or cutting BBS</strong>; bends, anchors, laps and stock yield remain unapproved.</p>'+
 '<p><a href="'+esc(new URL('projects/harisharan-adhikari/stages/'+r.stage+'/?member='+encodeURIComponent(r.id),root).href)+'">Open the detailed '+esc(STAGE_NAMES[r.stage])+' source workbench</a></p></div>';
}
function boqTable(){
 return '<div class="review-table-scroll"><table class="review-boq"><thead><tr><th>Unique quantity owner</th><th>Objects</th><th>PCC/RCC m³</th><th>Steel kg</th><th>Planning cement bags</th><th>Review state</th></tr></thead><tbody>'+
 ledger.boq.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+r.count+'</td><td>'+fmt(r.concreteM3,5)+'</td><td>'+fmt(r.theoreticalSteelKg,3)+'</td><td>'+fmt(r.cementPlanningBags,3)+'</td><td>'+esc(r.sourceStatus)+'</td></tr>').join('')+
 '</tbody></table></div>'+
 '<p class="review-note">Distinct totals: footing PCC <b>'+fmt(ledger.totals.pccM3,5)+' m³</b>; provisional RCC <b>'+fmt(ledger.totals.rccM3,5)+' m³</b>; theoretical steel <b>'+fmt(ledger.totals.theoreticalOwnedSteelKg,3)+' kg</b>; planning cement <b>'+fmt(ledger.totals.cementPlanningBags,3)+' bags</b>. No M50 double count, no extra M80 material, and no approved unit rates or procurement amounts.</p>';
}
function holdCards(){
 return REVIEW_HOLDS.map(h=>'<article class="review-hold"><div><b>'+esc(h.id)+'</b><strong>'+esc(h.title)+'</strong><span>'+esc(h.state)+'</span></div><p>'+esc(h.finding)+'</p><p class="review-note"><b>Source:</b> '+esc(h.sources)+'</p><p class="review-note"><b>Needed:</b> '+esc(h.required)+'</p><a href="'+esc(h.issueUrl)+'" target="_blank" rel="noopener">GitHub issue #'+h.issue+'</a></article>').join('');
}
function updateUrl(){history.replaceState({},'',linked(state.member));}
function downloadCsv(kind){
 const rows=kind==='holds'?REVIEW_HOLDS:ledger[kind];
 const columns=kind==='holds'?['id','stage','title','sources','finding','state','required','issueUrl']:CSV_SCHEMAS[kind];
 const csv=safeCsv(rows,columns),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='harisharan-'+kind+'-'+REVIEW_REVISION.toLowerCase()+'-NOT_FOR_CONSTRUCTION.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function compareVariants(){
 const one=buildHarisharanStages(source,{footingMats:1}),two=buildHarisharanStages(source,{footingMats:2});
 const light=buildHarisharanStages(source,{columnTieDiameter:8,columnTieSpacing:.125});
 const heavy=buildHarisharanStages(source,{columnTieDiameter:10,columnTieSpacing:.1});
 return '<div class="review-scenario-grid"><div><b>Footing 1 mat</b><strong>'+fmt(one.summary.v03.theoreticalSteelKg,2)+' kg</strong><small>Alternative, not approved</small></div>'+
 '<div><b>Footing 2 mats</b><strong>'+fmt(two.summary.v03.theoreticalSteelKg,2)+' kg</strong><small>STR-01 schedule candidate</small></div>'+
 '<div><b>Column ties Ø8 @125</b><strong>'+fmt(light.summary.m60.theoreticalSteelKg,2)+' kg</strong><small>Includes longitudinal steel</small></div>'+
 '<div><b>Column ties Ø10 @100</b><strong>'+fmt(heavy.summary.m60.theoreticalSteelKg,2)+' kg</strong><small>Includes longitudinal steel</small></div></div>';
}
function bind(){
 for(const element of document.querySelectorAll('[data-member]')){
  const action=()=>{const id=element.getAttribute('data-member');if(model.byStage[state.stage].some(r=>r.id===id)){state.member=id;paint();updateUrl();}};
  element.addEventListener('click',action);
  element.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&element.tagName.toLowerCase()!=='button'){e.preventDefault();action();}});
 }
 $('review-stage').onchange=e=>{state.stage=e.target.value;state.member=model.byStage[state.stage][0]?.id||'';paint();updateUrl();};
 $('review-mats').onchange=e=>{state.mats=Number(e.target.value);rebuild();};
 $('review-ties').onchange=e=>{state.tieDia=Number(e.target.value);state.tiePitch=state.tieDia===10?.1:.125;rebuild();};
 for(const button of document.querySelectorAll('[data-export]'))button.onclick=()=>downloadCsv(button.getAttribute('data-export'));
}
function paint(){
 const r=selected();state.member=r?.id||'';
 $('review-stage').value=state.stage;$('review-mats').value=String(state.mats);$('review-ties').value=String(state.tieDia);
 $('review-count').textContent=model.byStage[state.stage].length+' source members · '+(r?.id||'NO STRUCTURAL OBJECT');
 $('review-2d').innerHTML=plan2D();$('review-3d').innerHTML=axon3D();
 $('review-members').innerHTML=recordsTable();$('review-selected').innerHTML=details();
 $('review-boq').innerHTML=boqTable();$('review-holds').innerHTML=holdCards();
 $('review-scenarios').innerHTML=compareVariants();
 $('review-footnote').textContent='Drawing SHA256 '+model.sourceFingerprint.slice(0,18)+'… · report '+model.governingReport.id+' · '+REVIEW_AUTHORITY;
 bind();
}
function rebuild(){try{model=buildHarisharanStages(source,scenarios());ledger=buildReviewLedger(model);paint();updateUrl();$('review-error').textContent='';}catch(e){$('review-error').textContent='Scenario refused: '+e.message;}}
async function boot(){
 $('review-project').href=projectUrl.href;
 try{
  const response=await fetch(sourceUrl,{cache:'no-store'});if(!response.ok)throw Error('Source takeoff fetch '+response.status);
  source=await response.json();rebuild();
  window.HarisharanReviewStudio=Object.freeze({
   getState:()=>({stage:state.stage,member:state.member,mats:state.mats,ties:state.tieDia,
     ledgerRevision:ledger.revision,modelRevision:model.revision,memberCount:model.byStage[state.stage].length,
     barCount:ledger.bars.length,totals:ledger.totals,issueForConstruction:false,readOnly:true}),
   getLedger:()=>ledger,getMember:(id)=>model.byStage[state.stage].find(m=>m.id===id)||null,
   csv:(kind)=>safeCsv(kind==='holds'?REVIEW_HOLDS:ledger[kind],kind==='holds'?['id','sources','state']:CSV_SCHEMAS[kind])
  });
 }catch(e){$('review-error').textContent='Fail-closed source load: '+e.message;for(const id of ['review-2d','review-3d','review-members','review-selected','review-boq','review-holds','review-scenarios'])$(id).innerHTML='';}
}
boot();
