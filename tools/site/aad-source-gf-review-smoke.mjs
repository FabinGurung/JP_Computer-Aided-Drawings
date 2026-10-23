/* Source-native Narayani GF candidate acceptance (no original DXF reshipping).
 * This checks source ledger identity & deterministic registration, NOT engineering.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {createSourceGroundFloorReview} from "../../public/assets/js/aad-source-ground-floor.mjs";
import {bridgeM70Plinth} from "../../public/assets/js/aad-m70-plinth-bridge.mjs";
import {findProjectedBeamCrossing,nearestSourceElements,worldXZToNativeStructuralMM}
 from "../../public/assets/js/aad-source-coordinate-picking.mjs";
const file="public/data/projects/narayani-parajuli/aad-source-gf-review-v1.json";
const raw=fs.readFileSync(file,"utf8"),input=JSON.parse(raw);
const m=createSourceGroundFloorReview(input);
assert.equal(m.schema,"jp-cad://aad-source-gf-assembly/1");
assert.equal(m.projectId,"PRJ-000007");
assert.deepEqual(m.counts,{"column":23,"footing":21,"beam":32,"architectural-line":74});
assert.equal(m.stage,"ENGINEERING_HOLD");
// The frozen M70 plinth network exists as its own source stage.
// Prove all 23 M70/structural-DXF grid controls before displaying any PB.
const m70Stage=JSON.parse(fs.readFileSync("public/stages/m70/stage-data.json","utf8"));
const m70Meta=JSON.parse(fs.readFileSync("public/stages/m70/meta.json","utf8"));
const stageAdapter=JSON.parse(fs.readFileSync("public/data/projects/narayani-parajuli/aad-source-stage-links-v1.json","utf8"));
assert.equal(stageAdapter.projectId,m.projectId);
assert.equal(stageAdapter.additionalLayers.length,1);
assert.equal(stageAdapter.additionalLayers[0].stage,"M70");
const m70=bridgeM70Plinth(m,m70Stage,m70Meta);
assert.equal(m70.runCount,16);
assert.equal(m70.registrationControlCount,23);
assert.ok(m70.maxColumnResidualM<.001);
assert.equal(m70.declaredSectionMM.width,230);
assert.equal(m70.declaredSectionMM.depth,300);
assert.ok(Math.abs(m70.centerlineLengthM-134.184228)<.000002);
assert.equal(m70.records[0].id,"PB-H1");
assert.equal(m70.records.at(-1).id,"PB-V9");
assert.ok(m70.records.every(e=>e.kind==="plinth-beam"&&e.width===.23&&e.depth===.30));
assert.ok(m70.records.every(e=>e.source.file==="M70_FROZEN_STAGE"&&e.source.stageSnapshotId==="NARAYANI-M70-EMBEDDED-SNAPSHOT-002"));
const h3=m70.records.find(e=>e.id==="PB-H3"),v9=m70.records.find(e=>e.id==="PB-V9");
assert.ok(Math.hypot(h3.bx-v9.bx,h3.bz-v9.bz)<.00001,"M70 PB-H3 and PB-V9 must meet at I3");
assert.ok(Math.abs(h3.bz-6.12504)<.001,"M70 I3 must register to same world Z as the projected GF beam candidates");
assert.ok(m.elements.some(e=>e.id==="SC-I4"),"DXF I4 column must remain present");
assert.ok(!m.elements.some(e=>e.id==="SC-I3"),"Do not invent an I3 column");
assert.throws(()=>bridgeM70Plinth({...m,projectId:"WRONG"},m70Stage,m70Meta),/project ID mismatch/);
const tamperedStage=structuredClone(m70Stage);tamperedStage.spatial_db.grid.x_mm.I+=50;
assert.throws(()=>bridgeM70Plinth(m,tamperedStage,m70Meta),/registration >1mm/);
assert.deepEqual(m.counts,{"column":23,"footing":21,"beam":32,"architectural-line":74},
 "Original DXF geometry must remain unmodified by separate plinth-stage bridge");
assert.equal(m.beamEndpointReview.beamCount,32);
assert.equal(m.beamEndpointReview.endpoints,64);
assert.equal(m.beamEndpointReview.toleranceM,.5);
assert.equal(m.beamEndpointReview.withinTolerance,54);
assert.equal(m.beamEndpointReview.beyondTolerance,10);
assert.equal(m.beamEndpointReview.reviewStatus,"ENGINEERING_HOLD_NOT_A_BEAM_SUPPORT_GRAPH");
assert.ok(m.beamEndpointReview.details.every(e=>e.status==="POTENTIAL_PROXIMITY_ONLY_SUPPORT_NOT_VERIFIED"));
const beamAuditById=m.beamEndpointReview.details.filter(x=>x.beamId==="SB-GF-001");
assert.equal(beamAuditById.length,2);
assert.ok(beamAuditById.every(v=>v.withinDisplayTolerance));

assert.equal(m.productionApproved,false);
// Cursor reference points come from the original member candidates, not an AI grid.
const proposed=findProjectedBeamCrossing(m.elements,"SB-GF-018","SB-GF-020");
const columnI4=m.elements.find(e=>e.id==="SC-I4");
assert.ok(columnI4);
assert.ok(Math.abs(proposed.x-21.000162)<.000002);
assert.ok(Math.abs(proposed.z-6.12504)<.000002);
assert.equal(proposed.onBothOriginalSegments,false);
assert.equal(proposed.withinReviewExtensionLimit,true);
assert.ok(Math.abs(proposed.extensionA_m-.131909)<.000002);
assert.ok(Math.abs(proposed.extensionB_m-.131909)<.000002);
assert.ok(Math.abs(Math.hypot(columnI4.x-proposed.x,columnI4.z-proposed.z)-.655)<.000002);
assert.match(proposed.status,/NOT_VERIFIED/);
const originalI4={x:columnI4.x,z:columnI4.z};
const nativeProposal=worldXZToNativeStructuralMM(m.registration,proposed);
assert.ok(Math.abs(nativeProposal.x-777005.039)<.002);
assert.ok(Math.abs(nativeProposal.y+123108.74)<.002);
assert.deepEqual({x:columnI4.x,z:columnI4.z},originalI4,"Marker logic must not move source columns");
assert.ok(nearestSourceElements(m.elements,proposed,8).some(x=>x.elementId==="SC-I4"));
assert.throws(()=>findProjectedBeamCrossing(m.elements,"SB-GF-018","INVALID"),/Two distinct/);
assert.throws(()=>worldXZToNativeStructuralMM(m.registration,{x:NaN,z:0}),/Finite world/);
assert.equal(m.registration.rotationDeg,0);
assert.equal(m.registration.scale,1);
assert.equal(m.sourceAuthority.structural.sha256,"55a4b9828f569ece9c78063a60d56484c71e13563d9e73faf76a701bc182d1cf");
assert.equal(m.sourceAuthority.architectural.sha256,"077e7b4ffd5ce3c5c9789f9d040ef32ee661175aedd5f2d1059dbbe18176e124");
const get=id=>m.elements.find(e=>e.id===id);
const g1=get("SF-ACE9E"),g1col=get("SC-G1"),g3=get("SC-G3");
assert.ok(g1&&g1col&&g3);
assert.equal(g1.dx,1.8);assert.equal(g1.dz,1.8);
assert.equal(g1.conflict,true);assert.equal(g1.type,"IF3");
assert.deepEqual(g1.columnIds,["SC-G1"]);
assert.ok(m.issues.some(i=>i.code==="G1_FOOTING_DIMENSION_CONFLICT"&&i.scheduledM[0]===2.1));
assert.ok(m.issues.some(i=>i.code==="G3_OFFSET_REVIEW"&&i.decision.includes("NO_SNAPPING")));
assert.equal(g1col.source.entityHandle,"AEB80");
// Source points are independently rounded to the nearest 0.001 mm when transformed.
assert.ok(Math.abs(g1col.x-g1.x)<=.000002&&Math.abs(g1col.z-g1.z)<=.000002,
 "G1 native column and footing centres differ by more than 0.002 mm");
assert.equal(get("SF-AD0BC").columnIds.length,2);
assert.equal(get("SF-AD0BE").columnIds.length,2);
assert.equal(m.elements.filter(e=>e.kind==="footing"&&e.type==="CF1").length,2);
assert.ok(m.elements.filter(e=>e.kind==="beam").every(e=>e.width===.23&&e.source.entityHandles.length===2));
assert.ok(m.elements.filter(e=>e.kind==="architectural-line").every(e=>/^AW(P)?-[A-F0-9]+(?:-[0-9]+)?$/.test(e.id)));
assert.equal(input.architecturePolylines.length,12);
assert.equal(m.elements.filter(e=>e.id.startsWith("AWP-")).length,42);
const native=get("SC-D7").source.sourceMM,tran=input.registration.structuralToArchitecturalMM,org=input.registration.originArchitecturalMM;
assert.ok(Math.abs(get("SC-D7").x-(native[0]+tran.dx-org.x)/1000)<.000001);
assert.ok(Math.abs(get("SC-D7").z-(org.y-native[1]-tran.dy)/1000)<.000001);
const canonicalAgain=createSourceGroundFloorReview(JSON.parse(raw));
assert.deepEqual(m,canonicalAgain,"Source geometry assembly must be deterministic");
const tampered=structuredClone(input);tampered.footings[0][7]="SC-INVALID";
assert.throws(()=>createSourceGroundFloorReview(tampered),/references unknown/);
const swapped=structuredClone(input);
swapped.beams[0][2]=NaN;
assert.throws(()=>createSourceGroundFloorReview(swapped),/Invalid structX/);
const tamperedConflict=structuredClone(input);tamperedConflict.footings.find(x=>x[0]==="SF-ACE9E")[8]=0;
assert.throws(()=>createSourceGroundFloorReview(tamperedConflict),/Footing source-conflict count mismatch/);
for(const path of ["cad/aad/source-review/index.html","cad/aad/source-review/main.js",
  "public/projects/narayani-parajuli/aad-source-review/index.html"]){
 assert.ok(fs.statSync(path).size>100);
}
console.log("AAD_NARAYANI_SOURCE_GROUND_FLOOR_PREVIEW_PASS",JSON.stringify({
 project:m.projectId,counts:m.counts,bounds:m.bounds,stage:m.stage,
 ledgerSha256:crypto.createHash("sha256").update(raw).digest("hex"),
 exceptions:m.issues.map(i=>i.code),unchangedOldModel:"NOT_REPLACED"
}));
