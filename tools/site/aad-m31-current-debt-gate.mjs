// M31: current Narayani status must reflect M25/M28 owner decisions and
// M30 discovered source sheets, without pretending engineering validation.
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadAADReviewedStructure} from "../../public/assets/js/aad-reviewed-structural-intake.mjs";
import {assembleBuilding} from "../../public/assets/js/aad-building-core.mjs";
import {writeIFC4,checkIfcReferences} from "../../public/assets/js/aad-building-ifc4.mjs";
const dir="public/data/projects/narayani-parajuli/";
const read=n=>JSON.parse(fs.readFileSync(dir+n,"utf8"));
const old=read("aad-m27-engineering-holds.json");
const pre=read("archive/m31/M31_PRE_historical-M27-register.json");
const live=read("aad-engineering-current-register.json");
const post=read("archive/m31/M31_POST_current-engineering-register.json");
const m28=read("aad-m28-owner-verification-20261027.json");
const m30=read("aad-m30-original-dxf-full-source-index.json");
const manifest=read("aad-building-v1.json");
const history=fs.readFileSync(dir+"aad-engineering-current-register-history.jsonl","utf8")
 .trim().split("\n").map(s=>JSON.parse(s));
assert.deepEqual(pre,old,"M27 original eight-open historical source must remain exact");
assert.deepEqual(post,live,"M31 POST snapshot must match living register");
assert.deepEqual(history.map(x=>x.version),["M31_PRE","M31_POST","M31_POST_ARCHIVE_RECONCILED","M31_ARCHIVE_BINARY_VERIFIED"]);
assert.equal(live.schema,"jp-cad://aad-current-engineering-debt-register/1");
assert.equal(live.projectId,"PRJ-000007");
assert.equal(live.noFurtherOwnerLayoutApprovalRequired,true);
assert.equal(live.ownerAuthority,"M25_M28_WORKING_GEOMETRY_APPROVAL_FINAL");
assert.equal(m28.ownerDecisionStatus,"VERIFIED_AND_APPROVED_NO_REAPPROVAL_REQUEST");
assert.equal(live.constructionStatus,"ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION");
assert.equal(live.frozenSourcesUnmodified,true);
assert.deepEqual(live.counts,{
 historicalM27Issues:8,closedOwnerDecisionConflicts:1,remainingIndependentTechnicalGates:7
});
assert.equal(old.issues.length,8);
assert.deepEqual(live.issues.map(x=>x.id),old.issues.map(x=>x.id),
 "M31 must not silently discard historical issue IDs");
assert.equal(live.issues.filter(x=>x.engineeringGate==="OPEN").length,7);
assert.equal(live.issues.filter(x=>x.state==="RESOLVED_WORKING_DECISION").length,1);
assert.equal(live.issues.find(x=>x.id==="F3_SELECTION_NOTE_MISMATCH").workingDecision,
 "CLOSED_OWNER_CONFIRMED_DXF");
assert.equal(live.issues.find(x=>x.id==="DOCUMENTARY_ENGINEERING_APPROVAL").workingDecision,
 "OWNER_APPROVAL_SETTLED_M25_M28");
assert.equal(m30.sourceToDesignGate.issueForConstruction,false);
assert.equal(m30.upperFloorStructuralSheetEvidence.sourceNativeByFloor.ff.sheetBeamMTEXT,34);
assert.equal(m30.upperFloorStructuralSheetEvidence.sourceNativeByFloor.sf.sheetBeamMTEXT,31);
assert.deepEqual(m30.provenance.persistedExtractionArchive,live.extractionAudit.driveArchive);
assert.deepEqual(read("archive/m31/M31_POST_M30-source-index-with-archive-link.json"),m30);
const originalSourceIndex=read("archive/m31/M31_PRE_M30-source-index-before-archive-link.json");
assert.equal(originalSourceIndex.provenance.persistedExtractionArchive,undefined);
assert.equal(originalSourceIndex.originals.architecture.sha256,m30.originals.architecture.sha256);
assert.equal(originalSourceIndex.originals.structure.sha256,m30.originals.structure.sha256);
assert.equal(live.extractionAudit.uniqueHandles,385764);
assert.equal(live.extractionAudit.duplicateHandles,0);
assert.equal(live.extractionAudit.archiveIntegrity,"LOCAL_VERIFIED_ZIP_CRC_OK");
assert.equal(live.extractionAudit.archiveCentralDriveStorage,"VERIFIED_UPLOAD_AND_REDOWLOAD_BYTE_HASH_MATCH");
assert.equal(live.extractionAudit.driveArchive.driveFileId,
 "1t8rcWF4wW7dyO8fr4Pi58QAWJq3A4TiF");
assert.equal(live.extractionAudit.driveArchive.fileSizeBytes,9272240);
assert.equal(live.extractionAudit.driveArchive.driveByteDigestRecomputed,true);
assert.equal(live.extractionAudit.driveArchive.uploadReadback,
 "REDOWNLOADED_FROM_GOOGLE_DRIVE_SHA256_AND_ZIP_CRC_CONFIRMED");
assert.equal(live.extractionAudit.remoteCIRecomputedArchive,false,
 "GitHub CI cannot assert it downloaded a private raw archive");
assert.equal(live.extractionAudit.archiveSha256,
 "c89a0d54cda341794ebb0db750cd153f8a68febc39f63fcfac4477209d57d9b6");
const models=Object.fromEntries(manifest.levels.map(l=>[l.id,read(l.model)]));
const base=new URL("https://example.test/JP_Computer-Aided-Drawings/data/projects/narayani-parajuli/aad-building-v1.json");
const review=await loadAADReviewedStructure(manifest,base,async url=>
 JSON.parse(fs.readFileSync("public/"+url.pathname.slice("/JP_Computer-Aided-Drawings/".length),"utf8")));
assert.equal(review.userAuthorization,"M28_OWNER_VERIFIED");
const building=assembleBuilding(manifest,models,{reviewStructure:review});
assert.deepEqual([building.counts.column,building.counts.footing,building.counts.beam],[23,21,16]);
const codes=building.diagnostics.map(x=>x.code);
assert.ok(codes.includes("UPPER_STOREY_SOURCE_BEAM_SHEETS_PRESENT_MEMBERS_UNVERIFIED"));
assert.ok(codes.includes("I3_CF1_G1_OWNER_SELECTED_GEOMETRY_CAPACITY_UNVERIFIED"));
assert.ok(!codes.includes("NO_UPPER_FLOOR_STRUCTURAL_SOURCE"));
assert.ok(!codes.includes("I3_CF1_G1_STILL_UNRESOLVED"));
assert.equal(building.elements.filter(e=>["ff","sf"].includes(e.level)&&
 ["column","beam","footing"].includes(e.kind)).length,0);
const ifc=writeIFC4(building);
checkIfcReferences(ifc.text);
assert.equal(ifc.counts.IfcColumn,23);
assert.equal(ifc.counts.IfcFooting,21);
assert.equal(ifc.counts.IfcBeam,16);
assert.match(ifc.note,/Engineering HOLD/);
console.log("AAD_M31_OWNER_DECISION_CLOSED_7_ENGINEERING_GATES_OPEN_PASS",
 JSON.stringify({closedOwnerDecisions:1,remainingIndependentTechnicalGates:7,
 originalIndexedSourceHandles:385764,structuralGF:[23,21,16],
 upperFloorDrawingSheetsLocated:true,upperFloorIFCMembersInvented:0,
 archiveVerifiedLocallyNotCI:true,googleDriveArchiveFullReDownloadSHA256AndCRC:true,constructionApproved:false}));
