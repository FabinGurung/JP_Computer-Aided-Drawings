import {chromium} from "playwright";
const base=process.env.CAD_M04_URL||"http://127.0.0.1:5174/cad/";
const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader"]});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const errors=[];page.on("pageerror",err=>errors.push(err.message));
const frame={schema:"fabin-cad://dxf-review-overlay/0.1",status:"SOURCE_GEOMETRY_REVIEW_ONLY",
source:{source_id:"DEMO-DXF-001",file_sha256:"a".repeat(64),dxf_version:"AC1021",units:"mm",region_global_mm:[0,0,600,600],local_origin_global_mm:[0,0]},
entities:[
{handle:"AB12",layer:"WALL_REVIEW",kind:"LINE",points_mm:[[0,100],[500,100]],closed:false},
{handle:"AB13",layer:"COL_REVIEW",kind:"LWPOLYLINE",points_mm:[[100,100],[300,100],[300,300],[100,300]],closed:true}
],qa:{selected_count:2,by_kind:{LINE:1,LWPOLYLINE:1},outside_region:{},unsupported_or_bulge:{},modelspace_entity_count:2,semantic_gate:"NO_AUTOMATIC_BIM_PROMOTION"}};
try{
 await page.goto(base,{waitUntil:"domcontentloaded",timeout:45000});
 await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M02 demo loaded"),undefined,{timeout:35000});
 const count=await page.locator("#modelTree button").count();
 await page.locator("#loadDxfReview").setInputFiles({name:"preview.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(frame))});
 await page.waitForFunction(()=>document.querySelector("#dxfReviewStatus")?.textContent?.includes("2 native entities"));
 if((await page.locator("#viewName").textContent())!=="Ground floor plan")throw Error("DXF review should switch to plan");
 if(!await page.locator("#dxfReviewLayers").textContent())throw Error("DXF layer inspector blank");
 if((await page.locator("#modelTree button").count())!==count)throw Error("Source review changed editable model");
 const bad=structuredClone(frame);bad.qa.semantic_gate="APPROVED";
 await page.locator("#loadDxfReview").setInputFiles({name:"bad.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(bad))});
 await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("DXF review rejected:"));
 if(!(await page.locator("#dxfReviewLayers").textContent())?.includes("WALL_REVIEW"))throw Error("Rejected package destroyed earlier overlay");
 await page.locator("#clearDxfReview").click();
 if(!(await page.locator("#dxfReviewStatus").textContent())?.includes("No DXF review"))throw Error("Clear DXF review failed");
 if(errors.length)throw Error("Runtime errors: "+errors.join(" | "));
 console.log("CAD_M04_BROWSER_DXF_REVIEW_PASS",{entities:2,layers:2,canonObjects:count,invalidRejected:true});
}catch(e){console.error("STATUS",await page.locator("#status").textContent().catch(()=>""),errors);throw e;}
finally{await browser.close();}
