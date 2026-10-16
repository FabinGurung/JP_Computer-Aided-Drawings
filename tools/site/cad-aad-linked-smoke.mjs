/** CAD AAD acceptance — visible pixels AND semantics, not DOM existence alone. */
import { chromium } from "playwright";
import { PNG } from "pngjs";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const variants=[{label:"desktop",width:1510,height:980},{label:"tablet",width:900,height:900},{label:"mobile",width:390,height:844}];
const pages=[];
function imageVariance(png,label){
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
 if(n<50||unique.size<7)throw Error(label+" rendered as an empty/flat image: "+unique.size+" bucket colors over "+n+" samples");
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
  const threeColors=imageVariance(await canvas.screenshot({animations:"disabled"}),config.label+" 3D");
  const planColors=imageVariance(await plane.screenshot({animations:"disabled"}),config.label+" 2D");
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
