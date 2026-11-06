import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAADWorkspace} from '../../public/assets/js/aad-unified-workspace.mjs';
const p='public/data/projects/ashok-adhikari/',rd=n=>JSON.parse(fs.readFileSync(p+n,'utf8'));
const source=rd('aad-building-qa02.json'),revision=rd('owner-revision-20261106.json'),manifest=rd('aad-building-v3-review.json');
const gf=rd('aad-gf-model-v3-review.json'),ff=rd('aad-ff-model-v3-review.json');
assert.equal(manifest.release.version,'v3-review');
assert.equal(source.release.version,'v2');
assert.equal(manifest.restrictions.issueForConstruction,false);
assert.deepEqual(manifest.levels.map(x=>x.model),['aad-gf-model-v3-review.json','aad-ff-model-v3-review.json']);
assert.deepEqual(manifest.presentation.outerBounds,source.presentation.outerBounds);
assert.ok(manifest.reviewHolds.find(x=>x.code==='20261106_GROUND_ACCESSIBILITY'));
assert.ok(!gf.floorGraph.labels['GF-HALL-REV04-001']);
assert.equal(gf.roomEnvelopes.filter(x=>x.id==='GF-HALL-REV04-001').length,0);
const bath=gf.roomEnvelopes.find(x=>x.id==='GF-BATH');
assert.deepEqual(bath.bbox,[0,5600,3300,9400]);
const prevBath=rd('aad-gf-model-qa02.json').roomEnvelopes.find(x=>x.id==='GF-BATH');
assert.equal(((bath.bbox[2]-bath.bbox[0])-(prevBath.bbox[2]-prevBath.bbox[0]))*(bath.bbox[3]-bath.bbox[1])/1e6,4.5144);
assert.equal(revision.impacts.boq.quantitative.grossBathroomZoneIncreaseM2,4.5144);
for(const id of ['GF-D-BED1-KITCHEN-V3','GF-D-KITCHEN-LOUNGE-V3','GF-D-BATH-LOUNGE-V3','GF-D-BED2-LOUNGE-V3'])assert.ok(gf.floorGraph.openings.some(o=>o.id===id),id);
for(const id of ['GF-D-BED1-HALL','GF-D-BED2-HALL','GF-D-BATH-HALL','GF-OPEN-KITCHEN'])assert.ok(!gf.floorGraph.openings.some(o=>o.id===id),'Retired opening remains: '+id);
for(const id of ['FF-W001','FF-W002']){const o=ff.floorGraph.openings.find(x=>x.id===id);assert.equal(o.width,2.1);assert.equal(o.style,'aluminium-sliding');}
for(const id of ['FF-W008-BED2-STAIR-V3','FF-W009-BED2-STAIR-V3']){const o=ff.floorGraph.openings.find(x=>x.id===id);assert.equal(o.wallId,'FF-STAIR-REAR-1');assert.match(o.status,/HOLD/);}
assert.equal(ff.floorGraph.openings.find(x=>x.id==='FF-W005').style,'aluminium-sliding');
for(const [level,m] of Object.entries({gf,ff})){
 const nodes=Object.fromEntries(m.floorGraph.nodes.map(n=>[n.id,n])),walls=Object.fromEntries(m.floorGraph.walls.map(w=>[w.id,w]));
 for(const opening of m.floorGraph.openings){
  const wall=walls[opening.wallId];assert.ok(wall,'Missing '+opening.wallId);
  const a=nodes[wall.a],b=nodes[wall.b];assert.ok(a&&b);
  const len=Math.hypot(a.x-b.x,a.z-b.z);
  assert.ok(opening.offset>=0&&opening.width>0&&opening.offset+opening.width<=len+1e-6,'Out of wall: '+opening.id);
  assert.ok(!(Math.abs(a.x-7.085)<1e-6&&Math.abs(b.x-7.085)<1e-6),'Zero-setback right wall was opened: '+opening.id);
 }
 for(const wall of m.floorGraph.walls){assert.ok(nodes[wall.a]&&nodes[wall.b],'Dangling wall '+wall.id);}
 const hosts=new Map();
 for(const o of m.floorGraph.openings)(hosts.get(o.wallId)||hosts.set(o.wallId,[]).get(o.wallId)).push(o);
 for(const [host,arr] of hosts){arr.sort((a,b)=>a.offset-b.offset);for(let i=1;i<arr.length;i++)assert.ok(arr[i].offset>=arr[i-1].offset+arr[i-1].width-1e-6,'Overlapping apertures: '+host);}
}
assert.equal(revision.impacts.gantt.startDate,null);assert.equal(revision.impacts.gantt.durations,null);assert.equal(revision.impacts.boq.approvedBOQ,null);
const built=createAADWorkspace(manifest,{gf,ff}).snapshot().assembly;
assert.ok(built.elements.length>0);
assert.ok(built.counts.door>0&&built.counts.window>0);
console.log('ASHOK_V3_OWNER_CHANGE_REVIEW_PASS',JSON.stringify({roomBath:bath.bbox,doors:built.counts.door,windows:built.counts.window,holdCount:manifest.reviewHolds.length}));
