import assert from "node:assert/strict";
import {chromium} from "playwright";
const url=process.env.AAD_M34_PROJECT_URL;
if(!url)throw Error("Missing AAD_M34_PROJECT_URL");
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
try{
 const page=await browser.newPage({viewport:{width:1490,height:1000}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"networkidle",timeout:75000});
 const app=page.frameLocator("#aad-unified-engine");
 await app.locator("#viewer3d canvas").waitFor({timeout:60000});
 await app.locator("#aad-m34-source").waitFor({state:"visible",timeout:35000});
 const e=await page.locator("#aad-unified-engine").evaluate(x=>
  x.contentWindow.AADStudio.getM34OwnerSourceClarification());
 assert.equal(e.schema,"jp-cad://aad-m34-owner-geometry-reconciliation/1");
 assert.equal(e.G2Interpretation,"DRAWN_BEAM_LINES_MEET_NOT_NEW_G2_COLUMN");
 assert.equal(e.c6f6Interpretation,"RECTIFY_WORKING_REFERENCE_ONLY_ORTHOGONAL_C6_F6_TO_016");
 assert.equal(e.originalSlopedEdgeDegrees,.471038);
 assert.equal(e.horizontalCenterlineHandle,"AFB3C");
 assert.equal(e.perpendicularCenterlineHandle,"AFB5C");
 assert.equal(e.newG2ColumnsAdded,false);
 assert.equal(e.structuralUpperIFCMembersAdded,0);
 assert.equal(e.constructionApproved,false);
 await app.locator("#aad-m32-floor").selectOption("gf");
 assert.equal(await app.locator('#aad-m32-plot line[data-native-strip-id]').count(),17);
 assert.equal(await app.locator('#aad-m32-plot circle[data-gf-source-column]').count(),23);
 assert.equal(await app.locator('#aad-m32-plot line[data-owner-orthogonal]').count(),2);
 assert.equal(await app.locator('#aad-m32-plot line[data-owner-source-handle]').count(),2);
 assert.equal(await app.locator('#aad-m32-plot circle[data-owner-g2-beam-junction]').count(),1);
 const orth=await app.locator('#aad-m32-plot line[data-owner-orthogonal="c6-f6"]').first().evaluate(el=>
  [el.getAttribute("y1"),el.getAttribute("y2")]);
 assert.deepEqual(orth,["118.83374","118.83374"]);
 await app.locator("#aad-m34-overlay").uncheck();
 assert.equal(await app.locator('#aad-m32-plot line[data-owner-orthogonal]').count(),0);
 assert.equal(await app.locator('#aad-m32-plot line[data-native-strip-id]').count(),17);
 await app.locator("#aad-m34-overlay").check();
 await app.locator("#aad-m32-floor").selectOption("ff");
 assert.equal(await app.locator('#aad-m32-plot line[data-owner-orthogonal]').count(),0);
 assert.equal(await app.locator('#aad-m32-plot circle[data-gf-source-column]').count(),0);
 const building=await page.locator("#aad-unified-engine").evaluate(x=>
  x.contentWindow.AADStudio.getSnapshot().assembly);
 assert.deepEqual([building.counts.column,building.counts.footing,building.counts.beam],[23,21,16]);
 assert.equal(building.elements.filter(x=>["ff","sf"].includes(x.level)&&
  ["column","beam","footing"].includes(x.kind)).length,0);
 assert.deepEqual(errors,[]);
 await app.locator("#aad-m32-floor").selectOption("gf");
 await page.screenshot({path:"/tmp/aad-m34-owner-g2-c6f6-orthogonal-source-review.png"});
 console.log("AAD_M34_LIVE_OWNER_ORTHOGONAL_REVIEW_OVERLAY_NONDESTRUCTIVE_PASS",
  JSON.stringify({GFNativeCandidateStrips:17,GFColumns:23,derivedIntendedAxes:2,
  originalAngledEdgesPreserved:2,noNewG2Column:true,canonicalGF:[23,21,16],newUpperIFC:0,constructionApproved:false}));
}finally{await browser.close();}
