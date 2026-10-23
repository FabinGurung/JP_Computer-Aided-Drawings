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
 // World-coordinate HUDs must be derived from the actual on-screen transforms,
 // not hard-coded fixed CSS pixel positions or synthetic screen-to-world mapping.
 const projected=await page.evaluate(()=>window.AADSourceReview.getProjectedCrossing());
 assert.equal(projected.onBothOriginalSegments,false);
 assert.ok(Math.abs(projected.extensionA_m-.131909)<.000002);
 assert.ok(Math.abs(projected.extensionB_m-.131909)<.000002);
 await page.locator("#pin-crossing").click();
 const projectedPin=await page.evaluate(()=>window.AADSourceReview.getPinnedPoint());
 assert.equal(projectedPin.method,"PROJECTED_BEAM_CROSSLINES");
 assert.ok(Math.abs(projectedPin.x-projected.x)<.000001);
 assert.ok(Math.abs(projectedPin.z-projected.z)<.000001);
 assert.match(await page.locator("#pin-proposal").innerText(),/SC-I4 source centre is 0.655 m away/);
 assert.match(await page.locator("#pin-proposal").innerText(),/do NOT physically intersect/);
 assert.match(await page.locator("#pin-details").innerText(),/Structural DXF native/);
 assert.equal(await page.locator('#plan [data-pinned-coordinate="true"]').count(),1);
 assert.ok((await page.locator("#pin-copy-text").inputValue()).includes("SC-I4"));
 // Point-to-pixel via SVG CTM must still agree after CSS responsive scaling.
 const viewPoint=await page.evaluate(()=>{
  const svg=document.querySelector("#plan"),p=svg.createSVGPoint();
  const crossing=window.AADSourceReview.getProjectedCrossing();
  p.x=crossing.x;p.y=crossing.z;
  const screen=p.matrixTransform(svg.getScreenCTM());
  return{x:screen.x,y:screen.y};
 });
 await page.mouse.move(viewPoint.x,viewPoint.y);
 assert.match(await page.locator("#cursor2d").innerText(),/X 21.000 · Z 6.125 m/);
 await page.mouse.click(viewPoint.x,viewPoint.y);
 const tapPin=await page.evaluate(()=>window.AADSourceReview.getPinnedPoint());
 assert.equal(tapPin.method,"2D_TAP");
 assert.ok(Math.hypot(tapPin.x-projected.x,tapPin.z-projected.z)<.003);
 await page.locator("#model3d canvas").scrollIntoViewIfNeeded();
 const bounds=await page.locator("#model3d canvas").boundingBox();
 assert.ok(bounds?.width>100&&bounds?.height>100);
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
 assert.match(await page.locator("#cursor3d").innerText(),/3D X -?\\d+\\.\\d{3} · Z -?\\d+\\.\\d{3} m/);
 await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
 assert.equal((await page.evaluate(()=>window.AADSourceReview.getPinnedPoint())).method,"3D_GROUND_TAP");
 await page.locator("#pin-clear").click();
 assert.equal(await page.evaluate(()=>window.AADSourceReview.getPinnedPoint()),null);
 await page.locator("#pin-crossing").click();
 assert.equal(await page.locator("#pin-copy").isDisabled(),false);
 assert.match(await page.locator("#pin-copy-text").inputValue(),/PROJECTED_BEAM_CROSSLINES/);
 // Original source position is immutable even after interactive proposed pins.
 const sourceI4=await page.evaluate(()=>window.AADSourceReview.getSnapshot().elements.find(e=>e.id==="SC-I4"));
 assert.ok(Math.abs(sourceI4.x-projected.x)<.001);
 assert.ok(Math.abs(sourceI4.z-projected.z)>.6);
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
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,
  hasTouch:true,isMobile:true});
 try{
  await mobile.goto(url,{waitUntil:"networkidle",timeout:60000});
  await mobile.waitForFunction(()=>Boolean(window.AADSourceReview?.getPinnedPoint),{timeout:60000});
  await mobile.locator("#pin-crossing").click();
  assert.equal((await mobile.evaluate(()=>window.AADSourceReview.getPinnedPoint())).method,"PROJECTED_BEAM_CROSSLINES");
  const p=await mobile.evaluate(()=>{
   const svg=document.getElementById("plan"),crossing=window.AADSourceReview.getProjectedCrossing();
   const point=svg.createSVGPoint();point.x=crossing.x;point.y=crossing.z;
   const q=point.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};
  });
  await mobile.touchscreen.tap(p.x,p.y);
  const pinnedTouch=await mobile.evaluate(()=>window.AADSourceReview.getPinnedPoint());
  assert.equal(pinnedTouch.method,"2D_TAP");
  assert.ok(Math.hypot(pinnedTouch.x-projected.x,pinnedTouch.z-projected.z)<.01);
  await mobile.locator("#model3d canvas").scrollIntoViewIfNeeded();
  const mr=await mobile.locator("#model3d canvas").boundingBox();
  await mobile.touchscreen.tap(mr.x+mr.width/2,mr.y+mr.height/2);
  assert.equal((await mobile.evaluate(()=>window.AADSourceReview.getPinnedPoint())).method,"3D_GROUND_TAP");
 }finally{await mobile.close();}
 console.log("AAD_SOURCE_GROUND_FLOOR_BROWSER_PASS",JSON.stringify({counts:first.counts,
  g1ConflictVisible:true,columnParityVerified:true,sourceMode:"BRANCH_QA_ONLY"}));
}finally{await browser.close();}
