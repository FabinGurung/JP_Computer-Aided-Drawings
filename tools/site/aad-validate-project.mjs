/* Generic AAD project model validator; no Narayani-specific paths.
 * Usage: node tools/site/aad-validate-project.mjs public/data/projects/<slug>/aad-building-v1.json
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {assembleBuilding,verifyAssembly} from "../../public/assets/js/aad-building-core.mjs";
import {writeIFC4,checkIfcReferences} from "../../public/assets/js/aad-building-ifc4.mjs";
import {evaluateAADProjectCodeEvidence} from '../../public/assets/js/aad-project-code-evidence.mjs';
const filename=process.argv[2];
if(!filename||process.argv.length!==3)throw Error("Expected one project-owned aad-building-v1.json pathname");
const source=path.resolve(filename),stat=fs.statSync(source);
if(!stat.isFile()||stat.size>250000)throw Error("Invalid or oversized AAD manifest");
const manifest=JSON.parse(fs.readFileSync(source,"utf8"));
const registryPath=path.resolve('public/data/codes/nepal-pokhara.json');
const codeEvidence=evaluateAADProjectCodeEvidence(manifest,fs.existsSync(registryPath)?JSON.parse(fs.readFileSync(registryPath)):null);
assert.equal(manifest.schema,"jp-cad://aad-building/1");
const floorDir=path.dirname(source),models={};
for(const level of manifest.levels){
 const modelPath=path.resolve(floorDir,level.model);
 if(path.dirname(modelPath)!==floorDir)throw Error("Floor model must stay in same project data directory");
 if(fs.statSync(modelPath).size>2000000)throw Error("Oversized AAD floor model "+level.id);
 models[level.id]=JSON.parse(fs.readFileSync(modelPath,"utf8"));
}
const building=assembleBuilding(manifest,models),check=verifyAssembly(building);
assert.ok(check.valid,"Fatal floor/structural topology diagnostics: "+JSON.stringify(check.errors));
const ifc=writeIFC4(building),step=checkIfcReferences(ifc.text);
assert.ok(step.lines>200,"Expected spatial/physical IFC graph");
assert.equal(step.counts.IFCBUILDINGSTOREY,manifest.levels.length);
assert.equal(step.counts.IFCRELVOIDSELEMENT,building.counts.door+building.counts.window);
assert.equal(step.counts.IFCRELFILLSELEMENT,building.counts.door+building.counts.window);
console.log("AAD_TEMPLATE_PROJECT_VALIDATION_PASS",JSON.stringify({
 projectId:manifest.projectId,levels:building.levels.length,counts:building.counts,
 areaDeviation_m2:check.areaDeviation,ifcEntities:step.lines,warnings:check.assumptions.length,
 status:"CONCEPTUAL_BIM_ENGINEERING_HOLD",codeEvidenceStatus:codeEvidence.status
}));
