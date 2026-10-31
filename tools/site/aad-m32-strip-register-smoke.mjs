// M32 source drawing-strip register: provenance, data quality, non-promotion
// and explicit distinction from engineering beam validation.
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadAADReviewedStructure} from "../../public/assets/js/aad-reviewed-structural-intake.mjs";
import {assembleBuilding} from "../../public/assets/js/aad-building-core.mjs";
const dir="public/data/projects/narayani-parajuli/";
const read=n=>JSON.parse(fs.readFileSync(dir+n,"utf8"));
const src=read("aad-m32-beam-strip-source-register.json");
const base=read("aad-m30-original-dxf-full-source-index.json");
const model=read("aad-building-v1.json");
const reg=read("aad-engineering-current-register.json");
assert.equal(src.schema,"jp-cad://aad-m32-native-beam-strip-register/1");
assert.equal(src.projectId,model.projectId);
assert.equal(src.issuedForConstruction,false);
assert.equal(src.ifcMemberCountAdded,0);
assert.equal(src.sourceOriginalDXFSha256,base.originals.structure.sha256);
assert.equal(src.sourceM30ArchiveSHA256,base.provenance.persistedExtractionArchive.sha256);
assert.equal(src.sourceM32Archive.sha256,"e0e5e7dec6ca7f4dc7287f23aeb0b5d91d79fbcee508efcca03865182e098f35");
assert.equal(src.sourceM32Archive.driveFileId,"1DMPF-RiOVDldGKjl4CHq8q0GPb8ZmaTp");
assert.equal(src.sourceM32Archive.uploadReadback,"GOOGLE_DRIVE_REDOWLOAD_SHA256_AND_ZIP_CRC_CONFIRMED");
assert.equal(src.sheetFrame.startsWith("X=(DXF native X"),true);
assert.equal(src.commonStrictSheetNormalizedAxesM.length,17);
assert.deepEqual(Object.keys(src.floorSource).sort(),["ff","gf","sf"]);
const all=new Set();
let total=0;
for(const [floor,expectedLong,expectedRaw,expectedAll] of [
 ["gf",62,113,35],["ff",62,113,35],["sf",57,107,33]]){
 const f=src.floorSource[floor];
 assert.equal(f.eligibleLines,expectedLong);
 assert.equal(f.originalWallLines,expectedRaw);
 assert.equal(f.allParallel230Pairs,expectedAll);
 assert.equal(f.pairedHandles.length,17);
 assert.equal(f.nearestTextHandles.length,17);
 assert.equal(f.sheetAnchorXMM,base.upperFloorStructuralSheetEvidence.nativeSheetTranslationComparison.sheetXAnchorNativeMM[floor]);
 const local=new Set();
 f.pairedHandles.forEach(pair=>{
  assert.equal(pair.length,2);
  for(const handle of pair){
   assert.match(handle,/^[0-9A-F]+$/);
   assert.ok(!local.has(handle),"duplicate source LINE handle on same floor: "+handle);
   local.add(handle);all.add(handle);
  }
 });
 assert.equal(local.size,34);
 assert.equal(new Set(f.nearestTextHandles).size<=17,true,
  "MTEXT proximity can be many-to-one; no member assignment inferred");
 total+=f.pairedHandles.length;
}
assert.equal(total,51);assert.equal(all.size,102);
assert.deepEqual(src.summary.strictCandidatePairsByFloor,{gf:17,ff:17,sf:17});
assert.deepEqual(src.summary.additionalNonStrictParallelHypothesesByFloor,{gf:18,ff:18,sf:16});
for(const axis of src.commonStrictSheetNormalizedAxesM){
 assert.equal(axis.length,4);assert.ok(axis.every(Number.isFinite));
 const length=Math.hypot(axis[2]-axis[0],axis[3]-axis[1]);
 assert.ok(length>0.5&&length<20);
}
assert.equal(model.structuralReview.nativeBeamStripEvidence,"aad-m32-beam-strip-source-register.json");
assert.deepEqual(read("archive/m32/M32_POST_aad-building-v1.json"),
 read("archive/m33/M33_PRE_aad-building-v1.json"));
assert.deepEqual(read("archive/m32/M32_POST_current-engineering-register.json"),
 read("archive/m33/M33_PRE_current-engineering-register.json"));
assert.deepEqual(read("archive/m33/M33_POST_aad-building-v1.json"),model);
assert.deepEqual(read("archive/m33/M33_POST_current-engineering-register.json"),reg);
assert.equal(read("archive/m32/M32_PRE_aad-building-v1.json").structuralReview.nativeBeamStripEvidence,undefined);
assert.equal(read("archive/m32/M32_PRE_current-engineering-register.json").currentVersion,"M31-20261028");
assert.equal(reg.currentVersion,"M33-20261031");
assert.equal(reg.noFurtherOwnerLayoutApprovalRequired,true);
assert.equal(reg.issues.filter(x=>x.engineeringGate==="OPEN").length,7);
assert.equal(reg.counts.closedOwnerDecisionConflicts,1);
assert.equal(reg.latestTechnicalEvidence.strictCandidates,51);
assert.equal(reg.latestTechnicalEvidence.engineeredSupportMembersVerified,0);
assert.equal(reg.latestTechnicalEvidence.constructionApproval,false);
const models=Object.fromEntries(model.levels.map(l=>[l.id,read(l.model)]));
const root=new URL("https://example.test/JP_Computer-Aided-Drawings/data/projects/narayani-parajuli/aad-building-v1.json");
const review=await loadAADReviewedStructure(model,root,async u=>
 JSON.parse(fs.readFileSync("public/"+u.pathname.slice("/JP_Computer-Aided-Drawings/".length),"utf8")));
const assembly=assembleBuilding(model,models,{reviewStructure:review});
assert.deepEqual([assembly.counts.column,assembly.counts.footing,assembly.counts.beam],[23,21,16]);
assert.equal(assembly.elements.filter(e=>["ff","sf"].includes(e.level)&&
 ["beam","column","footing"].includes(e.kind)).length,0);
assert.equal(assembly.reviewStatus,"DRAFT_ENGINEERING_HOLD");
console.log("AAD_M32_51_NATIVE_SOURCE_STRIPS_NOT_ADMITTED_TO_IFC_PASS",
 JSON.stringify({sourceStripCandidates:total,uniqueNativeHandles:all.size,commonDrawingAxes:17,
 gfStructuralIFC:[23,21,16],upperStoreyStructuralIFCAdded:0,engineeringHolds:7}));
