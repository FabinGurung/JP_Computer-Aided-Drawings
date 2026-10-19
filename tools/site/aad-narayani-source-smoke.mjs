/** AAD source/project acceptance. No client-specific geometry in shared engine tests. */
import fs from "node:fs";
import vm from "node:vm";
import zlib from "node:zlib";
import assert from "node:assert/strict";
const base="public/projects/narayani-parajuli/aad/";
const doc=fs.readFileSync(base+"index.html","utf8");
const hub=fs.readFileSync("public/projects/narayani-parajuli/index.html","utf8");
const studio=fs.readFileSync("cad/aad/main.ts","utf8");
const viewer=fs.readFileSync("public/assets/js/aad-project-viewer.js","utf8");
assert.match(hub,/href="\.\/aad\/"/);
assert.match(doc,/aad-source-v1\.js/);
assert.match(doc,/aad-project-viewer\.js/);
assert.match(doc,/aad-ground-floor-model\.json/);
assert.match(studio,/openHostedProject/);
assert.match(viewer,/DecompressionStream\("gzip"\)/);
const context={window:{}};
vm.runInNewContext(fs.readFileSync("public/data/projects/narayani-parajuli/aad-source-v1.js","utf8"),context);
const pkg=context.window.AAD_PROJECT_PACKAGE;
assert.equal(pkg.projectId,"PRJ-000007");
const expected={gf:[205.16,264,52,73],ff:[200.67,340,54,75],sf:[175.62,275,53,71]};
for(const [key,values] of Object.entries(expected)){
 const source=pkg.floors[key];
 assert.ok(source?.gzip, "Missing "+key);
 const data=JSON.parse(zlib.gunzipSync(Buffer.from(source.gzip,"base64")).toString("utf8"));
 assert.equal(data.area,values[0]);
 assert.equal(data.lines.length,values[1]);
 assert.equal(data.annotations.length,values[2]);
 assert.equal(data.dimensions.length,values[3]);
 assert.ok(data.annotations.some(row=>/PLAN|BEDROOM|COMMERCIAL/i.test(row[2])),key+" needs room or plan labels");
 assert.ok(data.dimensions.every(row=>/^\d/.test(String(row[2]))),"Numeric source dimension absent");
}
const model=JSON.parse(fs.readFileSync("public/data/projects/narayani-parajuli/aad-ground-floor-model.json","utf8"));
assert.equal(model.schema,"jp-cad://linked-one-bay-demo/0.5");
assert.equal(model.floorGraph.perimeter.length,10);
assert.ok(model.projectNote.includes("233.62"));
console.log("AAD_NARAYANI_SOURCE_PROJECT_PASS");
