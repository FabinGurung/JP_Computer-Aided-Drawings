import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAADWorkspace} from '../../public/assets/js/aad-unified-workspace.mjs';
import {buildAADComponentGroups,classifyAADComponent} from '../../public/assets/js/aad-component-register.mjs';
const dir='public/data/projects/ashok-adhikari/',read=n=>JSON.parse(fs.readFileSync(dir+n));
const manifest=read('aad-building-qa02.json'),models=Object.fromEntries(manifest.levels.map(l=>[l.id,read(l.model)]));
const building=createAADWorkspace(manifest,models).snapshot().assembly,before=JSON.stringify(building);
const rows=g=>g.groups.flatMap(l=>l.disciplines.flatMap(d=>d.types.flatMap(t=>t.items)));
const all=building.elements.filter(e=>e.ifcType),full=buildAADComponentGroups(building);
assert.deepEqual(rows(full).map(e=>e.id).sort(),all.map(e=>e.id).sort());
for(const l of ['all',...building.levels.map(l=>l.id)])for(const d of ['all','Architecture','Structure','MEP','Other'])for(const kind of ['all',...new Set(all.map(e=>e.kind))]){
 const result=buildAADComponentGroups(building,{level:l,discipline:d,kind});
 const expected=all.filter(e=>(l==='all'||e.level===l)&&(d==='all'||classifyAADComponent(e).discipline===d)&&(kind==='all'||e.kind===kind));
 assert.deepEqual(rows(result).map(e=>e.id).sort(),expected.map(e=>e.id).sort());
}
for(const sort of ['id','name','x','z','kind']){
 const a=buildAADComponentGroups(building,{sort}),d=buildAADComponentGroups(building,{sort,direction:'desc'});
 const groups=g=>g.groups.flatMap(l=>l.disciplines.flatMap(d=>d.types.map(t=>t.items)));
 assert.deepEqual(groups(d).map(es=>es.map(e=>e.id)),groups(a).map(es=>[...es].reverse().map(e=>e.id)));
}
assert.equal(rows(buildAADComponentGroups(building,{search:'unmatched-query-493857'})).length,0);
assert.ok(rows(buildAADComponentGroups(building,{discipline:'MEP',search:'Vent'})).length>0);
assert.equal(JSON.stringify(building),before,'Filtering and sorting must never mutate source geometry');
console.log('ASHOK_REGISTER_FILTER_SORT_SOURCE_PRESERVATION_PASS',all.length,'components; all level/discipline/type combinations and both sort directions');
