import {chromium} from "playwright";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1460,height:940}});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
try {
 const url=process.env.AAD_PROJECT_URL||"http://127.0.0.1:5175/projects/narayani-parajuli/aad/";
 await page.goto(url,{waitUntil:"networkidle",timeout:60000});
 const iframe=page.locator("#aad-engine");
 const engine=page.frameLocator("#aad-engine");
 assert.equal(await page.locator("#aad-original-dxf").getAttribute("open"),null,"DXF must start collapsed, not as the primary product");
 assert.equal(await page.locator('[data-model="gf"]').getAttribute("aria-pressed"),"true");
 await engine.locator("#message").filter({hasText:"Loaded hosted project draft"}).waitFor({timeout:30000});
 await engine.locator("#canvas3d canvas").first().waitFor({timeout:30000});
 await engine.locator("#plan [data-part]").first().waitFor({timeout:30000});
 assert.equal(await engine.locator("#length").inputValue(),"26");
 const projectMode=await iframe.evaluate(frame=>{
  const doc=frame.contentDocument;
  return {
   sameOrigin:Boolean(doc),
   native3d:Boolean(doc?.querySelector("#canvas3d canvas")),
   native2d:Boolean(doc?.querySelector("#plan [data-part]")),
   introHidden:doc?getComputedStyle(doc.querySelector(".intro")).display==="none":false,
   workspaceLayout:doc?.querySelector(".workspace")?getComputedStyle(doc.querySelector(".workspace")).gridTemplateAreas:"",
   viewerY:doc?.querySelector(".viewer")?.getBoundingClientRect().top
  };
 });
 assert.ok(projectMode.sameOrigin&&projectMode.native2d&&projectMode.native3d,"Narayani must run real native AAD linked engine, not plotted SVG only");
 assert.ok(projectMode.introHidden,"Remove synthetic generic-engine intro from project experience");
 assert.ok(projectMode.viewerY<180,"Put native live 2D/3D workspace at the beginning of the project experience: "+projectMode.viewerY);
 await page.waitForFunction(()=>{
  const f=document.getElementById("aad-engine");
  const d=f?.contentDocument;
  return d?.body?.dataset.aadProjectLayout==="2d-left"&&d.querySelector(".plan")?.getBoundingClientRect().left<d.querySelector(".threed")?.getBoundingClientRect().left;
 },null,{timeout:20000});
 assert.equal(await page.locator("#aad-view-order").inputValue(),"2d-left");
 await page.locator("#aad-view-order").selectOption("3d-left");
 await page.waitForFunction(()=>{
  const d=document.getElementById("aad-engine")?.contentDocument;
  return d?.body?.dataset.aadProjectLayout==="3d-left"&&d.querySelector(".threed")?.getBoundingClientRect().left<d.querySelector(".plan")?.getBoundingClientRect().left;
 },null,{timeout:20000});
 await page.locator("#aad-view-order").selectOption("2d-left");
 await page.locator("[data-register-counts] .aad-count-tile").first().waitFor({timeout:20000});
 await page.waitForFunction(()=>document.querySelectorAll("[data-register-body] tr").length===147,null,{timeout:20000});
 const modeledCount=await page.locator("[data-register-body] tr").count();
 assert.equal(modeledCount,147,"All authored wall, door, window and semantic-label records should be tabulated");
 const firstWall=await page.locator('[data-register-body] tr[data-kind="wall"]').first().innerText();
 assert.match(firstWall,/EXT-01/);
 assert.match(firstWall,/IfcWall/);
 assert.match(firstWall,/20\.147/);
 assert.equal(await page.locator('.aad-count-tile[data-status="unmodeled"]').count(),5,"Absent IFC categories must not be invented");
 await page.locator('[data-register-type]').selectOption("window");
 assert.equal(await page.locator("[data-register-body] tr").count(),23);
 await page.locator('[data-register-type]').selectOption("all");
 await page.locator('[data-register-floor]').selectOption("gf");
 assert.equal(await page.locator("[data-register-body] tr").count(),42);
 await page.locator('[data-register-floor]').selectOption("all");
 assert.match(await page.locator("#aad-bim-assembly").innerText(),/Shared building coordinates/);

 const hub=await browser.newPage({viewport:{width:1180,height:800}});
 await hub.goto(new URL("../",url).href,{waitUntil:"domcontentloaded"});
 const label=await hub.locator(".aad-project-entry").innerText();
 assert.match(label,/Live AAD/);
 assert.doesNotMatch(label,/area QA open/);
 await hub.close();
 await page.screenshot({path:"/tmp/cad-aad-narayani-gf-live.png",fullPage:false});

 for(const [level,dim] of [["ff","25"],["sf","25"],["gf","26"]]){
  const expected={ff:"aad-first-floor-model.json",sf:"aad-second-floor-model.json",gf:"aad-ground-floor-model.json"}[level];
  await Promise.all([
   page.waitForEvent("framenavigated",{predicate:f=>f!==page.mainFrame()&&f.url().includes(expected),timeout:35000}),
   page.locator('[data-model="'+level+'"]').click()
  ]);
  await engine.locator("#message").filter({hasText:"Loaded hosted project draft"}).waitFor({timeout:30000});
  await engine.locator("#plan [data-part]").first().waitFor({timeout:30000});
  const actual=await engine.locator("#length").inputValue();
  assert.equal(actual,dim,"Native AAD model on "+level+" must use project dimension, not previous floor");
  assert.equal(await page.locator('[data-model="'+level+'"]').getAttribute("aria-pressed"),"true");
  await page.screenshot({path:"/tmp/cad-aad-narayani-"+level+"-live.png",fullPage:false});
 }
 assert.ok((await page.locator("#aad-studio-status").innerText()).includes("Live model loaded"));
 const iframeSrc=await iframe.getAttribute("src");
 assert.ok(iframeSrc.includes("aad-ground-floor-model.json"));
 assert.ok((await page.locator("#aad-open-studio").getAttribute("href")).includes("aad-ground-floor-model.json"));

 // Source plan survives as a secondary, deliberately user-opened reference only.
 await page.locator("#aad-original-dxf summary").click();
 for(const [key,area,count] of [["gf","205.16 m²","73 measured dimension objects"],["ff","200.67 m²","75 measured dimension objects"],["sf","175.62 m²","71 measured dimension objects"],["footing","Not tabulated","14 measured dimension objects"],["beam_gf","Not tabulated","11 measured dimension objects"]]){
  await page.locator('[data-floor="'+key+'"]').click();
  await page.waitForFunction(([expectedArea,expectedCount])=>document.querySelector("#aad-area")?.textContent===expectedArea && document.querySelector("#aad-dim-count")?.textContent===expectedCount,[area,count],{timeout:20000});
  assert.ok((await page.locator("#aad-source-svg path").count())>=1,key+" should retain source-layer plotting as evidence");
 }
 await page.screenshot({path:"/tmp/cad-aad-narayani-dxf-reference.png",fullPage:false});
 if(errors.length)throw Error("Narayani product browser errors: "+errors.join("; "));
 console.log("AAD_NARAYANI_LIVE_NATIVE_EDITOR_PASS",JSON.stringify(projectMode));
} finally {
 await page.close();
 await browser.close();
}
