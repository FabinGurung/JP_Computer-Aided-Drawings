/* AI-authoring pipeline smoke tests: synthetic only, deterministic and negative.
 * Does not require any LLM or GitHub token. Run via standard Node 22.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {compileAADDesign} from "../../public/assets/js/aad-ai-design-compiler.mjs";
import {checkIfcReferences} from "../../public/assets/js/aad-building-ifc4.mjs";
import {derivePlanRooms} from "../../public/assets/js/aad-topology.mjs";
import {getAADPublicationCopy} from "./aad-ai-publication-copy.mjs";
const original=JSON.parse(fs.readFileSync("design_jobs/synthetic/aad-ai-two-storey.json","utf8"));
const syntheticCopy=getAADPublicationCopy("synthetic-demo");
const realCopy=getAADPublicationCopy("owner-approved-public");
assert.match(syntheticCopy.overview,/synthetic.*not a real client's property/i);
assert.match(syntheticCopy.overviewHold,/NOT FOR CONSTRUCTION/);
assert.match(realCopy.overview,/owner-approved.*public publication/i);
assert.match(realCopy.overviewHold,/GEOMETRY UNVERIFIED.*ENGINEERING HOLD/);
assert.match(realCopy.studioHold,/NOT FOR CONSTRUCTION/);
for(const copy of Object.values(realCopy))assert.doesNotMatch(copy,/synthetic|surveyed|structurally approved/i);
assert.throws(()=>getAADPublicationCopy("unknown"),/Unsupported AAD project publication mode/);
const compile=x=>compileAADDesign(structuredClone(x));
const built=compile(original),repeat=compile(original);
assert.equal(built.projectId,"AAD-DEMO-001");
assert.equal(built.slug,"aad-ai-demo");
assert.equal(built.manifest.schema,"jp-cad://aad-building/1");
assert.deepEqual(built.manifest.levels.map(l=>[l.id,l.sourceArea,l.elevation]),[["gf",80,0],["ff",80,3]]);
assert.equal(built.assembly.area.source,160);
assert.equal(built.assembly.area.model,160);
assert.equal(built.qa.issueForConstruction,false);
assert.equal(built.qa.stage,"AI_CONCEPTUAL_ENGINEERING_HOLD");
assert.ok(built.manifest.restrictions.engineeringApproval==="HOLD");
assert.deepEqual(derivePlanRooms(built.models.gf.floorGraph).map(x=>x.area).sort((a,b)=>a-b),[40,40]);
assert.deepEqual(derivePlanRooms(built.models.ff.floorGraph).map(x=>x.area).sort((a,b)=>a-b),[40,40]);
assert.equal(built.assembly.counts.wall,14); // each floor: 4 perimeter, 2 split segments, 1 partition
assert.equal(built.assembly.counts.door,3); // GF two / FF one
assert.equal(built.assembly.counts.window,4);
assert.equal(built.assembly.counts.column,8); // four grid axes on both levels
assert.equal(built.assembly.counts.stair,2); // two flights between levels
assert.ok(built.assembly.counts.slab===2);
assert.equal(built.ifcFile,"AAD-DEMO-001_AAD_CONCEPTUAL_2STOREY_IFC4.ifc");
const ifc=checkIfcReferences(built.ifc);
assert.equal(ifc.counts.IFCBUILDINGSTOREY,2);
assert.equal(ifc.counts.IFCRELVOIDSELEMENT,7);
assert.equal(ifc.counts.IFCRELFILLSELEMENT,7);
assert.equal(ifc.counts.IFCSTAIRFLIGHT,2);
assert.equal(built.ifc,repeat.ifc,"Identical input must produce byte-identical IFC");
assert.deepEqual(built.manifest,repeat.manifest,"Identical input must produce identical project manifest");
const expectReject=(fn,regex)=>assert.throws(fn,regex);
let x;
x=structuredClone(original);x.publication.publicApproved=false;
expectReject(()=>compile(x),/public publication permission/);
x=structuredClone(original);x.publication.mode="owner-approved-public";delete x.publication.approvalReference;
expectReject(()=>compile(x),/Invalid publication approval reference|approval reference/);
x=structuredClone(original);x.units="ft";
expectReject(()=>compile(x),/requires metres/);
x=structuredClone(original);x.levels[0].outline=[[0,0],[10,8],[0,8],[10,0]];
expectReject(()=>compile(x),/Self-intersecting|counterclockwise/);
x=structuredClone(original);x.levels[0].openings.push({host:"central",kind:"door",offset:1.4,width:1,height:2.1,sill:0});
expectReject(()=>compile(x),/overlap/i);
x=structuredClone(original);x.levels[0].partitions[0].end=[16,8];
expectReject(()=>compile(x),/footprint/);
x=structuredClone(original);x.structural.columns.gridX=[8,2];
expectReject(()=>compile(x),/Unsorted column grid/);
x=structuredClone(original);x.project.slug="../escape";
expectReject(()=>compile(x),/URL-safe/);
// M16 acceptance: source-referenced vs inferred geometry stays explicit and never
// turns polygon-derived area into surveyed or engineering-approved measurement.
// This fixture is NOT a real client's project and is never added to publish queue.
const approved=structuredClone(original);
approved.publication={mode:"owner-approved-public",publicApproved:true,approvalReference:"TEST_FIXTURE_ONLY_DO_NOT_PUBLISH"};
approved.evidence={kind:"test-fixture",status:"UNVERIFIED_NOT_REAL_CLIENT"};
approved.sources=[{id:"PLAN-A1",kind:"dxf",reference:"Synthetic test drawing A1 (not an actual customer DXF)"}];
approved.levels[0].geometryProvenance={basis:"source-referenced",sourceId:"PLAN-A1",locator:"Test drawing A1 / GF outline"};
approved.levels[1].geometryProvenance={basis:"ai-inferred",rationale:"Conceptual upstairs layout provided for automated testing"};
approved.constraints={
 maxFloorPlateAreaM2:80,maxTotalFloorPlateAreaM2:160,
 buildableEnvelope:[[-1,-1],[11,-1],[11,9],[-1,9]]
};
const checked=compile(approved);
assert.equal(checked.manifest.sourceAuthority.sources[0].id,"PLAN-A1");
assert.equal(checked.manifest.levels[0].geometryProvenance.status,"SOURCE_REFERENCED_NOT_INDEPENDENTLY_VERIFIED");
assert.equal(checked.manifest.levels[1].geometryProvenance.status,"AI_INFERRED_NOT_SOURCE_VERIFIED");
assert.equal(checked.manifest.levels[0].sourceAreaBasis,"AI_POLYGON_SHOELACE_CALCULATED_NOT_SURVEYED");
assert.equal(checked.qa.geometryProvenance.length,2);
assert.equal(checked.qa.authoringConstraints.length,3);
assert.equal(checked.qa.issueForConstruction,false);
assert.deepEqual(checked.ifc,compile(approved).ifc,"Provenance inputs must keep IFC generation deterministic");
x=structuredClone(approved);delete x.levels[0].geometryProvenance;
expectReject(()=>compile(x),/needs explicit geometryProvenance/);
x=structuredClone(approved);x.levels[0].geometryProvenance.sourceId="MISSING";
expectReject(()=>compile(x),/Unknown source ID/);
x=structuredClone(approved);delete x.levels[0].geometryProvenance.locator;
expectReject(()=>compile(x),/Invalid source locator/);
x=structuredClone(approved);delete x.levels[1].geometryProvenance.rationale;
expectReject(()=>compile(x),/Invalid AI inference rationale/);
x=structuredClone(approved);x.levels[0].geometryProvenance={basis:"synthetic"};
expectReject(()=>compile(x),/cannot be labeled synthetic/);
x=structuredClone(approved);x.sources.push({...x.sources[0]});
expectReject(()=>compile(x),/Duplicate or invalid AAD source ID/);
x=structuredClone(approved);x.constraints.maxFloorPlateAreaM2=79.9;
expectReject(()=>compile(x),/maximum floor plate area/);
x=structuredClone(approved);x.constraints.maxTotalFloorPlateAreaM2=159.9;
expectReject(()=>compile(x),/maximum total floor plate area/);
x=structuredClone(approved);x.constraints.buildableEnvelope=[[1,-1],[11,-1],[11,9],[1,9]];
expectReject(()=>compile(x),/exceeds owner-specified buildable envelope/);
x=structuredClone(approved);x.levels[1].transform={x:3,z:0,rotationDeg:0};
expectReject(()=>compile(x),/exceeds owner-specified buildable envelope/);
x=structuredClone(approved);
x.constraints.buildableEnvelope=[[-1,-1],[11,-1],[11,9],[7,9],[7,3],[3,3],[3,9],[-1,9]];
expectReject(()=>compile(x),/crosses (outside owner-specified buildable envelope|owner-specified buildable envelope boundary)/);
x=structuredClone(approved);x.constraints.unknownZoningRatio=0.7;
expectReject(()=>compile(x),/Unsupported AAD constraint/);
console.log("AAD_AI_M16_PROVENANCE_AND_CONSTRAINTS_PASS",JSON.stringify({
 levels:checked.qa.geometryProvenance.map(v=>[v.level,v.basis,v.status]),
 checks:checked.qa.authoringConstraints.map(v=>v.code),
 engineering:checked.qa.stage
}));

console.log("AAD_AI_DESIGN_COMPILER_SYNTHETIC_PASS",JSON.stringify({
 project:built.projectId,areas:built.manifest.levels.map(l=>l.sourceArea),
 rooms:2,ifcElements:ifc.lines,sourceType:built.manifest.sourceAuthority.type,
 engineeringStatus:built.qa.stage
}));
