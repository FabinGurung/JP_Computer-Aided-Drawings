import {ALL_WORKSPACE_PROJECTS} from './project-workspace-config.mjs';
import {NORMALIZED_PACKAGE_CATALOG,NORMALIZED_PROJECTS} from './project-engineering-normalization.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=document.body.dataset.project,project=ALL_WORKSPACE_PROJECTS[slug],record=NORMALIZED_PROJECTS[slug],root=new URL('../../../',location.href);
if(!project||!record)throw Error('Unknown project memory wall');
document.title=project.name+' · Engineering Memory Palace';
const url=p=>new URL(p,root).href;
const poster=(id,html)=>({id,html});
const projectLearnings={
 'narayani-parajuli':'<strong>Source-derived model audit:</strong> 23 GF columns, 21 footing outlines and 16 M70 runs are published as source-review counts, not accepted fabrication counts. Engineering HOLDs remain for registration, footing/load paths and technical issues. M80 tank is held; no independently source-confirmed soling module.',
 'harisharan-adhikari':'<strong>Provisional site-study case:</strong> through-plinth basic rebar is approximately 11,492.98 kg; cement scenario approximately 713 bags before allowances. These depend on provisional geometry and assumptions, NOT procurement or standard defaults. Source report and drawings have an M20/M25 discrepancy; upper-storey source/floor counts need reconciliation.',
 'ashok-adhikari':'<strong>Edition discipline:</strong> v1 is the frozen pre-MEP architecture; v2 is a coordination edition. Septic/soak positioning, site boundary registration and any structural/detail approval require project evidence; never treat coordination model columns as designed structural members.',
 'ramachandra-devkota':'<strong>Source admission:</strong> REV02 exists as a governed source family. Public structural members, checked rebar BBS, concrete mixes and programme are not admitted. Private financial or client files must not be copied into public posters.',
 'example-empty':'<strong>FICTIONAL:</strong> There are no source-derived findings and no real steel, cement, floor, cost, site or client values.'
};

