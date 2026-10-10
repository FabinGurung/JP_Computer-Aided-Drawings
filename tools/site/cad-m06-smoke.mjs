import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader"]});
const columns=[
{grid:"A1",column_type:"C1",shape:"rectangular",x_mm:0,y_mm:0,width_mm:400,depth_mm:400,source_handle:"AD86B",native_centre_global_mm:[1000,2000],native_bbox_mm:[800,1800,1200,2200],residual_mm:0,geometry_review:"DXF_BLOCK_GEOMETRY_CHECKED",vertical_review:"HEIGHT_AND_ELEVATION_UNVERIFIED",z_mm:null,height_mm:null},
{grid:"A2",column_type:"C4",shape:"circular",x_mm:0,y_mm:3600,width_mm:350,depth_mm:350,source_handle:"AD86C",native_centre_global_mm:[1000,5600],native_bbox_mm:[825,5425,1175,5775],residual_mm:0,geometry_review:"DXF_BLOCK_GEOMETRY_CHECKED",vertical_review:"HEIGHT_AND_ELEVATION_UNVERIFIED",z_mm:null,height_mm:null}
];
const plan={schema:"fabin-cad://semantic-column-review/0.1",status:"SEMANTIC_PLAN_REVIEW_ONLY",project_id:"DEMO-A-001",source:{source_id:"TEST-SRC",file_sha256:"a".repeat(64),layout_sha256:"b".repeat(64),units:"mm",dxf_version:"AC1021"},alignment:{method:"TRANSFORMED_INSERT_BLOCK_BBOX_CENTRE_TRANSLATION",rotation_deg:0,scale:1,translation_global_from_grid_mm:[1000,2000],tolerance_mm:1,maximum_residual_mm:0},columns,qa:{column_count:2,all_source_handles_unique:true,plan_geometry_gate:"CHECKED_FOR_2D_REVIEW_ONLY",vertical_geometry_gate:"HOLD_UNTIL_ELEVATIONS_AND_HEIGHTS_VERIFIED",construction_gate:"NOT_FIELD_ISSUED",semantic_promotion:"BLOCKED"}};
const good={schema:"fabin-cad://vertical-observations/0.1",status:"PROVISIONAL_NOT_FIELD_ISSUED",project_id:plan.project_id,plan_source_sha256:plan.source.file_sha256,plan_layout_sha256:plan.source.layout_sha256,datum_label:"LOCAL_DATUM",vertical_sources:[{id:"SEC-001",record_id:"SHEET-03",kind:"SECTION",review:"USER_REVIEWED_NOT_AUTHORIZED"}],levels:[{id:"BASE",z_mm:-500,source_ids:["SEC-001"]},{id:"L01",z_mm:3100,source_ids:["SEC-001"]}],segments:columns.map(c=>({grid:c.grid,from_level:"BASE",to_level:"L01",source_ids:["SEC-001"]}))};
const upload=async(page,id,json)=>page.locator("#"+id).setInputFiles({name:"review.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(json))});
for(const [name,w,h] of [["desktop",1400,900],["phone",390,844]]){
 const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<500,hasTouch:w<500,acceptDownloads:true});
 const page=await context.newPage();const failures=[];page.on("pageerror",e=>failures.push(e.message));
 try{
  await page.goto(process.env.CAD_M06_URL||"http://127.0.0.1:5174/cad/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M02 demo loaded"));
  const n=await page.locator("#modelTree button").count();
  await upload(page,"loadSemanticReview",plan);
  await page.waitForFunction(()=>document.querySelector("#semanticColumns button")!==null);
  const download=page.waitForEvent("download");await page.locator("#downloadVerticalTemplate").click();
  const dl=await download;const template=JSON.parse(await(await import("node:fs/promises")).readFile(await dl.path(),"utf8"));
  if(template.segments.length!==2||template.levels.some(l=>l.z_mm!==null)||template.vertical_sources.length)throw Error("Template invents heights");
  await upload(page,"loadVerticalReview",template);
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M06 vertical rejected"));
  await upload(page,"loadVerticalReview",good);
  await page.waitForFunction(()=>document.querySelector("#verticalStatus")?.textContent?.includes("2 provisional 3D"));
  if(!(await page.locator("#viewName").textContent())?.includes("NOT APPROVED"))throw Error("No clear draft warning");
  if(await page.locator("#sectionPanel").isVisible())throw Error("Unrelated synthetic section visible");
  const bad=structuredClone(good);bad.plan_source_sha256="c".repeat(64);
  await upload(page,"loadVerticalReview",bad);
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M06 vertical rejected"));
  if(!(await page.locator("#viewName").textContent())?.includes("NOT APPROVED"))throw Error("Bad input reset valid review");
  const noSource=structuredClone(good);noSource.levels[0].source_ids=[];
  await upload(page,"loadVerticalReview",noSource);
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M06 vertical rejected"));
  await page.locator("#clearVerticalReview").click();
  if(!(await page.locator("#viewName").textContent())?.includes("elevations unknown"))throw Error("Plan not restored");
  if((await page.locator("#modelTree button").count())!==n||failures.length)throw Error("Model damaged or runtime errors "+failures.join(","));
  console.log("M06_SOURCE_GATED_3D_BROWSER_PASS",name);
 }finally{await context.close();}
}
await browser.close();
