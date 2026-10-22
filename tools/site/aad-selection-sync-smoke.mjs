import {chromium} from "playwright";
import assert from "node:assert/strict";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1560,height:930}});
const errors=[];page.on("pageerror",e=>errors.push(e.message));
try{
 const canonical=process.env.CAD_AAD_TEMPLATE_URL||"http://127.0.0.1:5191/JP_Computer-Aided-Drawings/cad/aad/";
 await page.goto(canonical,{waitUntil:"networkidle",timeout:70000});
 await page.waitForURL(/\/cad\/aad\/multistorey\//,{timeout:15000});
 assert.match(page.url(),/example=narayani/);
 await page.locator("#viewer2d .aad-wall").first().waitFor({state:"attached",timeout:35000});
 await page.locator("#viewer3d canvas").waitFor({timeout:35000});
 await page.waitForFunction(()=>Boolean(window.AADStudio?.getSnapshot()?.assembly?.elements.length),null,{timeout:30000});
 assert.equal(await page.locator("#aad-selected-summary").count(),1);
 const gid="PRJ-000007:gf:EXT-01";
 const table=page.locator('[data-element-id="'+gid+'"]');
 await table.click();
 assert.equal(await table.getAttribute("aria-selected"),"true");
 assert.equal(await page.locator("#viewer3d canvas").getAttribute("data-selected-element-id"),gid);
 assert.equal(await page.locator('#viewer2d [data-part="gf:EXT-01"].is-selected').count(),1);
 assert.match(await page.locator("#aad-selected-summary").innerText(),/gf:EXT-01/);
 // A click in 2D drives the very same selected ID, row and 3D emissive/outline state.
 await page.locator('[data-part="gf:WIN01"]').first().dispatchEvent("click");
 const wid="PRJ-000007:gf:WIN01";
 assert.equal(await page.locator('[data-element-id="'+wid+'"]').getAttribute("aria-selected"),"true");
 assert.equal(await page.locator("#viewer3d canvas").getAttribute("data-selected-element-id"),wid);
 assert.equal(await page.locator('#viewer2d [data-part="gf:WIN01"].is-selected').count(),1);
 // M17: the column is a real world-coordinate 2D footprint, not a temporary locator.
 const col=page.locator('#elements tr[data-element-id*=":gf:COL:"]').first();const cid=await col.getAttribute("data-element-id");
 await col.click();
 assert.equal(await col.getAttribute("aria-selected"),"true");
 assert.equal(await page.locator("#viewer3d canvas").getAttribute("data-selected-element-id"),cid);
 assert.equal(await page.locator("#viewer2d .aad-column.is-selected").count(),1);
 assert.equal(await page.locator("#viewer2d [data-plan-selection-marker]").count(),0);
 // Check actual mouse raycasting selects another rendered object and updates all surfaces.
 const canvas=page.locator("#viewer3d canvas"),box=await canvas.boundingBox();
 let selected=cid;
 for(const [rx,ry] of [[.5,.5],[.45,.58],[.60,.55],[.45,.4],[.6,.4]]){
  await canvas.click({position:{x:box.width*rx,y:box.height*ry}});
  selected=await canvas.getAttribute("data-selected-element-id");
  if(selected&&selected!==cid)break;
 }
 assert.ok(selected&&selected!==cid,"3D mesh raycast should select a building object");
 assert.equal(await page.locator('#elements tr[data-element-id="'+selected+'"]').getAttribute("aria-selected"),"true");
 const planSelection=await page.locator("#viewer2d .is-selected").count(),marker=await page.locator("#viewer2d [data-plan-selection-marker]").count();
 assert.ok(planSelection+marker>=1,"3D selection needs a visible authored 2D highlight or explicit plan locator");
 // M18: the shared template explains the selected BIM object in plain terms.
 assert.match(await page.locator("#aad-selected-details").innerText(),/Element ID:|Editable junction node/);
 assert.equal(await page.locator("#aad-audit-register").count(),1);
 assert.equal(await page.locator("#elements > details.aad-audit-level").count(),3);
 const gf=page.locator('#elements > details[data-level="gf"]');
 assert.ok((await gf.locator("summary").first().innerText()).includes("components"));
 assert.ok(await gf.locator('details[data-discipline="Architecture"]').count()>0);
 assert.ok(await gf.locator('details[data-discipline="Structure"]').count()>0);
 assert.ok(await gf.locator('details[data-kind="column"]').count()>0);
 await page.locator("#aad-audit-storey").selectOption("ff");
 assert.equal(await page.locator("#elements > details.aad-audit-level").count(),1);
 assert.equal(await page.locator("#elements > details.aad-audit-level").first().getAttribute("data-level"),"ff");
 await page.locator("#aad-audit-discipline").selectOption("Structure");
 assert.ok((await page.locator("#elements tr").count())>0);
 assert.equal(await page.locator('#elements details[data-discipline="Architecture"]').count(),0);
 await page.locator("#aad-audit-kind").selectOption("column");
 assert.ok((await page.locator("#elements tr").count())>0);
 assert.equal(await page.locator('#elements details[data-kind="beam"]').count(),0);
 await page.locator("#aad-audit-sort").selectOption("x");
 const coords=await page.locator("#elements tr td:nth-child(5)").allInnerTexts();
 const valid=coords.map(Number).filter(Number.isFinite);
 assert.ok(valid.every((x,i)=>i===0||x>=valid[i-1]-1e-6),"World-X sort must be ascending");
 await page.locator("#aad-audit-search").fill("NO_MATCH_999");
 assert.equal(await page.locator("#elements tr").count(),0);
 assert.match(await page.locator("#aad-audit-count").innerText(),/Showing 0/);
 await page.locator("#aad-audit-clear").click();
 assert.equal(await page.locator("#elements > details.aad-audit-level").count(),3);
 // A selection originating outside the register must reveal the correct
 // filtered-out row and open all its ancestor groups.
 await page.locator("#aad-audit-kind").selectOption("beam");
 assert.equal(await page.locator('#elements tr[data-element-id="PRJ-000007:gf:EXT-01"]').count(),0);
 assert.equal(await page.evaluate(()=>window.AADStudio.selectElementById("PRJ-000007:gf:EXT-01")),true);
 assert.equal(await page.locator("#aad-audit-kind").inputValue(),"all");
 assert.equal(await page.locator('#elements tr[data-element-id="PRJ-000007:gf:EXT-01"]').getAttribute("aria-selected"),"true");
 const wallGroups=await page.locator('#elements tr[data-element-id="PRJ-000007:gf:EXT-01"]').evaluate(n=>{
  const groups=[];for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==="DETAILS")groups.push(p.open);
  return groups;
 });
 assert.ok(wallGroups.length===3&&wallGroups.every(Boolean));
 // The orange dot is a topology control handle when a wall-graph node is
 // selected, not a column or an additional physical IFC element.
 await page.locator("#aad-storey").selectOption("gf");
 await page.locator("#viewer2d .aad-node").first().dispatchEvent("click");
 assert.match(await page.locator("#aad-selected-details").innerText(),/wall-graph geometry control point/);
 assert.match(await page.locator("#aad-selected-details").innerText(),/NOT a concrete column/);
 assert.match(await page.locator("#aad-selected-details").innerText(),/orange 3D dot/);
 assert.ok((await page.locator("#viewer2d .aad-node.is-selected").count())===1);
 // Programmatic AI action interface shares exact same validation and render path.
 const result=await page.evaluate(()=>window.AADStudio.change({level:"gf",kind:"wall",id:"EXT-01",patch:{thickness:.31}}));
 assert.ok(result.version>0);
 assert.equal(await page.locator('[data-part="gf:EXT-01"]').getAttribute("stroke-width"),"0.31");
 await page.locator("#aad-reset").click();
 assert.equal(await page.locator('[data-part="gf:EXT-01"]').getAttribute("stroke-width"),"0.23");
 await page.screenshot({path:"/tmp/cad-aad-shared-highlight-selection.png",fullPage:false});
 if(errors.length)throw Error(errors.join("; "));
 console.log("AAD_TEMPLATE_2D_3D_TABLE_SELECTION_SYNC_PASS",{selectedFrom3d:selected,viewport:"same shared engine"});
}finally{await page.close();await browser.close();}
