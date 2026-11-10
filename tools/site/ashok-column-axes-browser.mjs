import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/jp-drawing-coordination/';
const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const p=await b.newPage({viewport});
  const errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  let res=await p.goto(base+'projects/ashok-adhikari/?edition=v3-2&panel=views&phase=gf&layout=split#views',{waitUntil:'domcontentloaded'});
  assert.equal(res.status(),200);
  await p.waitForFunction(()=>window.ProjectWorkspace?.getDrawing()?.getState()?.ready,null,{timeout:65000});
  const frame=p.frameLocator('#ashok-engine');
  await frame.locator('[data-column-axis-overlay="review"]').waitFor({timeout:20000});
  assert.equal(await frame.locator('[data-axis-line]').count(),8);
  assert.equal(await frame.locator('[data-axis-direction="letter"]').count(),6);
  assert.equal(await frame.locator('[data-axis-direction="number"]').count(),10);
  assert.equal(await frame.locator('[data-column-axis-node]').count(),14);
  assert.equal(await frame.locator('[data-column-axis-node="C1"]').count(),0);
  assert.equal(await frame.locator('[data-column-axis-id]').count(),14);
  await frame.locator('[data-column-axis-id="A1"]').click();
  assert.match(await frame.locator('#aad-selected-details').innerText(),/Column-axis location A1/);
  await frame.locator('#aad-column-axes').uncheck();
  assert.equal(await frame.locator('[data-column-axis-overlay="review"]').count(),0);
  await frame.locator('#aad-column-axes').check();
  assert.equal(await frame.locator('[data-column-axis-node="B3"]').count(),1);
  assert.equal(await frame.locator('#viewer3d canvas').isVisible(),true);
  await p.locator('#pw-phase').selectOption('ff');
  await p.waitForFunction(()=>window.ProjectWorkspace.getDrawing().getState().phase==='ff');
  assert.equal(await frame.locator('[data-column-axis-node]').count(),14);
  assert.equal(await frame.locator('[data-column-axis-id="C5"]').count(),1);
  res=await p.goto(base+'projects/ashok-adhikari/v3-2-compare/',{waitUntil:'domcontentloaded'});
  assert.equal(res.status(),200);
  await p.locator('[data-axis-view="comparison"] [data-column-axis-overlay="review"]').first().waitFor({timeout:25000});
  assert.equal(await p.locator('[data-axis-view="comparison"] [data-column-axis-overlay="review"]').count(),3);
  assert.equal(await p.locator('[data-axis-view="comparison"] [data-column-axis-node="C1"]').count(),0);
  assert.equal(await p.locator('[data-axis-view="comparison"] [data-column-axis-node="A1"]').count(),3);
  await p.locator('#compare-axes').uncheck();
  assert.equal(await p.locator('[data-axis-view="comparison"]').first().evaluate(x=>getComputedStyle(x).display),'none');
  assert.deepEqual(errors,[]);
  await p.close();
  console.log('ASHOK_COLUMN_AXES_BROWSER_PASS',viewport.width);
 }
}finally{await b.close();}
