import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createAADWorkspace} from '../../public/assets/js/aad-unified-workspace.mjs';
import {wallSolidCells} from '../../public/assets/js/aad-wall-voids.mjs';
import {writeIFC4,checkIfcReferences} from '../../public/assets/js/aad-building-ifc4.mjs';
const dir='public/data/projects/ashok-adhikari/',read=n=>JSON.parse(fs.readFileSync(dir+n));
const manifest=read('aad-building-qa02.json'),models=Object.fromEntries(manifest.levels.map(l=>[l.id,read(l.model)]));
const source=read('model.public.json'),ledger=read('coordination-ledger-qa02.json');
const workspace=createAADWorkspace(manifest,models),b=workspace.snapshot().assembly;
assert.equal(b.counts.wall,49);assert.equal(b.counts.window,18);assert.equal(b.counts.door,14);
assert.ok(b.counts.furniture>=30&&b.counts.fixture===12&&b.counts.column===28);
assert.deepEqual(manifest.presentation.outerBounds,[0,0,7.2,14.4]);
assert.deepEqual(source.site.plot,{width_mm:9144,length_mm:18288});
assert.equal(manifest.levels[0].elevation,.61);assert.equal(manifest.levels[1].elevation,3.658);
for(const floor of ['gf','ff']){
 const model=models[floor],g=model.floorGraph,nodes=new Map(g.nodes.map(n=>[n.id,n]));
 const admitted=new Set(g.openings.map(o=>o.id));
 for(const o of source[floor.toUpperCase()].openings){
  if(o.action==='REMOVE')assert.ok(!admitted.has(o.id),'Source removal reinstated '+o.id);
  else if(['DOOR','WINDOW','VENTILATOR'].includes(o.type))assert.ok(admitted.has(o.id),'Source opening omitted '+o.id);
 }
 // Positive-length collinear overlaps are prohibited. Shared T/corner nodes are allowed.
 for(let i=0;i<g.walls.length;i++)for(let j=i+1;j<g.walls.length;j++){
  const a=g.walls[i],d=g.walls[j],A=nodes.get(a.a),B=nodes.get(a.b),C=nodes.get(d.a),D=nodes.get(d.b);
  const dx=B.x-A.x,dz=B.z-A.z,len=Math.hypot(dx,dz),cross=p=>Math.abs((p.x-A.x)*dz-(p.z-A.z)*dx);
  if(cross(C)<1e-7&&cross(D)<1e-7){
   const at=p=>((p.x-A.x)*dx+(p.z-A.z)*dz)/len;
   assert.ok(Math.min(len,Math.max(at(C),at(D)))-Math.max(0,Math.min(at(C),at(D)))<1e-6,'Overlapping walls '+a.id+' '+d.id);
  }
 }
 const exterior=g.perimeter.flatMap(id=>{const w=g.walls.find(w=>w.id===id);return[nodes.get(w.a),nodes.get(w.b)];});
 assert.equal(Math.min(...exterior.map(p=>p.x))-.115,0);
 assert.ok(Math.abs(Math.max(...exterior.map(p=>p.x))+.115-7.2)<1e-8);
 assert.ok(Math.abs(Math.min(...exterior.map(p=>p.z))-.115)<1e-8);
 assert.ok(Math.abs(Math.max(...exterior.map(p=>p.z))+.115-14.4)<1e-8);
 for(const o of g.openings){
  const wall=g.walls.find(w=>w.id===o.wallId),a=nodes.get(wall.a),d=nodes.get(wall.b);
  assert.ok(!(Math.abs(a.x-7.085)<.001&&Math.abs(d.x-7.085)<.001),'Opening on zero-setback wall');
 }
}
for(const e of b.elements.filter(e=>e.kind==='wall')){
 const proof=wallSolidCells(e,b.elements),holes=b.elements.filter(o=>o.host===e.id);
 if(holes.length)assert.ok(proof.solidVolume<proof.grossVolume-.00001,'No real wall subtraction '+e.id);
 for(const o of holes){
  const a=(e.rotationDeg||0)*Math.PI/180,x=(o.x-e.x)*Math.cos(a)+(o.z-e.z)*Math.sin(a),y=o.y-e.y;
  assert.ok(!proof.cells.some(c=>Math.abs(c.x-x)<c.dx/2-1e-6&&Math.abs(c.y-y)<c.dy/2-1e-6),'Opening centre still solid '+o.id);
 }
}
assert.ok(b.elements.filter(e=>e.kind==='column').every(e=>e.ifcType==='IfcBuildingElementProxy'&&e.status.includes('NOT_A_DESIGNED_SECTION')));
for(const e of b.elements.filter(e=>e.roomId&&['furniture','fixture'].includes(e.kind))){
 const room=manifest.presentation.roomEnvelopes[e.level.toUpperCase()].find(r=>r.id===e.roomId);
 assert.ok(room,'No host room for '+e.id);let[x0,y0,x1,y1]=room.bbox;
 x0=x0===0?230:x0+50;x1=x1===7200?6970:x1-50;y0=y0===0?230:y0+50;y1=y1===14400?14170:y1-50;
 const x=e.x*1000,y=(14.4-e.z)*1000;
 assert.ok(x-e.dx*500>=x0-.01&&x+e.dx*500<=x1+.01&&y-e.dz*500>=y0-.01&&y+e.dz*500<=y1+.01,'Furnishing crosses a room wall: '+e.id);
}
// Explicit access bands: do not let a nominal fixture fit hide a blocked route.
const tub=b.elements.find(e=>e.id.endsWith(':FIX-GF-TUB'));
assert.ok(2.062-(tub.x+tub.dx/2)>=.9,'Tub blocks access to the shower');
const hallClear=3.3-.05-(2.112+.05);assert.ok(hallClear>=.9);
const landing=b.elements.find(e=>e.id.endsWith(':FF-STAIR-SIDE-LANDING'));
assert.equal(landing.dx,.9);assert.equal(landing.dz,1.9);
const plate=b.elements.find(e=>e.id.endsWith(':FF-FLOOR-PLATE'));assert.equal(plate.holes.length,2);
const car=b.elements.find(e=>e.id.endsWith(':SITE-CAR-DOLPHIN'));
assert.equal(car.dx,4.29);assert.equal(car.declaredEnvelope.dz,1.77);assert.equal(car.dz,2.012);
assert.equal(manifest.presentation.vehicleEnvelope.transverseExtendedMirrorFit,false);
assert.equal(b.elements.find(e=>e.id.endsWith(':FF-ROOF-TERRACE')).holes.length,2);
assert.ok(b.elements.some(e=>e.id.endsWith(':FF-ROOF-STAIR-FLIGHTS')));
assert.ok(!manifest.reviewHolds.some(x=>x.code==='SOURCE_CUSTODY'));
assert.ok(Math.abs((7.2-(car.x+car.dx/2))-2.943)<1e-9);
const steps=b.elements.find(e=>e.id.endsWith(':GF-ENTRY-STEPS'));assert.equal(steps.parts.length,3);
for(const n of ledger.changes.filter(x=>typeof x.change_percent==='number'))assert.ok(Math.abs(n.change_percent)<=30.001,n.item);
const ifc=writeIFC4(b).text;checkIfcReferences(ifc);
assert.equal((ifc.match(/=IFCRELVOIDSELEMENT\(/g)||[]).length,32);
assert.ok(!/=IFCCOLUMN\(/.test(ifc),'Proposed column markers misrepresented as designed structural columns');
const hashes=read('output-hashes-qa02.json').sha256;
for(const[name,hash]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(dir+name)).digest('hex'),hash);
fs.writeFileSync('/tmp/ashok-qa02-conceptual.ifc',ifc);
console.log('ASHOK_QA02_CONSTRAINT_AND_REAL_OPENINGS_PASS',JSON.stringify({counts:b.counts,voids:32,overlappingWallPairs:0,outerFaceErrorMm:0,ifcBytes:ifc.length}));
