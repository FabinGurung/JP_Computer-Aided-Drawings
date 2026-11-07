/**
 * Harisharan R1/R2 review ledger. Source-derived *provisional* quantities only.
 * Original drawing/report source and structural stage kernel remain unchanged.
 * Sheets HAR-STAGES-001-R000002 is the native human register; this is the
 * deterministic public snapshot model for the website.
 */
export const REVIEW_REVISION = 'HAR-REVIEW-R000001';
export const REVIEW_AUTHORITY = 'SOURCE QUALIFIED / NOT FOR CONSTRUCTION';
export const RELEASED_SOURCE_SHA = 'dfd60740b7c003bc1eac581e1ac0e5c217f2fe63';
export const SOURCE_FINGERPRINTS = Object.freeze({
  structural: '6ae8eaa70273b79a50ad28a2345da7966201efd5f4a32ea260cbece34f75b9c5',
  architectural: '8429a256588c87c7f1cef5ae6a25006ee5f1e5b3ac7d6c5c27423efa4cc908e9',
  report: '8aa9e0a67817c3d00382f910d3b293cdf172dbda7bda3ea4144308fee4942b35'
});
const repository = 'https://github.com/FabinGurung/JP_Computer-Aided-Drawings';
export const REVIEW_HOLDS = Object.freeze([
 {id:'HAR-01',stage:'m40',title:'Concrete grade and mixing',sources:'STR-01/03/05 vs revised structural report (Materials)',finding:'M20 appears on structural drawings; revised report design tables apply M25. 350 kg/m³ is only a planning scenario, never a tested mix.',state:'ENGINEERING HOLD',required:'Signed adopted grade and approved concrete mix design, batch-test evidence.',issue:101},
 {id:'HAR-02',stage:'m40',title:'Footing casting profile',sources:'STR-02 footing section vs 600 mm SAFE analysis property',finding:'F1/F2 geometric volumes use full rectangular prisms. Drawn slopes lack sufficient dimensions for net as-built casting quantities.',state:'ENGINEERING HOLD',required:'Engineer-issued edge thickness, plateau/slope break coordinates, founding levels and intersections.',issue:97},
 {id:'HAR-03',stage:'v03',title:'Footing layer count',sources:'STR-01 footing schedule, STR-02 footing section, revised report footing summary',finding:'Drawing schedule explicitly specifies Ø16 @150 top AND bottom, while the section depicts a lower mesh and report summary does not explicitly settle the layer count. Two mats is an editable scenario.',state:'ENGINEERING HOLD',required:'Signed F1/F2 plan and reinforcement section with mats, anchorage and covered BBS.',issue:96},
 {id:'HAR-04',stage:'v02',title:'Coordinates and plan registration',sources:'ARC-02 site plan vs STR-01 member grid; original plan calibration',finding:'Outer dimensions and centreline dimensions are not interchangeable. Intermediate grid positions are PDF-derived and lack signed survey coordinates.',state:'SOURCE/SITE HOLD',required:'Approved survey datum, member setting-out, field measurement and level benchmark.',issue:101},
 {id:'HAR-05',stage:'m60',title:'Column confinement',sources:'STR-02 vs STR-06 and STR-03/16',finding:'Ø8 @125 and Ø10 @100 tie options conflict. Six-legged tie-set equivalent is not an approved fabrication shape.',state:'ENGINEERING HOLD',required:'Engineer-signed type/zone-wise ties, cover, hoops and cross-tie shape.',issue:98},
 {id:'HAR-06',stage:'m70',title:'Joint anchorage and fabrication',sources:'STR-05, STR-06 vs revised report link summaries',finding:'M50 starters and M70 bars lack accepted anchorage, splice, lap, bend and joint deductions. Beam link spacing also differs across documents.',state:'ENGINEERING HOLD',required:'Shop-checkable signed bar-mark BBS, hooks, laps, development lengths, junction takeoff and cut-stock review.',issue:100},
 {id:'HAR-07',stage:'m40',title:'Soil and seismic source inputs',sources:'Revised structural analysis report — geotechnical/site and seismic sections',finding:'Report text references soil type C and assumed 100 kPa; some tables refer to type A and 429 kPa. Z and importance assumptions also vary.',state:'ENGINEERING HOLD',required:'Original site-specific soil report, final adopted geotechnical and NBC model inputs, independent engineer sign-off.',issue:101},
 {id:'HAR-08',stage:'m50',title:'Issue-for-construction release',sources:'Structural report and current project source register',finding:'No complete signed IFC, approved BBS, site inspection or municipal release has been admitted to the quantity model.',state:'NOT FOR CONSTRUCTION',required:'Issued signed plans, permits, field QA and responsible professional acceptance.',issue:101},
 {id:'HAR-09',stage:'m80',title:'Architectural tank evidence clarified',sources:'ARC-02 architectural site plan — underground water tank / septic tank / soak pit labels',finding:'The plan depicts intended service facilities and adjacent dimensions; it does not establish an engineer-admitted surveyed structural position, depths, capacity, base/wall/cover cage or pour quantities. Earlier "no tank" wording was too broad.',state:'SITING CANDIDATE ONLY / STRUCTURAL HOLD',required:'Approved location registration plus tank structural/MEP sections, soil/water criteria, reinforcement and waterproofing.',issue:102},
 {id:'HAR-10',stage:'m70',title:'Stage total ownership',sources:'HAR-STAGES-001-R000002 / governed structural stage engine',finding:'V03 owns mesh steel and M40 references it; M50 references M60 column bars; M80 material quantities are unknown, not zero.',state:'DRAFT BOQ CONTROL',required:'Approved source revisions and signed procurement quantities before pricing or orders.',issue:103}
].map(h => Object.freeze({...h,issueUrl:repository+'/issues/'+h.issue})));
export const OWNER_STAGE = Object.freeze({v02:'PCC',v03:'FOOTING_STEEL',m40:'FOOTING_RCC',m50:'REFERENCE_ONLY',m60:'COLUMN_RCC_STEEL',m70:'BEAM_RCC_STEEL',m80:'SOURCE_INTAKE'});
export const STAGE_NAMES = Object.freeze({v02:'V02 · PCC',v03:'V03 · footing mesh',m40:'M40 · footing RCC',m50:'M50 · dowel reference',m60:'M60 · columns',m70:'M70 · beams',m80:'M80 · tank review'});
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null; // preserve source 6-8dp m³ conservation before display rounding
export function buildReviewLedger(model) {
 if(model?.project!=='INTAKE-20260826-HARISHARAN'||model.issueForConstruction!==false) throw Error('Unexpected/admitted source project');
 for(const st of Object.keys(OWNER_STAGE)) if(!Array.isArray(model.byStage?.[st]))throw Error('Missing source stage '+st);
 const observed={v02:18,v03:18,m40:18,m50:18,m60:18,m70:39,m80:0};
 for(const [id,n] of Object.entries(observed)) if(model.byStage[id].length!==n)throw Error('Changed source cardinality '+id);
 const measuringStages=['v02','v03','m40','m60','m70'];
 const measurements=model.items.map(m=>({
  stage:m.stage, memberId:m.id, family:m.kind, from:m.geometry?.from??m.support?.id??'', to:m.geometry?.to??'',
  concreteM3:(m.stage==='v03'||m.stage==='m50')?null:m.concreteM3,
  steelKg:['v03','m60','m70'].includes(m.stage)?m.theoreticalSteelKg:null,
  cementPlanningBags:['v02','m40','m60','m70'].includes(m.stage)?m.cement.planningBags:null,
  approvedCementBags:null,approvedSteelKg:null,approvedConcreteM3:null,
  quantityOwner:OWNER_STAGE[m.stage],status:m.sourceStatus,sourceRevision:model.sourceRevision,
  sourceId:m.source.governingId,constructionApproved:false
 }));
 const bars=model.items.filter(m=>['v03','m60','m70'].includes(m.stage)).flatMap(m=>m.steelRows.map(b=>({
   parent:m.id,stage:m.stage,barId:b.id,diameterMm:b.diameterMm,count:b.count,
   cutEquivalentM:b.cutLengthM,totalEquivalentM:b.totalLengthM,kg:b.theoreticalKg,
   sourceId:b.governedBy??b.basis??'',role:b.role,
   cutForFabricationApproved:false,hookAndLapUnknown:true,
   status:'THEORETICAL_EQUIVALENT_NOT_A_FABRICATION_BBS'
 })));
 if(new Set(bars.map(x=>x.stage+'/'+x.barId)).size!==bars.length)throw Error('Duplicate owned bar marks');
 function sum(rows,key){return round(rows.reduce((n,x)=>n+(Number.isFinite(x[key])?x[key]:0),0),5)}
 const members={v02:model.byStage.v02,v03:model.byStage.v03,m40:model.byStage.m40,m60:model.byStage.m60};
 const perStage=[
 {id:'v02',name:'PCC pads',count:18,records:members.v02,concrete:true,steel:false},
 {id:'v03',name:'Footing meshes',count:18,records:members.v03,concrete:false,steel:true},
 {id:'m40',name:'Footing RCC envelope',count:18,records:members.m40,concrete:true,steel:false},
 {id:'m50',name:'Dowel continuity (reference)',count:18,records:[],concrete:false,steel:false},
 {id:'m60',name:'Below-plinth columns',count:18,records:members.m60,concrete:true,steel:true},
 {id:'m70-pb',name:'Tie / plinth beams',count:27,records:model.byStage.m70.filter(m=>m.kind==='plinth-beam'),concrete:true,steel:true},
 {id:'m70-st',name:'Strap beams',count:12,records:model.byStage.m70.filter(m=>m.kind==='strap'),concrete:true,steel:true},
 {id:'m80',name:'Tank / services (unadmitted)',count:0,records:[],concrete:false,steel:false}
 ].map(p=>({
  id:p.id,name:p.name,count:p.count,
  concreteM3:p.concrete?sum(p.records,'concreteM3'):null,
  theoreticalSteelKg:p.steel?sum(p.records,'theoreticalSteelKg'):null,
  cementPlanningBags:p.concrete?round(p.records.reduce((n,m)=>n+m.cement.planningBags,0),5):null,
  approvedSteelKg:null,approvedCementBags:null,approvedConcreteM3:null,
  sourceStatus:p.id==='m80'?'UNKNOWN_NOT_ZERO':p.id==='m50'?'NON_ADDITIVE_REFERENCE':'PROVISIONAL_NOT_APPROVED'
 }));
 const physical=perStage.filter(r=>r.id!=='m80'&&r.id!=='m50');
 const totals={pccM3:perStage[0].concreteM3,
  rccM3:round(perStage.filter(x=>['m40','m60','m70-pb','m70-st'].includes(x.id)).reduce((n,x)=>n+(x.concreteM3||0),0)),
  theoreticalOwnedSteelKg:round(physical.reduce((n,x)=>n+(x.theoreticalSteelKg||0),0)),
  cementPlanningBags:round(physical.reduce((n,x)=>n+(x.cementPlanningBags||0),0)),
  approvedCementBags:null,approvedSteelKg:null,tankConcreteM3:null,procurementAmountNpr:null};
 if(Math.abs(totals.theoreticalOwnedSteelKg-model.totals.steelKgScenario)>.0002)throw Error('Owned-steel reconciliation failed');
 if(Math.abs(totals.rccM3-model.totals.rccM3Scenario)>.0002)throw Error('Owned-concrete reconciliation failed');
 if(bars.length!==178)throw Error('Unexpected source-governed bar-row count '+bars.length);
 return Object.freeze({schema:'jp-cad://harisharan/review-ledger/1',revision:REVIEW_REVISION,
  sourceRevision:model.sourceRevision,sourceFingerprint:model.sourceFingerprint,
  status:REVIEW_AUTHORITY,issueForConstruction:false,
  stageCounts:observed,measurements,bars,boq:perStage,totals,holds:REVIEW_HOLDS});
}
export function safeCsv(rows,keys) {
 // Guard exported spreadsheet CSV against formula injection from source text.
 const quote=(v)=>{
  if(v===null||v===undefined)return '""';
  let s=String(v);
  if(/^[=+@-]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 return [keys.map(quote).join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n')+'\r\n';
}
export const CSV_SCHEMAS=Object.freeze({
 measurements:['stage','memberId','family','from','to','concreteM3','steelKg','cementPlanningBags','quantityOwner','status','constructionApproved','sourceRevision','sourceId'],
 bars:['stage','parent','barId','diameterMm','count','cutEquivalentM','totalEquivalentM','kg','role','status','sourceId','cutForFabricationApproved'],
 boq:['id','name','count','concreteM3','theoreticalSteelKg','cementPlanningBags','sourceStatus','approvedConcreteM3','approvedSteelKg','approvedCementBags']
});
