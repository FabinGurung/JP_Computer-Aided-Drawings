import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {PROJECTS,ALL_WORKSPACE_PROJECTS,EMPTY_DUMMY_PROJECT,CHAPTERS} from '../../public/assets/js/project-workspace-config.mjs';
import {NORMALIZED_PACKAGE_CATALOG,NORMALIZED_PROJECTS,NORMALIZED_EVIDENCE,normalizedSlots,renderNormalizedReadiness} from '../../public/assets/js/project-engineering-normalization.mjs';
import {packageRecords,renderPackages} from '../../public/assets/js/project-site-packages.mjs';
import {theoreticalSteelMass,simpleRectangularVolume,cementBagsFromApprovedDosage,stirrupOrDowelCutLengthWithoutAcceptedDetail} from '../../public/assets/js/engineering-quantity-guardrails.mjs';
const read=p=>fs.readFileSync(p,'utf8');
const register=JSON.parse(read('public/data/engineering/engineering-package-readiness.v1.json'));
const quantity=JSON.parse(read('public/data/engineering/quantity-posters.v1.json'));
const demo=JSON.parse(read('public/templates/project-workspace/project-template.v1.json'));
const real=Object.keys(PROJECTS).sort(),all=Object.keys(ALL_WORKSPACE_PROJECTS).sort();
assert.deepEqual(real,['ashok-adhikari','harisharan-adhikari','narayani-parajuli','ramachandra-devkota']);
assert.deepEqual(all,[...real,'example-empty'].sort());
assert.equal(EMPTY_DUMMY_PROJECT.synthetic,true);
assert.equal(EMPTY_DUMMY_PROJECT.editions[0].manifest,undefined);
assert.equal(EMPTY_DUMMY_PROJECT.editions[0].engine,undefined);
assert.equal(demo.project.slug,'example-empty');
assert.equal(demo.packages.length,0,'dummy must be actually empty, not carry fake example quantities');
assert.equal(demo.sourceBoundary.designApproval,false);
assert.equal(demo.normalization.engineeringApproval,false);
assert.equal(demo.normalization.requiredPackageSlots,16);
assert.deepEqual(CHAPTERS.map(c=>c[0]),['views','boq','gantt','packages','sources']);
assert.equal(NORMALIZED_PACKAGE_CATALOG.length,16);
assert.equal(new Set(NORMALIZED_PACKAGE_CATALOG.map(x=>x.id)).size,16);
assert.deepEqual(register.catalog,NORMALIZED_PACKAGE_CATALOG,'JSON and deployed renderer must describe exactly the same package categories');
assert.deepEqual(register.projects,NORMALIZED_PROJECTS,'No stale/competing machine register or UI status');
assert.deepEqual(Object.keys(register.projects).sort(),all);
const expectedCounts={'narayani-parajuli':7,'harisharan-adhikari':5,'ashok-adhikari':1,'ramachandra-devkota':0,'example-empty':0};
for(const slug of all){
 const p=NORMALIZED_PROJECTS[slug],slots=normalizedSlots(slug);
 assert.equal(slots.length,16,slug);
 assert.deepEqual(slots.map(s=>s.slotId),NORMALIZED_PACKAGE_CATALOG.map(s=>s.id),slug);
 assert.ok(slots.every(s=>s.engineeringApprovalEvidence===null),slug+' must not invent an engineer approval');
 assert.ok(slots.every(s=>s.approvedBBS===false&&s.calculatedValues===null&&s.fieldInspection===null),slug);
 assert.equal(slots.filter(s=>s.publicSourceHref).length,expectedCounts[slug],slug+' source-backed category count');
 assert.ok(slots.every(s=>s.quantityBasisVerified===false),slug);
 assert.equal(p.normalizationStatus,'SCHEMA_NORMALIZED_NOT_ENGINEERING_APPROVED');
 const page='public/projects/'+slug+'/index.html';
 const wall='public/projects/'+slug+'/memory-wall/index.html';
 assert.ok(fs.existsSync(page),page);
 assert.ok(fs.existsSync(wall),wall);
 assert.match(read(wall),new RegExp('data-project="'+slug+'"'));
 assert.match(read(wall),/cad-project-memory-palace\.mjs/);
 const html=renderNormalizedReadiness({slug,root:new URL('https://example.com/JP_Computer-Aided-Drawings/'),
  escape:s=>String(s).replaceAll('&','&amp;')});
 assert.equal((html.match(/class="pw-normalized-item"/g)||[]).length,16,slug);
 assert.match(html,/engineering acceptance/i);
 assert.match(html,/4\.2\.16/);
 for(const s of slots){
  assert.ok(['TEMPLATE ONLY','NOT ADMITTED','FROZEN','PROVISIONAL STUDY','PHASE SUMMARY','COORDINATION ONLY','ENGINEERING HOLD'].includes(s.sourceStatus),slug);
  if(s.publicSourceHref){
   assert.equal(s.sourceRevisionAccepted,null);assert.ok(s.originalSourceModule);
   const u=new URL(s.publicSourceHref,'https://example.com/');
   const fn=path.join('public',u.pathname.replace(/^\/+/,''));
   const other=path.join('.',u.pathname.replace(/^\/+/,''));
   assert.ok(fs.existsSync(fn)||fs.existsSync(path.join(fn,'index.html'))||fs.existsSync(other)||fs.existsSync(path.join(other,'index.html')),fn);
  }else assert.equal(s.originalSourceModule,null);
 }
}
for(const s of normalizedSlots('example-empty'))assert.equal(s.sourceStatus,'TEMPLATE ONLY');
assert.equal(packageRecords('example-empty').length,0);
assert.equal(packageRecords('narayani-parajuli').length,7);
assert.equal(packageRecords('harisharan-adhikari').length,6);
assert.equal(packageRecords('ashok-adhikari').length,1);
assert.equal(packageRecords('ramachandra-devkota').length,0);
assert.equal(normalizedSlots('narayani-parajuli').find(s=>s.slotId==='tank').sourceStatus,'ENGINEERING HOLD');
assert.equal(normalizedSlots('narayani-parajuli').find(s=>s.slotId==='soling').sourceStatus,'NOT ADMITTED');
assert.equal(normalizedSlots('harisharan-adhikari').find(s=>s.slotId==='plinth').sourceStatus,'PROVISIONAL STUDY');
assert.equal(normalizedSlots('ashok-adhikari').find(s=>s.slotId==='upper-floors').sourceStatus,'COORDINATION ONLY');
assert.ok(quantity.rules.every(x=>x.approval==='NO'&&x.siteDefaults===null));
const steel=theoreticalSteelMass({diameterMm:12,cutLengthM:1,barCount:1});
assert.ok(Math.abs(steel.theoreticalUnitMassKgPerM-0.8875)<0.005);
assert.equal(steel.approvingEngineer,null);
assert.equal(simpleRectangularVolume({lengthM:2,widthM:3,heightM:4}).netM3,null);
assert.equal(cementBagsFromApprovedDosage({volumeM3:1,dosageKgPerM3:300,bagSizeKg:50}).bagCount,null);
assert.equal(stirrupOrDowelCutLengthWithoutAcceptedDetail().cutLengthM,null);
for(const bad of [0,-10,NaN,Infinity])assert.throws(()=>theoreticalSteelMass({diameterMm:bad,cutLengthM:1}));
const palace=read('public/assets/js/cad-project-memory-palace.mjs');
assert.match(palace,/class="level3"/);
assert.match(palace,/subsection-/);
assert.match(palace,/theoretical rod mass/i);
const pub=read('public/memory-wall/pages/index.html');
const starter=read('public/templates/project-workspace/index.html');
for(const [label,html] of [['Pages memory',pub],['starter',starter]]){
 assert.match(html,/Three-level table of contents/i,label);
 assert.match(html,/class="level3"/);
 assert.match(html,/1\.1\.1/);
 assert.match(html,/chapter-5/);
}
for(const stage of ['v02','v03','m40','m50','m60','m70','m80']){
 const expected={
 v02:'069eff794f6f909ecfa62571cc0c633c72a6c6b9',v03:'d524b236baa437d31c4aab18c0dc6ce52bd2fae7',m40:'4d732e35cdbfd959628701a14792d5436951fd69',
 m50:'c046589907f3547f77131a55bb4f58d6d3ae2e4b',m60:'965c8460d825d495a7a60f4310c1fa34f6bb4562',m70:'76d33e99e706a9b24e5e9c60f78a354a23ab23d9',
 m80:'649ebd2a6964414fc11adbfe1ecacaf723d635e0'}[stage];
 assert.equal(execFileSync('git',['rev-parse','HEAD:public/stages/'+stage],{encoding:'utf8'}).trim(),expected);
}
console.log('ENGINEERING_NORMALIZATION_PASS 4 real projects + 1 fictional empty starter, 16 source-qualified stages each, 3-level memory walls, no invented approvals');
