import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assembly,calculate,unitMass} from '../../public/assets/js/harisharan-takeoff.mjs';
import {buildHarisharanStages,memberSegmentScenario,STAGES} from '../../public/assets/js/harisharan-seven-stages.mjs';
import {PROJECT_STAGE_EVIDENCE} from '../../public/assets/js/project-construction-stages.mjs';
import {packageRecords} from '../../public/assets/js/project-site-packages.mjs';
import {NORMALIZED_PROJECTS} from '../../public/assets/js/project-engineering-normalization.mjs';
const src=JSON.parse(fs.readFileSync('public/data/projects/harisharan-adhikari/takeoff.json','utf8'));
const reg=buildHarisharanStages(src),original=calculate(src),graph=assembly(src);
const expected={v02:18,v03:18,m40:18,m50:18,m60:18,m70:39,m80:0};
assert.deepEqual(reg.membership,expected);
assert.equal(STAGES.length,7);assert.equal(graph.nodes.length,18);assert.equal(graph.straps.length,12);assert.equal(graph.plinth.length,27);
assert.equal(reg.sourceRevision,'R000001');assert.equal(reg.governingReport.concreteGrade,'M25');assert.equal(reg.governingReport.steelGrade,'Fe500');
assert.ok(reg.issueForConstruction===false);
for(const stage of STAGES){
 assert.equal(reg.byStage[stage.id].length,expected[stage.id],stage.id);
 assert.ok(fs.existsSync('public/projects/harisharan-adhikari/stages/'+stage.id+'/index.html'),stage.id);
 assert.equal(PROJECT_STAGE_EVIDENCE['harisharan-adhikari'][{v02:'groundworks',v03:'footing-rebar',m40:'footing-rcc',m50:'dowels',m60:'columns',m70:'plinth',m80:'tank'}[stage.id]].href,'projects/harisharan-adhikari/stages/'+stage.id+'/');
 for(const r of reg.byStage[stage.id]){
  assert.equal(r.source.sourceRevision,'R000001');
  assert.equal(r.source.governingId,'HAR-SRC-RPT-001');
  assert.ok(r.cement.acceptedMixQuantity===null);
  assert.ok(r.concreteM3>=0);
  assert.ok(Math.abs(r.steelRows.reduce((t,x)=>t+x.theoreticalKg,0)-r.theoreticalSteelKg)<.00002);
  for(const bar of r.steelRows){
   assert.equal(bar.role==='DRAFT_THEORETICAL_NOT_APPROVED_BBS'||bar.role?.includes('REFERENCE')||bar.role?.includes('CONTINUITY'),true);
   assert.ok(bar.theoreticalKg>0);
  }
 }
}
const by=(code,id)=>reg.byStage[code].find(r=>r.id===id);
const pcc=by('v02','PCC-A1');assert.ok(pcc);
assert.ok(Math.abs(pcc.concreteM3-2.1*2.7*.075)<1e-6);
assert.ok(pcc.steelRows.length===0&&pcc.steelStatus==='NO_SOURCE_SPECIFIED');
const footing=by('v03','F-A1');assert.equal(footing.support.footingType,'F2');assert.equal(footing.steelRows.length,2);
const f1=by('v03','F-B4');assert.equal(f1.support.footingType,'F1');
assert.ok(Math.abs(by('m40','PAD-A1').concreteM3-2.1*2.7*.6)<1e-6);
assert.equal(by('m40','PAD-A1').steelRows[0].role,'REFERENCE_V03__NOT_ADDITIVE');
assert.equal(by('m50','DOWEL-A1').independentDowelSteelKg,null);
assert.equal(by('m50','DOWEL-A1').independentDowelCementKg,null);
assert.ok(by('m50','DOWEL-A1').steelRows.every(b=>b.role.includes('REFERENCE')));
assert.equal(by('m60','COL-A1').geometry.bottomElevationM,-.9);
assert.equal(by('m60','COL-A1').geometry.topElevationM,.55);
assert.ok(by('m60','COL-A1').steelRows.some(x=>x.id==='CT-A1'));
const slice=memberSegmentScenario(by('m60','COL-A1'),0,.55);
assert.ok(Math.abs(slice.geometryConcreteM3-.45**2*.55)<1e-6);
assert.equal(slice.tieSetKg,null);
assert.throws(()=>memberSegmentScenario(by('m60','COL-A1'),0,5),/outside source-admitted/);
const pl=by('m70','PB-A1-B1'),st=by('m70','ST-A1-B1');
assert.ok(pl&&st);assert.equal(pl.kind,'plinth-beam');assert.equal(st.kind,'strap');
assert.equal(pl.steelRows.find(r=>r.id==='PB-A1-B1-8').count,44);
assert.notEqual(pl.steelRows.find(r=>r.id==='PB-A1-B1-8').originalSourceCount,44);
assert.equal(st.steelRows.find(r=>r.id==='ST-A1-B1-8').diameterMm,8);
assert.ok(pl.cement.planningBags>0&&st.cement.planningBags>0);
assert.equal(reg.byStage.m80.length,0);assert.equal(reg.summary.m80.concreteM3,null);assert.equal(reg.totals.tankVolumeM3,null);
assert.equal(reg.summary.v03.theoreticalSteelKg>0,true);assert.equal(reg.summary.m40.theoreticalSteelKg,null);
assert.equal(reg.summary.m50.theoreticalSteelKg,null);assert.equal(reg.summary.m60.theoreticalSteelKg>0,true);
const expectedOwned=reg.byStage.v03.reduce((n,r)=>n+r.theoreticalSteelKg,0)+
 reg.byStage.m60.reduce((n,r)=>n+r.theoreticalSteelKg,0)+
 reg.byStage.m70.reduce((n,r)=>n+r.theoreticalSteelKg,0);
assert.ok(Math.abs(reg.totals.steelKgScenario-expectedOwned)<.0005);
const singleMat=buildHarisharanStages(src,{footingMats:1});
assert.ok(singleMat.summary.v03.theoreticalSteelKg<reg.summary.v03.theoreticalSteelKg);
const tie10=buildHarisharanStages(src,{columnTieDiameter:10,columnTieSpacing:.1});
assert.ok(tie10.summary.m60.theoreticalSteelKg>reg.summary.m60.theoreticalSteelKg);
const mix=buildHarisharanStages(src,{rccCementKgM3:400});
assert.equal(mix.byStage.m40[0].concreteM3,reg.byStage.m40[0].concreteM3);
assert.ok(mix.byStage.m40[0].cement.planningBags>reg.byStage.m40[0].cement.planningBags);
assert.throws(()=>buildHarisharanStages(src,{footingMats:3}),/Invalid tie or mat/);
assert.equal(packageRecords('harisharan-adhikari').length,10);
assert.equal(NORMALIZED_PROJECTS['harisharan-adhikari'].slots.filter(r=>r.publicSourceHref).length,8);
assert.ok(NORMALIZED_PROJECTS['harisharan-adhikari'].slots.every(r=>r.engineeringApprovalEvidence===null&&r.approvedBBS===false));
console.log('HARISHARAN_SEVEN_STAGES_STATIC_PASS: 18 PCC,18 footing steel,18 RCC,18 dowel QA,18 columns,39 beams,0 tank objects, nonadditive sources');
