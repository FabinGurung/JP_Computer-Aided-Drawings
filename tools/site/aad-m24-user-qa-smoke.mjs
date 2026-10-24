import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {createSourceGroundFloorReview} from "../../public/assets/js/aad-source-ground-floor.mjs";
import {bridgeM70Plinth} from "../../public/assets/js/aad-m70-plinth-bridge.mjs";
import {reconcileM23Stages} from "../../public/assets/js/aad-m23-governed-stages.mjs";
import {deriveUserQAPreview} from "../../public/assets/js/aad-m24-user-reviewed-preview.mjs";

const base="public/data/projects/narayani-parajuli/";
const raw=path=>fs.readFileSync(path,"utf8");
const json=path=>JSON.parse(raw(path));
const gitBlobSha=path=>{
 const contents=fs.readFileSync(path);
 return createHash("sha1").update(Buffer.from("blob "+contents.length+"\0")).update(contents).digest("hex");
};
const qa=json(base+"aad-user-qa-decisions-v1.json");
const paths={M60:"public/stages/m60/stage-data.json",
 M40:"public/stages/m40/stage-data.json",V03:"public/stages/v03/stage-data.json",
 M70:"public/stages/m70/stage-data.json",DXF_LEDGER:base+"aad-source-gf-review-v1.json"};
for(const [k,path] of Object.entries(paths))
 assert.equal(gitBlobSha(path),qa.sourceBlobSHAs[k],"Source drift without QA reconciliation: "+k);
assert.equal(qa.issues.length,13);
assert.ok(qa.issues.every(e=>e.recordedEvidence.engineer&&e.recordedEvidence.dxf));
const originalInput=json(paths.DXF_LEDGER);
const dxf=createSourceGroundFloorReview(originalInput);
const origString=JSON.stringify(dxf.elements);
const stage70=json(paths.M70),meta70=json("public/stages/m70/meta.json");
const m70=bridgeM70Plinth(dxf,stage70,meta70);
m70.grid=stage70.spatial_db.grid;
const s60=json(paths.M60),s40=json(paths.M40),s03=json(paths.V03);
const meta={m60:json("public/stages/m60/meta.json"),m40:json("public/stages/m40/meta.json"),
 v03:json("public/stages/v03/meta.json")};
const m23=reconcileM23Stages(dxf,m70,s60,s40,s03,meta);
const stageString=JSON.stringify([m23.columns,m23.footings,m70.records]);
const approval=json(base+"aad-user-message-approval-20261024.json");
assert.equal(approval.approvalStatement,"i approve vervally or message-ly just now.");
assert.equal(approval.projectId,qa.projectId);
assert.equal(approval.engineeringApprovalVerified,false);
assert.equal(approval.engineeringHoldPreserved,true);
const output=deriveUserQAPreview(dxf,m70,m23,qa,approval);
assert.equal(output.userMessageApproval.status,"USER_APPROVED_WORKING_QA_PROPOSAL_FOR_FURTHER_REVIEW_AND_DEVELOPMENT");
assert.equal(output.userMessageApproval.engineeringApprovalVerified,false);
assert.equal(output.engineeringApproval,false);
assert.ok(output.discrepancies.some(x=>x.code==="USER_MESSAGE_APPROVAL_RECORDED"));
assert.ok(!output.discrepancies.some(x=>x.code==="SIGNED_ENGINEER_APPROVAL_NOT_SUPPLIED"));
assert.throws(()=>deriveUserQAPreview(dxf,m70,m23,qa,{...approval,engineeringApprovalVerified:true}),
 /contradicts original QA/);
assert.equal(output.status,"ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION");
assert.equal(output.engineeringApproval,false);
assert.equal(output.counts.workingColumns,23);
assert.equal(output.counts.workingFootings,21);
assert.equal(output.counts.governingM70BeamRuns,16);
assert.deepEqual(new Set(output.columns.map(c=>c.grid)).size,23);
assert.ok(output.columns.some(c=>c.grid==="I3"&&c.section==="Ø350"&&c.id==="QA-SC-I3"));
assert.ok(!output.columns.some(c=>c.grid==="I4"));
assert.ok(output.columns.some(c=>c.grid==="F3"&&c.source.dxfId==="SC-F3"));
for(const g of ["C4","E2","E4","G4","H4"])
 assert.ok(!output.columns.some(c=>c.grid===g),"M60-only column unexpectedly retained at "+g);
for(const g of ["C3","F2","F3","G3","H3"])
 assert.ok(output.columns.some(c=>c.grid===g),"DXF column missing: "+g);
const i3=output.columns.find(c=>c.grid==="I3");
const from=dxf.elements.find(c=>c.id==="SC-I4");
assert.ok(Math.abs(i3.x-from.x)<.00001);
assert.ok(Math.abs(i3.z-6.12504)<.001);
assert.ok(Math.abs(i3.z-from.z-.655)<.002);
const g1=output.footings.find(x=>x.grid==="G1");
assert.deepEqual([g1.dx,g1.dz],[1.8,1.8]);
assert.deepEqual([g1.stageComparison.dx,g1.stageComparison.dz],[2.1,2.1]);
assert.equal(g1.excavationWorkingArea.actualExcavationSizeM,null);
assert.equal(g1.excavationWorkingArea.perSideUnspecified,true);
assert.equal(output.footingSizingPolicy.autoExcavationDimensions,false);
const orphan=output.footings.filter(x=>x.orphanOriginalColumnIds.length);
assert.equal(orphan.length,1);
assert.ok(orphan[0].originalDxfColumnIds.includes("SC-I4"));
assert.ok(orphan[0].status.includes("ORPHAN"));
assert.equal(output.discrepancies.length,5);
assert.ok(output.discrepancies.some(x=>x.code==="F3_RECORDED_DECISION_VS_NOTE"));
assert.ok(output.discrepancies.some(x=>x.code==="CF1_ORPHAN_I4_SUPPORT"));
assert.equal(JSON.stringify(dxf.elements),origString,"Original derived DXF elements modified");
assert.equal(JSON.stringify([m23.columns,m23.footings,m70.records]),stageString,
 "Frozen stage derivation mutated");
assert.throws(()=>deriveUserQAPreview(dxf,m70,m23,{...qa,engineeringApproval:true}),/cannot certify/);
assert.throws(()=>deriveUserQAPreview(dxf,m70,m23,{...qa,issues:qa.issues.slice(1)}),
 /exactly the 13/);
console.log("AAD_M24_USER_QA_PROPOSAL_PASS",JSON.stringify({
  sourceShaChecks:Object.keys(paths),counts:output.counts,i3:{x:i3.x,z:i3.z},
  nativeG1:[g1.dx,g1.dz],m40G1:[g1.stageComparison.dx,g1.stageComparison.dz],
  orphanFootings:orphan.map(x=>x.id),blocking:output.discrepancies.map(x=>x.code)}));
