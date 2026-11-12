import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAADWorkspace} from '../../public/assets/js/aad-unified-workspace.mjs';
import {inspectColumnAxisGrid} from '../../public/assets/js/aad-column-axis-grid.mjs';
const root='public/data/projects/ashok-adhikari/';
const read=name=>JSON.parse(fs.readFileSync(root+name,'utf8'));
const baseline=read('aad-building-v3-2-review.json');
const manifest=read('aad-building-v3-3-review.json');
const gf=read('aad-gf-model-v3-grid-review.json');
const oldFF=read('aad-ff-model-v3-2-review.json');
const ff=read('aad-ff-model-v3-3-review.json');
const ledger=read('coordination-20261112.json');
assert.equal(baseline.release.version,'v3-2-review');
assert.equal(manifest.release.version,'v3-3-review');
assert.equal(manifest.release.previous,'v3-2-review');
assert.equal(manifest.representation,'ARCHITECTURAL_REVIEW_ONLY');
assert.equal(manifest.restrictions.issueForConstruction,false);
assert.equal(manifest.restrictions.engineeringApproval,'HOLD');
assert.equal(manifest.levels.find(l=>l.id==='gf').model,'aad-gf-model-v3-grid-review.json');
assert.equal(manifest.levels.find(l=>l.id==='ff').model,'aad-ff-model-v3-3-review.json');
assert.equal(manifest.presentation.coordinateGrid.baseCellMm,100);
const check=inspectColumnAxisGrid(manifest);
assert.deepEqual(check.grid.letterAxes.map(x=>x.xMm),[150,3600,7050]);
assert.deepEqual(check.grid.numberAxes.map(z=>z.zMm),[14250,12200,8800,5000,150]);
assert.deepEqual(check.knownEmpty,['C1']);
for(const level of ['gf','ff']){
 for(let i=1;i<=5;i++){
  const e=check.markersByLevel[level].find(x=>x.id==='B'+i);
  assert.ok(e);
  assert.equal(e.xMm,3600);
 }
 assert.equal(check.markersByLevel[level].length,14);
}
const prevMarkers=baseline.presentation.elements.filter(e=>e.kind==='column');
const changed=manifest.presentation.elements.filter(e=>e.kind==='column');
assert.equal(prevMarkers.length,28);
assert.equal(changed.length,28);
for(const e of prevMarkers){
 const now=changed.find(x=>x.id===e.id&&x.level===e.level);
 assert.ok(now,e.id);
 assert.equal(now.z,e.z);
 assert.equal(now.x,e.axisReference?.startsWith('B')?3.6:e.x);
}
assert.deepEqual(ff.floorGraph.nodes,oldFF.floorGraph.nodes,'Do not move source nodes');
assert.deepEqual(ff.floorGraph.walls,oldFF.floorGraph.walls,'Do not move wall geometry');
assert.deepEqual(ff.roomEnvelopes,oldFF.roomEnvelopes,'Keep nominal room zoning');
const before=Object.fromEntries(oldFF.floorGraph.openings.map(o=>[o.id,o]));
const after=Object.fromEntries(ff.floorGraph.openings.map(o=>[o.id,o]));
assert.equal(ff.floorGraph.openings.length,oldFF.floorGraph.openings.length+1);
for(const [id,o] of Object.entries(before)){
 const candidate=after[id];assert.ok(candidate,id);
 if(id!=='FF-D-LOUNGE-MAIN')assert.deepEqual(candidate,o,'Historical openings must not be changed: '+id);
}
assert.equal(after['FF-D-LOUNGE-MAIN'].wallId,'FF-MAIN-BAND-3');
assert.equal(after['FF-D-LOUNGE-MAIN'].offset,.55);
assert.equal(after['FF-D-LOUNGE-MAIN'].width,.914);
const window=after['FF-W009-C4-C2-OWNER-20261112'];
assert.ok(window);
assert.equal(window.wallId,'FF-EXT-04-1');
assert.equal(window.offset,2.435);
assert.equal(window.width,2.1);
assert.equal(window.height,1.5);
assert.match(window.status,/MUNICIPAL_HOLD/);
assert.equal(ledger.ownerInstructions.length,4);
assert.equal(ledger.engineeringApproval,false);
assert.equal(ledger.issueForConstruction,false);
assert.equal(ledger.ownerInstructions.find(x=>x.id==='STAIR').geometryChange,false);
const oldStair=baseline.presentation.elements.filter(e=>/stair|landing|roof-access/i.test(e.kind+' '+e.id));
const newStair=manifest.presentation.elements.filter(e=>/stair|landing|roof-access/i.test(e.kind+' '+e.id));
assert.deepEqual(newStair,oldStair,'Do not silently modify stairs');
const assembly=createAADWorkspace(manifest,{gf,ff}).snapshot().assembly;
assert.ok(assembly.elements.some(e=>e.id?.endsWith('FF-W009-C4-C2-OWNER-20261112')));
assert.ok(assembly.elements.some(e=>e.id?.endsWith('FF-D-LOUNGE-MAIN')));
const stair=read('staircase-dimension-audit-20261112.json');
const schedule=stair.drawnConfiguration,option=stair.ownerPreviouslyRequestedOption;
const approx=(a,b)=>Math.abs(a-b)<.01; // allow millimetre values rounded to 0.001 in the published JSON
assert.equal(stair.classification,'ARCHITECTURAL_DIMENSION_CHECK_ONLY__DESIGN_GEOMETRY_UNCHANGED');
assert.equal(manifest.presentation.roofAccess.risers,schedule.riserCount);
assert.ok(approx(manifest.presentation.roofAccess.riseM*1000,schedule.risePerStoreyMm));
assert.ok(approx(manifest.presentation.roofAccess.treadM*1000,schedule.goingMm));
assert.equal(schedule.riserCount/schedule.flightCount,schedule.risersPerFlight);
assert.ok(approx(schedule.riserHeightMm*schedule.riserCount,schedule.risePerStoreyMm));
assert.equal(schedule.goingsPerFlight,schedule.risersPerFlight-1);
assert.ok(approx(schedule.horizontalRunPerFlightMm,schedule.goingsPerFlight*schedule.goingMm));
assert.ok(approx(schedule.longitudinalEnvelopeMm,schedule.horizontalRunPerFlightMm+schedule.sideLandingWidthMm+schedule.midLandingWidthMm));
assert.ok(approx(schedule.nominalBayDimensionsMm.longitudinal,manifest.presentation.stairBay[0]*1000));
assert.ok(approx(schedule.nominalLongitudinalResidualMm,schedule.nominalBayDimensionsMm.longitudinal-schedule.longitudinalEnvelopeMm));
assert.ok(approx(option.nominalResidualMm,254.8));
assert.equal(stair.coordinateReconciliation.proposedDisplayAxisBXmm,3600);
assert.equal(stair.coordinateReconciliation.stairDatumXmm,4175);
assert.equal(stair.geometryMutationsApplied,0);
assert.deepEqual(manifest.presentation.elements.filter(e=>e.id==='GF-STAIR-FLIGHTS'),baseline.presentation.elements.filter(e=>e.id==='GF-STAIR-FLIGHTS'));
console.log('ASHOK_V3_3_STAIR_DIMENSION_AND_SOURCE_NON_MUTATION_PASS',schedule.riserHeightMm,schedule.horizontalRunPerFlightMm,option.nominalResidualMm);
console.log('ASHOK_V3_3_OWNER_FF_OPENINGS_B_AXIS_REVIEW_HOLD_PASS');
