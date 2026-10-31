// M32 real browser: source-native tracing exists but never enters structural BIM/IFC.
import assert from "node:assert/strict";
import {chromium} from "playwright";
const url=process.env.AAD_M32_PROJECT_URL;
if(!url)throw Error("AAD_M32_PROJECT_URL missing");
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
try{
 const page=await browser.newPage({viewport:{width:1536,height:1100}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"networkidle",timeout:75000});
 const app=page.frameLocator("#aad-unified-engine");
 await app.locator("#viewer3d canvas").waitFor({timeout:65000});
 await app.locator("#aad-m32-source").waitFor({state:"visible",timeout:35000});
 const e=await page.locator("#aad-unified-engine").evaluate(iframe=>
  iframe.contentWindow.AADStudio.getM32SourceEvidence());
 assert.equal(e.schema,"jp-cad://aad-m32-native-beam-strip-register/1");
 assert.equal(e.count,51);assert.equal(e.sourceHandleCount,102);
 assert.equal(e.commonAxes,17);
 assert.deepEqual(e.floorCounts,{gf:17,ff:17,sf:17});
 assert.equal(e.IFCMembersAdded,0);
 assert.equal(e.constructionApproval,false);
 assert.equal(await app.locator("#aad-m32-plot line[data-native-strip-id]").count(),17);
 await app.locator("#aad-m32-floor").selectOption("ff");
 assert.equal(await app.locator("#aad-m32-plot line").count(),17);
 assert.equal(await app.locator("#aad-m32-plot line").first().getAttribute("data-native-handles"),"B017E,B017F");
 await app.locator("#aad-m32-plot line").first().click({force:true});
 assert.match(await app.locator("#aad-m32-picked").innerText(),/B017E.*B017F/);
 assert.match(await app.locator("#aad-m32-picked").innerText(),/NOT AN IFC BEAM/);
 await app.locator("#aad-m32-floor").selectOption("sf");
 assert.equal(await app.locator("#aad-m32-plot line").first().getAttribute("data-native-handles"),"B057D,B057E");
 assert.equal(await app.locator("#aad-m32-plot line").count(),17);
 const href=await app.locator("#aad-m32-archive-link").getAttribute("href");
 assert.match(href,/1DMPF-RiOVDldGKjl4CHq8q0GPb8ZmaTp/);
 const state=await page.locator("#aad-unified-engine").evaluate(iframe=>
  iframe.contentWindow.AADStudio.getSnapshot().assembly);
 assert.deepEqual([state.counts.column,state.counts.footing,state.counts.beam],[23,21,16]);
 assert.equal(state.elements.filter(x=>["ff","sf"].includes(x.level)&&
  ["beam","column","footing"].includes(x.kind)).length,0);
 assert.equal(errors.length,0,errors.join(" | "));
 await page.screenshot({path:"/tmp/aad-m32-native-source-strip-inspector.png"});
 console.log("AAD_M32_LIVE_NATIVE_STRIP_SOURCE_VIEWER_IFC_GUARD_PASS",
  JSON.stringify({sourceStripCandidates:51,originalDXFHandles:102,
   commonSourceAxes:17,actualGF:[23,21,16],upperFloorIFCMembersAdded:0,
   independentlyValidatedBeamMembers:0,constructionApproval:false}));
}finally{await browser.close();}
