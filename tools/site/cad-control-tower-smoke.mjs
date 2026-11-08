import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PROJECTS,ALL_WORKSPACE_PROJECTS,CHAPTERS} from '../../public/assets/js/project-workspace-config.mjs';
import {validateControlTower,inspectAxisEvidence,modelLineage,reviewGate,REQUIRED_CHAPTERS} from '../../public/assets/js/cad-view-control-tower.mjs';
const path='public/data/cad/view-control-tower.v1.json';
const t=validateControlTower(JSON.parse(fs.readFileSync(path,'utf8')));
assert.deepEqual(CHAPTERS.map(x=>x[0]),REQUIRED_CHAPTERS);
assert.deepEqual(t.axisContract.displayIn,REQUIRED_CHAPTERS);
assert.ok(t.axisContract.displayRules.every(x=>x.length>20));
assert.equal(t.principles[0].north.includes('chapters'),true);
const all=Object.keys(ALL_WORKSPACE_PROJECTS);
assert.deepEqual(Object.keys(t.projects).sort(),all.sort());
for(const slug of all){
 const project=t.projects[slug];
 for(let i=0;i<project.gates.length;i++){
  const {gate,count,index}=reviewGate(t,slug,i);
  assert.equal(index,i);assert.equal(count,project.gates.length);
  assert.equal(gate.id,project.gateIds[i]);
  if(gate.sourceRef)assert.ok(fs.existsSync('public/'+gate.sourceRef),gate.sourceRef);
 }
 const e=ALL_WORKSPACE_PROJECTS[slug].editions[0];
 const manifest=e.manifest?JSON.parse(fs.readFileSync('public/'+e.manifest,'utf8')):null;
 const axes=inspectAxisEvidence(t,manifest,{slug,editionId:e.id});
 for(const chapter of REQUIRED_CHAPTERS){
  const lineage=modelLineage(t,{slug,editionId:e.id,phase:ALL_WORKSPACE_PROJECTS[slug].defaultLevel,panel:chapter,manifest});
  assert.equal(lineage.axisStatus,axes.status);
  assert.deepEqual(lineage.axisIds,axes.axisIds);
  assert.equal(lineage.chapter,chapter);
  assert.equal(lineage.constructionApproved,false);
 }
}
const ash=PROJECTS['ashok-adhikari'];
const v32=ash.editions.find(e=>e.id==='v3-2');
const previous=ash.editions.find(e=>e.id==='v3-grid');
assert.ok(v32&&previous,'Review and old historical edition required');
const m=JSON.parse(fs.readFileSync('public/'+v32.manifest,'utf8'));
const old=JSON.parse(fs.readFileSync('public/'+previous.manifest,'utf8'));
const current=inspectAxisEvidence(t,m,{slug:'ashok-adhikari',editionId:v32.id});
const prior=inspectAxisEvidence(t,old,{slug:'ashok-adhikari',editionId:previous.id});
assert.equal(current.status,'DISPLAY_REVIEW_ONLY');
assert.equal(prior.status,'AXES_NOT_ADMITTED','Legacy edition must remain untouched');
assert.deepEqual(current.axisIds,[
 'A1','A2','A3','A4','A5','B1','B2','B3','B4','B5','C2','C3','C4','C5']);
assert.equal(current.floorRegistration,'gf/ff');
assert.equal(m.restrictions.issueForConstruction,false);
assert.equal(m.restrictions.engineeringApproval,'HOLD');
const template=JSON.parse(fs.readFileSync('public/templates/project-workspace/project-template.v1.json','utf8'));
assert.equal(template.viewControlTower.schema,t.schema);
assert.equal(template.viewControlTower.axisRegistry.sourceRef,null);
assert.equal(template.viewControlTower.axisRegistry.structuralAuthority,'NOT_ADMITTED');
assert.ok(template.navigation.south.includes('no duplicate'));
const shell=fs.readFileSync('public/assets/js/project-workspace.mjs','utf8');
assert.match(shell,/renderReviewNavigation/);
assert.match(shell,/data\.cad|view-control-tower\.v1\.json/);
assert.match(shell,/pw-axis-proof/);
assert.match(shell,/pw-review-next/);
assert.doesNotMatch(shell,/renderPackageDock|data-dock-package|data-dock-empty/,'South must not reproduce package-navigation menu');
assert.ok(fs.existsSync('public/templates/project-workspace/control-tower/index.html'));
assert.match(fs.readFileSync('public/templates/project-workspace/control-tower/index.html','utf8'),/AXES_NOT_ADMITTED/);
console.log('CAD_CONTROL_TOWER_5_CHAPTERS_4_REAL_PLUS_EMPTY_SOURCE_AXIS_AND_UNIQUE_SOUTH_ROUTE_PASS');
