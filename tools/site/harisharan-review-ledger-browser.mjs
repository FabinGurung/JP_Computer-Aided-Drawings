import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/jp-drawing-coordination/';
const url=new URL('projects/harisharan-adhikari/review/',base).href;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:820},acceptDownloads:true});
  const errors=[];page.on('pageerror',x=>errors.push(x.message));
  const res=await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(res?.status(),200);
  await page.waitForFunction(()=>Boolean(window.HarisharanReviewStudio),null,{timeout:25000});
  let st=await page.evaluate(()=>window.HarisharanReviewStudio.getState());
  assert.equal(st.memberCount,39);assert.equal(st.barCount,178);assert.equal(st.issueForConstruction,false);
  assert.ok(await page.locator('#review-2d svg [data-member]').count()>0);
  assert.ok(await page.locator('#review-3d svg [data-member]').count()>0);
  assert.equal(await page.locator('#review-holds .review-hold').count(),10);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'Horizontal overflow '+width);
  await page.locator('#review-2d svg [data-member="PB-A1-B1"]').click();
  st=await page.evaluate(()=>window.HarisharanReviewStudio.getState());
  assert.equal(st.member,'PB-A1-B1');
  assert.equal(await page.locator('#review-3d svg [data-member="PB-A1-B1"].active').count(),1);
  assert.equal(await page.locator('#review-members [data-member="PB-A1-B1"].active').count(),1);
  await page.locator('#review-3d svg [data-member="ST-A1-B1"]').click();
  st=await page.evaluate(()=>window.HarisharanReviewStudio.getState());assert.equal(st.member,'ST-A1-B1');
  await page.locator('#review-stage').selectOption('v03');
  st=await page.evaluate(()=>window.HarisharanReviewStudio.getState());assert.equal(st.memberCount,18);
  await page.locator('#review-mats').selectOption('1');
  st=await page.evaluate(()=>window.HarisharanReviewStudio.getState());assert.equal(st.mats,1);
  await page.locator('#review-mats').selectOption('2');
  await page.locator('#review-stage').selectOption('m80');
  st=await page.evaluate(()=>window.HarisharanReviewStudio.getState());assert.equal(st.memberCount,0);
  assert.match(await page.locator('#review-members').innerText(),/site-plan.*candidate|siting candidate/i);
  assert.match(await page.locator('#review-selected').innerText(),/architectural.*location/i);
  assert.equal((await page.evaluate(()=>window.HarisharanReviewStudio.csv('bars'))).includes('F-A1-X'),true);
  assert.deepEqual(errors,[],'No script errors on '+width);
  console.log('HARISHARAN_R1_R4_REVIEW_BROWSER_PASS',width);
  await page.close();
 }
}finally{await browser.close()}
