import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of [390,1440]){
  const p=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const res=await p.goto(root+'projects/harisharan-adhikari/rear-nine/',{waitUntil:'domcontentloaded'});
  assert.equal(res?.status(),200);
  await p.waitForFunction(()=>Boolean(window.HarisharanRearNine),null,{timeout:25000});
  let data=await p.evaluate(()=>window.HarisharanRearNine.getState());
  assert.equal(data.scope.columns,9);assert.equal(data.scope.footings,9);
  assert.equal(data.scope.strapBeams,6);assert.equal(data.scope.plinthTotal,15);
  assert.equal(await p.locator('[data-node-choice]:checked').count(),9);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile overflow '+width);
  assert.equal(await p.locator('.qa-list li').count(),8);
  await p.locator('#stage-filter').selectOption('Column verticals');
  const first=await p.locator('[data-bar-id][data-bar-field=count]').first();
  const initial=Number(await first.inputValue());
  await first.fill(String(initial+1));await first.dispatchEvent('change');
  assert.match(await p.locator('#saved-label').innerText(),/Saved locally/);
  const draftDl=p.waitForEvent('download');
  await p.locator('#export-json').click();
  const download=await draftDl;
  assert.match(download.suggestedFilename(),/harisharan-nine-columns-draft/);
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>Boolean(window.HarisharanRearNine));
  assert.equal(Number(await p.locator('[data-bar-field=count]').first().inputValue()),initial+1);
  await p.locator('#group-select').selectOption('front');
  data=await p.evaluate(()=>window.HarisharanRearNine.getState());
  assert.equal(data.scope.columns,9);
  assert.deepEqual(data.selectedIds,['A1','B1','F1','A2','B2','F2','A3','B3','F3']);
  assert.equal(await p.locator('#bar-table .approved-badge').count(),0);
  await p.locator('#include-boundary').uncheck();
  data=await p.evaluate(()=>window.HarisharanRearNine.getState());
  assert.equal(data.scope.plinthTotal,12);
  assert.deepEqual(errors,[]);
  await p.close();
  console.log('HARISHARAN_REAR_NINE_BROWSER_PASS width='+width);
 }
}finally{await browser.close()}
