/* Source-native Narayani GF candidate acceptance (no original DXF reshipping).
 * This checks source ledger identity & deterministic registration, NOT engineering.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {createSourceGroundFloorReview} from "../../public/assets/js/aad-source-ground-floor.mjs";
const file="public/data/projects/narayani-parajuli/aad-source-gf-review-v1.json";
const raw=fs.readFileSync(file,"utf8"),input=JSON.parse(raw);
const m=createSourceGroundFloorReview(input);
assert.equal(m.schema,"jp-cad://aad-source-gf-assembly/1");
assert.equal(m.projectId,"PRJ-000007");
assert.deepEqual(m.counts,{"column":23,"footing":21,"beam":32,"architectural-line":32});
assert.equal(m.stage,"ENGINEERING_HOLD");
assert.equal(m.productionApproved,false);
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
assert.ok(Math.abs(g1col.x-g1.x)<.000001&&Math.abs(g1col.z-g1.z)<.000001);
assert.equal(get("SF-AD0BC").columnIds.length,2);
assert.equal(get("SF-AD0BE").columnIds.length,2);
assert.equal(m.elements.filter(e=>e.kind==="footing"&&e.type==="CF1").length,2);
assert.ok(m.elements.filter(e=>e.kind==="beam").every(e=>e.width===.23&&e.source.entityHandles.length===2));
assert.ok(m.elements.filter(e=>e.kind==="architectural-line").every(e=>/^AW-[A-F0-9]+$/.test(e.id)));
const native=get("SC-D7").source.sourceMM,tran=input.registration.structuralToArchitecturalMM,org=input.registration.originArchitecturalMM;
assert.ok(Math.abs(get("SC-D7").x-(native[0]+tran.dx-org.x)/1000)<.000001);
assert.ok(Math.abs(get("SC-D7").z-(org.y-native[1]-tran.dy)/1000)<.000001);
const canonicalAgain=createSourceGroundFloorReview(JSON.parse(raw));
assert.deepEqual(m,canonicalAgain,"Source geometry assembly must be deterministic");
const tampered=structuredClone(input);tampered.footings[0][7]="SC-INVALID";
assert.throws(()=>createSourceGroundFloorReview(tampered),/references unknown/);
const tamperedConflict=structuredClone(input);tamperedConflict.footings.find(x=>x[0]==="SF-ACE9E")[8]=0;
assert.throws(()=>createSourceGroundFloorReview(tamperedConflict),/G1 conflict must remain explicit/);
for(const path of ["cad/aad/source-review/index.html","cad/aad/source-review/main.js",
  "public/projects/narayani-parajuli/aad-source-review/index.html"]){
 assert.ok(fs.statSync(path).size>100);
}
console.log("AAD_NARAYANI_SOURCE_GROUND_FLOOR_PREVIEW_PASS",JSON.stringify({
 project:m.projectId,counts:m.counts,bounds:m.bounds,stage:m.stage,
 ledgerSha256:crypto.createHash("sha256").update(raw).digest("hex"),
 exceptions:m.issues.map(i=>i.code),unchangedOldModel:"NOT_REPLACED"
}));
