#!/usr/bin/env node
/* Read-only AAD browser edit-set reviewer.
 * Run from repository root: node tools/site/aad-review-change-set.mjs /path/to/export.json
 * Never writes source files. Review in project-specific engineering thread before PR.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {join} from "node:path";
import {createAADWorkspace} from "../../public/assets/js/aad-unified-workspace.mjs";
import {replayAADChangeSet,aadFingerprint} from "../../public/assets/js/aad-edit-journal.mjs";

const file=process.argv[2];
if(!file||process.argv.length!==3)throw Error("Usage: node tools/site/aad-review-change-set.mjs <exported-change-set.json>");
const stat=fs.statSync(file);
if(!stat.isFile()||stat.size>2_000_000)throw Error("Change set must be a JSON file under 2 MB");
const changeSet=JSON.parse(fs.readFileSync(file,"utf8"));
const prefix="/data/projects/";
const source=changeSet.sourceManifestPath;
if(typeof source!=="string"||!source.includes(prefix)||source.includes(".."))
 throw Error("Source manifest path missing or invalid");
const suffix=source.slice(source.indexOf(prefix)+prefix.length);
if(!/^[a-z0-9-]+\/[a-zA-Z0-9._-]+\.json$/.test(suffix))
 throw Error("Source manifest not inside one admitted project directory");
const path=join("public","data","projects",suffix);
const manifest=JSON.parse(fs.readFileSync(path,"utf8"));
assert.equal(manifest.projectId,changeSet.projectId,"Project identity cannot cross a project boundary");
assert.equal(manifest.revision,changeSet.baselineRevision,"Source revision differs from exported working edit baseline");
const sourceModels={};const projectFolder=join("public","data","projects",suffix.split("/")[0]);
for(const level of manifest.levels){
 if(!/^[a-zA-Z0-9._-]+\.json$/.test(level.model))throw Error("Unsupported floor model pathname");
 sourceModels[level.id]=JSON.parse(fs.readFileSync(join(projectFolder,level.model),"utf8"));
}
const candidate=replayAADChangeSet(sourceModels,changeSet,{projectId:manifest.projectId,revision:manifest.revision});
const workspace=createAADWorkspace(manifest,sourceModels);
const baseline=workspace.snapshot();
workspace.restore({
 schema:"jp-cad://aad-working-draft/1",projectId:manifest.projectId,models:candidate
});
const updated=workspace.snapshot();
const kindCount=m=>Object.fromEntries(
 Object.entries(m).map(([level,model])=>[level,{
  nodes:model.floorGraph.nodes.length,walls:model.floorGraph.walls.length,
  doors:model.floorGraph.openings.filter(x=>x.kind==="door").length,
  windows:model.floorGraph.openings.filter(x=>x.kind==="window").length
 }])
);
for(const kind of ["column","beam","footing"]){
 if(updated.assembly.counts[kind]!==baseline.assembly.counts[kind])
  throw Error("Structural member counts changed in review-only edit: "+kind);
}
if(aadFingerprint(updated.models)!==changeSet.finalFingerprint)throw Error("Candidate output has unexpected final model content");
const report={
 schema:"jp-cad://aad-edit-review-result/1",projectId:manifest.projectId,
 sourceRevision:manifest.revision,baselineFingerprint:changeSet.baselineFingerprint,
 finalFingerprint:changeSet.finalFingerprint,edits:changeSet.events.length,
 actions:changeSet.events.map(x=>({id:x.id,kind:x.kind,level:x.level,objectId:x.objectId,patchOperations:x.patch.length})),
 floorCountsBefore:kindCount(sourceModels),floorCountsAfter:kindCount(candidate),
 originalStructuralCountsUnchanged:true,sourceFilesWritten:0,
 engineeringStatus:"HOLD_REQUIRES_EVIDENCE_AND_REVIEW",
 nextStep:"Inspect project source evidence and QA; only then open a scoped reviewed PR; verify Actions and Pages."
};
console.log("AAD_EDIT_CHANGESET_READONLY_REPLAY_PASS");
console.log(JSON.stringify(report,null,2));
