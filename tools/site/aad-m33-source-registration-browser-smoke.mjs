// M33 actual primary CAD studio readback: GF source drawing registration is
// inspectable and cannot modify the shared 2D/3D/IFC canonical model.
import assert from "node:assert/strict";
import {chromium} from "playwright";
const url=process.env.AAD_M33_PROJECT_URL;
if(!url)throw Error("Missing AAD_M33_PROJECT_URL");
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
try{
 const page=await browser.newPage({viewport:{width:1460,height:1050}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"networkidle",timeout:75000});
 const app=page.frameLocator("#aad-unified-engine");
 await app.locator("#viewer3d canvas").waitFor({timeout:60000});
 await app.locator("#aad-m33-source").waitFor({state:"visible",timeout:30000});
 const evidence=await page.locator("#aad-unified-engine").evaluate(iframe=>
  iframe.contentWindow.AADStudio.getM33SourceEvidence());
 assert.equal(evidence.schema,"jp-cad://aad-m33-gf-drawing-frame-column-proximity/1");
 assert.equal(evidence.calibratedTranslationXMetres,-762.364891);
 assert.equal(evidence.heldOutControlResidualMaxMm,.853);
 assert.equal(evidence.endpointsWithin250mm,29);
 assert.equal(evidence.bothEndsNearby,12);
 assert.equal(evidence.unmatchedEndpointStripCount,5);
 assert.equal(evidence.GFColumnReferenceCount,23);
 assert.equal(evidence.verifiedBeamSupportConnections,0);
 assert.equal(evidence.upperFloorColumnControls,0);
 assert.equal(evidence.constructionApproved,false);
 await app.locator("#aad-m32-floor").selectOption("gf");
 assert.equal(await app.locator("#aad-m32-plot line[data-native-strip-id]").count(),17);
 assert.equal(await app.locator("#aad-m32-plot circle[data-gf-source-column]").count(),23);
 assert.equal(await app.locator('#aad-m32-plot circle[data-gf-source-column="I3"]').count(),1);
 await app.locator("#aad-m32-plot line").first().click({force:true});
 assert.match(await app.locator("#aad-m32-picked").innerText(),/A1 \(201 mm, near GF column\)/);
 assert.match(await app.locator("#aad-m32-picked").innerText(),/C1 \(199 mm, near GF column\)/);
 await app.locator("#aad-m32-plot line").nth(2).click({force:true});
 assert.match(await app.locator("#aad-m32-picked").innerText(),/NO nearby GF column/);
 await app.locator("#aad-m32-floor").selectOption("ff");
 assert.equal(await app.locator("#aad-m32-plot circle[data-gf-source-column]").count(),0);
 await app.locator("#aad-m32-plot line").first().click({force:true});
 assert.match(await app.locator("#aad-m32-picked").innerText(),/FF\/SF actual supports NOT VERIFIED/);
 const state=await page.locator("#aad-unified-engine").evaluate(iframe=>
  iframe.contentWindow.AADStudio.getSnapshot().assembly);
 assert.deepEqual([state.counts.column,state.counts.footing,state.counts.beam],[23,21,16]);
 assert.equal(state.elements.filter(e=>["ff","sf"].includes(e.level)&&
  ["column","beam","footing"].includes(e.kind)).length,0);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:"/tmp/aad-m33-source-column-drawing-frame-proximity.png"});
 console.log("AAD_M33_LIVE_GF_DXF_COLUMN_SOURCE_REGISTRATION_NO_SUPPORT_PROMOTION_PASS",
  JSON.stringify({translation:evidence.calibratedTranslationXMetres,
  witnessMaxMM:.853,endsNearColumns:29,bothEndsNear:12,unmatched:5,
  gfSourceColumns:23,actualGFMembers:[23,21,16],engineeredBeamsAdded:0}));
}finally{await browser.close();}
