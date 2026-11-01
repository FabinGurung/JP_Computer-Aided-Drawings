// M34 owner's interpretation (G2 beam-line meeting; C6-F6/016 orthogonal working
// geometry) is source-backed, non-destructive and non-certifying.
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadAADReviewedStructure} from "../../public/assets/js/aad-reviewed-structural-intake.mjs";
import {assembleBuilding} from "../../public/assets/js/aad-building-core.mjs";
const base="public/data/projects/narayani-parajuli/";
const read=x=>JSON.parse(fs.readFileSync(base+x,"utf8"));
const source=read("aad-m34-owner-geometry-reconciliation-20261101.json"),
 ledger=read("aad-engineering-current-register.json"),
 manifest=read("aad-building-v1.json"),
 m33=read("aad-m33-gf-sheet-registration-audit.json"),
 m32=read("aad-m32-beam-strip-source-register.json"),
 m30=read("aad-m30-original-dxf-full-source-index.json");
assert.equal(source.schema,"jp-cad://aad-m34-owner-geometry-reconciliation/1");
assert.equal(source.projectId,"PRJ-000007");
assert.equal(source.originalStructuralDxfSha256,m30.originals.structure.sha256);
assert.equal(source.originalStructuralDxfSha256,m32.sourceOriginalDXFSha256);
assert.deepEqual(source.questions.Q1.sourceStrictStripIndices,[3,6,7,9]);
assert.deepEqual(source.questions.Q1.originalCenterlineHandles,["AFB31","AFB4A"]);
assert.equal(source.questions.Q1.ownerDecision,"DRAWN_BEAM_LINES_MEET_NOT_NEW_G2_COLUMN");
assert.equal(source.questions.Q1.existingGFColumnAtIntersection,false);
assert.equal(source.questions.Q1.structuralJunctionSupportCapacity,"UNVERIFIED");
const q2=source.questions.Q2,overlay=q2.workingOverlayIntent;
assert.equal(q2.ownerDecision,"RECTIFY_WORKING_REFERENCE_ONLY_ORTHOGONAL_C6_F6_TO_016");
assert.deepEqual(q2.originalAxisSourceHandles,["AFB3C","AFB5C"]);
assert.deepEqual(q2.originalWallSourceHandles,["AFBC0","AFBBB","AFBB9","AFBBA"]);
assert.equal(q2.originalLayerAtHighlightedLine,"wall");
assert.equal(q2.originalWallEdges.AFBC0.slopeDegrees,0.471038);
assert.equal(q2.sourceColumnCenterDifferenceZMM,.353);
assert.equal(q2.columnSeparationM,4.823853);
const [[ax,ay],[bx,by]]=overlay.sourceSheetC6ToF6CenterlineM;
const [[cx,cy],[dx,dy]]=overlay.sourceSheetStrip016CenterlineM;
assert.equal(ay,by,"C6–F6 intended straight");
assert.equal(cx,dx,"016 intended perpendicular");
assert.equal((bx-ax)*(dx-cx)+(by-ay)*(dy-cy),0,"review axis dot product exactly 0");
assert.equal(overlay.nominalAngleDegrees,90);
assert.deepEqual(overlay.crossing,[2.389578,118.833740]);
assert.equal(overlay.status,"OWNER_INTENT_COORDINATION_OVERLAY_ONLY_NO_ORIGINAL_DXF_MUTATION");
assert.equal(q2.originalDistanceFaceToHorizontalCenterlineMMApprox,114.74);
assert.equal(m33.endpointProximity.pairedCandidatesOnlyOneEndNearGFColumn,5,
 "Historic source proximity counts must remain unchanged by working interpretation");
assert.equal(source.sourcePreservation.newG2ColumnAdded,false);
assert.equal(source.sourcePreservation.upperIFCStructuralMembersAdded,0);
assert.equal(source.issueDisposition.issueForConstruction,false);
assert.equal(source.issueDisposition.remainingIndependentTechnicalGates,7);
assert.equal(manifest.structuralReview.ownerSourceGeometryClarification,
 "aad-m34-owner-geometry-reconciliation-20261101.json");
assert.deepEqual(manifest,read("archive/m34/M34_POST_aad-building-v1.json"));
assert.deepEqual(ledger,read("archive/m34/M34_POST_current-engineering-register.json"));
assert.deepEqual(read("archive/m33/M33_POST_aad-building-v1.json"),
 read("archive/m34/M34_PRE_aad-building-v1.json"));
assert.deepEqual(read("archive/m33/M33_POST_current-engineering-register.json"),
 read("archive/m34/M34_PRE_current-engineering-register.json"));
assert.equal(ledger.currentVersion,"M34-20261101_OWNER_OBSERVATION_RECONCILED");
assert.equal(ledger.issues.filter(i=>i.engineeringGate==="OPEN").length,7);
assert.equal(ledger.noFurtherOwnerLayoutApprovalRequired,true);
const models=Object.fromEntries(manifest.levels.map(x=>[x.id,read(x.model)]));
const root=new URL("https://example.test/JP_Computer-Aided-Drawings/data/projects/narayani-parajuli/aad-building-v1.json");
const review=await loadAADReviewedStructure(manifest,root,async u=>JSON.parse(
 fs.readFileSync("public/"+u.pathname.slice("/JP_Computer-Aided-Drawings/".length),"utf8")));
const building=assembleBuilding(manifest,models,{reviewStructure:review});
assert.deepEqual([building.counts.column,building.counts.footing,building.counts.beam],[23,21,16]);
assert.equal(building.elements.filter(x=>["ff","sf"].includes(x.level)&&
 ["beam","column","footing"].includes(x.kind)).length,0);
assert.equal(building.reviewStatus,"DRAFT_ENGINEERING_HOLD");
console.log("AAD_M34_OWNER_GEOMETRY_ORTHOGONAL_REVIEW_ONLY_SEVEN_GATES_OPEN_PASS",
 JSON.stringify({ownerG2:"junction-no-column",c6f6:"straight",strip016:"perpendicular",
 sourceAngleDegrees:q2.originalWallEdges.AFBC0.slopeDegrees,workingAngleDeg:90,
 gfModel:[23,21,16],extraMembers:0,technicalGates:7}));
