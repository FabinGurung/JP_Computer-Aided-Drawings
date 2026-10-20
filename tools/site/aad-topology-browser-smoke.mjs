import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1550,height:980},acceptDownloads:true});
const errors=[];page.on("pageerror",e=>errors.push(e.message));
try{
 const url=process.env.CAD_AAD_TEMPLATE_URL||"http://127.0.0.1:5192/JP_Computer-Aided-Drawings/cad/aad/";
 await page.goto(url,{waitUntil:"networkidle",timeout:90000});
 await page.waitForURL(/\/cad\/aad\/multistorey\//,{timeout:20000});
 await page.locator("#viewer2d .aad-wall").first().waitFor({state:"attached",timeout:35000});
 await page.waitForFunction(()=>!!window.AADStudio?.topology,null,{timeout:25000});
 assert.equal(await page.locator("#aad-derived-room-panel").count(),1);
 assert.equal(await page.locator("#aad-draw-wall").count(),1);
 const initial=await page.evaluate(()=>({count:window.AADStudio.getSnapshot().assembly.counts.door,
  rooms:window.AADStudio.getRooms("gf").length,
  walls:window.AADStudio.getSnapshot().assembly.counts.wall}));
 // Find a hosted-openings-free, long interior segment on GF without relying
 // on project-specific IDs in the canonical browser UI.
 const wall=await page.evaluate(()=>{
  const g=window.AADStudio.getSnapshot().models.gf.floorGraph,n=new Map(g.nodes.map(p=>[p.id,p]));
  const choices=[];
  for(const w of g.walls){
   const len=Math.hypot(n.get(w.a).x-n.get(w.b).x,n.get(w.a).z-n.get(w.b).z);
   const filled=g.openings.filter(o=>o.wallId===w.id).map(o=>[o.offset,o.offset+o.width]).sort((a,b)=>a[0]-b[0]);
   let cursor=.15;
   for(const [a,b] of [...filled,[len,Number.POSITIVE_INFINITY]]){
    if(a-cursor>=1.3)choices.push({id:w.id,len,offset:Math.round((cursor+.15)*1000)/1000,interior:!g.perimeter.includes(w.id)});
    cursor=Math.max(cursor,b+.15);
   }
  }
  return choices.sort((a,b)=>Number(b.interior)-Number(a.interior)||b.len-a.len)[0];
 });
 assert.ok(wall,"Need a nonoverlapping 1m host-wall segment in the source plan");
 const result=await page.evaluate(({wall})=>window.AADStudio.topology({
  level:"gf",action:"addOpening",
  args:{wallId:wall.id,kind:"door",offset:wall.offset,width:1,height:2.1,sill:0}
 }),{wall});
 assert.ok(result.result.id.startsWith("AID-"));
 const part="gf:"+result.result.id,elementId="PRJ-000007:"+part;
 assert.equal(await page.locator('[data-part="'+part+'"]').count(),1,"New hosted door must render in linked 2D plan");
 assert.equal(await page.locator('[data-element-id="'+elementId+'"]').count(),1,"Door must enter assembled BIM component schedule");
 assert.equal(await page.evaluate(()=>window.AADStudio.getSnapshot().assembly.counts.door),initial.count+1);
 assert.equal(await page.evaluate(()=>window.AADStudio.getSnapshot().assembly.elements.find(e=>e.id.endsWith(":"+window.AADStudio.getDraft().lastEdit.result.id)).source),
  "AI_AUTHORED_HOSTED_OPENING");
 const exportBtn=page.locator("#download-ifc");
 const download=page.waitForEvent("download",{timeout:15000});
 await exportBtn.click();
 const file=await download;const path="/tmp/cad-aad-topology-working.ifc";await file.saveAs(path);
 const contents=fs.readFileSync(path,"utf8");
 assert.ok(contents.includes("=IFCRELVOIDSELEMENT("));
 assert.equal((contents.match(/=IFCDOOR\(/g)||[]).length,initial.count+1,"IFC4 derived from edited model");
 await page.screenshot({path:"/tmp/cad-aad-topology-3way-ui.png",fullPage:false});
 // Save/import must permit topology mutations, then reset must remove them.
 const draft=await page.evaluate(()=>window.AADStudio.getDraft());
 assert.ok(draft.models.gf.floorGraph.openings.some(o=>o.id===result.result.id));
 await page.locator("#aad-reset").click();
 assert.equal(await page.locator('[data-part="'+part+'"]').count(),0);
 assert.equal(await page.evaluate(()=>window.AADStudio.getSnapshot().assembly.counts.door),initial.count);
 await page.evaluate(data=>localStorage.setItem("aad:unified:draft:"+data.projectId,JSON.stringify(data)),draft);
 await page.reload({waitUntil:"networkidle",timeout:70000});
 await page.waitForFunction(id=>Boolean(window.AADStudio?.getSnapshot()?.models.gf.floorGraph.openings.some(o=>o.id===id)),result.result.id,{timeout:25000});
 await page.locator("#aad-storey").selectOption("gf");
 assert.equal(await page.locator('[data-part="'+part+'"]').count(),1,"Reload must restore topology model");
 await page.locator("#aad-reset").click();
 if(errors.length)throw Error(errors.join("; "));
 console.log("AAD_TOPOLOGY_BROWSER_2D_3D_IFC_DRAFT_PASS",JSON.stringify({newDoor:result.result.id,rooms:initial.rooms,wall:wall.id}));
}finally{await page.close();await browser.close();}
