// M29 acceptance in the actual primary Narayani shared AAD studio.
// Ghost FF/SF projections and native DXF edge overlays must never become IFC members.
import assert from "node:assert/strict";
import {chromium} from "playwright";
const url=process.env.AAD_M29_PROJECT_URL;
if(!url)throw Error("Missing AAD_M29_PROJECT_URL");
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
try{
 const page=await browser.newPage({viewport:{width:1540,height:1100}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"networkidle",timeout:75000});
 const app=page.frameLocator("#aad-unified-engine");
 await app.locator("#viewer3d canvas").waitFor({timeout:60000});
 await app.locator("#aad-m29-controls").waitFor({state:"visible",timeout:30000});
 const evidence=await page.locator("#aad-unified-engine").evaluate(iframe=>
  iframe.contentWindow.AADStudio.getM29DatumEvidence());
 assert.equal(evidence.schema,"jp-cad://aad-m29-partial-dxf-datum-projection/1");
 assert.equal(evidence.sourceEdgeCount,74);
 assert.equal(evidence.summary.modeledGFWallCenterlines,24);
 assert.equal(evidence.summary.nearestWallMidpointDistanceM.within300mm,13);
 assert.equal(evidence.summary.nearestWallMidpointDistanceM.p50,0.36396);
 assert.deepEqual(evidence.upperProjectionCounts.map(x=>[x.level,x.inside,x.outside]),
  [["ff",11,12],["sf",9,14]]);
 await app.locator("#aad-storey").selectOption("gf");
 assert.equal(await app.locator("#viewer2d .aad-m29-original-dxf-edge").count(),0);
 await app.locator("#aad-m29-source-toggle").check();
 assert.equal(await app.locator("#viewer2d .aad-m29-original-dxf-edge").count(),74);
 assert.equal(await app.locator("#viewer2d .aad-source-beam").count(),16);
 assert.equal(await app.locator("#viewer2d .aad-source-footing").count(),21);
 await app.locator("#aad-m29-projection-toggle").check();
 await app.locator("#aad-storey").selectOption("ff");
 assert.equal(await app.locator("#viewer2d .aad-m29-upper-projection").count(),23);
 assert.equal(await app.locator('#viewer2d .aad-m29-upper-projection[data-inside-envelope="true"]').count(),11);
 assert.equal(await app.locator("#viewer2d .aad-m29-original-dxf-edge").count(),0);
 assert.equal(await app.locator("#viewer2d .aad-column").count(),0,"Ghost projections must not be actual FF columns");
 await app.locator("#aad-storey").selectOption("sf");
 assert.equal(await app.locator("#viewer2d .aad-m29-upper-projection").count(),23);
 assert.equal(await app.locator('#viewer2d .aad-m29-upper-projection[data-inside-envelope="true"]').count(),9);
 const state=await page.locator("#aad-unified-engine").evaluate(iframe=>
  iframe.contentWindow.AADStudio.getSnapshot().assembly);
 assert.deepEqual([state.counts.column,state.counts.footing,state.counts.beam],[23,21,16]);
 assert.equal(state.elements.filter(e=>["ff","sf"].includes(e.level)&&
  ["column","beam","footing"].includes(e.kind)).length,0);
 assert.ok(state.diagnostics.some(d=>d.code==="NO_UPPER_FLOOR_STRUCTURAL_SOURCE"));
 assert.equal(errors.length,0,"Browser exception: "+errors.join(" | "));
 await page.screenshot({path:"/tmp/aad-m29-dxf-datum-and-upper-floor-evidence.png",fullPage:false});
 console.log("AAD_M29_PRIMARY_STUDIO_DXF_EDGE_AND_UPPER_PROJECTION_BROWSER_PASS",
  JSON.stringify({sourceEdges:74,GFSourceStructural:[23,21,16],FFInside:11,SFInside:9,
    nonStructuralGhosts:23,sourceUnchanged:true,modelShared:true}));
}finally{await browser.close();}
