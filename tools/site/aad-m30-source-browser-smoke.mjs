// M30 live primary AAD studio: the full original-DXF index must be visible
// and must not inject any artificial upper beam members in IFC or the engine.
import assert from "node:assert/strict";
import {chromium} from "playwright";
const url=process.env.AAD_M30_PROJECT_URL;if(!url)throw Error("AAD_M30_PROJECT_URL missing");
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
try{
 const page=await browser.newPage({viewport:{width:1536,height:1000}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"networkidle",timeout:75000});
 const app=page.frameLocator("#aad-unified-engine");
 await app.locator("#viewer3d canvas").waitFor({timeout:60000});
 await app.locator("#aad-m30-source").waitFor({state:"visible",timeout:30000});
 const evidence=await page.locator("#aad-unified-engine").evaluate(iframe=>
  iframe.contentWindow.AADStudio.getM30SourceEvidence());
 assert.equal(evidence.architectureIndexed,371930);
 assert.equal(evidence.structureIndexed,13834);
 assert.deepEqual(Object.values(evidence.floorSheets).map(x=>x.sheetBeamMTEXT),[34,34,31]);
 assert.equal(evidence.upperFloorIFCMembersAdded,0);
 assert.equal(evidence.constructionApproval,false);
 for(const [id,label,handle] of [["gf","Ground","B000D"],["ff","First","B0452"],["sf","Second","B084F"]]){
  await app.locator("#aad-m30-floor").selectOption(id);
  const text=await app.locator("#aad-m30-floor-evidence").innerText();
  assert.ok(text.includes(label+" floor original structural sheet"));
  assert.ok(text.includes(handle));
  assert.ok(text.includes("NOT VERIFIED"));
 }
 const state=await page.locator("#aad-unified-engine").evaluate(iframe=>
  iframe.contentWindow.AADStudio.getSnapshot().assembly);
 assert.deepEqual([state.counts.column,state.counts.footing,state.counts.beam],[23,21,16]);
 assert.equal(state.elements.filter(e=>["ff","sf"].includes(e.level)&&
   ["column","beam","footing"].includes(e.kind)).length,0);
 assert.equal(errors.length,0,errors.join(" | "));
 await page.screenshot({path:"/tmp/aad-m30-source-native-upper-floors.png"});
 console.log("AAD_M30_LIVE_PRIMARY_STUDIO_SOURCE_BEAM_SHEET_EVIDENCE_PASS",
 JSON.stringify({arch:371930,structural:13834,upperBeamAnnotations:[34,31],
  trueIFCUpperMembersAdded:0,sourceQualified:true,constructionApproval:false}));
}finally{await browser.close();}
