/* AI-authoring pipeline smoke tests: synthetic only, deterministic and negative.
 * Does not require any LLM or GitHub token. Run via standard Node 22.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {compileAADDesign} from "../../public/assets/js/aad-ai-design-compiler.mjs";
import {checkIfcReferences} from "../../public/assets/js/aad-building-ifc4.mjs";
import {derivePlanRooms} from "../../public/assets/js/aad-topology.mjs";
const original=JSON.parse(fs.readFileSync("design_jobs/synthetic/aad-ai-two-storey.json","utf8"));
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
console.log("AAD_AI_DESIGN_COMPILER_SYNTHETIC_PASS",JSON.stringify({
 project:built.projectId,areas:built.manifest.levels.map(l=>l.sourceArea),
 rooms:2,ifcElements:ifc.lines,sourceType:built.manifest.sourceAuthority.type,
 engineeringStatus:built.qa.stage
}));
