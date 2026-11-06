import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {PROJECTS,CHAPTERS} from '../../public/assets/js/project-workspace-config.mjs';
import {CONSTRUCTION_STAGES,PROJECT_STAGE_EVIDENCE} from '../../public/assets/js/project-construction-stages.mjs';
import {packageRecords,packageById,filterPackageRecords,renderPackages,renderPackageInspector,renderPackageDock,packageShareUrl} from '../../public/assets/js/project-site-packages.mjs';

const schema=JSON.parse(fs.readFileSync('governance/aad/site-package-workspace-template.v1.json','utf8'));
const example=JSON.parse(fs.readFileSync('public/templates/project-workspace/project-template.v1.json','utf8'));
const templatePage=fs.readFileSync('public/templates/project-workspace/index.html','utf8');
const sourceConfig=fs.readFileSync('public/assets/js/project-workspace-config.mjs','utf8');
const sourceApp=fs.readFileSync('public/assets/js/project-workspace.mjs','utf8');
assert.equal(schema.$id,'jp-cad://aad/site-package-workspace-template/1');
assert.deepEqual(CHAPTERS.map(c=>c[0]),['views','boq','gantt','packages','sources']);
assert.deepEqual(example.chapters,CHAPTERS.map(c=>c[0]));
assert.deepEqual(Object.keys(example.navigation).sort(),['east','north','south','west']);



assert.equal(example.packages.length,0,'empty fictional starter must not supply even a sample work item');
assert.equal(example.normalization.templateOnly,true);assert.equal(example.normalization.requiredPackageSlots,16);
assert.equal(example.sourceBoundary.designApproval,false);
assert.equal(example.sourceBoundary.publicRedaction,true);
assert.match(templatePage,/four navigation directions/i);
assert.match(templatePage,/Packages \/ Site Modules/);
assert.match(sourceApp,/pw-inspector/);
assert.match(sourceApp,/pw-dock/);
assert.match(sourceApp,/packageRecords/);
assert.doesNotMatch(sourceConfig,/4\.2 · Detailed material module/);
assert.doesNotMatch(sourceConfig,/4\.2 · Work-package records/);
assert.equal(Object.keys(PROJECTS).length,4);

for(const slug of Object.keys(PROJECTS)){
 const records=packageRecords(slug);
 assert.ok(records.every(r=>Boolean(r.href)&&Boolean(r.status)&&Boolean(r.note)));
 assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 const html=renderPackages({slug,root:new URL('https://example.org/JP_Computer-Aided-Drawings/'),
  editionId:PROJECTS[slug].editions[0].id,selected:records[0]?.id||'',escape:s=>String(s).replaceAll('&','&amp;')});
 assert.match(html,/4\.1 · Published site workbenches/);assert.match(html,/4\.2 · Engineering package normalization/);
 assert.equal((html.match(/data-package-id=/g)||[]).length,records.length);
 assert.equal(filterPackageRecords(records,'nonexistent-test-token','all').length,0);
 const insp=renderPackageInspector({slug,root:new URL('https://example.org/JP_Computer-Aided-Drawings/'),
  editionId:PROJECTS[slug].editions[0].id,selected:records[0]?.id||'',panel:'packages',phase:'gf',escape:s=>String(s)});
 assert.match(insp,/Package details/);assert.match(insp,/Package status/);
 const dock=renderPackageDock({slug,selected:records[0]?.id||'',escape:s=>String(s)});
 assert.match(dock,/Package dock/);
 if(slug==='narayani-parajuli'){
  assert.equal(records.length,7);
  assert.match(packageById(slug,'tank').status,/HOLD/);
  assert.match(html,/stages\/v02\//);
  assert.match(packageById(slug,'groundworks').note,/soling module has not been verified/i);
 }
 if(slug==='harisharan-adhikari'){
  assert.equal(records.length,10);
  assert.equal(records[0].id,'rear-nine');assert.equal(records[0].verified,false);
  assert.equal(records[1].title,'Through plinth beam · rebar and cement');
  assert.equal(records[1].href,'projects/harisharan-adhikari/plinth/');
  assert.match(records[1].status,/PROVISIONAL/);
 }
 if(slug==='ashok-adhikari'){assert.equal(records.length,1);assert.match(records[0].status,/COORDINATION/);}
 if(slug==='ramachandra-devkota'){assert.equal(records.length,0);assert.doesNotMatch(html,/pw-package-badge frozen/);}
}
assert.match(packageShareUrl({slug:'narayani-parajuli',root:new URL('https://example.org/JP_Computer-Aided-Drawings/'),editionId:'source-current',id:'tank'}).href,/panel=packages/);
for(const code of ['v02','v03','m40','m50','m60','m70','m80']){
 const meta=JSON.parse(fs.readFileSync('public/stages/'+code+'/meta.json','utf8'));
 const record=packageById('narayani-parajuli',{v02:'groundworks',v03:'footing-rebar',m40:'footing-rcc',m50:'dowels',m60:'columns',m70:'plinth',m80:'tank'}[code]);
 assert.ok(record?.code.includes(meta.version),code);
 assert.match(record.href,new RegExp('/'+code+'/'));
 assert.ok(fs.existsSync('public/stages/'+code+'/index.html'));
 assert.ok(fs.existsSync('public/stages/'+code+'/stage-data.json'));
 if(code==='m80')assert.match(meta.status,/HOLD/);
 else assert.equal(meta.status,'FROZEN');
}
// Pin to the seven *original* stage blobs so interface updates cannot silently
// rewrite technical source packages during a purely navigational release.
const expected={
 v02:'069eff794f6f909ecfa62571cc0c633c72a6c6b9',
 v03:'d524b236baa437d31c4aab18c0dc6ce52bd2fae7',
 m40:'4d732e35cdbfd959628701a14792d5436951fd69',
 m50:'c046589907f3547f77131a55bb4f58d6d3ae2e4b',
 m60:'965c8460d825d495a7a60f4310c1fa34f6bb4562',
 m70:'76d33e99e706a9b24e5e9c60f78a354a23ab23d9',
 m80:'649ebd2a6964414fc11adbfe1ecacaf723d635e0'
};
for(const [stage,sha] of Object.entries(expected))
 assert.equal(execFileSync('git',['rev-parse','HEAD:public/stages/'+stage],{encoding:'utf8'}).trim(),sha,'frozen stage '+stage);
console.log('SITE_PACKAGE_STANDARD_PASS five chapters, all four projects, four directions, original stage tree hashes, truthful missing stages');
