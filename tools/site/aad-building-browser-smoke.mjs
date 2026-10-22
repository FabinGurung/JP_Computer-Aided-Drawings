import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1450,height:950},acceptDownloads:true});
const failures=[];page.on("pageerror",e=>failures.push(e.message));
try{
 const base=process.env.AAD_BUILDING_URL||"http://127.0.0.1:5192/JP_Computer-Aided-Drawings/cad/aad/multistorey/";
 const manifest=new URL("../../../data/projects/narayani-parajuli/aad-building-v1.json",base);
 const url=new URL(base);url.searchParams.set("manifest",manifest.pathname);
 await page.goto(url.href,{waitUntil:"networkidle",timeout:75000});
 await page.locator("#viewer3d canvas").waitFor({timeout:30000});
 await page.waitForFunction(()=>document.querySelector("#action-status")?.textContent.includes("Shared AAD building assembly ready"),null,{timeout:30000});
 assert.match(await page.locator("#building-name").innerText(),/Narayani/);
 assert.equal(await page.locator("#storeys input[type=checkbox]").count(),3);
 assert.ok((await page.locator("#elements tr").count())>160,"Assembled IFC-classified component register not rendered");
 assert.match(await page.locator("#quantities").innerText(),/column/);
 await page.locator("#aad-storey").selectOption("gf");
 const parity=await page.evaluate(()=>{
  const columns=window.AADStudio.getSnapshot().assembly.elements
   .filter(e=>e.kind==="column"&&e.level==="gf").slice(0,12);
  return columns.map(e=>window.AADStudio.getViewCoordinateProof(e.id));
 });
 assert.ok(parity.length>=2,"Narayani must have modeled columns");
 for(const p of parity){
  assert.ok(p.plan&&p.mesh&&p.table,"3-way column missing "+p.elementId);
  for(const axis of ["x","z"]){
   assert.ok(Math.abs(p.model[axis]-p.plan[axis])<.000001,"Narayani plan mismatch "+p.elementId);
   assert.ok(Math.abs(p.model[axis]-p.mesh[axis])<.000001,"Narayani mesh mismatch "+p.elementId);
   assert.ok(Math.abs(p.model[axis]-p.table[axis])<.001,"Narayani table mismatch "+p.elementId);
  }
 }
 await page.locator("#aad-storey").selectOption("all");
 assert.match(await page.locator("#qa-result").innerText(),/IFC4 STEP internal references: PASS/);
 assert.match(await page.locator("#qa-result").innerText(),/Structural capacity\/code QA: HOLD/);
 const metrics=await page.locator("#viewer3d canvas").evaluate(canvas=>{
  const gl=canvas.getContext("webgl2")||canvas.getContext("webgl");
  const b=canvas.getBoundingClientRect();
  return{width:b.width,height:b.height,buffer:canvas.width,webGL:Boolean(gl)};
 });
 assert.ok(metrics.width>300&&metrics.height>350&&metrics.buffer>300&&metrics.webGL,"Multistorey geometry canvas not visible");
 await page.screenshot({path:"/tmp/cad-aad-building-3storey.png",fullPage:false});
 await page.locator("#storeys input").last().uncheck();
 await page.locator("#storeys input").last().check();
 await page.locator("#run-qa").click();
 assert.match(await page.locator("#action-status").innerText(),/QA completed/);
 const dl=page.waitForEvent("download",{timeout:20000});
 await page.locator("#download-ifc").click();
 const file=await dl;
 assert.match(file.suggestedFilename(),/\.ifc$/);
 const save="/tmp/cad-aad-building-roundtrip.ifc";
 await file.saveAs(save);
 const contents=fs.readFileSync(save,"utf8");
 assert.match(contents,/FILE_SCHEMA\(\('IFC4'\)\)/);
 assert.match(contents,/IFCBUILDINGSTOREY/);
 assert.match(contents,/IFCRELVOIDSELEMENT/);
 assert.ok(contents.length>40000,"Tiny/empty IFC export");
 if(failures.length)throw Error("Browser errors: "+failures.join("; "));
 console.log("AAD_BUILDING_BROWSER_EXPORT_PASS",JSON.stringify(metrics));
}finally{await page.close();await browser.close();}
