import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectColumnAxisGrid} from '../../public/assets/js/aad-column-axis-grid.mjs';
const root='public/data/projects/ashok-adhikari/';
const get=n=>JSON.parse(fs.readFileSync(root+n,'utf8'));
const candidate=get('aad-building-v3-2-review.json');
const previous=get('aad-building-v3-grid-review.json');
const ledger=get('coordination-20261108.json');
const a=inspectColumnAxisGrid(candidate);
assert.equal(inspectColumnAxisGrid(previous),null,'v3.1 must not receive an implicit axis grid');
assert.deepEqual(a.grid.letterAxes.map(x=>x.label),['A','B','C']);
assert.deepEqual(a.grid.numberAxes.map(x=>x.label),['1','2','3','4','5']);
assert.deepEqual(a.grid.letterAxes.map(x=>x.xMm),[150,4290,7050]);
assert.deepEqual(a.grid.numberAxes.map(x=>x.zMm),[14250,12200,8800,5000,150]);
assert.equal(candidate.presentation.coordinateGrid.baseCellMm,100);
assert.deepEqual(a.knownEmpty,['C1']);
assert.equal(a.markerIds.length,14);
assert.ok(a.markerIds.includes('A1'));
assert.ok(a.markerIds.includes('C5'));
assert.ok(!a.markerIds.includes('C1'));
assert.deepEqual(Object.keys(a.markersByLevel).sort(),['ff','gf']);
for(const level of ['gf','ff']){
 assert.equal(a.markersByLevel[level].length,14);
 for(const marker of a.markersByLevel[level]){
  assert.ok(/^[A-C][1-5]$/.test(marker.id));
  const proxy=candidate.presentation.elements.find(e=>e.id===marker.elementId&&e.level===level);
  assert.ok(proxy);
  assert.match(proxy.status,/NOT_A_DESIGNED_SECTION/);
  assert.equal(proxy.axisReference,marker.id);
 }
}
assert.equal(candidate.representation,'ARCHITECTURAL_REVIEW_ONLY');
assert.equal(candidate.restrictions.issueForConstruction,false);
assert.equal(candidate.restrictions.engineeringApproval,'HOLD');
assert.ok(candidate.reviewHolds.some(h=>h.code==='20261108_COLUMN_AXIS_REFERENCE_ONLY'));
assert.equal(ledger.columnAxisReview.independentLoadPathApproval,false);
assert.equal(ledger.columnAxisReview.excludedIntersection,'C1');
assert.equal(ledger.columnAxisReview.gfMarkers,14);
assert.equal(ledger.columnAxisReview.ffMarkers,14);
console.log('ASHOK_COLUMN_AXES_A_C_1_5_PRESERVATION_PASS');
