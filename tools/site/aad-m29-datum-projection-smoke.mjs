// M29: attest computed source DXF edge audit, projection and frozen structural counts.
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadAADReviewedStructure} from "../../public/assets/js/aad-reviewed-structural-intake.mjs";
import {deriveM29DatumEvidence} from "../../public/assets/js/aad-m29-source-datum.mjs";
import {assembleBuilding} from "../../public/assets/js/aad-building-core.mjs";
const dir="public/data/projects/narayani-parajuli/";
const read=n=>JSON.parse(fs.readFileSync(dir+n,"utf8"));
const manifest=read("aad-building-v1.json"),ledger=read("aad-source-gf-review-v1.json"),
 control=read("aad-m29-datum-upper-projection-20261027.json");
const models=Object.fromEntries(manifest.levels.map(l=>[l.id,read(l.model)]));
const root=new URL("https://example.test/JP_Computer-Aided-Drawings/data/projects/narayani-parajuli/aad-building-v1.json");
const review=await loadAADReviewedStructure(manifest,root,async url=>
 JSON.parse(fs.readFileSync("public/"+url.pathname.slice("/JP_Computer-Aided-Drawings/".length),"utf8")));
const ev=deriveM29DatumEvidence(ledger,manifest,models,review);
assert.equal(ev.schema,"jp-cad://aad-m29-partial-dxf-datum-projection/1");
assert.equal(ev.sourceSegments.length,control.sourceEdgeEvidence.edgeSegments);
assert.equal(ev.summary.sourceLineCount,control.sourceEdgeEvidence.lineEntities);
assert.equal(ev.summary.sourcePolylineCount,control.sourceEdgeEvidence.sourcePolylines);
assert.equal(ev.summary.sourcePolylineEdges,control.sourceEdgeEvidence.polylineEdgeSegments);
assert.equal(ev.summary.modeledGFWallCenterlines,control.sourceEdgeEvidence.modeledGFWallCenterlines);
const expected=control.sourceEdgeEvidence.nearestWallCentrelineMidpointDistanceM;
for(const k of ["min","p50","p90","max"])
 assert.ok(Math.abs(ev.summary.nearestWallMidpointDistanceM[k]-expected[k])<.000002,k+" source-distance drift");
for(const k of ["within150mm","within300mm","over1m"])
 assert.equal(ev.summary.nearestWallMidpointDistanceM[k],expected[k]);
for(const p of control.upperStoreyProjection){
 const computed=ev.upperFloorProjections.find(x=>x.level===p.level);
 assert.ok(computed);assert.equal(computed.projectedCount,23);
 assert.equal(computed.withinFootprint,p.inside);assert.equal(computed.outsideFootprint,p.outside);
 assert.deepEqual(computed.elements.filter(x=>x.insideArchitecturalEnvelope).map(x=>x.grid),p.gridsWithin);
}
assert.equal(control.constructionApproval,false);
assert.equal(control.noUpperStructureInvented,true);
assert.equal(manifest.structuralReview.datumEvidence,"aad-m29-datum-upper-projection-20261027.json");
const building=assembleBuilding(manifest,models,{reviewStructure:review});
assert.deepEqual([building.counts.column,building.counts.footing,building.counts.beam],[23,21,16]);
assert.ok(!building.elements.some(e=>(e.level==="ff"||e.level==="sf")&&
 (e.kind==="column"||e.kind==="beam"||e.kind==="footing")));
console.log("AAD_M29_SOURCE_EDGE_DATUM_AND_UPPER_PROJECTION_AUDIT_PASS",
 JSON.stringify({summary:ev.summary,originalStructuralCounts:[23,21,16],
 upperFloorStructuralMembersInvented:false,notSurveyRegistration:true}));
