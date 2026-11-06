import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {PROJECTS,CHAPTERS} from '../../public/assets/js/project-workspace-config.mjs';
import {CONSTRUCTION_STAGES,PROJECT_STAGE_EVIDENCE,availableConstructionStages,preferredConstructionStage,renderConstructionStages} from '../../public/assets/js/project-construction-stages.mjs';
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

// The construction navigation is a publication view of source-backed work
// packages; old stage bytes stay frozen and missing details remain unknown.
assert.equal(CONSTRUCTION_STAGES.length,8);
assert.deepEqual(Object.keys(PROJECT_STAGE_EVIDENCE).sort(),Object.keys(PROJECTS).sort());
assert.equal(availableConstructionStages('narayani-parajuli').length,7);
assert.equal(availableConstructionStages('ramachandra-devkota').length,0);
assert.equal(preferredConstructionStage('narayani-parajuli'),'groundworks');
for(const [slug,rows] of Object.entries(PROJECT_STAGE_EVIDENCE)){
 for(const [stage,item] of Object.entries(rows)){
  assert.ok(CONSTRUCTION_STAGES.some(x=>x.id===stage),stage);
  const target=new URL(item.href,'https://example.com/');
  const pathname=target.pathname.replace(/^\/+/,'');
  const publicFile=path.resolve('public',pathname);
  const projectFile=path.resolve(pathname);
  assert.ok(fs.existsSync(publicFile)||fs.existsSync(publicFile+'/index.html')||fs.existsSync(projectFile)||fs.existsSync(projectFile+'/index.html'),item.href);
 }
 const html=renderConstructionStages({slug,root:new URL('https://example.com/'),editionId:PROJECTS[slug].editions[0].id,stageId:preferredConstructionStage(slug),escape:s=>s.replaceAll('&','&amp;')});
 assert.match(html,/Construction stages & member details/);
 assert.equal((html.match(/data-stage-select=/g)||[]).length,8);
 if(slug==='ramachandra-devkota')assert.doesNotMatch(html,/<iframe/);
 if(slug==='narayani-parajuli')assert.match(html,/stages\/v02\//);
}
for(const code of ['v02','v03','m40','m50','m60','m70','m80']){
 const meta=JSON.parse(fs.readFileSync('public/stages/'+code+'/meta.json','utf8'));
 assert.equal(meta.slug,code);
 assert.ok(fs.existsSync('public/stages/'+code+'/index.html'));
 assert.ok(fs.existsSync('public/stages/'+code+'/stage-data.json'));
 if(code==='m80')assert.match(meta.status,/HOLD/);
 else assert.equal(meta.status,'FROZEN');
}
const stageWorkspace=fs.readFileSync('public/assets/js/project-workspace.mjs','utf8');
assert.match(stageWorkspace,/data-stage-quick/);
assert.match(stageWorkspace,/renderConstructionStages/);
assert.match(stageWorkspace,/section==='stages'/);

console.log('PROJECT_WORKSPACE_CONTRACT_PASS 4 projects, real edition snapshots, source links, preserved modules, stage workbenches preserved, no invented public geometry');
