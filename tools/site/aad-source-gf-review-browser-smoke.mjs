/* Browser regression: actual 2D SVG + real THREE mesh + source register.
 * Browser test applies to preview and publicly marked SOURCE REVIEW builds.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const url=process.env.AAD_SOURCE_REVIEW_URL;
if(!url)throw Error("Set AAD_SOURCE_REVIEW_URL to the built project launcher");
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1510,height:1020},deviceScaleFactor:1});
 page.on("pageerror",e=>{console.error("Source preview browser pageerror",e.message);});
 await page.goto(url,{waitUntil:"networkidle",timeout:60000});
 await page.waitForFunction(()=>Boolean(window.AADSourceReview?.getSnapshot),{timeout:60000});
 const first=await page.evaluate(()=>{
  const a=window.AADSourceReview.getSnapshot();
  return{schema:a.schema,counts:a.counts,rendered:a.elements.length,issues:a.issues.map(x=>x.code),
   proof:window.AADSourceReview.getViewCoordinateProof("SC-G1")};
 });
 assert.equal(first.schema,"jp-cad://aad-source-gf-assembly/1");
 assert.deepEqual(first.counts,{"column":23,"footing":21,"beam":32,"architectural-line":74});
 assert.ok(first.proof.plan&&first.proof.mesh&&first.proof.table,"Structural column needs 2D/3D/table views");
 for(const frame of ["plan","mesh","table"]){
  for(const axis of ["x","z"]){
   assert.ok(Math.abs(first.proof.source[axis]-first.proof[frame][axis])<
    (frame==="table"?.0006:1e-6),frame+" "+axis+" diverges from registered source");
  }
 }
 await page.locator('#rows tr[data-id="SF-ACE9E"]').click();
 assert.match(await page.locator("#selected").innerText(),/G1 CRITICAL/);
 assert.match(await page.locator("#selected").innerText(),/1.8 × 1.8/);
 assert.match(await page.locator("#selected").innerText(),/2.1 × 2.1/);
 assert.equal(await page.locator('#rows tr[data-id="SF-ACE9E"].selected').count(),1);
 await page.locator("#filter").selectOption("column");
 assert.equal(await page.locator("#rows tr").count(),23);
 await page.locator("#filter").selectOption("footing");
 assert.equal(await page.locator("#rows tr").count(),21);
 await page.locator("#filter").selectOption("beam");
 assert.equal(await page.locator("#rows tr").count(),32);
 await page.locator('#rows tr[data-id="SB-GF-003"]').click();
 assert.match(await page.locator("#selected").innerText(),/Endpoint A: nearest column candidate/);
 assert.match(await page.locator("#selected").innerText(),/NO — REVIEW/);
 assert.match(await page.locator("#issues").innerText(),/10 \/ 64/);
 await page.locator("#filter").selectOption("architectural-line");
 assert.equal(await page.locator("#rows tr").count(),74);
 await page.locator("#filter").selectOption("all");
 await page.locator('#plan [data-id="SC-G3"]').click();
 assert.match(await page.locator("#selected").innerText(),/SC-G3/);
 assert.equal(await page.locator('#plan [data-id="SC-G3"]').count(),1);
 assert.equal(await page.locator('#rows tr[data-id="SC-G3"].selected').count(),1);
 await page.evaluate(()=>window.AADSourceReview.selectById("SF-ACE9E"));
 await page.screenshot({path:"/tmp/aad-narayani-source-gf-review.png",fullPage:true});
 console.log("AAD_SOURCE_GROUND_FLOOR_BROWSER_PASS",JSON.stringify({counts:first.counts,
  g1ConflictVisible:true,columnParityVerified:true,sourceMode:"BRANCH_QA_ONLY"}));
}finally{await browser.close();}
