import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculate,assembly,unitMass} from '../../public/assets/js/harisharan-takeoff.mjs';
const source=JSON.parse(fs.readFileSync('public/data/projects/harisharan-adhikari/takeoff.json','utf8'));
const result=calculate(source),a=assembly(source),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
assert.equal(a.nodes.length,18);assert.equal(a.plinth.length,27);assert.equal(a.straps.length,12);
const counts={};for(const n of a.nodes)counts[n.type]=(counts[n.type]||0)+1;assert.deepEqual(counts,{C3:11,C4:4,C2:2,C1:1});
assert.equal(new Set(a.nodes.map(n=>n.id)).size,18);assert.equal(new Set(result.steel.map(n=>n.id)).size,result.steel.length);
// Independently calculated from explicit schedules, not copied engine output.
near(result.footingEnvelope,6*2.55*2.55*.6+12*2.7*2.1*.6);near(result.pcc,(6*2.55*2.55+12*2.7*2.1)*.075);
const mats=result.steel.filter(n=>n.stage==='Footings');near(mats.reduce((s,n)=>s+n.length,0),6*2*(18*2.45+18*2.45)+12*2*(19*2+15*2.6));
near(result.byDiameter.find(n=>n.diameter===25).length,6*2); // C1 only, no invented anchorage.
assert.ok(result.concrete.every(n=>n.volume>0));near(result.steel.reduce((s,n)=>s+n.kg,0),result.totalSteel);
near(result.cementBags,(result.rcc*350+result.pcc*1.54*1440/10)/50);
const one=calculate(source,{footingMats:1});near(result.totalSteel-one.totalSteel,mats.reduce((s,n)=>s+n.kg,0)/2);
const tie10=calculate(source,{columnTieDiameter:10,columnTieSpacing:.1});assert.ok(tie10.totalSteel>result.totalSteel);assert.equal(tie10.byDiameter.find(n=>n.diameter===10).diameter,10);
const richer=calculate(source,{rccCementKgM3:400});near(richer.cementBags-result.cementBags,result.rcc);
assert.throws(()=>calculate(source,{rccCementKgM3:NaN}));assert.throws(()=>calculate(source,{footingMats:3}));
assert.equal(source.defaults.beamCover,.025);assert.equal(source.defaults.strapCover,.05);const strap=result.steel.filter(x=>x.stage==='Strap links');assert.equal(strap.length,12);assert.ok(strap.every(x=>x.note.includes('4L @100')));
assert.equal(source.issueForConstruction,false);assert.equal(source.issues.length,8);assert.ok(source.exclusions.length>=5);
const files=['public/data/projects/harisharan-adhikari/takeoff.json','public/assets/js/harisharan-takeoff.mjs','public/projects/harisharan-adhikari/index.html','projects/harisharan-adhikari/workspace/index.html','projects/harisharan-adhikari/workspace/main.ts'];
for(const f of files)assert.ok(!/drive\.google\.com|docs\.google\.com|tecarchengineering@|9769494047/.test(fs.readFileSync(f,'utf8')),`Private source leak in ${f}`);
assert.equal(JSON.parse(fs.readFileSync('public/data/projects.json')).projects.filter(n=>n.slug==='harisharan-adhikari').length,1);
console.log('HARISHARAN_MATERIAL_SOURCE_QA_PASS',JSON.stringify({steelNetKg:result.totalSteel,cementScenarioBags:result.cementBags,rccScenarioM3:result.rcc,pccM3:result.pcc,engineeringApproved:false}));
