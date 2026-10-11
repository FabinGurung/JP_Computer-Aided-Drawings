import {chromium} from "playwright";
const file="/tmp/cad-m07-browser/outputs/columns.ifc";
const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader"]});
for(const [name,w,h] of [["desktop",1440,900],["phone",390,844]]){
 const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<500,hasTouch:w<500});
 const page=await context.newPage();const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(process.env.CAD_M07_URL||"http://127.0.0.1:5174/cad/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M02 demo loaded"),null,{timeout:35000});
  const old=await page.locator("#modelTree button").count();
  await page.locator("#importIfc").setInputFiles(file);
  await page.waitForFunction(()=>{
    const t=document.querySelector("#status")?.textContent||"";
    return t.includes("IFC loaded read-only")||t.includes("IFC import failed")||t.includes("no renderable geometry");
  },null,{timeout:90000});
  const message=await page.locator("#status").textContent();
  if(!message?.includes("IFC loaded read-only"))throw Error("Browser IFC import not working: "+message);
  const count=Number(message.match(/(\d+) mesh parts/)?.[1]||0);
  if(count<3)throw Error("Missing IFC geometry pieces: "+count);
  if((await page.locator("#modelTree button").count())!==old)throw Error("IFC import mutated editable draft");
  if(errors.length)throw Error("Browser JS errors "+errors.join("|"));
  console.log("M07_WEBIFC_THREE_IMPORT_PASS",name,"IFC_parts="+count,"draft_preserved=true");
 }finally{await context.close();}
}
await browser.close();
