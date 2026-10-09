import {chromium} from "playwright";
const site="https://fabingurung.github.io/JP_Computer-Aided-Drawings/cad/";
const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader"]});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const errors=[];page.on("pageerror",error=>errors.push(error.message));
try{
 await page.goto(site,{waitUntil:"domcontentloaded",timeout:45000});
 await page.locator("#viewport canvas").waitFor({timeout:30000});
 await page.waitForFunction(()=>{
 const t=document.querySelector("#status")?.textContent||"";
 return t.includes("M01 demo loaded")||t.includes("load failed");
},undefined,{timeout:30000});
const ready=await page.locator("#status").textContent();
console.log("CAD_BROWSER_READY_STATUS",ready);
if(!ready?.includes("M01 demo loaded"))throw Error("Demo did not initialize: "+ready+" | errors="+errors.join(" || "));
 const rows=await page.locator("#modelTree button").count();
 if(rows!==11)throw Error("Expected 11 scene objects, got "+rows);
 await page.locator("#modelTree button").first().click();
 const id=await page.locator("#elementId").inputValue();
 if(!id)throw Error("Element did not become selected");
 const original=Number(await page.locator("#length").inputValue());
 await page.locator("#length").fill(String(original+100));
 console.log("FORM_VALIDATION",await page.locator("#elementForm").evaluate(form=>({
 valid:form.checkValidity(),
 invalid:Array.from(form.elements).filter(input=>!input.checkValidity()).map(input=>({id:input.id,value:input.value,message:input.validationMessage}))
})));
await page.locator("#elementForm button[type=submit]").click();
console.log("FORM_AFTER_SUBMIT_STATUS",await page.locator("#status").textContent());
 await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("Draft updated"));
 if(Number(await page.locator("#length").inputValue())!==original+100)throw Error("Dimension not updated");
 await page.locator("#undo").click();
 if(Number(await page.locator("#length").inputValue())!==original)throw Error("Undo failed");
 await page.locator("#redo").click();
 if(Number(await page.locator("#length").inputValue())!==original+100)throw Error("Redo failed");
 await page.locator("#viewPlan").click();
 if((await page.locator("#viewName").textContent())!=="Ground floor plan")throw Error("Plan camera failed");
 await page.locator("#viewFront").click();
 await page.locator("#toggleClip").click();
 await page.locator("#view3d").click();
 if(errors.length)throw Error("Browser runtime errors: "+errors.join(" | "));
 console.log("LIVE_CAD_BROWSER_INTERACTION_PASS",{objects:rows,selected:id,changedLength:original+100,undoRedo:true,cameraModes:true,sectionClipping:true});
 if(process.env.CAD_TEST_IFC){
  await page.locator("#importIfc").setInputFiles(process.env.CAD_TEST_IFC);
  await page.waitForFunction(()=>{
   const text=document.querySelector("#status")?.textContent||"";
   return text.startsWith("IFC loaded read-only:")||text.startsWith("IFC parsed but")||text.startsWith("IFC import failed:");
  },undefined,{timeout:120000});
  const result=await page.locator("#status").textContent();
  console.log("IFC_IMPORT_STATUS",result);
  if(!result?.startsWith("IFC loaded read-only:"))throw Error("Web IFC geometry import did not complete: "+result);
  if(errors.length)throw Error("Browser errors after IFC: "+errors.join(" | "));
  console.log("WEB_IFC_IN_BROWSER_GEOMETRY_PASS");
 }
 await page.screenshot({path:"/tmp/cad-m01-browser-smoke.png",fullPage:true});
}catch(error){
 console.error("CAD_BROWSER_DIAGNOSTIC_STATUS",await page.locator("#status").textContent().catch(()=>"(unavailable)"));
 console.error("CAD_BROWSER_DIAGNOSTIC_ERRORS",errors);
 await page.screenshot({path:"/tmp/cad-m01-browser-smoke.png",fullPage:true}).catch(err=>console.error("screenshot failed",String(err)));
 throw error;
}finally{await browser.close();}
