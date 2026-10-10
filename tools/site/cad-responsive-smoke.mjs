import {chromium} from "playwright";
import {mkdirSync} from "node:fs";
const url=process.env.CAD_MOBILE_URL||"http://127.0.0.1:5174/cad/";
const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader"]});
mkdirSync("artifacts",{recursive:true});
const failures=[];
for(const [name,w,h] of [["small-phone",360,740],["iphone",390,844],["large-phone",430,932],["tablet",768,1024],["desktop",1440,900]]){
 const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:w<500?3:1,isMobile:w<500,hasTouch:w<500, reducedMotion:"reduce"});
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M02 demo loaded"),null,{timeout:45000});
  const geometry=await page.evaluate(()=>({
    inner:document.documentElement.clientWidth,outer:document.documentElement.scrollWidth,
    bar:document.querySelector(".toolbar")?.getBoundingClientRect().height,
    top:document.querySelector(".top")?.getBoundingClientRect().height,
    stage:document.querySelector(".stage")?.getBoundingClientRect().height,
    canvas:document.querySelector("#viewport")?.getBoundingClientRect().height,
    nav:getComputedStyle(document.querySelector(".mobile-nav")).display,
    section:document.querySelector("#sectionPanel")?.open,
    stageOrder:getComputedStyle(document.querySelector(".stage")).order
  }));
  if(geometry.outer>geometry.inner+2)throw Error("Horizontal page overflow "+JSON.stringify(geometry));
  if(w<500){
   if(geometry.bar>70||geometry.top>115)throw Error("Toolbar or masthead consumes mobile viewport: "+JSON.stringify(geometry));
   if(geometry.canvas<260)throw Error("Canvas too small: "+geometry.canvas);
   if(geometry.nav==="none")throw Error("Mobile navigation missing");
   if(geometry.section)throw Error("Source section should start collapsed");
   if(geometry.stageOrder!=="1")throw Error("3D viewport not first");
   const v=await page.locator("#viewport").boundingBox(),s=await page.locator("#sectionPanel").boundingBox();
   if(s.y<v.y+v.height-1)throw Error("Section drawing overlaps the viewport");
   await page.locator("#viewPlan").click();
   await page.waitForFunction(()=>document.querySelector("#viewName")?.textContent==="Ground floor plan");
   await page.locator("#sectionPanel summary").click();
   if(!await page.locator("#sectionPanel").evaluate(el=>el.open))throw Error("Tap to expand section failed");
   const vp=await page.locator("#viewport").boundingBox(),sec=await page.locator("#sectionPanel").boundingBox();
   if(sec.y<vp.y+vp.height-1)throw Error("Expanded section obscures model");
   await page.locator("#sectionPanel summary").click();
   await page.locator("[data-mobile-target=explorer]").click();
   if(!(await page.locator("[data-mobile-target=explorer]").getAttribute("aria-current")))throw Error("Project navigation inactive");
   await page.locator("#modelTree button").first().click();
   await page.locator("[data-mobile-target=inspector]").click();
   if(!(await page.locator("#elementId").inputValue()))throw Error("Inspector lost selected object");
   await page.locator("[data-mobile-target=export]").click();
   if(!(await page.locator("#loadSemanticReview").count()))throw Error("M05 source import buried");
   await page.locator("[data-mobile-target=stage]").click();
   if(errors.length)throw Error(errors.join(" | "));
  }else if(w>=1000){
   if(geometry.nav!=="none")throw Error("Desktop bottom navigation should be hidden");
   if(!geometry.section)throw Error("Desktop section should retain open behaviour");
   if(geometry.canvas<400)throw Error("Desktop main viewport unexpectedly small");
  }
  if(["iphone","small-phone","desktop"].includes(name))await page.screenshot({path:"artifacts/cad-responsive-"+name+".png",fullPage:name==="desktop"});
  console.log("CAD_RESPONSIVE_QA_PASS",name,geometry);
 }catch(err){failures.push(name+" "+String(err));await page.screenshot({path:"artifacts/cad-responsive-failed-"+name+".png"}).catch(()=>{});}
 finally{await context.close();}
}
await browser.close();
if(failures.length)throw Error(failures.join("\n"));
