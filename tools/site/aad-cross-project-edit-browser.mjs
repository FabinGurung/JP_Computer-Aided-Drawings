/** Project workspace link and local request history: all currently listed projects. */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const root=process.env.CAD_SITE_URL||"http://127.0.0.1:5191/JP_Computer-Aided-Drawings/"; // staging preview; production passes CAD_SITE_URL explicitly
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});
async function open(page,slug){
 const url=new URL("projects/"+slug+"/",root);
 const res=await page.goto(url.href,{waitUntil:"domcontentloaded",timeout:70000});
 assert(res?.ok(),"Missing workspace "+slug);
 await page.locator("#pw-edit-readiness").waitFor({state:"attached",timeout:30000});
 return url;
}
try{
 const page=await browser.newPage({viewport:{width:1400,height:900},acceptDownloads:true});
 const admitted={
  "ashok-adhikari":"/data/projects/ashok-adhikari/aad-building-v3-2-review.json",
  "narayani-parajuli":"/data/projects/narayani-parajuli/aad-building-v1.json"
 };
 for(const [slug,suffix] of Object.entries(admitted)){
  await open(page,slug);
  const link=page.locator("#pw-edit-direct");
  assert.equal(await link.isVisible(),true,slug+" should expose the same shared editor");
  const href=await link.getAttribute("href"),url=new URL(href);
  assert(url.pathname.endsWith("/cad/aad/multistorey/"),"Must use one shared viewer");
  assert(url.searchParams.get("manifest").endsWith(suffix),"Wrong source model for "+slug);
  assert.equal(url.searchParams.get("workspace"),"standard");
  if(slug==="narayani-parajuli")assert.equal(url.searchParams.get("structure"),"source-review");
  assert.equal(await page.locator("#pw-request-status").textContent().then(s=>s.includes("0 local request(s)")),true);
 }
 await open(page,"ashok-adhikari");
 await page.locator("#pw-edition").selectOption("v3-grid");
 await page.waitForFunction(()=>document.getElementById("pw-edit-direct")?.href?.includes("aad-building-v3-grid-review"));
 assert(new URL(await page.locator("#pw-edit-direct").getAttribute("href")).searchParams.get("manifest").endsWith("aad-building-v3-grid-review.json"),
 "Changing Ashok edition must retarget the model, not mix earlier client editions");
 const readOnly=["harisharan-adhikari","ramachandra-devkota","example-empty"];
 for(const slug of readOnly){
  await open(page,slug);
  assert.equal(await page.locator("#pw-edit-direct").isVisible(),false,"Source-only project must not claim live editable model: "+slug);
  assert.match(await page.locator("#pw-edit-readiness").textContent(),/SOURCE REVIEW HOLD/);
  await page.locator("#pw-edit-request-open").click();
  assert.equal(await page.locator("#pw-change-request").evaluate(node=>node.open),true);
  await page.locator("#pw-request-type").selectOption("request-remove");
  await page.locator("#pw-request-object").fill("WALL-REF-17");
  await page.locator("#pw-request-note").fill("Please verify this wall against source drawings and review proposed removal.");
  await page.locator("#pw-request-record").click();
  const b=await page.evaluate(()=>window.ProjectWorkspace.getChangeRequests());
  assert.equal(b.schema,"jp-cad://aad-project-change-requests/1");
  assert.equal(b.projectSlug,slug);
  assert.equal(b.requests.length,1);
  assert.equal(b.requests[0].applied,false);
  assert.equal(b.sourceManifestPath,null);
  assert.equal(b.requests[0].status,"REVIEW_REQUIRED_NOT_APPLIED");
  assert.match(await page.locator("#pw-request-export-preview").inputValue(),/CAD_AAD_PROJECT_CHANGE_REQUEST_HANDOVER_V1/);
  const download=page.waitForEvent("download",{timeout:10000});
  await page.locator("#pw-request-export").click();
  const result=await download;
  assert(result.suggestedFilename().startsWith(slug+"_"),"Wrong project export");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#pw-request-list li").first().waitFor({state:"attached",timeout:30000});
  assert.equal(await page.locator("#pw-request-list li").count(),1,"Request log should persist across reload");
 }
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await open(mobile,"narayani-parajuli");
 assert.equal(await mobile.locator("#pw-edit-request-open").count(),1);
 await mobile.locator("#pw-edit-request-open").tap();
 assert.equal(await mobile.locator("#pw-change-request").evaluate(n=>n.open),true);
 console.log("AAD_PROJECT_WIDE_EDIT_ROUTE_PASS",JSON.stringify({admitted:Object.keys(admitted),sourceOnly:readOnly,editionRebinding:true,requestExport:true,mobile:true}));
}finally{await browser.close();}
