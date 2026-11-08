import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const url=new URL('projects/harisharan-adhikari/decisions/',base).href;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const res=await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(res?.status(),200);
  assert.equal(await page.locator('article.decision').count(),9);
  assert.equal(await page.locator('svg[role="img"]').count(),9);
  assert.match(await page.locator('h1').innerText(),/needs a decision/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'Horizontal overflow at '+width);
  assert.match(await page.locator('#tank-design .explain').innerText(),/DOES show/);
  assert.match(await page.locator('#materials-soil .explain').innerText(),/M20/);
  assert.match(await page.locator('#materials-soil .explain').innerText(),/M25/);
  assert.match(await page.locator('#footing-mats .inspect').getAttribute('href'),/\/stages\/v03\/\?member=F-A1$/);
  const audit=page.locator('#footing-mats details');
  assert.equal(await audit.evaluate(x=>x.open),false);
  await audit.locator('summary').click();
  assert.equal(await audit.evaluate(x=>x.open),true);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/harisharan-human-decisions-'+width+'.png',fullPage:true});
  console.log('HARISHARAN_VISUAL_HOLDS_BROWSER_PASS viewport='+width+' cards=9');
  await page.close();
 }
}finally{await browser.close()}