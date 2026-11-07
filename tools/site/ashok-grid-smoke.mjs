import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAADWorkspace} from '../../public/assets/js/aad-unified-workspace.mjs';
const root='public/data/projects/ashok-adhikari/';
const read=f=>JSON.parse(fs.readFileSync(root+f,'utf8'));
const current=read('aad-gf-model-v3-grid-review.json'),prior=read('aad-gf-model-v3-review.json'),manifest=read('aad-building-v3-grid-review.json'),grid=read('coordinate-grid-v1.json'),changes=read('grid-alignment-20261107.json'),ff=read('aad-ff-model-v3-review.json');
assert.equal(grid.schema,'jp-cad://architectural-coordinate-grid/1.0');
assert.equal(grid.baseCellMm,100);assert.equal(grid.horizontalPrecisionMm,1);assert.equal(grid.snapEnabled,false);
assert.deepEqual(grid.plot.buildingOriginInPlotMm,[1944,2000]);
assert.equal(grid.plot.widthMm,9144);assert.equal(grid.plot.depthMm,18288);
assert.equal((9144-grid.plot.buildingOriginInPlotMm[0]),7200);
assert.equal((18288-grid.plot.buildingOriginInPlotMm[1]-grid.plot.rearSetbackMm),14400);
assert.equal(grid.sheet.sizeMm[0],420);assert.equal(grid.sheet.recommendedScaleDenominator,100);
assert.equal(grid.constraints[0].targetXmm,3600);
assert.equal(grid.constraints[1].centrelineOffsetMm,575);
assert.equal(manifest.release.version,'v3-grid-review');assert.equal(manifest.release.previous,'v3-review');
assert.equal(manifest.restrictions.engineeringApproval,'HOLD');
assert.equal(manifest.restrictions.issueForConstruction,false);
assert.equal(manifest.levels.find(x=>x.id==='gf').model,'aad-gf-model-v3-grid-review.json');
assert.equal(manifest.levels.find(x=>x.id==='ff').model,'aad-ff-model-v3-review.json');
assert.equal(manifest.presentation.coordinateGrid.file,'coordinate-grid-v1.json');
const g=current.floorGraph,nodes=Object.fromEntries(g.nodes.map(n=>[n.id,n])),walls=Object.fromEntries(g.walls.map(w=>[w.id,w]));
assert.equal(Object.keys(nodes).length,g.nodes.length,'No duplicate node IDs');
for(const w of g.walls){const a=nodes[w.a],b=nodes[w.b];assert.ok(a&&b,'Missing node: '+w.id);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>0.000001,'Zero-length wall: '+w.id);}
for(const id of ['GF-BED-KITCHEN','GF-BATH-LOUNGE-V3','GF-HALL-LOW-1']){const w=walls[id];assert.ok(w,id);assert.equal(nodes[w.a].x,3.6,id+' a');assert.equal(nodes[w.b].x,3.6,id+' b');}
const spans=['GF-BED-KITCHEN','GF-BATH-LOUNGE-V3','GF-HALL-LOW-1'].map(id=>{const w=walls[id];return [nodes[w.a].z,nodes[w.b].z].sort((a,b)=>a-b)}).sort((a,b)=>a[0]-b[0]);
assert.deepEqual(spans,[[.115,5],[5,8.8],[8.8,12.2]],'One continuous common wall datum');
assert.equal(g.walls.some(w=>w.id==='GF-REAR-BAND-3'),false,'No redundant segment');
assert.equal(prior.floorGraph.walls.find(w=>w.id==='GF-BATH-LOUNGE-V3').a, 'GF-N017','Archived version must stay independent');
const oldNodes=Object.fromEntries(prior.floorGraph.nodes.map(n=>[n.id,n]));
assert.equal(oldNodes['GF-N017'].x,3.3,'Original v3 must remain unchanged');
const staircase=walls['GF-EXT-02-1'];assert.equal(nodes[staircase.a].x,4.175);assert.equal(nodes[staircase.b].x,4.175);
const widths={};for(const id of ['GF-BATH','GF-BED2','GF-LOUNGE']){const x=current.roomEnvelopes.find(r=>r.id===id),p=prior.roomEnvelopes.find(r=>r.id===id);widths[id]=[x.bbox[2]-x.bbox[0],p.bbox[2]-p.bbox[0]];}
assert.deepEqual(widths['GF-BATH'],[3600,3300]);assert.deepEqual(widths['GF-BED2'],[3600,3300]);assert.deepEqual(widths['GF-LOUNGE'],[3600,3900]);
assert.equal(changes.quantityChange.combinedAreaDeltaM2,0);
assert.equal(changes.quantityChange.buildingFootprintDeltaM2,0);
assert.equal(changes.quantityChange.boqPrice,null);
const nodesByFloor={gf:current,ff};for(const [floor,model] of Object.entries(nodesByFloor)){const ns=Object.fromEntries(model.floorGraph.nodes.map(n=>[n.id,n])),ws=Object.fromEntries(model.floorGraph.walls.map(w=>[w.id,w]));for(const o of model.floorGraph.openings){const w=ws[o.wallId];assert.ok(w,'Missing opening host '+o.id);const a=ns[w.a],b=ns[w.b];const length=Math.hypot(a.x-b.x,a.z-b.z);assert.ok(o.offset>=0&&o.offset+o.width<=length+1e-6,'Opening out of host '+o.id);if(Math.abs(a.x-7.085)<.001&&Math.abs(b.x-7.085)<.001)assert.fail('Zero right boundary aperture '+o.id)}}
const assembled=createAADWorkspace(manifest,{gf:current,ff}).snapshot().assembly;
assert.ok(assembled.elements.length>100);
assert.ok(assembled.diagnostics.some(x=>x.code==='20261107_GF_GRID_ALIGNMENT'));
assert.ok(assembled.diagnostics.some(x=>x.code==='20261107_ROOM_CLEARANCES'));
console.log('ASHOK_100MM_GRID_X3600_ALIGNMENT_PASS',JSON.stringify({centrelineMm:3600,stairHoldOffsetMm:575,rooms:widths,objects:assembled.elements.length,reviewOnly:true}));
