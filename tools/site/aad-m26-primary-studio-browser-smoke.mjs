import assert from "node:assert/strict";
import {chromium} from "playwright";
import fs from "node:fs";
const url=process.env.AAD_M26_PROJECT_URL;
if(!url)throw Error("Set AAD_M26_PROJECT_URL");
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1020},acceptDownloads:true});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"networkidle",timeout:75000});
 assert.equal(await page.locator("#aad-unified-engine").count(),1);
 const editor=page.frameLocator("#aad-unified-engine");
 await editor.locator("#viewer3d canvas").waitFor({timeout:40000});
 await editor.locator("#action-status").filter({hasText:"M26 source-backed structural GF"}).waitFor({timeout:40000});
 const core=await page.locator("#aad-unified-engine").evaluate(frame=>{
  const win=frame.contentWindow,studio=win.AADStudio;
  return{caps:studio.getCapabilities(),assembly:studio.getSnapshot().assembly,
   selectedSource:["PRJ-000007:gf:QA-COL:I3","PRJ-000007:gf:QA-BEAM:PB-H3","PRJ-000007:gf:QA-FOOT:QA-SF-ACE9E"]};
 });
 assert.equal(core.assembly.counts.column,23);
 assert.equal(core.assembly.counts.footing,21);
 assert.equal(core.assembly.counts.beam,16);
 assert.ok(core.assembly.sourceStructuralReview);
 assert.equal(core.caps.sourceReviewedStructure,true);
 assert.ok(core.assembly.diagnostics.some(x=>x.code==="I3_CF1_G1_STILL_UNRESOLVED"));
 assert.equal(core.assembly.elements.filter(x=>x.kind==="column"&&x.level==="ff").length,0);
 assert.ok(!core.assembly.elements.some(e=>e.id.includes(":COL:G1-1")));
 assert.ok(core.assembly.elements.some(e=>e.id==="PRJ-000007:gf:QA-COL:I3"));
 const select=[
  core.assembly.elements.find(e=>e.id==="PRJ-000007:gf:QA-COL:I3"),
  core.assembly.elements.find(e=>e.kind==="beam"&&e.provenance?.sourceId==="PB-H3"),
  core.assembly.elements.find(e=>e.kind==="footing"&&e.provenance?.grid==="G1")
 ];
 assert.ok(select.every(Boolean),"M26 source members missing");
 await editor.locator("#aad-storey").selectOption("gf");
 for(const member of select){
  const proof=await page.locator("#aad-unified-engine").evaluate((frame,id)=>
   frame.contentWindow.AADStudio.getViewCoordinateProof(id),member.id);
  assert.ok(proof.plan&&proof.mesh&&proof.table,"Missing linked plan/mesh/table "+member.id);
  for(const axis of ["x","z"]){
   assert.ok(Math.abs(proof.model[axis]-proof.plan[axis])<.00001,"Plan "+axis+" mismatch "+member.id);
   assert.ok(Math.abs(proof.model[axis]-proof.mesh[axis])<.00001,"3D "+axis+" mismatch "+member.id);
   assert.ok(Math.abs(proof.model[axis]-proof.table[axis])<.0006,"Table "+axis+" mismatch "+member.id);
  }
 }
 assert.equal(await editor.locator("#viewer2d .aad-source-beam").count(),16);
 assert.equal(await editor.locator("#viewer2d .aad-source-footing").count(),21);
 assert.equal(await editor.locator("#viewer2d .aad-column").count(),23);
 const download=page.waitForEvent("download",{timeout:20000});
 await editor.locator("#download-ifc").click();
 const d=await download;const p="/tmp/aad-m26-source-structural.ifc";await d.saveAs(p);
 const ifc=fs.readFileSync(p,"utf8");
 assert.equal((ifc.match(/=IFCFOOTING\(/g)||[]).length,21);
 assert.equal((ifc.match(/=IFCCOLUMN\(/g)||[]).length,23);
 assert.equal((ifc.match(/=IFCBEAM\(/g)||[]).length,16);
 await page.screenshot({path:"/tmp/aad-m26-main-studio-source-structural.png",fullPage:false});
 assert.equal(errors.length,0,"Browser errors: "+errors.join(" | "));
 console.log("AAD_M26_PRIMARY_AAD_SOURCE_INTEGRATION_BROWSER_PASS",JSON.stringify({
  counts:{columns:23,footings:21,beams:16},coreShared:true,ifcFootings:21,
  holdWarnings:core.assembly.diagnostics.filter(x=>x.severity==="WARNING").map(x=>x.code)
 }));
}finally{await browser.close();}
