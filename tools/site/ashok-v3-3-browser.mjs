import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const p=await browser.newPage({viewport}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const res=await p.goto(base+'projects/ashok-adhikari/?edition=v3-3&panel=views&phase=ff&layout=split#views',{waitUntil:'domcontentloaded'});
  assert.equal(res.status(),200);
  await p.waitForFunction(()=>window.ProjectWorkspace?.getDrawing()?.getState()?.ready,null,{timeout:65000});
  assert.equal(await p.evaluate(()=>window.ProjectWorkspace.getState().edition),'v3-3');
  assert.equal(await p.locator('#pw-phase').inputValue(),'ff');
  const frame=p.frameLocator('#ashok-engine');
  await frame.locator('#aad-grid-hud').waitFor({state:'visible',timeout:20000});
  assert.equal(await frame.locator('#viewer2d').isVisible(),true);
  assert.equal(await frame.locator('#viewer3d canvas').isVisible(),true);
  const report=await p.locator('#ashok-engine').evaluate(el=>{
   const w=el.contentWindow,s=w.AADStudio.getSnapshot();
   const axes=s.manifest.presentation.columnAxisGrid;
   const ff=s.models.ff.floorGraph;
   const window=ff.openings.find(o=>o.id==='FF-W009-C4-C2-OWNER-20261112');
   const door=ff.openings.find(o=>o.id==='FF-D-LOUNGE-MAIN');
   const markers=s.manifest.presentation.elements.filter(e=>e.kind==='column'&&e.axisReference?.startsWith('B'));
   const element=s.assembly.elements.find(e=>e.id?.endsWith('FF-W009-C4-C2-OWNER-20261112'));
   return{phase:w.AADStudio.getViewportProof().activeLevel,axes:axes.letterAxes.map(a=>a.xMm),
    window:{offset:window?.offset,width:window?.width,host:window?.wallId,rendered:Boolean(element)},
    door:{offset:door?.offset,host:door?.wallId},markers:markers.map(e=>e.x),
    issued:s.manifest.restrictions.issueForConstruction};
  });
  assert.equal(report.phase,'ff');
  assert.deepEqual(report.axes,[150,3600,7050]);
  assert.equal(report.markers.length,10);
  assert.ok(report.markers.every(x=>x===3.6));
  assert.deepEqual(report.window,{offset:2.435,width:2.1,host:'FF-EXT-04-1',rendered:true});
  assert.deepEqual(report.door,{offset:.55,host:'FF-MAIN-BAND-3'});
  assert.equal(report.issued,false);
  const direct=new URL(await p.locator('#pw-edit-direct').getAttribute('href'));
  assert.equal(direct.searchParams.get('phase'),'ff');
  await p.locator('#pw-phase').selectOption('gf');
  await p.waitForFunction(()=>window.ProjectWorkspace.getDrawing().getState().phase==='gf');
  assert.equal(new URL(await p.locator('#pw-edit-direct').getAttribute('href')).searchParams.get('phase'),'gf');
  assert.deepEqual(errors,[]);
  await p.close();
  console.log('ASHOK_V3_3_REVIEW_ONLY_LINKED_GF_FF_BROWSER_PASS',viewport.width);
 }
}finally{await browser.close();}
