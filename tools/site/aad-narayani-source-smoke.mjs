/* Source acceptance for Narayani project adapter and historical DXF evidence.
 * Presentation uses ONE shared AAD multistorey editor, not two embedded apps.
 */
import fs from "node:fs";
import vm from "node:vm";
import zlib from "node:zlib";
import assert from "node:assert/strict";
const page=fs.readFileSync("public/projects/narayani-parajuli/aad/index.html","utf8");
const hub=fs.readFileSync("public/projects/narayani-parajuli/index.html","utf8");
assert.match(hub,/href="\.\/aad\/"/);
assert.equal((page.match(/<iframe\b/g)||[]).length,1);
assert.match(page,/id="aad-unified-engine"/);
assert.match(page,/aad-building-v1.json/);
assert.doesNotMatch(page,/aad-multistorey-engine/);
assert.doesNotMatch(page,/id="aad-engine"/);
assert.match(page,/MODEL_QA_MANIFEST_v2.json/);
const template=fs.readFileSync("cad/aad/multistorey/index.html","utf8");
for(const id of ["viewer2d","viewer3d","aad-storey","aad-view-mode","aad-save-working","aad-import-working","aad-apply-edit","elements"])
 assert.ok(template.includes('id="'+id+'"'),"Missing shared editor widget "+id);
const context={window:{}};
for(const file of ["aad-source-v1.js","aad-structure-v1.js"])
 vm.runInNewContext(fs.readFileSync("public/data/projects/narayani-parajuli/"+file,"utf8"),context);
const pkg=context.window.AAD_PROJECT_PACKAGE;
assert.equal(pkg.projectId,"PRJ-000007");
const expected={gf:[205.16,264,52,73],ff:[200.67,340,54,75],sf:[175.62,275,53,71],footing:[null,66,78,14],beam_gf:[null,45,44,11]};
for(const [floor,values] of Object.entries(expected)){
 const data=JSON.parse(zlib.gunzipSync(Buffer.from(pkg.floors[floor].gzip,"base64")).toString("utf8"));
 assert.deepEqual([data.area,data.lines.length,data.annotations.length,data.dimensions.length],values,floor+" original DXF source mismatch");
}
const manifest=JSON.parse(fs.readFileSync("public/data/projects/narayani-parajuli/aad-building-v1.json","utf8"));
assert.equal(manifest.schema,"jp-cad://aad-building/1");
assert.deepEqual(manifest.levels.map(x=>x.id),["gf","ff","sf"]);
let counts={wall:0,door:0,window:0,space:0};
for(const level of manifest.levels){
 const model=JSON.parse(fs.readFileSync("public/data/projects/narayani-parajuli/"+level.model,"utf8"));
 counts.wall+=model.floorGraph.walls.length;
 counts.door+=model.floorGraph.openings.filter(x=>x.kind==="door").length;
 counts.window+=model.floorGraph.openings.filter(x=>x.kind==="window").length;
 counts.space+=Object.keys(model.floorGraph.labels).length;
}
assert.deepEqual(counts,{wall:68,door:20,window:23,space:36});
console.log("AAD_NARAYANI_SOURCE_PROJECT_PASS");
