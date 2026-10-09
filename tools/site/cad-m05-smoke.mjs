import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader"]});
const page=await browser.newPage({viewport:{width:1450,height:980}});
const errors=[];page.on("pageerror",e=>errors.push(e.message));
const src={source_id:"TEST-SRC",file_sha256:"a".repeat(64),layout_sha256:"b".repeat(64),units:"mm",dxf_version:"AC1021"};
const columns=[
{grid:"A1",column_type:"C1",shape:"rectangular",x_mm:0,y_mm:0,width_mm:400,depth_mm:400,source_handle:"AD86B",native_centre_global_mm:[1000,2000],native_bbox_mm:[800,1800,1200,2200],residual_mm:0,geometry_review:"DXF_BLOCK_GEOMETRY_CHECKED",vertical_review:"HEIGHT_AND_ELEVATION_UNVERIFIED",z_mm:null,height_mm:null},
{grid:"A2",column_type:"C4",shape:"circular",x_mm:0,y_mm:3600,width_mm:350,depth_mm:350,source_handle:"AD86C",native_centre_global_mm:[1000,5600],native_bbox_mm:[825,5425,1175,5775],residual_mm:0,geometry_review:"DXF_BLOCK_GEOMETRY_CHECKED",vertical_review:"HEIGHT_AND_ELEVATION_UNVERIFIED",z_mm:null,height_mm:null}
];
const pkg={schema:"fabin-cad://semantic-column-review/0.1",status:"SEMANTIC_PLAN_REVIEW_ONLY",project_id:"TEST-001",source:src,
alignment:{method:"TRANSFORMED_INSERT_BLOCK_BBOX_CENTRE_TRANSLATION",rotation_deg:0,scale:1,translation_global_from_grid_mm:[1000,2000],tolerance_mm:1,maximum_residual_mm:0},
columns,qa:{column_count:2,all_source_handles_unique:true,plan_geometry_gate:"CHECKED_FOR_2D_REVIEW_ONLY",vertical_geometry_gate:"HOLD_UNTIL_ELEVATIONS_AND_HEIGHTS_VERIFIED",construction_gate:"NOT_FIELD_ISSUED",semantic_promotion:"BLOCKED"}};
async function upload(value,file="semantic.json"){await page.locator("#loadSemanticReview").setInputFiles({name:file,mimeType:"application/json",buffer:Buffer.from(JSON.stringify(value))});}
try{
 await page.goto(process.env.CAD_M05_URL||"http://127.0.0.1:5174/cad/",{waitUntil:"domcontentloaded",timeout:45000});
 await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M02 demo loaded"),undefined,{timeout:35000});
 const objects=await page.locator("#modelTree button").count();
 await upload(pkg);
 await page.waitForFunction(()=>document.querySelector("#semanticReviewStatus")?.textContent?.includes("2 CAD-reconciled 2D columns"));
 if((await page.locator("#semanticColumns button").count())!==2)throw Error("Missing columns");
 if((await page.locator("#modelTree button").count())!==objects)throw Error("Semantic import mutated draft model");
 if(await page.locator(".section-view").getAttribute("hidden")===null)throw Error("Synthetic section is still visible");
 await page.locator("#semanticColumns button[data-grid='A2']").click();
 if(!(await page.locator("#semanticSelection").textContent())?.includes("AD86C"))throw Error("Handle detail not linked");
 const invalid=structuredClone(pkg);invalid.columns[0].height_mm=3000;
 await upload(invalid,"bad.json");
 await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M05 review rejected:"));
 if((await page.locator("#semanticColumns button").count())!==2)throw Error("Rejected data destroyed old state");
 const corrupt=structuredClone(pkg);corrupt.columns[1].native_centre_global_mm=[1000,5900];
 await upload(corrupt,"bad2.json");
 await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("M05 review rejected:"));
 await page.locator("#clearSemanticReview").click();
 if((await page.locator("#semanticColumns button").count())!==0)throw Error("Clear failed");
 if(await page.locator(".section-view").getAttribute("hidden")!==null)throw Error("Canonical section not restored");
 if(errors.length)throw Error(errors.join("|"));
 console.log("CAD_M05_SOURCE_HANDLE_PLAN_QA_PASS",{columns:2,shapes:["rectangular","circular"],draftPreserved:true,block3DPromotion:true,alignmentRejected:true,errors:0});
}catch(e){console.error("STATUS",await page.locator("#status").textContent().catch(()=>""),errors);throw e;}finally{await browser.close();}
