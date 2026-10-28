// M30 original-DXF fingerprinted complete source inventory; offline source facts
// are checked, not represented as a live GitHub Actions Drive download.
import assert from "node:assert/strict";
import fs from "node:fs";
import {assembleBuilding} from "../../public/assets/js/aad-building-core.mjs";
import {loadAADReviewedStructure} from "../../public/assets/js/aad-reviewed-structural-intake.mjs";
const dir="public/data/projects/narayani-parajuli/";
const read=n=>JSON.parse(fs.readFileSync(dir+n,"utf8"));
const inventory=read("aad-m30-original-dxf-full-source-index.json");
const manifest=read("aad-building-v1.json");
const before=read("archive/m30/M30_PRE_aad-building-v1.json");
const after=read("archive/m30/M30_POST_aad-building-v1.json");
const history=read("aad-m30-source-index-version-history.json");
assert.equal(inventory.schema,"jp-cad://aad-m30-original-dxf-source-index/1");
assert.equal(inventory.projectId,manifest.projectId);
assert.equal(manifest.structuralReview.fullSourceIndex,"aad-m30-original-dxf-full-source-index.json");
assert.deepEqual(manifest,after);
assert.deepEqual({...before,structuralReview:{...before.structuralReview,
 fullSourceIndex:"aad-m30-original-dxf-full-source-index.json"}},manifest,
 "M30 may only add reference to derived source inventory");
assert.equal(history.events.length,2);
assert.equal(history.events[0].version,"M30_PRE");
assert.equal(history.events[1].version,"M30_POST");
assert.equal(inventory.originals.architecture.sha256,"077e7b4ffd5ce3c5c9789f9d040ef32ee661175aedd5f2d1059dbbe18176e124");
assert.equal(inventory.originals.structure.sha256,"55a4b9828f569ece9c78063a60d56484c71e13563d9e73faf76a701bc182d1cf");
const a=inventory.originals.architecture,s=inventory.originals.structure;
assert.equal(Object.values(a.entityTypes).reduce((x,y)=>x+y,0),a.modelspaceEntities);
assert.equal(Object.values(s.entityTypes).reduce((x,y)=>x+y,0),s.modelspaceEntities);
assert.equal(a.modelspaceEntities,371930);
assert.equal(s.modelspaceEntities,13834);
assert.deepEqual(Object.values(inventory.selectedBlockBArchitecture.drawnWallSourceEntities),[44,101,142]);
const plans=inventory.upperFloorStructuralSheetEvidence;
assert.deepEqual(Object.values(plans.sourceNativeByFloor).map(x=>x.sheetBeamMTEXT),[34,34,31]);
assert.deepEqual(Object.values(plans.sourceNativeByFloor).map(x=>x.wallLines),[113,113,107]);
assert.deepEqual(Object.values(plans.sourceNativeByFloor).map(x=>x.centerlineLines),[20,20,20]);
assert.deepEqual([plans.sheetTitleHandles.gf,plans.sheetTitleHandles.ff,plans.sheetTitleHandles.sf],
 ["B000D","B0452","B084F"]);
assert.equal(inventory.sourceToDesignGate.issueForConstruction,false);
assert.equal(inventory.sourceToDesignGate.upperFloorIFCConstructionMembers,0);
assert.equal(plans.certifiedBeamMemberCount,null);
assert.equal(plans.verifiedColumnContinuity,false);
const cmp=plans.nativeSheetTranslationComparison;
assert.equal(cmp.translationRelativeToGroundFloorMM.ff,36174);
assert.equal(cmp.gfVsFf.wallLineSourceGeometryIdentical,113);
assert.equal(cmp.gfVsFf.sourceBeamAnnotationIdentical,34);
assert.equal(cmp.ffVsSf.sharedWallLinesAfterNativeTranslation,104);
assert.equal(cmp.ffVsSf.ffOnlyWallLines,9);
assert.equal(cmp.ffVsSf.sfOnlyWallLines,3);
assert.equal(cmp.ffVsSf.sharedBeamAnnotations,31);
const models=Object.fromEntries(manifest.levels.map(l=>[l.id,read(l.model)]));
const root=new URL("https://example.test/JP_Computer-Aided-Drawings/data/projects/narayani-parajuli/aad-building-v1.json");
const review=await loadAADReviewedStructure(manifest,root,async u=>
 JSON.parse(fs.readFileSync("public/"+u.pathname.slice("/JP_Computer-Aided-Drawings/".length),"utf8")));
assert.equal(review.userAuthorization,"M28_OWNER_VERIFIED");
const building=assembleBuilding(manifest,models,{reviewStructure:review});
assert.deepEqual([building.counts.column,building.counts.footing,building.counts.beam],[23,21,16]);
assert.equal(building.elements.filter(e=>["ff","sf"].includes(e.level)&&
 ["column","beam","footing"].includes(e.kind)).length,0);
assert.equal(manifest.restrictions.issueForConstruction,false);
console.log("AAD_M30_COMPLETE_DXF_INDEX_AND_NATIVE_UPPER_SOURCE_AUDIT_PASS",
 JSON.stringify({indexed:[a.modelspaceEntities,s.modelspaceEntities],
 wallLayers:[44,101,142],beamAnnotations:[34,34,31],
 trueStructuralMembers:[23,21,16],sourceHashesVerified:true,
 originalsUnchanged:true,upperFloorMembersNotFabricated:true}));
