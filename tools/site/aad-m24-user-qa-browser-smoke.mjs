/* M24 user-submitted Narayani decisions: linked viewer and HOLD invariants. */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const url=process.env.AAD_M24_QA_URL;
if(!url)throw Error("Set AAD_M24_QA_URL");
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"networkidle",timeout:60000});
 await page.waitForFunction(()=>window.AADSourceReview?.getUserQAPreview?.()?.columns?.length===23,
  {timeout:60000});
 assert.equal(errors.length,0,"Browser page errors: "+errors.join(" | "));
 const m=await page.evaluate(()=>window.AADSourceReview.getSnapshot());
 const qa=await page.evaluate(()=>window.AADSourceReview.getUserQAPreview());
 assert.equal(qa.status,"ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION");
 assert.equal(qa.userMessageApproval.status,
  "USER_APPROVED_WORKING_QA_PROPOSAL_FOR_FURTHER_REVIEW_AND_DEVELOPMENT");
 assert.equal(qa.userMessageApproval.engineeringApprovalVerified,false);
 assert.ok(qa.discrepancies.some(x=>x.code==="USER_MESSAGE_APPROVAL_RECORDED"));
 assert.match(await page.locator("#issues").innerText(),/M25 USER CHAT APPROVAL RECORDED/);
 assert.match(await page.locator("#issues").innerText(),/Engineering design checks remain OPEN/);
 assert.equal(qa.columns.length,23);
 assert.equal(qa.footings.length,21);
 assert.equal(qa.counts.governingM70BeamRuns,16);
 assert.ok(qa.columns.some(e=>e.id==="QA-SC-I3"&&e.grid==="I3"));
 assert.ok(!qa.columns.some(e=>e.grid==="I4"));
 assert.equal(await page.locator('#plan [data-id="QA-SC-I3"]').count(),1);
 assert.equal(await page.locator('#plan [data-id="QA-SF-ACE9E"]').count(),1);
 assert.equal(await page.locator('#plan [data-id="M60-C4-I4"]').count(),0);
 assert.equal(await page.locator('.toolbar input[value="qa-column"]').isChecked(),true);
 assert.equal(await page.locator('.toolbar input[value="qa-footing"]').isChecked(),true);
 assert.equal(await page.locator('.toolbar input[value="stage-column"]').isChecked(),false);
 assert.equal(await page.locator('.toolbar input[value="stage-footing"]').isChecked(),false);
 const proof=await page.evaluate(()=>window.AADSourceReview.getViewCoordinateProof("QA-SC-I3"));
 assert.ok(proof.plan&&proof.mesh&&proof.table);
 for(const frame of ["plan","mesh","table"])for(const axis of ["x","z"])
  assert.ok(Math.abs(proof.source[axis]-proof[frame][axis])<
    (frame==="table"?.0006:1e-6),frame+"/"+axis+" parity");
 await page.locator("#filter").selectOption("qa-column");
 assert.equal(await page.locator("#rows tr").count(),23);
 await page.locator('#rows tr[data-id="QA-SC-I3"]').click();
 assert.match(await page.locator("#selected").innerText(),/USER_PROPOSED_RELOCATION_655MM/);
 await page.locator("#filter").selectOption("qa-footing");
 assert.equal(await page.locator("#rows tr").count(),21);
 await page.locator('#rows tr[data-id="QA-SF-ACE9E"]').click();
 assert.match(await page.locator("#selected").innerText(),/extra excavation\/formwork working space/);
 assert.match(await page.locator("#selected").innerText(),/1.8 × 1.8 m/);
 await page.locator("#filter").selectOption("all");
 await page.locator('.toolbar input[value="stage-column"]').check();
 assert.equal(await page.locator('#plan [data-id="M60-C4-I4"]').count(),1);
 assert.equal(await page.locator('#plan [data-id="QA-SC-I3"]').count(),1);
 await page.locator('.toolbar input[value="stage-column"]').uncheck();
 await page.screenshot({path:"/tmp/aad-narayani-m24-user-qa-browser.png",fullPage:true});
 assert.equal(errors.length,0,"Browser errors during interaction: "+errors.join(" | "));
 console.log("AAD_M24_USER_QA_BROWSER_PASS",JSON.stringify({
  counts:qa.counts,i3:qa.columns.find(e=>e.grid==="I3"),
  previewMode:"qa=user-reviewed",sourceCount:m.elements.length,
  blockers:qa.discrepancies.map(x=>x.code)
 }));
}finally{await browser.close();}
