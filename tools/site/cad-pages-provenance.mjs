import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
const base=resolve('dist');
const expected=process.env.EXPECTED_SOURCE_SHA;
const actual=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(actual)||actual!==expected)throw Error('CAD Pages source SHA mismatch; refuse publishing');
const assets=[
'assets/js/harisharan-seven-stages.mjs',
'assets/js/harisharan-stage-app.mjs',
'assets/js/harisharan-review-data.mjs',
'assets/js/harisharan-review-dashboard.mjs',
'assets/js/harisharan-upper-floor-source.mjs',
'data/projects/harisharan-adhikari/takeoff.json',
'data/projects/harisharan-adhikari/upper-floor-source-r000001.json',
'projects/harisharan-adhikari/review/index.html',
'projects/harisharan-adhikari/upper-floors/index.html',
'assets/js/aad-dimensioned-plan.mjs',
'data/projects/ashok-adhikari/coordinate-grid-v1.json'
];
const hashes={};
for(const path of assets){const full=join(base,path);if(!existsSync(full))throw Error('No public source proof asset: '+path);hashes[path]=createHash('sha256').update(readFileSync(full)).digest('hex');}
const result={
schema:'jp-cad://pages-exact-artifact-provenance/1',
sourceCommitSha:actual,
pagesWorkflowRunId:String(process.env.GITHUB_RUN_ID||'LOCAL'),
upstreamQaRunId:process.env.UPSTREAM_QA_RUN_ID||null,
sourceMode:process.env.GITHUB_EVENT_NAME==='workflow_dispatch'?'manual-main-head':'passed-main-staging-qa',
assets:hashes,
constructionApproval:false
};
const out=join(base,'cad','provenance.json');mkdirSync(join(base,'cad'),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log('CAD_PAGES_ASSET_PROVENANCE_GENERATED',actual,'asset_count='+assets.length,'pages_run='+result.pagesWorkflowRunId,'qa_run='+result.upstreamQaRunId);
