import {chromium} from 'playwright';import assert from 'node:assert/strict';
const url=process.env.HARISHARAN_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/projects/harisharan-adhikari/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const response=await page.goto(url);assert.equal(response.status(),200);await page.waitForFunction(()=>document.getElementById('steel-net')?.textContent.includes('t'));
 assert.ok((await page.locator('#cement-net').innerText()).includes('713.0'));assert.ok((await page.locator('#steel-net').innerText()).includes('11.49'));
 assert.equal(await page.locator('#issues details').count(),8);assert.equal(await page.locator('#source-files p').count(),3);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'body overflow');
 await page.locator('#view-plan').click();assert.ok(await page.locator('#plan').isVisible());assert.equal(await page.locator('#plan svg rect').count(),36);await page.locator('#plan [data-item]').first().press('Enter');assert.ok((await page.locator('#selection').innerText()).includes('PAD-'));
 await page.locator('.settings summary').click();await page.locator('#tie-scenario').selectOption('10');await page.waitForFunction(()=>document.querySelector('#diameters')?.textContent.includes('10 mm'));
 await page.locator('#mats').selectOption('1');const lower=await page.locator('#steel-net').innerText();assert.notEqual(lower,'11.49 t');await page.locator('#reset-inputs').click();assert.ok((await page.locator('#steel-net').innerText()).includes('11.49'));
 await page.locator('#cement-content').fill('400');await page.locator('#cement-content').dispatchEvent('change');assert.ok((await page.locator('#cement-net').innerText()).includes('809.7'));await page.locator('#reset-inputs').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#download-steel').click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('PROVISIONAL_steel.csv'));
 await page.locator('#view-3d').click();assert.ok(await page.locator('#viewer canvas').isVisible());await page.locator('#model').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/harisharan-${name}.png`,fullPage:false});assert.deepEqual(errors,[]);await page.close();
 }console.log('HARISHARAN_BROWSER_QA_PASS desktop/mobile, view switch, selection, assumptions, export, privacy');}finally{await browser.close();}
