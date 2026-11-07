import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PROJECT_SITE_URL??'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const url=new URL('projects/harisharan-adhikari/upper-floors/',base).href;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:820},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const res=await page.goto(url,{waitUntil:'domcontentloaded'});assert.equal(res?.status(),200,url);
  await page.waitForFunction(()=>Boolean(window.HarisharanUpperFloorReview),null,{timeout:25000});
  let s=await page.evaluate(()=>window.HarisharanUpperFloorReview.getState());
  assert.equal(s.rows,90);assert.equal(s.approved,false);assert.equal(s.floorId,'ground');assert.equal(s.grid,'A1');
  assert.equal(await page.locator('#choices button').count(),18);
  assert.equal(await page.locator('#table tbody tr').count(),18);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+3),'unexpected mobile horizontal overflow');
  await page.locator('#choices button[data-grid="B4"]').click();
  s=await page.evaluate(()=>window.HarisharanUpperFloorReview.getState());assert.equal(s.grid,'B4');
  assert.match(await page.locator('#selected').innerText(),/UF-GROUND-B4/);
  await page.locator('#floor').selectOption('fourth');
  s=await page.evaluate(()=>window.HarisharanUpperFloorReview.getState());
  assert.equal(s.floorId,'fourth');assert.equal(s.rows,90);assert.equal(s.approved,false);
  assert.match(await page.locator('#selected').innerText(),/UF-FOURTH-B4/);
  await page.locator('#height').fill('2.8');await page.locator('#height').dispatchEvent('change');
  s=await page.evaluate(()=>window.HarisharanUpperFloorReview.getState());
  assert.equal(s.nominalLengthM,2.8);
  await page.locator('#plan g[data-grid="A1"]').click();
  s=await page.evaluate(()=>window.HarisharanUpperFloorReview.getState());assert.equal(s.grid,'A1');
  assert.equal(await page.locator('#elevation g[data-floor="fourth"]').count(),1);
  const downloadWait=page.waitForEvent('download');
  await page.locator('#download').click();
  const download=await downloadWait;assert.match(download.suggestedFilename(),/NOT_FOR_CONSTRUCTION\.csv/);
  assert.deepEqual(errors,[],'Page script errors');
  await page.close();
  console.log('HARISHARAN_UPPER_FLOOR_R3_BROWSER_PASS width='+width+' sourceEntries=90 floor=fourth');
 }
}finally{await browser.close()}
