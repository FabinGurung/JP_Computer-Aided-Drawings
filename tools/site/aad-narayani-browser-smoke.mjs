import {chromium} from "playwright";
import assert from "node:assert/strict";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1460,height:940}});
const errors=[];page.on("pageerror",e=>errors.push(e.message));
try{
 const url=process.env.AAD_PROJECT_URL||"http://127.0.0.1:5175/projects/narayani-parajuli/aad/";
 await page.goto(url,{waitUntil:"networkidle",timeout:60000});
 if(!await page.locator('[data-floor="gf"]').count())throw Error("Narayani project route missing floor controls: "+await page.title()+" URL="+page.url()+" body="+(await page.locator("body").innerText()).slice(0,230));
 for(const [key,area,count] of [["gf","205.16 m²","73 measured dimension objects"],["ff","200.67 m²","75 measured dimension objects"],["sf","175.62 m²","71 measured dimension objects"],["footing","Not tabulated","14 measured dimension objects"],["beam_gf","Not tabulated","11 measured dimension objects"]]){
  await page.locator('[data-floor="'+key+'"]').click();
  await page.waitForFunction(expected=>document.querySelector("#aad-area")?.textContent===expected,area,{timeout:15000});
  assert.equal(await page.locator("#aad-dim-count").innerText(),count);
  assert.ok((await page.locator("#aad-source-svg path").count())>=1,key+" missing plotted DXF layer vectors");
 }
 const screenshotPath="/tmp/cad-aad-narayani-dxf.png";
 await page.screenshot({path:screenshotPath,fullPage:true});
 await page.locator("#aad-tab-3d").click();
 const frame=page.frameLocator("#aad-engine");
 await frame.locator("#plan [data-part]").first().waitFor({timeout:25000});
 const note=await frame.locator("#message").innerText();
 if(!note.includes("Loaded hosted project draft"))throw Error("Narayani hosted 3D model was not imported: "+note);
 if(errors.length)throw Error("Browser exceptions: "+errors.join("; "));
 console.log("AAD_NARAYANI_BROWSER_VIEW_PASS");
}finally{await page.close();await browser.close();}
