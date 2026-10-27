import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.CAD_REFERENCE_BASE||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await page.goto(base+'codes/pokhara/',{waitUntil:'networkidle'})).status(),200);
 await page.locator('#rule-body tr').first().waitFor();assert.equal(await page.locator('#rule-body tr').count(),39);assert.equal(await page.locator('[data-reference-id]').count(),10);
 assert.match(await page.locator('#sizing-result').textContent(),/1\.7064/);assert.match(await page.locator('#sizing-result').textContent(),/requires measured infiltration/);
 await page.locator('#infiltration').fill('100');await page.locator('#wastewater-form button').click();assert.match(await page.locator('#sizing-result').textContent(),/1\.698 m internal/);
 await page.locator('#rule-search').fill('head');assert.ok(await page.locator('#rule-body tr').count()<39);await page.locator('#rule-search').fill('');await page.locator('#source-filter').selectOption('NBC208');assert.ok(await page.locator('#rule-body tr').count()>=6);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Code library overflows viewport');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:'/tmp/cad-code-library-'+width+'.png',fullPage:false});
 assert.equal((await page.goto(base+'memory-wall/',{waitUntil:'networkidle'})).status(),200);assert.equal(await page.locator('.step').count(),4);assert.match(await page.locator('main').textContent(),/same native Google Doc ID/);
 await page.locator('.toc a[href="#versions"]').click();assert.equal(await page.evaluate(()=>location.hash),'#versions');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Memory Wall overflows viewport');
 await page.screenshot({path:'/tmp/cad-memory-wall-'+width+'.png',fullPage:false});assert.deepEqual(errors,[]);await page.close();
 }console.log('CAD_CODE_LIBRARY_MEMORY_WALL_BROWSER_PASS phone/desktop; 39 rules; 10 references; hydraulic calculator; stable-document policy');
}finally{await browser.close();}
