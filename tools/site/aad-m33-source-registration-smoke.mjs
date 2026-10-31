// M33 — source-grounded internal DXF sheet registration, not surveyed / engineering support.
import assert from "node:assert/strict";
import fs from "node:fs";
import {deriveM33ColumnProximity} from "../../public/assets/js/aad-m33-source-sheet-registration.mjs";
import {loadAADReviewedStructure} from "../../public/assets/js/aad-reviewed-structural-intake.mjs";
import {assembleBuilding} from "../../public/assets/js/aad-building-core.mjs";
const base="public/data/projects/narayani-parajuli/";
const read=name=>JSON.parse(fs.readFileSync(base+name,"utf8"));
const src=read("aad-source-gf-review-v1.json"),
 m32=read("aad-m32-beam-strip-source-register.json"),
 m28=read("aad-m28-reconciliation-20261027.json"),
 report=read("aad-m33-gf-sheet-registration-audit.json"),
 manifest=read("aad-building-v1.json"),
 ledger=read("aad-engineering-current-register.json");
const result=deriveM33ColumnProximity(src,m32,m28);
assert.equal(result.schema,"jp-cad://aad-m33-gf-drawing-frame-column-proximity/1");
assert.equal(report.schema,"jp-cad://aad-m33-gf-sheet-registration-audit/1");
assert.equal(result.projectId,report.projectId);
assert.equal(result.stage,"M33");
assert.equal(result.issuedForConstruction,false);
assert.equal(report.conclusions.issueForConstruction,false);
assert.equal(report.conclusions.engineerVerifiedBeamSupports,0);
assert.equal(result.calibration.sourceSheetXTranslationM,report.sourceCalibration.translationXMetres);
assert.deepEqual(result.calibration.controlWitnesses.filter(x=>x.role==="CALIBRATION").map(x=>x.grid),
 report.sourceCalibration.controls);
assert.deepEqual(result.calibration.controlWitnesses.filter(x=>x.role==="HELD_OUT_INDEPENDENT_CHECK").map(x=>x.grid),
 report.sourceCalibration.independentHeldOutControls);
assert.equal(result.calibration.maximumWitnessResidualMm,report.sourceCalibration.maximumAbsoluteWitnessResidualMm);
for(const x of result.calibration.controlWitnesses)assert.equal(x.residualXmm,
 report.sourceCalibration[x.role==="CALIBRATION"?"calibrationResidualXmm":"heldOutResidualXmm"][x.grid]);
assert.equal(result.summary.totalStripEndpoints,34);
assert.equal(result.summary.endpointsWithin250mm,report.endpointProximity.endpointNearGFWorkingColumn);
assert.equal(result.summary.stripsBothEndsWithin250mm,report.endpointProximity.pairedCandidatesBothEndsNearGFColumns);
assert.equal(result.summary.stripsWithUnmatchedEndpoint,report.endpointProximity.pairedCandidatesOnlyOneEndNearGFColumn);
assert.deepEqual(result.stripEndpointProximity.map((x,i)=>!x.bothEndsWithin250mm?i+1:null).filter(Boolean),
 report.endpointProximity.unmatchedStripIndices);
assert.equal(result.columns.find(c=>c.grid==="I3").workingSelection,
 "M28_OWNER_APPROVED_RELOCATION_FROM_ORIGINAL_I4");
assert.equal(result.columns.filter(c=>c.workingSelection==="SOURCE_ORIGINAL_DXF").length,22);
assert.equal(result.summary.verifiedStructuralSupportConnections,0);
assert.equal(result.summary.verifiedUpperFloorColumnControls,0);
assert.equal(manifest.structuralReview.gfDrawingColumnProximity,"aad-m33-gf-sheet-registration-audit.json");
assert.deepEqual(read("archive/m33/M33_POST_aad-building-v1.json"),manifest);
assert.deepEqual(read("archive/m33/M33_POST_current-engineering-register.json"),ledger);
assert.equal(read("archive/m33/M33_PRE_aad-building-v1.json").structuralReview.gfDrawingColumnProximity,undefined);
assert.equal(read("archive/m33/M33_PRE_current-engineering-register.json").currentVersion,"M32-20261031");
assert.equal(ledger.currentVersion,"M33-20261031");
assert.equal(ledger.noFurtherOwnerLayoutApprovalRequired,true);
assert.equal(ledger.issues.filter(x=>x.engineeringGate==="OPEN").length,7);
assert.equal(ledger.latestTechnicalEvidence.engineeredSupportMembersVerified,0);
assert.equal(ledger.latestTechnicalEvidence.sourceSurveyRegistration,false);
assert.equal(ledger.latestTechnicalEvidence.verifiedUpperFloorStructuralMembers,0);
const models=Object.fromEntries(manifest.levels.map(l=>[l.id,read(l.model)]));
const root=new URL("https://example.test/JP_Computer-Aided-Drawings/data/projects/narayani-parajuli/aad-building-v1.json");
const review=await loadAADReviewedStructure(manifest,root,async u=>JSON.parse(
 fs.readFileSync("public/"+u.pathname.slice("/JP_Computer-Aided-Drawings/".length),"utf8")));
assert.equal(review.userAuthorization,"M28_OWNER_VERIFIED");
const building=assembleBuilding(manifest,models,{reviewStructure:review});
assert.deepEqual([building.counts.column,building.counts.footing,building.counts.beam],[23,21,16]);
assert.equal(building.elements.filter(x=>["ff","sf"].includes(x.level)&&
 ["beam","column","footing"].includes(x.kind)).length,0);
console.log("AAD_M33_DXF_SHEET_GF_COLUMN_MATCH_NOT_STRUCTURAL_SUPPORT_PASS",
 JSON.stringify({sourceFrameTranslationM:result.calibration.sourceSheetXTranslationM,
 witnessResidualMaxMm:result.calibration.maximumWitnessResidualMm,
 endsNearGFColumn:result.summary.endpointsWithin250mm,
 stripsBothEndsNear:result.summary.stripsBothEndsWithin250mm,
 supportsVerified:0,upperStructureAdded:0,sevenEngineeringGatesOpen:true}));
