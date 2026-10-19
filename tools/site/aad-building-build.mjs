import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {assembleBuilding,verifyAssembly} from "../../public/assets/js/aad-building-core.mjs";
import {writeIFC4,checkIfcReferences} from "../../public/assets/js/aad-building-ifc4.mjs";

const source="public/data/projects/narayani-parajuli",out=process.env.CAD_BIM_OUT||"dist/data/projects/narayani-parajuli";
const manifest=JSON.parse(fs.readFileSync(path.join(source,"aad-building-v1.json"),"utf8"));
const models=Object.fromEntries(manifest.levels.map(l=>[l.id,JSON.parse(fs.readFileSync(path.join(source,l.model),"utf8"))]));
const building=assembleBuilding(manifest,models);
const check=verifyAssembly(building);
assert.equal(building.schema,"jp-cad://aad-building-assembly/1");
assert.equal(building.levels.length,3);
assert.ok(check.valid,"Building topology must have no fatal errors: "+JSON.stringify(check.errors));
assert.ok(Math.abs(check.areaDeviation)<.01,"Unreconciled three floor plate areas");
assert.equal(building.counts.wall,68);
assert.equal(building.counts.door,20);
assert.equal(building.counts.window,23);
assert.equal(building.counts["space-label"],36);
assert.equal(building.counts.slab,3);
assert.equal(building.counts.roof,1);
assert.equal(building.counts.stair,4);
assert.equal(building.counts.landing,2);
assert.ok(building.counts.column>=20,"Conceptual support grid missing");
assert.ok(building.counts.beam>=30,"Conceptual beam grid missing");
assert.equal(building.diagnostics.filter(d=>d.code==="UNSUPPORTED_COLUMN").length,0);
const ifc=writeIFC4(building),checked=checkIfcReferences(ifc.text);
assert.ok(checked.lines>400,"IFC missing object and relationship graph: "+checked.lines);
assert.equal(ifc.counts.IfcWall,68);
assert.equal(ifc.counts.IfcDoor,20);
assert.equal(ifc.counts.IfcWindow,23);
assert.equal(ifc.counts.IfcStairFlight,4);
assert.equal(checked.counts.IFCBUILDINGSTOREY,3);
assert.equal(checked.counts.IFCRELFILLSELEMENT,43);
assert.equal(checked.counts.IFCRELVOIDSELEMENT,43);
assert.equal(checked.counts.IFCRELCONTAINEDINSPATIALSTRUCTURE,3);
assert.equal(checked.counts.IFCRELAGGREGATES,3);
assert.ok(checked.counts.IFCARBITRARYPROFILEDEFWITHVOIDS>=2,"Upper floor slabs require stairwell voids");
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,ifc.filename),ifc.text,"utf8");
fs.writeFileSync(path.join(out,"NARAYANI_BLOCK_B_AAD_BIM_A01.json"),JSON.stringify(building,null,2)+"\n","utf8");
const report={projectId:building.projectId,revision:manifest.revision,sourceArea_m2:building.area.source,
 modeledArea_m2:building.area.model,delta_m2:check.areaDeviation,levels:building.levels,
 counts:building.counts,ifcCounts:ifc.counts,ifcStepEntities:checked.lines,ifcFile:ifc.filename,
 authored_qa_warnings:check.assumptions,stage:"CONCEPTUAL_ASSEMBLY_ENGINEERING_HOLD",independentIfcRoundTrip:"TO_BE_ATTESTED_BY_IFCOPENSHELL_CI"};
fs.writeFileSync(path.join(out,"NARAYANI_BLOCK_B_AAD_BIM_A01_QA.json"),JSON.stringify(report,null,2)+"\n","utf8");
textPrint({counts:building.counts,ifcCounts:ifc.counts,entities:checked.lines,areaDelta:check.areaDeviation,out});
function textPrint(value){console.log("AAD_MULTISTOREY_STEP_SYNTACTIC_PASS",JSON.stringify(value));}
