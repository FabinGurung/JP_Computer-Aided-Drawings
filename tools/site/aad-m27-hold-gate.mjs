// M27: a machine check of preserved sources and explicit engineering holds;
// not an engineering design or capacity check.
import assert from "node:assert/strict";
import fs from "node:fs";
const dir="public/data/projects/narayani-parajuli/";
const read=f=>JSON.parse(fs.readFileSync(dir+f,"utf8"));
const m=read("aad-building-v1.json"),qa=read("aad-user-qa-decisions-v1.json"),
 a=read("aad-user-message-approval-20261024.json"),
 source=read("aad-source-gf-review-v1.json"),ledger=read("aad-m27-engineering-holds.json");
assert.equal(m.projectId,"PRJ-000007");
assert.equal(m.structuralReview.constructionApproval,false);
assert.equal(m.structuralReview.engineeringHold,true);
assert.equal(qa.engineeringApproval,false);
assert.equal(a.constructionApproval,false);
assert.equal(a.engineeringHoldPreserved,true);
assert.equal(source.columns.length,23);
assert.equal(source.footings.length,21);
assert.equal(ledger.projectId,m.projectId);
assert.equal(ledger.status,"ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION");
assert.equal(ledger.issues.length,8);
for(const issue of ledger.issues){
 assert.equal(issue.status,"OPEN");
 assert.ok(issue.requiredEvidence&&issue.source&&issue.finding);
}
const g1=source.footings.find(x=>x[0]==="SF-ACE9E");
assert.ok(g1&&g1[5]===1.8&&g1[6]===1.8);
assert.ok(qa.workingProposal.footings.conflict.includes("2100mm"));
assert.equal(qa.workingProposal.workingSpace.exactExcavationSizeApproved,false);
assert.equal(qa.workingProposal.workingSpace.perSideAssumed,false);
console.log("AAD_M27_SOURCE_PRESERVATION_AND_8_ENGINEERING_HOLDS_PASS");
