import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const url=new URL('projects/harisharan-adhikari/owner-review/',base).href;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:820}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(response?.status(),200);
  await page.waitForFunction(()=>Boolean(window.HarisharanR5Review),null,{timeout:20000});
  const s=await page.evaluate(()=>window.HarisharanR5Review.getSummary());
  assert.equal(s.issueForConstruction,false);assert.equal(s.ownerDirections,9);
  assert.equal(s.footingCases,8);assert.equal(s.tankCases,3);assert.equal(s.dowelBars,3);
  assert.equal(s.fullPrism,67.23);assert.equal(s.existingTank,9720);assert.equal(s.targetTank,16000);
  assert.equal(await page.locator('#directions article').count(),9);
  assert.equal(await page.locator('#footingTable tbody tr').count(),8);
  assert.equal(await page.locator('#dowelTable tbody tr').count(),3);
  assert.equal(await page.locator('#tankTable tbody tr').count(),3);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'horizontal overflow '+width);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/harisharan-r5-owner-scenarios-'+width+'.png',fullPage:true});
  console.log('HARISHARAN_R5_OWNER_RESEARCH_BROWSER_PASS viewport='+width);
  await page.close();
 }
}finally{await browser.close()}