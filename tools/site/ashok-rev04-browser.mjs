import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.ASHOK_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/projects/ashok-adhikari/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
try{
 for(const width of [390,820,1440]){
  const page=await browser.newPage({viewport:{width,height:950},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base,{waitUntil:'networkidle',timeout:90000});
  assert.equal(response.status(),200);assert.equal(await page.locator('body').getAttribute('data-cad-route'),'projects/ashok-adhikari/');
  const frame=page.frameLocator('#ashok-engine');
  await frame.locator('#viewer3d canvas').waitFor({timeout:45000});
  await frame.locator('#action-status').filter({hasText:'Shared AAD building assembly ready'}).waitFor({timeout:45000});
  const result=await page.locator('#ashok-engine').evaluate(f=>f.contentWindow.AADStudio.getSnapshot().assembly);
  assert.equal(result.projectId,'ashok-adhikari');assert.equal(result.levels.length,2);assert.equal(result.counts.wall,24);
  assert.equal(result.counts.column,undefined);assert.equal(result.counts.slab,undefined);
  await frame.locator('#aad-storey').selectOption('gf');
  const parity=await page.locator('#ashok-engine').evaluate(f=>{
   const s=f.contentWindow.AADStudio,b=s.getSnapshot().assembly;
   return s.getViewCoordinateProof(b.elements.find(e=>e.kind==='wall'&&e.level==='gf').id);
  });
  assert.ok(parity.mesh&&parity.plan&&parity.table);
  for(const axis of ['x','z'])for(const target of ['mesh','plan','table'])assert.ok(Math.abs(parity.model[axis]-parity[target][axis])<.001);
  await frame.locator('#viewer3d').screenshot({path:'/tmp/ashok-rev04-model-'+width+'.png'});
  await page.locator('[data-view="plans"]').click();
  assert.ok(await page.locator('#panel-plans').isVisible());
  for(const img of await page.locator('#panel-plans img').all())assert.ok(await img.evaluate(n=>n.complete&&n.naturalWidth>0));
  await page.locator('[data-view="visuals"]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#panel-visuals img')].every(n=>n.complete&&n.naturalWidth>0));
  await page.locator('[data-view="qa"]').click();await page.locator('#qa-notes').fill('GF-D-MAIN — test review note');
  const downloaded=page.waitForEvent('download');await page.locator('#export-qa').click();
  assert.equal((await downloaded).suggestedFilename(),'Ashok_REV04_QA_Notes.json');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Horizontal page overflow');
  await page.screenshot({path:'/tmp/ashok-rev04-qa-'+width+'.png',fullPage:false});
  await page.locator('[data-view="studio"]').click();await page.screenshot({path:'/tmp/ashok-rev04-studio-'+width+'.png',fullPage:false});
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('ASHOK_REV04_BROWSER_PASS mobile/tablet/desktop; shared 2D/3D/table; sources; visuals; notes');
}finally{await browser.close();}
