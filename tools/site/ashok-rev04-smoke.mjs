import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createAADWorkspace} from '../../public/assets/js/aad-unified-workspace.mjs';
import {writeIFC4,checkIfcReferences} from '../../public/assets/js/aad-building-ifc4.mjs';
const dir='public/data/projects/ashok-adhikari/';
const read=n=>JSON.parse(fs.readFileSync(dir+n,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=read('aad-building-v1.json'),source=read('model.public.json'),proof=read('source-manifest.public.json');
assert.equal(manifest.representation,'ARCHITECTURAL_REVIEW_ONLY');
assert.deepEqual(source.site.plot,{width_mm:9144,length_mm:18288});
assert.deepEqual(source.site.building,{width_mm:7200,length_mm:14400});
assert.deepEqual(source.site.building_origin_site_mm,[1944,2000]);
assert.equal(source.site.setbacks_mm.right,0);
for(const [name,h] of Object.entries(read('output-hashes.json').sha256))assert.equal(hash(fs.readFileSync(dir+name)),h,name);
const models=Object.fromEntries(manifest.levels.map(l=>[l.id,read(l.model)]));
const workspace=createAADWorkspace(manifest,models),b=workspace.snapshot().assembly;
assert.deepEqual(b.counts,{wall:24,door:9,'space-label':16});
assert.equal(b.area.model,207.36);assert.equal(b.area.source,207.36);
assert.ok(!b.elements.some(e=>['column','beam','slab','roof','footing','stair','landing'].includes(e.kind)));
for(const floor of ['GF','FF']){
 const g=models[floor.toLowerCase()].floorGraph;
 const idset=new Set(g.nodes.map(n=>n.id));
 assert.ok(g.walls.every(w=>idset.has(w.a)&&idset.has(w.b)));
 for(const o of source[floor].openings){
  assert.ok(g.openings.some(x=>x.id===o.id)||proof.deferredOpenings[floor].some(x=>x.id===o.id),'Opening lost: '+o.id);
  if(o.action==='REMOVE')assert.ok(!g.openings.some(x=>x.id===o.id),'Removed door reintroduced');
  if(o.action!=='REMOVE')assert.notEqual(o.anchor[0],7200,'Zero-side opening');
 }
}
const ifc=writeIFC4(b).text;checkIfcReferences(ifc);
assert.equal((ifc.match(/=IFCWALL\(/g)||[]).length,24);
assert.equal((ifc.match(/=IFCDOOR\(/g)||[]).length,9);
assert.ok(!/=IFC(?:SLAB|BEAM|COLUMN|FOOTING|STAIRFLIGHT)\(/.test(ifc));
// A local edit must update shared geometry and IFC without mutating the source.
const before=JSON.stringify(models),wall=models.gf.floorGraph.walls[0];
workspace.change('gf',{kind:'wall',id:wall.id},{thickness:.24});
assert.equal(workspace.snapshot().assembly.elements.find(e=>e.id.endsWith(':'+wall.id)).dz,.24);
assert.equal(JSON.stringify(models),before);workspace.reset();
for(const file of fs.readdirSync(dir))if(/\.(json|svg)$/.test(file)){
 const text=fs.readFileSync(dir+file,'utf8');
 assert.ok(!/drive\.google|docs\.google|drive.?id|\bDrive\s+[A-Za-z0-9_-]{20,}|sandbox:|sediment:/i.test(text),'Private provider reference: '+file);
}
const route=fs.readFileSync('public/projects/ashok-adhikari/index.html','utf8');
assert.ok(route.includes('data-cad-route="projects/ashok-adhikari/"'));
assert.ok(!route.includes('Narayani Modular Drawing Atlas'));
const registry=JSON.parse(fs.readFileSync('public/data/projects.json','utf8'));
assert.equal(registry.projects.filter(x=>x.slug==='ashok-adhikari').length,1);
console.log('ASHOK_REV04_SOURCE_TEMPLATE_QA_PASS',JSON.stringify({counts:b.counts,area:b.area,ifcReferences:true,privacy:true}));
