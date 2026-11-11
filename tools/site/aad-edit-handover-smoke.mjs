/** AAD local edit audit contract: log, replay, source protection, and stale baseline. */
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";
import {createAADWorkspace} from "../../public/assets/js/aad-unified-workspace.mjs";
import {createAADEditJournal,aadFingerprint,diffAADModels,replayAADChangeSet} from "../../public/assets/js/aad-edit-journal.mjs";
const dir="public/data/projects/design-studio-sandbox/";
const manifest=JSON.parse(fs.readFileSync(dir+"aad-building-v1.json","utf8"));
const sourceModels={gf:JSON.parse(fs.readFileSync(dir+"drawing-floor.json","utf8")),
 ff:JSON.parse(fs.readFileSync(dir+"upper-floor.json","utf8"))};
const sourceCopy=structuredClone(sourceModels),storageMap=new Map();
const storage={getItem:k=>storageMap.get(k)||null,setItem:(k,v)=>storageMap.set(k,v)};
const ws=createAADWorkspace(manifest,sourceModels);
let time=0;
const init=()=>createAADEditJournal({manifest,sourceModels,initialModels:ws.snapshot().models,
 manifestPath:"/jp-drawing-coordination/data/projects/design-studio-sandbox/aad-building-v1.json",storage,
 now:()=>new Date(Date.UTC(2026,10,11,0,0,time++)).toISOString()});
let journal=init();
assert.equal(journal.getEvents().length,0);
const run=(action,args,kind)=>{
 const before=ws.snapshot().models,out=ws.topology("gf",action,args);
 const event=journal.record(before,ws.snapshot().models,{kind:kind||"topology:"+action,level:"gf",objectId:args.wallId||args.id||null});
 assert(event&&event.patch.length>0);
 return out.result;
};
const newWall=run("addWall",{start:{x:2,z:3},end:{x:6,z:3},thickness:.15}).ids[0];
assert(newWall,"wall creation returned an ID");
const added=run("addOpening",{wallId:newWall,kind:"door",width:.9,offset:1});
assert(added.id,"host door must have stable ID");
assert.throws(()=>ws.topology("gf","removeWall",{wallId:newWall}),/Remove or rehost openings/);
assert.throws(()=>ws.topology("gf","removeWall",{wallId:"GF-E1"}),/Exterior perimeter cannot be deleted/);
assert.equal(journal.getEvents().length,2,"rejected edits must not appear in journal");
run("removeOpening",{id:added.id});
run("removeWall",{wallId:newWall});
const previous=ws.snapshot().models,updated=ws.snapshot().models;
assert.equal(journal.getEvents().length,4);
const changeSet=journal.exportChangeSet();
assert.equal(changeSet.projectId,manifest.projectId);
assert.equal(changeSet.baselineRevision,manifest.revision);
assert.equal(changeSet.approval,"ENGINEERING_HOLD_NOT_ISSUED");
assert.deepEqual(replayAADChangeSet(sourceModels,changeSet,{projectId:manifest.projectId,revision:manifest.revision}),updated);
assert.deepEqual(sourceModels,sourceCopy,"original source models must remain immutable");
assert.match(journal.handover(),/AAD_BROWSER_EDIT_HANDOVER_V1/);
assert.match(journal.handover(),/Do NOT treat this text as engineering approval/);
assert.equal(aadFingerprint(sourceModels),changeSet.baselineFingerprint);
const temp=fs.mkdtempSync(join(tmpdir(),"aad-review-"));
try{
 const changePath=join(temp,"review.json");
 fs.writeFileSync(changePath,JSON.stringify(changeSet));
 const output=execFileSync(process.execPath,["tools/site/aad-review-change-set.mjs",changePath],{encoding:"utf8"});
 assert.match(output,/AAD_EDIT_CHANGESET_READONLY_REPLAY_PASS/);
 assert.match(output,/"originalStructuralCountsUnchanged": true/);
 assert.match(output,/"sourceFilesWritten": 0/);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const remembered=init();
assert.equal(remembered.getEvents().length,4,"browser history must survive reload with same source fingerprint");
assert.deepEqual(replayAADChangeSet(sourceModels,remembered.exportChangeSet()),updated);
const modified=structuredClone(sourceModels);modified.gf.floorGraph.nodes[0].x=.05;
assert.throws(()=>replayAADChangeSet(modified,changeSet),/Source model fingerprint changed/);
assert.throws(()=>replayAADChangeSet(sourceModels,changeSet,{projectId:"ANOTHER"}),/Project identity mismatch/);
assert.throws(()=>replayAADChangeSet(sourceModels,changeSet,{revision:"STALE"}),/Source revision mismatch/);
const tampered=structuredClone(changeSet);tampered.events[0].postFingerprint="bogus";
assert.throws(()=>replayAADChangeSet(sourceModels,tampered),/content mismatch/);
const invalidPatch=structuredClone(changeSet);
invalidPatch.events[0].patch=[{op:"remove",path:"/models/gf/height"}];
assert.throws(()=>replayAADChangeSet(sourceModels,invalidPatch),/outside editable floor graph/);
const delta=diffAADModels(sourceModels,modified);
assert(delta.some(op=>op.op==="replace"&&op.path.includes("/nodes/0/x")));
const originalRemoved=fs.readFileSync("public/data/projects/narayani-parajuli/aad-building-v1.json","utf8");
assert(!originalRemoved.includes('"issueForConstruction": true'),"source files not changed by journal work");
const html=fs.readFileSync("cad/aad/multistorey/index.html","utf8"),app=fs.readFileSync("cad/aad/multistorey/main.js","utf8");
for(const id of ["aad-edit-mode","aad-edit-delete-selected","aad-edit-copy-handover","aad-edit-download-handover",
 "aad-edit-history-list","aad-edit-handover"])assert(html.includes('id="'+id+'"'),"missing local history UI "+id);
for(const marker of ['createAADEditJournal','journalAcceptedEdit','getChangeSet:','getEditHandover:','View only: switch to Edit draft'])
 assert(app.includes(marker),"missing editor integration "+marker);
console.log("AAD_EDIT_HANDOVER_SOURCE_REPLAY_PASS",JSON.stringify({project:manifest.projectId,events:changeSet.events.length,baseline:changeSet.baselineFingerprint,deletedWall:newWall,sourceImmutable:true}));
