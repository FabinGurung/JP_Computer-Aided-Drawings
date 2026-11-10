import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/jp-drawing-coordination/';
const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});
 const response=await p.goto(base+'projects/ashok-adhikari/?edition=v3-grid&panel=views&phase=gf&layout=split#views',{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200);
 await p.waitForFunction(()=>window.ProjectWorkspace?.getDrawing()?.getState()?.ready,null,{timeout:65000});
 assert.equal(await p.evaluate(()=>window.ProjectWorkspace.getState().edition),'v3-grid');
 const frame=p.frameLocator('#ashok-engine');
 await frame.locator('#aad-grid-hud').waitFor({state:'visible',timeout:20000});
 assert.match(await frame.locator('#aad-grid-hud').innerText(),/100 mm|100mm/);
 const proof=await p.locator('#ashok-engine').evaluate(el=>{
 const w=el.contentWindow,doc=el.contentDocument,s=w.AADStudio.getSnapshot(),g=s.models.gf.floorGraph,ns=Object.fromEntries(g.nodes.map(n=>[n.id,n]));
 const walls=['GF-BED-KITCHEN','GF-BATH-LOUNGE-V3','GF-HALL-LOW-1'].map(id=>{const v=g.walls.find(x=>x.id===id);return[ns[v.a].x,ns[v.b].x];});
 return {walls,grid:s.manifest.presentation.coordinateGrid,lines:doc.querySelectorAll('[data-owner-grid-datum-mm="3600"]').length,stair:doc.querySelectorAll('[data-unresolved-stair-datum-mm="4175"]').length,copy:!!doc.querySelector('#aad-grid-copy'),review:s.manifest.restrictions.issueForConstruction};
 });
 assert.deepEqual(proof.walls,[[3.6,3.6],[3.6,3.6],[3.6,3.6]]);
 assert.equal(proof.grid.baseCellMm,100);assert.ok(proof.lines>=1);assert.ok(proof.stair>=1);assert.ok(proof.copy);assert.equal(proof.review,false);
 await p.locator('#pw-phase').selectOption('ff');
 await p.waitForFunction(()=>window.ProjectWorkspace.getDrawing().getState().phase==='ff');
 const win=await p.locator('#ashok-engine').evaluate(el=>el.contentWindow.AADStudio.getSnapshot().models.ff.floorGraph.openings.filter(o=>o.wallId==='FF-STAIR-REAR-1'&&o.kind==='window'));
 assert.equal(win.length,1);
 await p.locator('#pw-edition').selectOption('v3');
 await p.waitForFunction(()=>window.ProjectWorkspace?.getDrawing()?.getState()?.ready&&window.ProjectWorkspace.getState().edition==='v3',null,{timeout:65000});
 const prev=await p.locator('#ashok-engine').evaluate(el=>{const s=el.contentWindow.AADStudio.getSnapshot(),n=s.models.gf.floorGraph.nodes.find(x=>x.id==='GF-N017');return n.x;});
 assert.equal(prev,3.3,'Old v3 edition preserved');
 await p.close();
 console.log('ASHOK_GRID_LIVE_VIEW_AND_V3_PRESERVATION_PASS');
}finally{await b.close();}
