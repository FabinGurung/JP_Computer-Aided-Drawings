import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const p=await browser.newPage({viewport}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  let res=await p.goto(base+'projects/ashok-adhikari/?edition=v3-2&panel=views&phase=ff&layout=split#views',{waitUntil:'domcontentloaded'});
  assert.equal(res.status(),200);
  await p.waitForFunction(()=>window.ProjectWorkspace?.getDrawing()?.getState()?.ready,null,{timeout:65000});
  assert.equal(await p.evaluate(()=>window.ProjectWorkspace.getState().edition),'v3-2');
  assert.equal(await p.locator('#pw-phase').inputValue(),'ff');
  const frame=p.frameLocator('#ashok-engine');
  await frame.locator('#aad-grid-hud').waitFor({state:'visible',timeout:20000});
  assert.equal(await frame.locator('#viewer2d').isVisible(),true);
  assert.equal(await frame.locator('#viewer3d canvas').isVisible(),true);
  const proof=await p.locator('#ashok-engine').evaluate(el=>{
   const s=el.contentWindow.AADStudio.getSnapshot(),n=Object.fromEntries(s.models.ff.floorGraph.nodes.map(v=>[v.id,v]));
   return{xs:['FF-N014','FF-N016','FF-N017','FF-N018'].map(id=>n[id].x),grid:s.manifest.presentation.coordinateGrid.baseCellMm,issue:s.manifest.restrictions.issueForConstruction};
  });
  assert.deepEqual(proof.xs,[3.6,3.6,3.6,3.6]);assert.equal(proof.grid,100);assert.equal(proof.issue,false);
  await p.locator('#pw-phase').selectOption('gf');
  await p.waitForFunction(()=>window.ProjectWorkspace.getDrawing().getState().phase==='gf');
  const gfX=await p.locator('#ashok-engine').evaluate(el=>el.contentWindow.AADStudio.getSnapshot().models.gf.floorGraph.nodes.find(v=>v.id==='GF-N017').x);
  assert.equal(gfX,3.6);
  res=await p.goto(base+'projects/ashok-adhikari/v3-2-compare/',{waitUntil:'domcontentloaded'});
  assert.equal(res.status(),200);
  await p.locator('svg[data-grid-plan][data-ready="true"]').first().waitFor({timeout:20000});
  assert.equal(await p.locator('svg[data-grid-plan][data-ready="true"]').count(),3);
  assert.match(await p.locator('#coord-readout').innerText(),/100 mm/);
  assert.deepEqual(errors,[]);
  await p.close();
  console.log('ASHOK_V3_2_LINKED_2D_3D_AND_COMPARE_BROWSER_PASS',viewport.width);
 }
}finally{await browser.close();}
