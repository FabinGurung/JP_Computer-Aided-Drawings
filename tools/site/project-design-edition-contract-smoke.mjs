import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PROJECTS,ALL_WORKSPACE_PROJECTS,EMPTY_DUMMY_PROJECT} from '../../public/assets/js/project-workspace-config.mjs';
import {AAD_WORKSPACE_ENGINE_VERSION,validateEditionRegistries,describeEdition,nextEditionRequest} from '../../public/assets/js/project-edition-contract.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const policy=read('public/data/cad/design-edition-contract.v1.json');
const template=read('public/templates/project-workspace/project-template.v1.json');
const domain=read('governance/aad/aad-domain-template.v0.1.json');
assert.equal(AAD_WORKSPACE_ENGINE_VERSION,'1.4.0');
assert.equal(policy.version,AAD_WORKSPACE_ENGINE_VERSION);
assert.equal(policy.owner,'FabinGurung/jp-drawing-coordination');
assert.equal(policy.a7Role,'READ_ONLY_INDEX__DO_NOT_WRITE_A7_FROM_CAD');
assert.equal(domain.version,'0.3.4');
assert.equal(domain.designEditionInheritance.contractVersion,policy.version);
assert.equal(template.project.workspaceEngineVersion,policy.version);
assert.equal(template.editions[0].kind,'template');
assert.equal(template.editions[0].snapshotPolicy,'NO_REAL_DESIGN');
assert.equal(template.editions[0].sourceRef,null);
assert.equal(template.editionPolicy.newRealGeometry,'NEW_UNIQUE_EDITION_PLUS_NEW_IMMUTABLE_SOURCE_MODEL_PATH');

const all=validateEditionRegistries(ALL_WORKSPACE_PROJECTS);
assert.equal(all.length,5);
assert.equal(Object.keys(PROJECTS).length,4);
assert.ok(EMPTY_DUMMY_PROJECT.synthetic);
assert.deepEqual(all.map(p=>p.slug).sort(),policy.sharedProjects.concat(policy.syntheticFixture).sort());
for(const [slug,project] of Object.entries(ALL_WORKSPACE_PROJECTS)){
 const seen=new Set();
 for(const e of project.editions){
  const desc=describeEdition(e);
  assert.equal(desc.id,e.id);
  assert.equal(desc.sourceRef,e.sourceRef);
  assert.equal(desc.predecessorId,e.predecessorId);
  assert.ok(!seen.has(e.id));seen.add(e.id);
  if(e.manifest){
   assert.equal(typeof e.manifest,'string');
   assert.ok(fs.existsSync('public/'+e.manifest),'Source-backed manifest missing: '+slug+'/'+e.id);
   assert.ok(e.manifest.startsWith('data/projects/'+slug+'/'));
  }
  if(e.sourceRef){
   assert.ok(fs.existsSync('public/'+e.sourceRef),'Versioned source missing: '+slug+'/'+e.id);
  }
 }
 const req=nextEditionRequest({projectSlug:slug,projectName:project.name,selectedEdition:project.editions[0],phase:project.defaultLevel,requests:[{id:'owner-1',description:'Proposed revision',applied:false}]});
 assert.equal(req.baselineEditionId,project.editions[0].id);
 assert.equal(req.presevesPreviousEdition,undefined); // no typo-mapped silent contract
 assert.equal(req.preservesPreviousEdition,true);
 assert.equal(req.status,'LOCAL_OWNER_REQUEST_NOT_APPLIED');
 assert.equal(req.policyVersion,'1.4.0');
 assert.equal(req.requests.length,1);
 assert.ok(req.instructions.includes('NEW project-owned manifest'));
}
assert.deepEqual(PROJECTS['ashok-adhikari'].editions.map(x=>x.id),['v3-3','v3-2','v3-grid','v3','v2','v1']);
assert.equal(PROJECTS['ashok-adhikari'].editions[0].lifecycle,'RELEASED_REVIEW');
assert.equal(PROJECTS['ashok-adhikari'].editions[0].releaseTag,'ashok-v3.3.0-window-visibility-review.1');
assert.equal(PROJECTS['ashok-adhikari'].editions[0].predecessorId,'v3-2');
assert.equal(PROJECTS['ashok-adhikari'].editions[0].sourceRef,'data/projects/ashok-adhikari/aad-building-v3-3-review.json');
assert.equal(PROJECTS['narayani-parajuli'].editions[0].kind,'source-family');
assert.equal(PROJECTS['narayani-parajuli'].editions[0].snapshotPolicy,'SOURCE_POINTER');
assert.equal(PROJECTS['harisharan-adhikari'].editions[0].kind,'design-option');
assert.equal(PROJECTS['ramachandra-devkota'].editions[0].lifecycle,'SOURCE_PENDING');
assert.equal(PROJECTS['ramachandra-devkota'].editions[0].manifest,undefined);
assert.equal(EMPTY_DUMMY_PROJECT.editions[0].lifecycle,'TEMPLATE_ONLY');
const ashok=read('public/data/projects/ashok-adhikari/aad-building-v3-3-review.json');
assert.equal(ashok.release.version,'v3-3-review');
assert.equal(ashok.restrictions.issueForConstruction,false);

for(const slug of [...Object.keys(PROJECTS),'example-empty']){
 const html=fs.readFileSync('public/projects/'+slug+'/index.html','utf8');
 assert.match(html,/project-workspace\.mjs/,'All projects must inherit the shared workspace: '+slug);
 assert.match(html,new RegExp('data-project="'+slug+'"'));
 const memory=fs.readFileSync('public/projects/'+slug+'/memory-wall/index.html','utf8');
 assert.match(memory,/cad-project-memory-palace\.mjs/,'Memory posters inherit shared engine for '+slug);
}
const workspace=fs.readFileSync('public/assets/js/project-workspace.mjs','utf8');
assert.match(workspace,/validateEditionRegistries\(ALL_WORKSPACE_PROJECTS\)/);
assert.match(workspace,/renderEditionProvenance/);
assert.match(workspace,/pw-new-edition/);
assert.match(workspace,/requiresNewDesignEditionForGeometryChange:true/);
assert.match(workspace,/LOCAL_OWNER_REQUEST_NOT_APPLIED|nextEditionRequest/);
const posters=fs.readFileSync('public/assets/js/cad-project-memory-palace.mjs','utf8');
assert.match(posters,/Immutable design-edition selector and shared engine/);
assert.match(posters,/data\/cad\/design-edition-contract\.v1\.json/);
for(const path of ['AGENTS.md','governance/aad/README.md','governance/aad/project-workspace-standard.md','governance/aad/design-edition-lifecycle.v1.md',
 'public/memory-wall/index.html','public/memory-wall/pages/index.html','public/templates/project-workspace/index.html']){
 const text=fs.readFileSync(path,'utf8');
 assert.match(text,/design-edition-contract\.v1\.json/,'CAD edition authority not linked: '+path);
}
console.log('PROJECT_DESIGN_EDITION_INHERITANCE_1_4_0_PASS',JSON.stringify(all));
