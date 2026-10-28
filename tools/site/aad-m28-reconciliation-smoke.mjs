// M28: owner-verified H3/I3-CF1 geometric relationship, not structural adequacy.
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadAADReviewedStructure} from "../../public/assets/js/aad-reviewed-structural-intake.mjs";
import {assembleBuilding} from "../../public/assets/js/aad-building-core.mjs";
const base="public/data/projects/narayani-parajuli/";
const read=x=>JSON.parse(fs.readFileSync(base+x,"utf8"));
const m=read("aad-building-v1.json"),ev=read("aad-m28-owner-verification-20261027.json"),
 report=read("aad-m28-reconciliation-20261027.json"),
 dxf=read("aad-source-gf-review-v1.json"),qa=read("aad-user-qa-decisions-v1.json");
const url=new URL("https://example.test/JP_Computer-Aided-Drawings/data/projects/narayani-parajuli/aad-building-v1.json");
const review=await loadAADReviewedStructure(m,url,async u=>
 JSON.parse(fs.readFileSync("public/"+u.pathname.slice("/JP_Computer-Aided-Drawings/".length),"utf8")));
assert.equal(ev.exactStatement,"i verify and approve it. now get to the next stage.");
assert.equal(review.ownerVerificationEventId,ev.eventId);
assert.equal(report.ownerVerificationEventId,ev.eventId);
assert.equal(ev.previousApprovalEventId,review.approvalEventId);
assert.equal(ev.constructionApproval,false);
assert.equal(review.userAuthorization,"M28_OWNER_VERIFIED");
const col=g=>review.elements.find(e=>e.kind==="column"&&e.provenance.grid===g);
const i3=col("I3"),h3=col("H3"),cf=review.elements.find(e=>
 e.kind==="footing"&&e.provenance.sourceId==="SF-AD0BC"),
 g1=review.elements.find(e=>e.kind==="footing"&&e.provenance.grid==="G1");
assert.ok(i3&&h3&&cf&&g1);
const link=cf.provenance.workingSupportProposal;
assert.ok(link&&link.nativeI4OrphanPreserved);
assert.deepEqual(link.workingIds,[h3.id,i3.id]);
assert.deepEqual(link.originalNativeIds,["SC-I4","SC-H3"]);
assert.deepEqual(cf.provenance.orphanIds,["SC-I4"]);
for(const c of [h3,i3]){
 assert.ok(Math.abs(c.x-cf.x)<=cf.dx/2+1e-6);
 assert.ok(Math.abs(c.z-cf.z)<=cf.dz/2+1e-6);
}
assert.ok(Math.abs(i3.x-21.000162)<.000002);
assert.ok(Math.abs(i3.z-6.12504)<.000002);
assert.ok(Math.abs(cf.x-20.250161)<.000002);
assert.ok(Math.abs(cf.z-6.15304)<.000002);
assert.deepEqual([cf.dx,cf.dz],[4,1.5]);
assert.equal(dxf.footings.find(f=>f[0]==="SF-AD0BC")[7],"SC-I4,SC-H3");
assert.deepEqual([g1.dx,g1.dz],[1.8,1.8]);
assert.deepEqual([g1.provenance.stageComparison.dx,g1.provenance.stageComparison.dz],[2.1,2.1]);
assert.equal(g1.provenance.excavationWorkingArea.actualExcavationSizeM,null);
assert.equal(report.g1.planAreaDeltaM2,1.17);
const f3=qa.issues.find(q=>q.id==="COL-F3");
assert.equal(f3.recordedDecision,"propose-stage");
assert.equal(f3.workingIntent,"RETAIN_DXF_COLUMN");
assert.equal(report.f3.workingSource,"ORIGINAL_DXF");
const models=Object.fromEntries(m.levels.map(l=>[l.id,read(l.model)]));
const building=assembleBuilding(m,models,{reviewStructure:review});
assert.equal(building.sourceStructuralReview.ownerVerificationEventId,ev.eventId);
assert.deepEqual([building.counts.column,building.counts.footing,building.counts.beam],[23,21,16]);
assert.equal(building.reviewStatus,"DRAFT_ENGINEERING_HOLD");
assert.ok(building.diagnostics.some(d=>d.code==="UPPER_STOREY_SOURCE_BEAM_SHEETS_PRESENT_MEMBERS_UNVERIFIED"));
console.log("AAD_M28_OWNER_APPROVED_CF1_GEOMETRIC_RECONCILIATION_PASS",
 JSON.stringify({verificationId:ev.eventId,workingSupports:link.workingIds,CF1:[cf.x,cf.z,cf.dx,cf.dz],
 G1:[g1.dx,g1.dz],F3:"ORIGINAL_DXF",sourcePreserved:true}));
