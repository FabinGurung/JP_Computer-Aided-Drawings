/** CAD AAD acceptance — visible pixels AND semantics, not DOM existence alone. */
import { chromium } from "playwright";
import { PNG } from "pngjs";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const variants=[{label:"desktop",width:1510,height:980},{label:"tablet",width:900,height:900},{label:"mobile",width:390,height:844}];
const pages=[];
function imageVariance(png,label,minBuckets=7){
 const {width,height,data}=PNG.sync.read(png);
 const unique=new Set();let n=0;
 for(let y=Math.floor(height*.12);y<height*.88;y+=Math.max(1,Math.floor(height/35))){
  for(let x=Math.floor(width*.12);x<width*.88;x+=Math.max(1,Math.floor(width/35))){
   const i=(y*width+x)*4;
   const a=data[i+3];if(a<30)continue;
   unique.add([Math.round(data[i]/12),Math.round(data[i+1]/12),Math.round(data[i+2]/12)].join(","));
   n++;
  }
 }
 if(n<50||unique.size<minBuckets)throw Error(label+" rendered as an empty/flat image: "+unique.size+" bucket colors over "+n+" samples");
 return unique.size;
}
try{
 for(const config of variants){
  const page=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:config.label==="tablet"?2:1});
  pages.push(page);
  const errors=[],consoleErrors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())});
  const address=process.env.CAD_AAD_URL||"http://127.0.0.1:5175/cad/aad/";
  await page.goto(address,{waitUntil:"networkidle",timeout:60000});
  await page.locator('#plan rect[data-part="C-NW"]').waitFor({timeout:20000});
  await page.locator('#threeStatus[data-state="ready"]').waitFor({timeout:20000});
  await page.locator('#planStatus[data-state="ready"]').waitFor({timeout:20000});
  const plane=page.locator("#plan");
  const parts=await page.locator("#plan rect[data-part]").count();
  if(parts<12)throw Error("Plan components missing: "+parts);
  const visible=await plane.evaluate(svg=>{
   const bounds=svg.getBoundingClientRect(),rects=[...svg.querySelectorAll("[data-part]")];
   return bounds.width>200&&bounds.height>200&&rects.every(r=>{
    const b=r.getBoundingClientRect(),style=getComputedStyle(r);
    return b.width>1&&b.height>1&&style.visibility!=="hidden"&&Number(style.opacity)>0;
   })&&rects.filter(r=>{const b=r.getBoundingClientRect();return b.left<bounds.right&&b.top<bounds.bottom&&b.right>bounds.left&&b.bottom>bounds.top}).length>=12;
  });
  if(!visible)throw Error("SVG has offscreen/invisible components ("+config.label+")");
  const canvas=page.locator("#canvas3d canvas");
  await canvas.waitFor({state:"visible"});
  const dimensions=await canvas.evaluate(x=>{const box=x.getBoundingClientRect();return{display:[box.width,box.height],buffer:[x.width,x.height]};});
  if(dimensions.display[0]<150||dimensions.display[1]<220)throw Error("3D canvas is too small ("+JSON.stringify(dimensions)+")");
  const threeShot=await canvas.screenshot({animations:"disabled"});
  const planShot=await plane.screenshot({animations:"disabled"});
  const fs=await import("node:fs/promises");
  await fs.writeFile("/tmp/cad-aad-daylight-3d-"+config.label+".png",threeShot);
  await fs.writeFile("/tmp/cad-aad-daylight-plan-"+config.label+".png",planShot);
  // Thin-line plan drawings have fewer coarse colour buckets than shaded 3D.
  // Spatial element visibility and all nonzero viewBox geometry are tested above.
  const threeColors=imageVariance(threeShot,config.label+" 3D",7);
  const planColors=imageVariance(planShot,config.label+" 2D",4);
  if(config.label==="desktop"){
   if(await page.locator("#area").innerText()!=="48.0 m²")throw Error("Starter footprint failed");
   await page.locator('#plan rect[data-part="C-NW"]').click();
   if(!(await page.locator("#inspect").innerText()).includes("C-NW"))throw Error("Plan selection missing");
   await page.locator("#length").fill("9");await page.locator("#length").press("Tab");
   if(await page.locator("#area").innerText()!=="54.0 m²")throw Error("Shared parametric geometry not updated");
   if(!(await page.locator("#inspect").innerText()).includes("C-NW"))throw Error("Stable component ID lost");
   await page.locator("#instruction").fill("Make it 7 m long, 5 m wide and 3.2 m high, remove bed.");
   await page.locator("#applyText").click();
   if(await page.locator("#area").innerText()!=="35.0 m²")throw Error("Words to model failed");
   if(await page.locator('#plan rect[data-part="BED"]').count()!==0)throw Error("Bed not removed");
   await page.locator("#dimensions").uncheck();
   if(await page.locator("#plan text").count()===0)throw Error("Plan disappeared after dimension display change");
   await page.locator("#dimensions").check();
   await page.locator('#plan rect[data-part="WINDOW-N"]').click();
   if(!(await page.locator("#inspect").innerText()).includes("WINDOW-N"))throw Error("Window not linked");
   await page.locator("#reset").click();
   if(await page.locator("#area").innerText()!=="48.0 m²")throw Error("Reset did not restore model");
   // Editable components are not independent overlays: each is serialized
   // in one draft and drives the SAME SVG plan and Three.js scene.
   await page.locator('#plan rect[data-part="WINDOW-N"]').click();
   if(!(await page.locator("#componentEditor").isVisible()))throw Error("Window inspector edit not shown");
   const oldNorthRight=Number(await page.locator('#plan rect[data-part="W-NR"]').getAttribute("x"));
   await page.locator("#partA").fill("2.5");await page.locator("#partB").fill("1.25");
   await page.locator("#applyPart").click();
   const newNorthRight=Number(await page.locator('#plan rect[data-part="W-NR"]').getAttribute("x"));
   if(!(newNorthRight<oldNorthRight))throw Error("Hosted window failed to regenerate north-wall jamb");
   if(!(await page.locator("#inspect").innerText()).includes("WINDOW-N"))throw Error("Edited window lost semantic selection");
   await page.locator('#plan rect[data-part="DOOR-S"]').click();
   const oldSouthRight=Number(await page.locator('#plan rect[data-part="W-SR"]').getAttribute("x"));
   await page.locator("#partA").fill("2.2");await page.locator("#partB").fill("1.1");
   await page.locator("#applyPart").click();
   if(!(Number(await page.locator('#plan rect[data-part="W-SR"]').getAttribute("x"))<oldSouthRight))
     throw Error("Door moved but hosted wall jamb did not follow");
   await page.locator('#plan rect[data-part="C-NW"]').click();
   const colWidthBefore=Number(await page.locator('#plan rect[data-part="C-NW"]').getAttribute("width"));
   await page.locator("#partA").fill(".36");await page.locator("#partB").fill(".38");
   await page.locator("#applyPart").click();
   if(!(Number(await page.locator('#plan rect[data-part="C-NW"]').getAttribute("width"))>colWidthBefore))
     throw Error("Column size edit absent in 2D plan");
   if(!(await page.locator("#inspect").innerText()).includes("C-NW"))throw Error("Column ID changed");
   await page.locator('#plan rect[data-part="B-N"]').click();
   await page.locator("#partA").fill(".46");
   await page.locator("#applyPart").click();
   if(!(await page.locator("#inspect").innerText()).includes("Vertical: 0.46 m"))
     throw Error("Selected beam depth did not update model geometry");
   await page.locator('#plan rect[data-part="W-NL"]').click();
   await page.locator("#partA").fill(".20");
   await page.locator("#applyPart").click();
   if(!(await page.locator("#partMessage").innerText()).includes("W-NL"))
     throw Error("Linked wall-thickness edit not acknowledged");
   await page.locator("#bed").check();
   await page.locator('#plan rect[data-part="BED"]').click();
   const oldBedX=Number(await page.locator('#plan rect[data-part="BED"]').getAttribute("x"));
   await page.locator("#partA").fill("2.1");await page.locator("#partB").fill("1.6");
   await page.locator("#partC").fill("2.15");await page.locator("#partD").fill("1.5");
   await page.locator("#applyPart").click();
   if(!(Number(await page.locator('#plan rect[data-part="BED"]').getAttribute("x"))>oldBedX))
     throw Error("Bed positioning did not update plan");
   // A corrupt/unknown-id draft must not silently enter the drawing model.
   if(await page.locator("#area").innerText()!=="48.0 m²")
     throw Error("Component editing unexpectedly altered building footprint");
   const saved=page.waitForEvent("download");
   await page.locator("#download").click();
   const downloaded=await saved;
   const fsDraft=await import("node:fs/promises");
   const serialized=JSON.parse(await fsDraft.readFile(await downloaded.path(),"utf8"));
   if(serialized.schema!=="jp-cad://linked-one-bay-demo/0.2"||!serialized.columnSizes["C-NW"]||
      serialized.beamDepths["B-N"]!==.46||serialized.windowX!==2.5||
      serialized.wallThickness!==.2||serialized.bedX!==2.1)
      throw Error("Versioned component changes missing from saved draft");
   const readback=await page.locator("#upload");
   await readback.setInputFiles({name:"linked-draft.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(serialized))});
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent?.includes("Loaded draft"),null,{timeout:12000});
   if(!(await page.locator("#message").innerText()).includes("Loaded draft") ||
      await page.locator('#plan rect[data-part="BED"]').count()!==1)
      throw Error("Validated draft reload lost the linked bed geometry");
   // Legacy 0.1 input is upgraded with centered hosted openings.
   await readback.setInputFiles({name:"legacy-draft.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({
     schema:"jp-cad://linked-one-bay-demo/0.1",length:8,width:6,height:3,door:.95,window:1.4,bed:true
   }))});
   await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#plan rect[data-part="WINDOW-N"]')?.getAttribute("x"))-Number(document.querySelector('#plan rect[data-part="C-NW"]')?.getAttribute("x")))>0.1 && document.querySelector<HTMLInputElement>("#partA")?.value==="3.3",null,{timeout:12000});
   await page.locator('#plan rect[data-part="WINDOW-N"]').waitFor();
   if(!(await page.locator("#message").innerText()).includes("Loaded draft"))
      throw Error("Legacy v0.1 migration failed");
   // Reject unknown per-component data and retain last known-good geometry.
   const illegal={...serialized,columnSizes:{"C-UNKNOWN":{x:.3,z:.3}}};
   await readback.setInputFiles({name:"invalid-draft.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(illegal))});
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent?.includes("Unknown column ID"),null,{timeout:12000});
   if(!(await page.locator("#message").innerText()).includes("Unknown column ID"))
     throw Error("Unsupported element accepted from untrusted draft");
   if(await page.locator("#area").innerText()!=="48.0 m²")throw Error("Bad draft mutated valid model");
   await page.locator("#reset").click();
   if(await page.locator("#partA").count()!==1)throw Error("Component editor was destroyed by reset");
   await page.screenshot({path:"/tmp/cad-aad-daylight-loaded.png",fullPage:true});
   // Force synthetic context-loss event: the plan remains usable.
   await page.evaluate(()=>document.querySelector("#canvas3d canvas")?.dispatchEvent(new Event("webglcontextlost",{cancelable:true})));
   await page.locator('#threeStatus[data-state="error"]').waitFor();
   if(await page.locator('#plan rect[data-part="C-NW"]').count()!==1)throw Error("2D plan died with WebGL context");
   if(!(await page.locator("#retry3d").isVisible()))throw Error("Missing 3D recovery affordance");
   await page.locator("#retry3d").click();
   await page.locator('#threeStatus[data-state="ready"]').waitFor({timeout:12000});
  }
  if(errors.length||consoleErrors.length)throw Error(config.label+" browser errors: "+JSON.stringify({errors,consoleErrors}));
  console.log("CAD_VISIBLE_PANELS_PASS",JSON.stringify({variant:config.label,threeColors,planColors,dimensions,components:parts}));
 }
}finally{await Promise.all(pages.map(x=>x.close()));await browser.close();}
