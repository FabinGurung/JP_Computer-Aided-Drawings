import {createHash} from 'node:crypto';
const base=process.env.CAD_PUBLIC_BASE||'https://fabingurung.github.io/JP_Computer-Aided-Drawings/';
const expectedSha=process.env.VERIFIED_SOURCE_SHA;
const expectedRun=process.env.PAGES_WORKFLOW_RUN_ID;
if(!/^[a-f0-9]{40}$/.test(expectedSha||'')||!/^\d+$/.test(expectedRun||''))throw Error('Missing source/deployment binding for audit');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function bytes(path){const response=await fetch(new URL(path,base),{headers:{'cache-control':'no-cache'}});if(!response.ok)throw Error('Missing live file '+path+' HTTP '+response.status);return Buffer.from(await response.arrayBuffer());}
let model;let last;
for(let attempt=0;attempt<15;attempt++){
 try{model=JSON.parse((await bytes('cad/provenance.json')).toString('utf8'));if(model.pagesWorkflowRunId===expectedRun&&model.sourceCommitSha===expectedSha)break;last='live manifest belongs to run '+model.pagesWorkflowRunId+' commit '+model.sourceCommitSha+' instead of '+expectedRun+'/'+expectedSha;}
 catch(e){last=String(e);}
 if(attempt===14)throw Error('Deployed SHA/run mismatch (fail-closed): '+last);
 await sleep(10000);
}
if(model.schema!=='jp-cad://pages-exact-artifact-provenance/1'||model.constructionApproval!==false)throw Error('Invalid public provenance manifest');
const entries=Object.entries(model.assets||{});
if(entries.length<11)throw Error('Missing required public asset checksums');
for(const [path,sha] of entries){
 if(!/^[a-f0-9]{64}$/.test(sha))throw Error('Bad SHA256 '+path);
 const actual=createHash('sha256').update(await bytes(path)).digest('hex');
 if(actual!==sha)throw Error('Published byte mismatch: '+path);
}
if(!('data/projects/harisharan-adhikari/upper-floor-source-r000001.json' in model.assets))throw Error('No R3 source byte binding');
if(!('data/projects/ashok-adhikari/coordinate-grid-v1.json' in model.assets))throw Error('No Ashok source byte binding');
console.log('CAD_LIVE_EXACT_PAGES_SOURCE_PROVENANCE_PASS',model.sourceCommitSha,'pages_run='+model.pagesWorkflowRunId,'assets='+entries.length);
