import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectNativeSourceAxisRegistry,modelLineage,validateControlTower} from '../../public/assets/js/cad-view-control-tower.mjs';
const read=p=>JSON.parse(fs.readFileSync('public/'+p,'utf8'));
const t=validateControlTower(read('data/cad/view-control-tower.v1.json'));
const sources=[
 ['narayani-parajuli','data/projects/narayani-parajuli/source-axis-register.v1.json',23],
 ['harisharan-adhikari','data/projects/harisharan-adhikari/source-axis-register.v1.json',18]
];
for(const [slug,path,count] of sources){
 assert.equal(t.projects[slug].axisRegisterRef,path);
 const r=read(path);
 assert.equal(r.sourceCount,count);
 assert.equal(r.members.length,count);
 assert.equal(r.displayPolicy.createUnoccupiedIntersections,false);
 assert.equal(r.displayPolicy.createLinesFromBareMarks,false);
 assert.equal(r.displayPolicy.notForConstruction,true);
 const view=inspectNativeSourceAxisRegistry(r,{phase:slug==='narayani-parajuli'?'gf':'ground'});
 assert.equal(view.status,'SOURCE_MARKS_REGISTERED_REVIEW_ONLY');
 assert.equal(view.axisIds.length,count);
 assert.equal(view.globalLinesAdmitted,false);
 assert.ok(view.sourceFileSha256.length===64);
 for(const c of ['views','boq','gantt','packages','sources']){
  const l=modelLineage(t,{slug,editionId:'source-current',phase:slug==='narayani-parajuli'?'gf':'ground',panel:c,nativeRegister:r});
  assert.equal(l.axisStatus,'SOURCE_MARKS_REGISTERED_REVIEW_ONLY');
  assert.deepEqual(l.axisIds,view.axisIds);
  assert.equal(l.constructionApproved,false);
  assert.equal(l.axisSourceFileSha256,r.sourceFileSha256);
 }
}
const nar=read(sources[0][1]),narOriginal=read('data/projects/narayani-parajuli/aad-source-gf-review-v1.json');
assert.equal(narOriginal.columns.length,23);
assert.equal(nar.members.length,narOriginal.columns.length);
const originalIds=new Set(narOriginal.columns.map(c=>c[0]));
for(const m of nar.members){
 assert.ok(originalIds.has(m.sourceElementId));
 const c=narOriginal.columns.find(c=>c[0]===m.sourceElementId);
 assert.equal(m.sourceAxisRef,c[1]);
 assert.equal(m.sourceNativeXYmm.x,c[3]);
 assert.equal(m.sourceNativeXYmm.y,c[4]);
 assert.equal(m.columnEntityHandle,c[5]);
}
assert.deepEqual(nar.letters,['A','B','C','D','E','F','G','H','I']);
assert.deepEqual(nar.numbers,[1,2,3,4,5,6,7]);
assert.ok(!nar.members.some(m=>m.sourceAxisRef==='I3'));
assert.equal(nar.members.find(m=>m.sourceAxisRef==='I4').workingAxisRef,'I3');
assert.equal(nar.workingException.workingAxis,'I3');
assert.equal(nar.workingException.replaces,'SC-I4');
assert.equal(nar.coordinateFrame.nativeToAadBuildingTransform,null);
const narFF=inspectNativeSourceAxisRegistry(nar,{phase:'ff'});
assert.equal(narFF.status,'AXES_NOT_ADMITTED');
assert.deepEqual(narFF.axisIds,[]);
assert.equal(read('data/projects/narayani-parajuli/aad-building-v1.json').structural.columns.source,'AI_INFERRED_4x3_AXIS_GRID_NOT_DXF_CERTIFIED');
const har=read(sources[1][1]),takeoff=read('data/projects/harisharan-adhikari/takeoff.json'),upper=read('data/projects/harisharan-adhikari/upper-floor-source-r000001.json');
const report=new Set(upper.records.map(x=>x.grid));
assert.equal(report.size,18);
for(const m of har.members){
 assert.ok(report.has(m.axisReference));
 const row=takeoff.rows.find(r=>r.row===m.row);
 assert.equal(m.zM,row.z);
 const x=m.axisReference.startsWith('A')?0:m.axisReference.startsWith('B')?takeoff.dimensions.leftBay:takeoff.dimensions.leftBay+row.rightBay;
 assert.ok(Math.abs(m.xM-x)<0.000001);
}
assert.deepEqual(har.nonRectangularBoundary,{row1to3RightAxis:'F',row4RightAxis:'E',row5RightAxis:'D',row6RightAxis:'C',straightContinuousRightAxisAssumed:false});
assert.equal(inspectNativeSourceAxisRegistry(har,{phase:'first'}).status,'SOURCE_MARKS_REGISTERED_REVIEW_ONLY');
assert.equal(har.coordinateFrame.sameFloorCrossLevelValidated,false);
console.log('CAD_PROJECT_NATIVE_AXES_HAR18_NAR23_I3_PROVENANCE_AND_FIVE_CHAPTER_HOLDS_PASS');
