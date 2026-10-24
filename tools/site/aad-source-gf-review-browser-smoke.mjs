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
   proof:window.AADSourceReview.getViewCoordinateProof("M60-C3-G1")};
 });
 assert.equal(first.schema,"jp-cad://aad-source-gf-assembly/1");
 const governed=await page.evaluate(()=>window.AADSourceReview.getGovernedStages());
 assert.ok(governed);
 assert.equal(governed.rules.groundFloorBeam,"M70_FROZEN_PLINTH_NETWORK_SUPREME");
 assert.deepEqual(governed.mismatches.m60Only,["C4","E2","E4","G4","H4"]);
 assert.deepEqual(governed.mismatches.dxfOnly,["C3","F2","F3","G3","H3"]);
 assert.ok(governed.footings.some(x=>x.id==="FDN-IF3-G1"&&x.dx===2.1&&x.conflict));
 assert.ok(governed.columns.some(x=>x.grid==="I4"&&x.section==="Ø350"));
 assert.ok(!governed.columns.some(x=>x.grid==="I3"));
 assert.equal(await page.locator('.toolbar input[value="stage-column"]').isChecked(),true);
 assert.equal(await page.locator('.toolbar input[value="stage-footing"]').isChecked(),true);
 assert.equal(await page.locator('.toolbar input[value="column"]').isChecked(),false);
 assert.equal(await page.locator('.toolbar input[value="footing"]').isChecked(),false);
 assert.equal(await page.locator('#plan [data-id="M60-C4-I4"]').count(),1);
 assert.equal(await page.locator('#plan [data-id="FDN-IF3-G1"]').count(),1);
 for(const id of ["M60-C4-I4","FDN-IF3-G1"]){
  const proof=await page.evaluate(id=>window.AADSourceReview.getViewCoordinateProof(id),id);
  assert.ok(proof.plan&&proof.mesh&&proof.table);
  for(const frame of ["plan","mesh","table"])for(const axis of ["x","z"])
   assert.ok(Math.abs(proof.source[axis]-proof[frame][axis])<(frame==="table"?.0006:1e-6));
 }
 assert.deepEqual(first.counts,{"column":23,"footing":21,"beam":32,"architectural-line":74,"plinth-beam":16,"stage-column":23,"stage-footing":21});
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
 await page.locator("#plan").scrollIntoViewIfNeeded();
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
 const pickError=Math.hypot(tapPin.x-projected.x,tapPin.z-projected.z);
 console.log("SOURCE_COORDINATE_PICK_DIAGNOSTIC",JSON.stringify({viewPoint,projected,tapPin,pickError,
  readout:await page.locator("#cursor2d").innerText()}));
 assert.ok(pickError<.05,"2D pixel cursor/pinned coordinate error "+pickError+" m for viewport picking");
 await page.locator("#model3d canvas").scrollIntoViewIfNeeded();
 const bounds=await page.locator("#model3d canvas").boundingBox();
 assert.ok(bounds?.width>100&&bounds?.height>100);
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
 assert.match(await page.locator("#cursor3d").innerText(),/3D X -?\d+\.\d{3} · Z -?\d+\.\d{3} m/);
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
 // M22: frozen M70 is an independent plinth-level source stage, not renamed GF edges.
 const m70=await page.evaluate(()=>window.AADSourceReview.getM70Plinth());
 assert.ok(m70?.maxColumnResidualM<.001&&m70.runCount===16);
 assert.equal(m70.declaredSectionMM.width,230);
 assert.equal(m70.declaredSectionMM.depth,300);
 assert.ok(m70.warnings.some(s=>s.includes("no SC-I3 column")));
 assert.equal(await page.locator('#plinth-layer-label').isVisible(),true);
 assert.equal(await page.locator('.toolbar input[value="beam"]').isChecked(),false);
 assert.equal(await page.locator('.toolbar input[value="plinth-beam"]').isChecked(),true);
 assert.equal(await page.locator('#plan [data-id="PB-H3"]').count(),1);
 assert.equal(await page.locator('#plan [data-id="SB-GF-018"]').count(),0);
 const pbProof=await page.evaluate(()=>window.AADSourceReview.getViewCoordinateProof("PB-H3"));
 assert.ok(pbProof.plan&&pbProof.mesh&&pbProof.table);
 for(const frame of ["plan","mesh","table"])for(const axis of ["x","z"])
  assert.ok(Math.abs(pbProof.source[axis]-pbProof[frame][axis])<(frame==="table"?.0006:1e-6),
   "M70 plinth "+frame+" "+axis+" did not match the registered source");
 await page.locator("#filter").selectOption("plinth-beam");
 assert.equal(await page.locator("#rows tr").count(),16);
 await page.locator('#rows tr[data-id="PB-H3"]').click();
 assert.match(await page.locator("#selected").innerText(),/230 × 300 mm/);
 await page.locator("#filter").selectOption("all");
 // Zoom state must survive a component selection and exact world coordinates
 // must remain stable; toolbar, wheel, pan and fit act on SVG viewBox only.
 const fit=await page.evaluate(()=>window.AADSourceReview.getPlanView());
 await page.locator("#zoom-in").click();
 const zoomed=await page.evaluate(()=>window.AADSourceReview.getPlanView());
 assert.ok(zoomed.w<fit.w&&zoomed.h<fit.h);
 await page.evaluate(()=>window.AADSourceReview.selectById("PB-H3"));
 const persistent=await page.evaluate(()=>window.AADSourceReview.getPlanView());
 assert.ok(Math.abs(persistent.w-zoomed.w)<1e-9);
 await page.locator("#zoom-out").click();
 await page.locator("#zoom-reset").click();
 const reset=await page.evaluate(()=>window.AADSourceReview.getPlanView());
 assert.ok(Math.abs(reset.w-fit.w)<1e-9);
 await page.locator("#plan").scrollIntoViewIfNeeded();
 const box=await page.locator("#plan").boundingBox();
 await page.mouse.move(box.x+box.width*.52,box.y+box.height*.52);
 await page.mouse.wheel(0,-140);
 const wheeled=await page.evaluate(()=>window.AADSourceReview.getPlanView());
 assert.ok(wheeled.w<fit.w,"Wheel zoom was lost");
 await page.mouse.move(box.x+box.width*.35,box.y+box.height*.37);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.46,box.y+box.height*.42,{steps:9});
 await page.mouse.up();
 const panned=await page.evaluate(()=>window.AADSourceReview.getPlanView());
 assert.ok(Math.abs(panned.x-wheeled.x)>.01||Math.abs(panned.y-wheeled.y)>.01,
  "Drag should pan plan world viewport");
 await page.locator("#zoom-reset").click();
 await page.locator('#rows tr[data-id="SF-ACE9E"]').click();
 assert.ok((await page.locator("#selected").innerText()).includes("STAGE/DXF CONFLICT HOLD"));
 assert.match(await page.locator("#selected").innerText(),/1.8 × 1.8/);
 assert.match(await page.locator("#selected").innerText(),/2.1×2.1/);
 assert.equal(await page.locator('#rows tr[data-id="SF-ACE9E"].selected').count(),1);
 await page.locator("#filter").selectOption("stage-column");
 assert.equal(await page.locator("#rows tr").count(),23);
 await page.locator("#filter").selectOption("stage-footing");
 assert.equal(await page.locator("#rows tr").count(),21);
 await page.locator('#rows tr[data-id="FDN-IF3-G1"]').click();
 assert.match(await page.locator("#selected").innerText(),/M40 depth/);
 assert.match(await page.locator("#selected").innerText(),/V03/);
 await page.locator("#filter").selectOption("column");
 assert.equal(await page.locator("#rows tr").count(),23);
 await page.locator("#filter").selectOption("plinth-beam");
 assert.equal(await page.locator("#rows tr").count(),16);
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
 await page.locator('.toolbar input[value="column"]').check();
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
  await mobile.locator("#plan").scrollIntoViewIfNeeded();
  const p=await mobile.evaluate(()=>{
   const svg=document.getElementById("plan"),crossing=window.AADSourceReview.getProjectedCrossing();
   const point=svg.createSVGPoint();point.x=crossing.x;point.y=crossing.z;
   const q=point.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};
  });
  await mobile.evaluate(()=>{
   const svg=document.querySelector("#plan");
   svg.addEventListener("click",ev=>{
    const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;
    const world=pt.matrixTransform(svg.getScreenCTM().inverse());
    window.__lastActualTapWorld={x:world.x,z:world.y,cx:ev.clientX,cy:ev.clientY};
   },{capture:true,once:true});
  });
  await mobile.touchscreen.tap(p.x,p.y);
  const pinnedTouch=await mobile.evaluate(()=>window.AADSourceReview.getPinnedPoint());
  assert.equal(pinnedTouch.method,"2D_TAP");
  const mobilePickError=Math.hypot(pinnedTouch.x-projected.x,pinnedTouch.z-projected.z);
  console.log("MOBILE_SOURCE_PICK_DIAGNOSTIC",JSON.stringify({projected,pinnedTouch,mobilePickError,p}));
  const eventWorld=await mobile.evaluate(()=>window.__lastActualTapWorld);
  assert.ok(eventWorld&&Number.isFinite(eventWorld.x));
  const mathError=Math.hypot(eventWorld.x-pinnedTouch.x,eventWorld.z-pinnedTouch.z);
  console.log("MOBILE_WORLD_COORDINATE_PROOF",JSON.stringify({eventWorld,mathError}));
  assert.ok(mathError<.005,"The displayed pinned coordinate must match actual touch world coordinate");
  assert.ok(mobilePickError<.5,"Touch event unexpectedly far from indicated target");
  await mobile.locator("#model3d canvas").scrollIntoViewIfNeeded();
  const mr=await mobile.locator("#model3d canvas").boundingBox();
  await mobile.touchscreen.tap(mr.x+mr.width/2,mr.y+mr.height/2);
  assert.equal((await mobile.evaluate(()=>window.AADSourceReview.getPinnedPoint())).method,"3D_GROUND_TAP");
 }finally{await mobile.close();}
 console.log("AAD_SOURCE_GROUND_FLOOR_BROWSER_PASS",JSON.stringify({counts:first.counts,
  g1ConflictVisible:true,columnParityVerified:true,sourceMode:"BRANCH_QA_ONLY"}));
}finally{await browser.close();}
