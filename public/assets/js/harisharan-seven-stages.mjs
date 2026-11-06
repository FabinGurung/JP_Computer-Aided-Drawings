/**
 * Harisharan seven-stage source-qualified register.
 * Uses the ORIGINAL 18-node, 12-strap and 27-plinth takeoff kernel;
 * no made-up tank, dowel/anchorage/cutting stock or accepted cement mix.
 * The 2083 analysis report governs beam links without overwriting STR-05.
 */
import {assembly,calculate,unitMass} from './harisharan-takeoff.mjs';
import {GOVERNING_REPORT} from './harisharan-rear-nine.mjs';
export const HAR_STAGE_SCHEMA='jp-cad://harisharan/seven-stages/1';
export const HAR_STAGE_RELEASE='v0.1 · ESTIMATING/QA · NOT FOR CONSTRUCTION';
export const STAGES=Object.freeze([
 {id:'v02',name:'PCC / blinding',short:'PCC V02',summary:'Individual footing-pad PCC; no separately admitted soling',scope:'18 pad blinding areas',authority:'STR-02 / preliminary pad footprint',status:'PROVISIONAL · SOLING NOT ADMITTED'},
 {id:'v03',name:'Footing reinforcement',short:'Footing rebar V03',summary:'One pad, two bar directions, alternative top/bottom mat counts',scope:'18 footing pads',authority:'STR-01 / STR-02 mesh conflict + HAR-SRC-RPT-001',status:'HOLD · TOP/BOTTOM MESH LAYERS'},
 {id:'m40',name:'Footing RCC',short:'Footing RCC M40',summary:'Full-prism footing envelopes and linked footing bars',scope:'18 footing pad envelopes',authority:'HAR-SRC-RPT-001 / STR-02 sloped section conflict',status:'HOLD · FOOTING PROFILE / MIX'},
 {id:'m50',name:'Starters / dowels',short:'Dowels M50',summary:'Column continuation references; no separate accepted starter-cutting schedule',scope:'18 column support locations',authority:'STR-03 source main bars; independent anchorage missing',status:'HOLD · DOWEL FABRICATION NOT ADMITTED'},
 {id:'m60',name:'Columns / ties',short:'Columns M60',summary:'Source longitudinal bars and alternative six-leg tie-set allowance',scope:'18 below-to-plinth columns',authority:'STR-02 / 03 / 06 conflicts + HAR-SRC-RPT-001',status:'PROVISIONAL · COLUMN TIES HELD'},
 {id:'m70',name:'Plinth / strap beams',short:'Plinth M70',summary:'27 plinth runs plus 12 transverse straps; per-run steel, concrete and cement allowance',scope:'39 unique beam spans',authority:'HAR-SRC-RPT-001 overrides STR-05 tie-link pitch; STR-06 straps',status:'PROVISIONAL · BENDS/LAPS HELD'},
 {id:'m80',name:'Tank / services',short:'Tank M80',summary:'Required-source checklist only. No admitted tank layout or dimensions.',scope:'No source-admitted tank objects',authority:'No accepted Harisharan tank location, section, BBS or MEP scheme',status:'SOURCE NOT ADMITTED / HOLD'}
]);
const finite=(x,what)=>{if(typeof x!=='number'||!Number.isFinite(x))throw Error('Invalid '+what);return x};
const cleanBar=(r,origin,reportCount=null)=>{
 const count=reportCount===null?r.count:reportCount;
 return {
  id:r.id,stage:r.stage,diameterMm:r.diameter,count,cutLengthM:r.cut,
  totalLengthM:r.cut*count,theoreticalKg:r.cut*count*unitMass(r.diameter),
  originalSourceCount:r.count,originalTheoreticalKg:r.kg,
  governedBy:reportCount===null?origin:GOVERNING_REPORT.id,
  qualification:reportCount===null?r.note:
   'Report Ø8 links @125 mm throughout; original STR-05 end/middle pitch retained in source-count column. Set cut shape and hooks not accepted.',
  basis:r.ref,role:'DRAFT_THEORETICAL_NOT_APPROVED_BBS'
 };
};
const refRow=(r,origin)=>({...cleanBar(r,origin),role:'REFERENCE_SAME_BARS_NOT_ADDITIVE'});
const q=(v,unit,n=3)=>Number.isFinite(v)?Number(v.toFixed(n)):null;
export function buildHarisharanStages(source,options={}){
 if(source.logicalId!=='INTAKE-20260826-HARISHARAN'||source.issueForConstruction!==false)throw Error('Unexpected project/source approval state');
 const report=source.sources.find(s=>s.id===GOVERNING_REPORT.id);
 if(!report||report.sha256!==GOVERNING_REPORT.sha256)throw Error('Governing report fingerprint mismatch');
 const acceptedOptionKeys=['footingMats','columnTieDiameter','columnTieSpacing','rccCementKgM3'];
 if(Object.keys(options).some(k=>!acceptedOptionKeys.includes(k)))throw Error('Unsupported scenario input');
 const original=calculate(source,options),a=assembly(source),steelById=new Map(original.steel.map(r=>[r.id,r])),volById=new Map(original.concrete.map(r=>[r.id,r]));
 const sourceKey=source.sources.find(x=>x.id==='HAR-SRC-STR-001')?.sha256;
 const physical={nodes:a.nodes.map(n=>({id:n.id,x:n.x,z:n.z,row:n.row,side:n.side,columnType:n.type,footingType:n.footing})),
  plinth:a.plinth.map(b=>({id:b.id,a:b.a.id,b:b.b.id,lengthM:b.length})),
  straps:a.straps.map(b=>({id:b.id,a:b.a.id,b:b.b.id,lengthM:b.length}))};
 const grade={concrete:GOVERNING_REPORT.concreteGrade,steel:GOVERNING_REPORT.steelGrade};
 const limits={
  sourceStatus:'PROVISIONAL_SOURCE_INTERPRETATION',notForConstruction:true,sourceRevision:source.revision,
  sourceSha256:sourceKey,governingId:report.id,governingSha256:report.sha256,
  cement:'Scenario from source.defaults.rccCementKgM3; NOT an approved M25 mix or order',
  steel:'Theoretical straight/equivalent lengths; no complete BBS, stock optimization, hooks, bends, splice or anchors',
  field:'No field inspections, pour releases, soil acceptance or signed IFC evidence provided'
 };
 const padGeometry=n=>n.footing==='F1'?{widthM:2.55,lengthM:2.55,depthM:source.dimensions.footingDepth}:{widthM:2.10,lengthM:2.70,depthM:source.dimensions.footingDepth};
 const perMember=[];
 const rccCement=volume=>({planningKg:q(volume*original.settings.rccCementKgM3,3),
  planningBags:q(volume*source.defaults.rccCementKgM3/source.defaults.bagKg,3),
  dosageKgPerM3:original.settings.rccCementKgM3,bagKg:source.defaults.bagKg,
  acceptedMixQuantity:null,status:'PLANNING_SCENARIO__NOT_APPROVED_M25_DOSAGE'});
 const pccCement=volume=>({planningKg:q(volume*source.defaults.pccDryFactor*source.defaults.cementDensity/10,3),
  planningBags:q(volume*source.defaults.pccDryFactor*source.defaults.cementDensity/(10*source.defaults.bagKg),3),
  dosageKgPerM3:q(source.defaults.pccDryFactor*source.defaults.cementDensity/10,2),
  acceptedMixQuantity:null,status:'PCC_DRY_FACTOR_ESTIMATING_SCENARIO__NOT_APPROVED_MIX'});
 const create=(stage,id,kind,support,geometry,volume,barRows,additional={})=>{
  if(!['v02','v03','m40','m50','m60','m70'].includes(stage))throw Error('Not a quantified stage');
  const actual=q(volume,6);
  const steel=barRows.reduce((sum,r)=>sum+r.theoreticalKg,0);
  return {id,stage,kind,support,x:support?.x??null,z:support?.z??null,geometry,
    concreteM3:actual,cement:stage==='v02'?pccCement(volume):rccCement(volume),
    steelRows:barRows,theoreticalSteelKg:q(steel,5),steelStatus:barRows.length?'SOURCE_INTERPRETED_NOT_APPROVED':'NO_SOURCE_SPECIFIED',
    qualification:'Member-level estimate from original source; no construction release',grade,source:limits,...additional};
 };
 for(const n of a.nodes){
  const g=padGeometry(n),padVol=volById.get('PAD-'+n.id),colVol=volById.get('COL-'+n.id);
  if(!padVol||!colVol)throw Error('Missing source volume for '+n.id);
  const footingBars=['F-'+n.id+'-X','F-'+n.id+'-Z'].map(id=>{
   const r=steelById.get(id);if(!r)throw Error('Missing source mesh '+id);return cleanBar(r,'STR-01/02');
  });
  const columnBars=[steelById.get('C-'+n.id+'-20'),steelById.get('C-'+n.id+'-25'),steelById.get('CT-'+n.id)].filter(Boolean).map(r=>cleanBar(r,'STR-03/02/06'));
  const pccM3=g.widthM*g.lengthM*source.dimensions.pccDepth;
  const footing={widthM:g.widthM,lengthM:g.lengthM,depthM:g.depthM,footingMark:n.footing,
    planX:n.x,planZ:n.z,pccThicknessM:source.dimensions.pccDepth};
  const columnBottom=-(source.dimensions.foundingBelowGround-source.dimensions.footingDepth);
  const columnTop=source.dimensions.plinthAboveGround;
  const colGeom={columnMark:n.type,widthM:source.dimensions.column,depthM:source.dimensions.column,
   bottomElevationM:columnBottom,topElevationM:columnTop,
   grossHeightM:columnTop-columnBottom,groundDatumM:0,planX:n.x,planZ:n.z};
  const pcc=create('v02','PCC-'+n.id,'blinding',n,footing,pccM3,[],{
   linkedFootingId:'PAD-'+n.id,sourceStatus:'PAD_ONLY__NO_SOLING_MEASUREMENT',
   holds:['No approved soling quantity','PCC extent below strap gaps and accepted mix not supplied']});
  const rebar=create('v03','F-'+n.id,'footing-rebar',n,footing,padVol.volume,footingBars,{
   quantityRole:'FOOTING_STEEL__CONCRETE_REFERENCE_M40',sourceStatus:'TWO_MATS_ASSUMED__NOT_CONFIRMED',
   holds:['Footing report lacks unambiguous mat-layer count','Straight mesh lengths omit bends, hooks and chairs','Full prism footing concrete is M40 reference, not v03 additive']});
  const m40=create('m40','PAD-'+n.id,'footing-rcc',n,footing,padVol.volume,footingBars.map(r=>({...r,role:'REFERENCE_V03__NOT_ADDITIVE'})),{
   quantityRole:'FOOTING_CONCRETE__REBAR_REFERENCE_V03',sourceStatus:'FULL_PRISM_ENVELOPE__SHAPE_HOLD',
   holds:['Source shows sloped pad section; profile and deductions not accepted','M25 source grade does not establish mix dosage','Mesh quantities linked from V03 only']});
  const m50=create('m50','DOWEL-'+n.id,'dowel-continuity',n,colGeom,colVol.volume,
   columnBars.filter(r=>r.id.startsWith('C-')).map(r=>({...r,role:'COLUMN_CONTINUITY_REFERENCE__NO_SEPARATE_DOWEL_BBS'})),{
   quantityRole:'NON_ADDITIVE_COLUMN_CONTINUITY_REFERENCE',
   sourceStatus:'NOT_ADMITTED_AS_INDEPENDENT_DOWEL_BBS',
   independentDowelSteelKg:null,independentDowelCementKg:null,
   holds:['Starter / dowel embedment, lap, bar bend, transfer and above-plinth continuation not accepted','Shared source main bars belong to M60; no additional steel should be summed']});
  const m60=create('m60','COL-'+n.id,'column',n,colGeom,colVol.volume,columnBars,{
   quantityRole:'COLUMN_CONCRETE_AND_THEORETICAL_STEEL',
   sourceStatus:'COLUMN_TIES_8MM_125_VS_10MM_100_HOLD',
   holds:['Column tie size/spacing conflict','Six-legged cross-tie shapes are schematic allowances','All laps, dowel development and above-plinth continuity missing']});
  perMember.push(pcc,rebar,m40,m50,m60);
 }
 const nodeById=new Map(a.nodes.map(n=>[n.id,n]));
 for(const b of [...a.plinth,...a.straps]){
  const isStrap=b.kind==='strap',volume=volById.get(b.id);
  if(!volume)throw Error('Missing beam volume '+b.id);
  const ids=isStrap?[b.id+'-20',b.id+'-8']:[b.id+'-20',b.id+'-16',b.id+'-8'];
  const bars=ids.map(id=>{
   const r=steelById.get(id);if(!r)throw Error('Missing beam steel '+id);
   const reportLinkCount=!isStrap&&id.endsWith('-8')?Math.ceil((b.length-source.dimensions.column)/(GOVERNING_REPORT.tieBeam.linkSpacingMm/1000))+1:null;
   return cleanBar(r,isStrap?'HAR-SRC-RPT-001 / STR-06':'HAR-SRC-RPT-001 / STR-05',reportLinkCount);
  });
  const aNode=nodeById.get(b.a.id),bNode=nodeById.get(b.b.id);
  perMember.push(create('m70',b.id,isStrap?'strap':'plinth-beam',null,{
   from:b.a.id,to:b.b.id,lengthCenterlineM:b.length,clearLengthM:b.length-source.dimensions.column,
   widthM:isStrap?source.dimensions.strapWidth:source.dimensions.plinthWidth,
   depthM:isStrap?source.dimensions.strapDepth:source.dimensions.plinthDepth,
   endpoints:[{id:b.a.id,x:aNode.x,z:aNode.z},{id:b.b.id,x:bNode.x,z:bNode.z}],
   elevationRelation:isStrap?'STRAP_BOTTOM_ALIGNED_TO_FOUNDING_BOTTOM__SCENARIO':'PLINTH_TOP_0.55M_ABOVE_GROUND__SCENARIO'
  },volume.volume,bars,{
   quantityRole:'M70_BEAM_OWNED__NO_DUPLICATION',
   sourceStatus:isStrap?'STRAP_LINKS_FOUR_LEG_EQUIVALENT__BENDS_HOLD':'REPORT_125MM_LINKS__CUT_BENDS_HOLD',
   holds:isStrap?['Strap concrete deduction/intersection interpretation provisional','Four-legged links are two-hoop equivalent, not fabricated bar shapes','No accepted anchorage, joint splice or bend schedule']:
   ['End anchorage, lap and 12m cutting-stock not source-admitted','Links based on report pitch @125 throughout; original STR-05 counts retained','Junction deductions not independent signed BOQ']
  }));
 }
 const byStage=Object.fromEntries(STAGES.map(s=>[s.id,perMember.filter(r=>r.stage===s.id)]));
 byStage.m80=[];
 const summary=Object.fromEntries(STAGES.map(s=>{
  const items=byStage[s.id],primary=items;
  return [s.id,{objectCount:items.length,concreteM3:items.length?s.id==='v03'||s.id==='m50'?null:q(primary.reduce((x,r)=>x+r.concreteM3,0),5):null,
    theoreticalSteelKg:items.length?s.id==='v02'?null:s.id==='m40'?null:s.id==='m50'?null:q(primary.reduce((x,r)=>x+r.theoreticalSteelKg,0),4):null,
    sourceAdmission:s.id==='m80'?'NOT_ADMITTED':'PROVISIONAL',approved:false}];
 }));
 // Distinct physical steel owners: V03 footing mesh, M60 columns/ties, M70 both beam families.
 const grandSteel=q(summary.v03.theoreticalSteelKg+summary.m60.theoreticalSteelKg+summary.m70.theoreticalSteelKg,4);
 const grandRcc=q(summary.m40.concreteM3+summary.m60.concreteM3+summary.m70.concreteM3,5);
 return {schema:HAR_STAGE_SCHEMA,project:'INTAKE-20260826-HARISHARAN',revision:'R000001',
  issueForConstruction:false,sourceRevision:source.revision,sourceFingerprint:sourceKey,
  governingReport:GOVERNING_REPORT,stageDefinitions:STAGES,geometry:physical,
  scenarioInputs:options,items:perMember,byStage,summary,totals:{steelKgScenario:grandSteel,rccM3Scenario:grandRcc,pccM3Scenario:summary.v02.concreteM3,
   approvedCementBags:null,installedSteelKg:null,dowelsExtraKg:null,tankVolumeM3:null},
  membership:{v02:18,v03:18,m40:18,m50:18,m60:18,m70:39,m80:0},limits};
}
export function memberSegmentScenario(record,fromM,toM){
 if(record?.stage!=='m60'||record?.kind!=='column')throw Error('Not a source-admitted column segment');
 const g=record.geometry,lo=finite(fromM,'lower elevation'),hi=finite(toM,'upper elevation');
 if(!(hi>lo&&lo>=g.bottomElevationM&&hi<=g.topElevationM))throw Error('Segment is outside source-admitted footing-top to plinth-top limits');
 const height=hi-lo,concrete=g.widthM*g.depthM*height;
 const main=record.steelRows.filter(r=>r.id.startsWith('C-'));
 return {fromM:lo,toM:hi,segmentHeightM:q(height),heightFt:q(height*3.280839895,3),
  geometryConcreteM3:q(concrete,6),
  mainBarsTheoreticalKg:q(main.reduce((s,r)=>s+r.count*height*unitMass(r.diameterMm),0),4),
  tieSetKg:null,cementMixAcceptedKg:null,qualification:'SECTION-SLICED REFERENCE ONLY. Tie count/continuity, splice, lap, anchorage and source geometry above plinth are not established; do not add to full-column totals.'};
}
