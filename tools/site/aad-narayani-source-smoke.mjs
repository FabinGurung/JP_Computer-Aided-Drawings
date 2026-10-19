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
vm.runInNewContext(fs.readFileSync("public/data/projects/narayani-parajuli/aad-structure-v1.js","utf8"),context);
const pkg=context.window.AAD_PROJECT_PACKAGE;
assert.equal(pkg.projectId,"PRJ-000007");
const expected={gf:[205.16,264,52,73],ff:[200.67,340,54,75],sf:[175.62,275,53,71],footing:[null,66,78,14],beam_gf:[null,45,44,11]};
for(const [key,values] of Object.entries(expected)){
 const source=pkg.floors[key];
 assert.ok(source?.gzip, "Missing "+key);
 const data=JSON.parse(zlib.gunzipSync(Buffer.from(source.gzip,"base64")).toString("utf8"));
 assert.equal(data.area,values[0]);
 assert.equal(data.lines.length,values[1]);
 assert.equal(data.annotations.length,values[2]);
 assert.equal(data.dimensions.length,values[3]);
 assert.ok(data.annotations.length>0,key+" should retain source annotation objects");
 assert.ok(data.dimensions.every(row=>/^\d/.test(String(row[2]))),"Numeric source dimension absent");
}
const manifest=JSON.parse(fs.readFileSync("public/data/projects/narayani-parajuli/MODEL_QA_MANIFEST_v2.json","utf8"));
assert.equal(manifest.schema,"jp-cad://project-aad-qa-manifest/2.0");
const expectedAreas={gf:205.16,ff:200.67,sf:175.62};
let combined=0;
for(const [level,official] of Object.entries(expectedAreas)){
 const f=manifest.levels.find(e=>e.id===level);
 assert.ok(f,"Missing model in project manifest: "+level);
 const model=JSON.parse(fs.readFileSync("public/data/projects/narayani-parajuli/"+f.file,"utf8"));
 assert.equal(model.schema,"jp-cad://linked-one-bay-demo/0.5");
 assert.equal(model.height,3);
 assert.equal(model.bed,false);
 const g=model.floorGraph;
 assert.ok(g.perimeter.length>=10);
 assert.ok(g.walls.length>g.perimeter.length);
 assert.ok(g.openings.length>5);
 assert.ok(Object.keys(g.labels).length>=6);
 const nodes=new Map(g.nodes.map(x=>[x.id,x]));
 const edges=new Map(g.walls.map(x=>[x.id,x]));
 let sum=0;
 const start=edges.get(g.perimeter[0]).a;
 let current=start;
 for(const id of g.perimeter){
  const w=edges.get(id);
  assert.ok(w);
  const first=nodes.get(current);
  assert.ok(first);
  let next=w.a===current?w.b:w.b===current?w.a:null;
  assert.ok(next,"Unconnected perimeter "+id);
  const other=nodes.get(next);
  sum+=first.x*other.z-other.x*first.z;
  current=next;
 }
 assert.equal(current,start);
 const area=Math.abs(sum)/2;
 assert.ok(Math.abs(area-official)<.01,level+" area discrepancy "+area+" versus "+official);
 assert.ok(/assum|infer|user.authorized|AI\s/i.test(model.projectNote),level+" provenance must identify source/assumed decisions");
 combined+=area;
}
assert.ok(Math.abs(combined-581.45)<.015);
assert.match(doc,/data-model="ff"/);
assert.match(doc,/data-model="sf"/);
assert.match(doc,/MODEL_QA_MANIFEST_v2.json/);
console.log("AAD_NARAYANI_SOURCE_PROJECT_PASS");