const siteRows=NORMALIZED_PACKAGE_CATALOG.map((p,i)=>{
 const r=record.slots[i];
 return '<tr><td><a href="'+esc(url('projects/'+slug+'/?panel=packages#packages'))+'">'+esc(p.number)+'</a></td><td>'+esc(p.title)+'</td><td>'+esc(r.sourceStatus)+'</td><td>'+esc(r.reviewState)+'</td></tr>';
}).join('');
const slots='<div class="memory-table-wrap"><table class="memory-table"><thead><tr><th>Section</th><th>Required site package</th><th>Public evidence</th><th>Engineering gate</th></tr></thead><tbody>'+siteRows+'</tbody></table></div>';
const sampleWarning=record.synthetic?'<p class="memory-note">EMPTY FICTIONAL PROJECT: there are no building dimensions, site conditions, engineering records, rod sizes or accepted calculations here. Every slot is a blank guardrail, not an engineering finding.</p>':'<p class="memory-note">'+esc(record.notice)+'</p>';
const chapters=[
 {name:'Sources, identity & evidence',sections:[
  {name:'Authority',sub:[
   poster('Preserve source authority','<p>Original DWG/DXF, site reports and signed decisions remain with the authenticated owner in governed Drive. GitHub owns public-safe CAD code, manifests, source pointers and presentation, not original privately held engineering approval.</p>'),
   poster('Registered project identity','<p>Project: <strong>'+esc(project.name)+'</strong>. State: <strong>'+esc(record.overallApproval)+'</strong>. Input provenance: '+esc(record.sourceBasis||'NONE — synthetic empty starter')+'. Distinguish an engineering approval from a website visibility setting.</p><p>'+projectLearnings[slug]+'</p>')]},
  {name:'Three-level source trace',sub:[
   poster('Source → interpretation → derived result','<p>Every accepted measurement or model member needs a source document, sheet/member mark, provider revision, extraction method, unit, calculation record and reviewer decision. Missing links block engineering acceptance.</p>'),
   poster('Hold conflicts rather than invent','<p>Conflicting drawings, levels, member dimensions, soil conditions, municipal applicability or design codes stay explicit HOLDs. A nearby project, old draft, template or friendly AI answer never supplies a missing approved source.</p>')]}
 ]},
 {name:'Rod / rebar & detailing memory posters',sections:[
  {name:'Quantities versus fabrication',sub:[
   poster('Theoretical rod mass formula','<p><code>unit_kg_per_m = π/4 × (diameter_mm/1000)² × density_kg_per_m³</code>; <code>total_kg = unit_kg_per_m × approved_cut_length_m × bar_count</code>.</p><p>Reference mathematics only; this is neither a procurement amount nor a bar bending schedule. Diameter, count, cut length, actual stock, density and product tolerances require documented source evidence. Never invent steel diameters to fill an empty row.</p>'),
   poster('BBS and cutoff rules','<p>Only calculate bar cut lengths from engineer-accepted shape codes, bar mark, covers, bends, hooks, stirrups, lapping/development and joint geometry. There is no universally valid rectangular or circular stirrup cutoff. Unknown hook/bend/lap details block fabrication quantities.</p>')]},
  {name:'Column and cage geometry',sub:[
   poster('Concrete section is not automatically the bar cage','<p>Prior site questions included a rectangular reinforcement configuration with a circular concrete finish. Store the actual concrete section and actual steel cage shape as <strong>separate verified dimensions</strong>. Never convert one to the other, nor invent hoop or stirrup placement from a visible round finish.</p>'),
   poster('Rod details memory is evidence-gated','<p>The earlier user-specific rod schedule/size poster has not been recovered as a confirmed canonical CAD source in this release. No historic rod diameters, spacings, hooks, lap lengths or bar grades are asserted. When uploaded, register the actual schedule with source fingerprint, bar marks, approver, revision and version history before publishing.</p>')]}
 ]},
 {name:'Construction package book',sections:[
  {name:'Sixteen normalized work-package slots',sub:[
   poster('Same template; different source completion','<p>Each real project has all <strong>16 identical</strong> package slots with the same inputs, calculation checks and field-QA requirements. A frozen original viewer does not imply accepted structural detail. These package categories remain empty in the fictional starter.</p>'+slots),
   poster('Original workbenches remain intact','<p>Existing Narayani V02/V03 and M40–M80 are immutable source-linked views; Harisharan uses a provisional common through-plinth material ledger; Ashok has architectural/MEP coordination only; Ramachandra has no admitted public engineering package. Soling is not proven by a PCC-only viewer. No fake workbench has been created.</p>')]},
  {name:'Site evidence acceptance',sub:[
   poster('Work package minimum record','<p>Before considering a site package accepted, capture: drawing/revision; stage/member IDs; approved dimensions; engineering design and code basis; quantities and units; bars/BBS; concrete/mix; work method; inspections/tests; original photos if authorized; reviewer signature and project release decision.</p>'),
   poster('Package HOLD vs interface QA','<p>Website link QA can be green while the engineering gate remains red. <strong>FROZEN</strong> is a publication state; <strong>ENGINEERING HOLD</strong> prevents construction-use claims. An unadmitted package is not a calculated zero. For all projects, technical approval remains separately evidenced.</p>')]}
 ]},
 {name:'Quantities / BOQ / Programme',sections:[
  {name:'Quantification controls',sub:[
   poster('Volume and deduction ledger','<p>Gross rectangular volume = <code>L_m × B_m × H_m</code>. Net quantities require source geometry, void/junction deductions, slopes, levels, and explicit units. Separate area (m²), length (m), volume (m³), steel (kg) and rates; never sum unlike units.</p>'),
   poster('Concrete and cement dosage','<p>Cement bag count is a mathematical consequence of <code>verified_net_volume_m³ × source_approved_dosage_kg/m³ ÷ confirmed_bag_kg</code>. No default cement dosage/mix or bags are accepted across projects. Include relevant field mix/strength tests and revision-specific basis.</p>')]},
  {name:'Scope, planning and bills',sub:[
   poster('BOQ versus quantities and bills','<p>BOQ item identity, measurement ledger, abstract of cost, site progress, running bills and vendor/contractor payments are distinct. Derived tables belong under Cost Estimation governance; the website can display approved public-safe projections but cannot authorize payment by itself.</p>'),
   poster('Gantt and 4D source status','<p>Programme tasks need logical IDs, sequence/dependencies, calendars, accepted rates, durations, issue dates and owner. Unapproved assumptions remain scenarios, not actual progress. The Scheduling repository is the programme authority; CAD visualizations do not grant a new site completion status.</p>')]}
 ]},
 {name:'QA, approvals & site decisions',sections:[
  {name:'Structural and code gates',sub:[
   poster('Independent engineering review','<p>Confirm jurisdiction and current clauses, loads, seismic inputs, soil bearing capacity, groundwater, footing registration, member/beam continuity, approved reinforcement, service interactions and any outstanding HOLDs. Incomplete documents do not become approved merely because a page renders correctly.</p>'),
   poster('Sampling, field photos and inspection','<p>Retain site testing, approved material samples, reinforcement inspections, concrete strength/cure evidence, stage photographs and signatures only within appropriate source permissions. Public pages show selected authorized derived summaries—not private client or personnel records.</p>')]},
  {name:'Exceptions and project-specific risks',sub:[
   poster('Site discrepancies are trackable','<p>Log exact member ID, photo/source sheet, observed-versus-expected value, severity, status, reviewer, current version and closure evidence. Never silently reconcile conflicting schedules, columns, footing marks, tank positions or floor heights.</p>'),
   poster('Normalization is not certification','<p><strong>Schema-normalized</strong> means all 16 slots use identical fields and visible evidence statuses. <strong>Engineering-verified</strong> requires accepted project-specific design and inspection evidence. The latter is not achieved by this memory palace or by GitHub Pages release checks.</p>')]}
 ]},
 {name:'History, privacy & reuse',sections:[
  {name:'One live identity; append-only history',sub:[
   poster('A7 reference and CAD ownership','<p>A7 is a read-only federation/catalogue for this CAD task. CAD owns template and source-safe geometry; original drawings and maintained engineering Docs remain in their verified Drive source folders; peer Cost and Scheduling own their calculations and programmes.</p>'),
   poster('Archive-before-update','<p>For a maintained native Doc, resolve stable logical ID and current revision; copy and read back the complete prior revision to verified archive; use requiredRevisionId to edit the <strong>same current Doc provider ID</strong>; increment exactly one logical revision; record PRE/POST hashes and receipt. Do not leak restricted provider IDs publicly.</p>')]},
  {name:'New upload onboarding',sub:[
   poster('Start from the empty dummy, not another building','<p>New-project steps: register a new stable logical ID; verify original files and permissions; identify jurisdiction/occupancy/ROW/datum; index real design editions; run controlled extraction; fill the 16 stage slots only when actual source evidence is available; run unit and browser QA; close technical HOLDs with an authorized professional. The dummy contains no reusable engineering numbers.</p>'),
   poster('Publication memory palace','<p><a href="'+esc(url('memory-wall/pages/'))+'">Open GitHub Pages / Actions memory wall ↗</a> for repository routes, tested builds, mobile/desktop navigation, release gates, rollback and privacy. <a href="'+esc(url('templates/project-workspace/'))+'">Open reusable project template ↗</a>.</p>')]}
 ]}
];
const app=document.getElementById('memory-app');
const toc=chapters.map((c,ci)=>'<a href="#chapter-'+(ci+1)+'" class="level1">'+(ci+1)+' · '+esc(c.name)+'</a>'+c.sections.map((sec,si)=>'<a href="#section-'+(ci+1)+'-'+(si+1)+'" class="level2">'+(ci+1)+'.'+(si+1)+' · '+esc(sec.name)+'</a>'+sec.sub.map((p,pi)=>'<a href="#subsection-'+(ci+1)+'-'+(si+1)+'-'+(pi+1)+'" class="level3">'+(ci+1)+'.'+(si+1)+'.'+(pi+1)+' · '+esc(p.id)+'</a>').join('')).join('')).join('');
const content=chapters.map((c,ci)=>'<section class="memory-chapter" id="chapter-'+(ci+1)+'"><h2>'+(ci+1)+' · '+esc(c.name)+'</h2>'+c.sections.map((sec,si)=>'<div class="memory-section"><h3 id="section-'+(ci+1)+'-'+(si+1)+'">'+(ci+1)+'.'+(si+1)+' · '+esc(sec.name)+'</h3>'+sec.sub.map((p,pi)=>'<article class="memory-poster" id="subsection-'+(ci+1)+'-'+(si+1)+'-'+(pi+1)+'"><span class="poster-id">CAD-MEM-'+String(ci+1).padStart(2,'0')+'-'+String(si+1).padStart(2,'0')+'-'+String(pi+1).padStart(2,'0')+'</span><h4>'+(ci+1)+'.'+(si+1)+'.'+(pi+1)+' · '+esc(p.id)+'</h4>'+p.html+'</article>').join('')+'</div>').join('')+'</section>').join('');
app.innerHTML='<header class="memory-head"><a href="'+esc(url('projects/'+slug+'/'))+'">← Back to project workspace</a><h1>Engineering Memory Palace<br>'+esc(project.name)+'</h1><p>Public-safe project guardrails · revision-aware · not construction authorization</p>'+sampleWarning+'</header><div class="memory-layout"><aside class="memory-toc"><h2>Three-level table of contents</h2><nav aria-label="Three-level project memory palace contents">'+toc+'</nav></aside><main class="memory-main">'+content+'<footer class="memory-footer">CAD-owned project memory wall · R000001 presentation, no engineer approval · <a href="'+esc(url('memory-wall/'))+'">CAD Memory Wall</a> · <a href="'+esc(url('projects/'+slug+'/?panel=packages'))+'">Site Packages</a></footer></main></div>';
window.ProjectMemoryPalace={slug,chapterCount:chapters.length,subsectionCount:chapters.reduce((n,c)=>n+c.sections.reduce((x,s)=>x+s.sub.length,0),0),synthetic:record.synthetic};
