import {chromium} from "playwright";
import {readFile} from "node:fs/promises";
const file=process.env.M08_IFC||"/tmp/cad-m08-reviews/design.ifc";
const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader"]});
for(const [name,width,height] of [["phone",390,844],["desktop",1440,900]]){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
 const page=await ctx.newPage();const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(process.env.M08_CAD_URL||"http://127.0.0.1:5174/cad/",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M02 demo loaded"),undefined,{timeout:45000});
  const old=await page.locator("#modelTree button").count();
  await page.locator("#importIfc").setInputFiles({name:"synthetic-m08.ifc",mimeType:"application/octet-stream",buffer:await readFile(file)});
  await page.waitForFunction(()=>/IFC loaded read-only|IFC import failed/.test(document.querySelector("#status")?.textContent||""),undefined,{timeout:90000});
  const msg=await page.locator("#status").textContent();
  if(!msg?.includes("IFC loaded read-only"))throw Error("web-ifc import failed: "+msg);
  const parts=Number(msg.match(/(\d+) mesh parts/)?.[1]||0);
  if(parts<5)throw Error("Expected five M08 object meshes, got "+parts);
  if((await page.locator("#modelTree button").count())!==old)throw Error("Generated IFC overwrote canonical editor objects");
  if(errors.length)throw Error("Browser exception: "+errors.join(" | "));
  console.log("M08_NATIVE_IFC_WEBIFC_THREEJS_READBACK_PASS",name,parts);
 }finally{await ctx.close();}
}
await browser.close();
