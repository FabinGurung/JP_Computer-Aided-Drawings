/* Production browser acceptance of a brand-new project created by AI-to-AAD CLI.
 * Tests the real shared studio, not a static image or duplicated custom engine.
 */
import {chromium} from "playwright";
import assert from "node:assert/strict";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1480,height:1000},acceptDownloads:true});
const errors=[];page.on("pageerror",e=>errors.push(e.message));
try{
 const url=process.env.AAD_AI_DEMO_URL||"http://127.0.0.1:5191/JP_Computer-Aided-Drawings/projects/aad-ai-demo/aad/";
 await page.goto(url,{waitUntil:"networkidle",timeout:70000});
 assert.equal(await page.locator("#aad-unified-engine").count(),1);
 assert.equal(await page.locator("iframe").count(),1,"AI generated project must use exactly one shared template");
 assert.match(await page.title(),/Synthetic Two-Storey Residence/);
 const viewer=page.frameLocator("#aad-unified-engine");
 await viewer.locator("#viewer2d .aad-wall").first().waitFor({state:"attached",timeout:35000});
 await viewer.locator("#viewer3d canvas").waitFor({timeout:35000});
 await viewer.locator("#action-status").filter({hasText:"Shared AAD building assembly ready"}).waitFor({timeout:30000});
 assert.equal(await viewer.locator("#aad-storey option").count(),3); // both storeys + ALL
 assert.match(await viewer.locator("#building-name").innerText(),/Synthetic Two-Storey Residence/);
 assert.match(await viewer.locator("#quantities").innerText(),/door/i);
 const stat=await viewer.locator("#aad-room-summary").innerText();
 assert.match(stat,/4 bounded room-face candidates/);
 assert.ok(await viewer.locator("#elements tr").count()>20);
 await viewer.locator("#aad-storey").selectOption("gf");
 assert.match(await viewer.locator("#aad-plan-level").innerText(),/Ground floor/);
 const wall=viewer.locator('[data-element-id="AAD-DEMO-001:gf:EXT-01"]');
 await wall.click();
 assert.equal(await wall.getAttribute("aria-selected"),"true");
 assert.equal(await viewer.locator("#viewer3d canvas").getAttribute("data-selected-element-id"),"AAD-DEMO-001:gf:EXT-01");
 assert.equal(await viewer.locator("#viewer2d .aad-wall.is-selected").count(),1);
 const canvas=await viewer.locator("#viewer3d canvas").boundingBox();
 assert.ok(canvas?.width>300&&canvas?.height>200);
 const dl=page.waitForEvent("download",{timeout:12000});
 await viewer.locator("#download-ifc").click();
 const download=await dl;
 assert.match(download.suggestedFilename(),/AAD-DEMO-001_AAD_CONCEPTUAL_2STOREY_IFC4\.ifc/);
 await page.screenshot({path:"/tmp/cad-aad-ai-new-project.png",fullPage:false});
 if(errors.length)throw Error("Browser exceptions: "+errors.join("; "));
 console.log("AAD_AI_NEW_PROJECT_BROWSER_PASS",JSON.stringify({title:await page.title(),rooms:4,storeys:2,ifc:download.suggestedFilename()}));
}finally{await page.close();await browser.close();}
