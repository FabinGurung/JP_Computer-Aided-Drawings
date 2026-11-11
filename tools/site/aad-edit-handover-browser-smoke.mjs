/* Real browser audit: one selected component, local deletion, reversible JSON patch, export. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "playwright";
const base=process.env.CAD_SITE_URL||"http://127.0.0.1:5191/JP_Computer-Aided-Drawings/";
const editor=new URL("cad/aad/multistorey/",base);
editor.searchParams.set("manifest",new URL("data/projects/design-studio-sandbox/aad-building-v1.json",base).pathname);
editor.searchParams.set("sandbox","1");
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
try{
 const page=await browser.newPage({viewport:{width:1360,height:940},acceptDownloads:true});
 const r=await page.goto(editor.href,{waitUntil:"networkidle",timeout:80000});
 assert(r?.ok(),"Design Studio editor page must load");
 await page.waitForFunction(()=>window.AADStudio?.getChangeSet()?.schema==="jp-cad://aad-edit-change-set/1",{timeout:60000});
 const initial=await page.evaluate(()=>window.AADStudio.getChangeSet());
 assert.equal(initial.events.length,0);
 assert.equal(initial.projectId,"AAD-SANDBOX-001");
 assert.equal(await page.locator("#aad-edit-mode").getAttribute("aria-pressed"),"true");
 const newWall=await page.evaluate(()=>{
  const out=window.AADStudio.topology({level:"gf",action:"addWall",
   args:{start:{x:2,z:3},end:{x:6,z:3},thickness:.15}});
  return out.result.ids[0];
 });
 assert(newWall,"new wall ID missing");
 await page.waitForFunction(()=>window.AADStudio.getChangeSet()?.events.length===1);
 const id="AAD-SANDBOX-001:gf:"+newWall;
 assert.equal(await page.evaluate(id=>window.AADStudio.selectElementById(id),id),true);
 await page.locator("#aad-edit-delete-selected").click();
 await page.waitForFunction(()=>window.AADStudio.getChangeSet()?.events.length===2);
 const end=await page.evaluate(()=>({j:window.AADStudio.getChangeSet(),model:window.AADStudio.getSnapshot()}));
 assert.deepEqual(end.j.events.map(e=>e.kind),["topology:addWall","topology:removeWall"]);
 assert.equal(end.j.finalFingerprint.startsWith("fnv1a64:"),true);
 assert.equal(end.model.manifest.restrictions.issueForConstruction,false);
 assert.match(await page.locator("#aad-edit-handover").inputValue(),/AAD_BROWSER_EDIT_HANDOVER_V1/);
 assert.match(await page.locator("#aad-edit-handover").inputValue(),/ENGINEERING_HOLD_NOT_ISSUED/);
 await page.locator("#aad-edit-mode").click();
 assert.equal(await page.locator("#aad-edit-mode").getAttribute("aria-pressed"),"false");
 const locked=await page.evaluate(()=>{
  try{window.AADStudio.topology({level:"gf",action:"addWall",
   args:{start:{x:1,z:1},end:{x:1,z:4}}});return false;}
  catch(e){return /View only/.test(e.message);}
 });
 assert(locked,"View mode must block edits even through command API");
 await page.locator("#aad-edit-mode").click();
 assert.equal(await page.locator("#aad-edit-mode").getAttribute("aria-pressed"),"true");
 const clickWait=page.waitForEvent("download",{timeout:12000});
 await page.locator("#aad-edit-download-handover").click();
 const file=await clickWait;
 assert(file.suggestedFilename().endsWith("_AAD_LOCAL_EDIT_CHANGESET.json"));
 const bytes=JSON.parse(readFileSync(await file.path(),"utf8"));
 assert.equal(bytes.events.length,2);
 assert.equal(bytes.projectId,initial.projectId);
 await page.reload({waitUntil:"networkidle",timeout:80000});
 await page.waitForFunction(()=>window.AADStudio?.getChangeSet()?.events.length===2,{timeout:60000});
 assert.equal(await page.locator("#aad-edit-history-list li").count(),2);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 await mobile.goto(editor.href,{waitUntil:"networkidle",timeout:80000});
 await mobile.waitForFunction(()=>window.AADStudio?.getChangeSet()?.projectId==="AAD-SANDBOX-001",{timeout:60000});
 assert.equal(await mobile.locator("#aad-edit-delete-selected").count(),1);
 assert.equal(await mobile.locator("#aad-edit-download-handover").count(),1);
 await mobile.locator("#aad-edit-mode").tap();
 assert.equal(await mobile.locator("#aad-edit-mode").getAttribute("aria-pressed"),"false");
 await mobile.close();
 console.log("AAD_BROWSER_EDIT_HISTORY_EXPORT_PASS",JSON.stringify({selectedDelete:true,replayablePatches:true,viewLock:true,reload:true,download:true,mobileControls:true,events:bytes.events.length}));
}finally{await browser.close();}
