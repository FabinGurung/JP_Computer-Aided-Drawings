/* M26 structural source -> ONE AAD building model acceptance.
 * Does not modify M60/M40/V03/M70 or original DXF, never asserts engineering approval.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadAADReviewedStructure} from "../../public/assets/js/aad-reviewed-structural-intake.mjs";
import {createAADWorkspace} from "../../public/assets/js/aad-unified-workspace.mjs";
import {assembleBuilding,verifyAssembly} from "../../public/assets/js/aad-building-core.mjs";
import {writeIFC4,checkIfcReferences} from "../../public/assets/js/aad-building-ifc4.mjs";
import {buildAADComponentGroups} from "../../public/assets/js/aad-component-register.mjs";

const project="public/data/projects/narayani-parajuli/";
const parse=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const manifest=parse(project+"aad-building-v1.json");
const models=Object.fromEntries(manifest.levels.map(l=>[l.id,parse(project+l.model)]));
const root=new URL("https://example.test/JP_Computer-Aided-Drawings/data/projects/narayani-parajuli/aad-building-v1.json");
const loads=[];
const review=await loadAADReviewedStructure(manifest,root,async url=>{
 assert.equal(url.origin,"https://example.test");
 assert.ok(url.pathname.startsWith("/JP_Computer-Aided-Drawings/"));
 const path="public/"+url.pathname.slice("/JP_Computer-Aided-Drawings/".length);
 loads.push(path);return parse(path);
});
assert.equal(review.elements.length,60);
assert.equal(review.elements.filter(e=>e.kind==="column").length,23);
assert.equal(review.elements.filter(e=>e.kind==="beam").length,16);
assert.equal(review.elements.filter(e=>e.kind==="footing").length,21);
assert.equal(review.reviewStatus,"ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION");
assert.ok(review.approvalEventId);
assert.ok(review.notes.some(t=>t.includes("upper-storey")));
const col=review.elements.find(e=>e.kind==="column"&&e.provenance.grid==="I3");
assert.ok(col&&col.provenance.section==="Ø350"&&col.profile.length===36);
assert.equal(review.elements.filter(e=>e.kind==="column"&&e.provenance.grid==="I4").length,0);
const g1=review.elements.find(e=>e.kind==="footing"&&e.provenance.grid==="G1");
assert.deepEqual([g1.dx,g1.dz],[1.8,1.8]);
assert.equal(g1.provenance.stageComparison.dx,2.1);
assert.equal(g1.provenance.excavationWorkingArea.actualExcavationSizeM,null);
const model=assembleBuilding(manifest,models,{reviewStructure:review});
assert.equal(model.sourceStructuralReview.scope,"GF_ONLY_SOURCE_PREVIEW");
assert.equal(model.counts.column,23);
assert.equal(model.counts.footing,21);
assert.equal(model.counts.beam,16);
assert.equal(model.diagnostics.some(d=>d.code==="STRUCTURAL_GRID_PROVENANCE_REVIEW"),false);
assert.equal(model.diagnostics.some(d=>d.code==="NO_UPPER_FLOOR_STRUCTURAL_SOURCE"),true);
assert.ok(model.elements.every(e=>!/:gf:COL:G[0-9]+-[0-9]+$/.test(e.id)&&!e.id.includes(":BEAM-X:")&&!e.id.includes(":BEAM-Z:")));
assert.ok(verifyAssembly(model).valid);
const register=buildAADComponentGroups(model,{level:"gf",discipline:"Structure"});
const sourced=register.groups.flatMap(g=>g.disciplines.flatMap(d=>d.types.flatMap(t=>t.items)))
 .filter(e=>["column","footing","beam"].includes(e.kind)&&e.previewOnly);
assert.equal(sourced.length,60,"Exactly 23+21+16 source structural elements in grouped register");
assert.ok(register.matching>=60,"Sourced structure must coexist with legitimate slab and landing members");
const ifc=writeIFC4(model);
checkIfcReferences(ifc.text);
assert.equal(ifc.counts.IfcColumn,23);
assert.equal(ifc.counts.IfcBeam,16);
assert.equal(ifc.counts.IfcFooting,21);
assert.match(ifc.text,/IFCFOOTING\(/);
assert.match(ifc.note,/Engineering HOLD/);
const workspace=createAADWorkspace(manifest,models,{reviewStructure:review});
const before=workspace.snapshot().assembly;
assert.equal(before.counts.column,23);
const width=workspace.snapshot().models.gf.floorGraph.walls[0].thickness;
workspace.change("gf",{kind:"wall",id:models.gf.floorGraph.walls[0].id},{thickness:width+.01});
assert.equal(workspace.snapshot().assembly.counts.column,23);
workspace.reset();
assert.equal(workspace.snapshot().assembly.counts.beam,16);
assert.throws(()=>assembleBuilding(manifest,models,{reviewStructure:{...review,projectId:"WRONG"}}),/unverified structural review data/);
assert.equal(loads.length,13); // M26 sources + append-only M28 owner verification
assert.equal(review.ownerVerificationEventId,"PRJ-000007-M28-USER-VERIFICATION-20261027");
console.log("AAD_M26_CANONICAL_SOURCE_INTEGRATION_PASS",JSON.stringify({
 loadedSourceFiles:loads,counts:model.counts,ifcCounts:ifc.counts,qaWarnings:model.diagnostics.length,
 activeMode:model.sourceStructuralReview.scope,
 unknowns:review.notes,approvalEventId:review.approvalEventId
}));
