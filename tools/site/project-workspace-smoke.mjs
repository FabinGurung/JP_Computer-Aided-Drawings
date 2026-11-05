import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {PROJECTS,CHAPTERS} from '../../public/assets/js/project-workspace-config.mjs';
assert.equal(Object.keys(PROJECTS).length,4);assert.equal(CHAPTERS.length,4);
for(const [slug,c] of Object.entries(PROJECTS)){
 const page=fs.readFileSync('public/projects/'+slug+'/index.html','utf8');assert.match(page,new RegExp('data-project="'+slug+'"'));assert.match(page,/project-workspace\.mjs/);assert.match(page,/project-workspace\.css/);
 assert.equal(new Set(c.editions.map(e=>e.id)).size,c.editions.length);
 for(const e of c.editions){if(e.manifest)assert.ok(fs.existsSync('public/'+e.manifest));assert.equal(new Set(e.levels.map(l=>l.id)).size,e.levels.length);}
 for(const g of c.sourceGroups)for(const l of g.links){if(!l.href||/^https:/.test(l.href))continue;const target=path.resolve('public/projects/'+slug,l.href.split('#')[0]);assert.ok(fs.existsSync(target)||fs.existsSync(target+'/index.html')||fs.existsSync(path.relative(path.resolve('public'),target)+'/index.html'),target);}
}
const dir='public/data/projects/ashok-adhikari/editions/v1/',p=JSON.parse(fs.readFileSync(dir+'provenance.json'));
for(const [f,sha] of Object.entries(p.filesSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(dir+f)).digest('hex'),sha,f);
const v1=JSON.parse(fs.readFileSync(dir+'aad-building-qa02.json')),v2=JSON.parse(fs.readFileSync('public/data/projects/ashok-adhikari/aad-building-qa02.json'));
assert.equal(v1.services,undefined);assert.ok(v2.services);assert.equal(v1.revision,'AAD-ASHOK-MODEL-001-R000003');assert.equal(p.geometryEdited,false);
assert.ok(fs.existsSync('projects/harisharan-adhikari/plinth/index.html'));assert.ok(fs.existsSync('projects/harisharan-adhikari/workspace/index.html'));
assert.equal(PROJECTS['ramachandra-devkota'].editions[0].manifest,undefined);
console.log('PROJECT_WORKSPACE_CONTRACT_PASS 4 projects, real edition snapshots, source links, preserved modules, no invented public geometry');
