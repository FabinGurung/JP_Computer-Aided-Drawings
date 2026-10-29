import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const url=process.env.ASHOK_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/projects/ashok-adhikari/';
const key='aad-site-pins-v2:ashok-adhikari';
const seed=[{xMm:1130,yMm:17053,label:'Soak pit'},{xMm:1746,yMm:8281,label:'Septic tank'}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
try{
 for(const [width,height,touch]of [[320,740,true],[844,390,true],[1440,950,false]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,seed,corrupt})=>{if(!sessionStorage.getItem('ashok-usability-seeded')){localStorage.setItem(key,JSON.stringify(corrupt?{invalid:'not a pin list'}:seed));sessionStorage.setItem('ashok-usability-seeded','1');}},{key,seed,corrupt:width===320});
  await page.goto(url,{waitUntil:'networkidle',timeout:90000});
  const frame=page.frameLocator('#ashok-engine');
  const ready=()=>frame.locator('#action-status').filter({hasText:'Shared AAD building assembly ready'}).waitFor({timeout:45000});
  await ready();
  const expected=width===320?0:2;
  // No mouse movement before these assertions: startup must restore saved feedback.
  assert.equal(await frame.locator('#aad-site-pins li').count(),expected);
  assert.equal(await frame.locator('[data-feedback-pin]').count(),expected);
  const pins=async()=>{const wait=page.waitForEvent('download');await frame.locator('#aad-export-pins').click();const d=await wait;return JSON.parse(fs.readFileSync(await d.path(),'utf8'));};
  assert.equal((await pins()).pins.length,expected,'Download before map interaction must include saved pins');
  await page.locator('#tab-studio').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#tab-plans').getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');assert.equal(await page.locator('#tab-qa').getAttribute('aria-selected'),'true');
  assert.match(await page.locator('#ashok-workbook-purpose').textContent(),/Editing Excel does not move/);
  assert.equal(await page.locator('#ashok-roadmap li').count(),4);
  await page.keyboard.press('Home');assert.equal(await page.locator('#tab-studio').getAttribute('aria-selected'),'true');
  await frame.locator('#aad-mep-view').click();
  await frame.locator('#aad-mep-visible').uncheck();
  assert.equal(await frame.locator('[data-mep-overlay]').count(),0);
  assert.equal(await frame.locator('[data-presentation-id*="MEP-"]').count(),0,'MEP proxy boxes must not leak into furniture');
  await frame.locator('#aad-mep-visible').check();
  await frame.locator('#aad-view-plan').click();
  await frame.locator('#aad-pin-mode').check();
  await frame.locator('#viewer2d').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
  const position=await frame.locator('#viewer2d').evaluate(svg=>{const p=svg.createSVGPoint();p.x=-.814;p.y=-.653;const q=p.matrixTransform(svg.getScreenCTM()),r=svg.getBoundingClientRect();return{x:q.x-r.left,y:q.y-r.top};});
  if(touch)await frame.locator('#viewer2d').tap({position:{x:position.x,y:position.y}});else await frame.locator('#viewer2d').click({position:{x:position.x,y:position.y}});
  assert.match(await frame.locator('#aad-site-readout').textContent(),/Plot X.*building X/);
  const saved=await pins();assert.equal(saved.pins.length,expected+1);
  assert.ok(Math.abs(saved.pins.at(-1).xMm-1130)<70&&Math.abs(saved.pins.at(-1).yMm-17053)<70);
  await frame.locator('#aad-dimensions').uncheck();await frame.locator('#aad-dimensions').check();
  assert.equal(await frame.locator('[data-feedback-pin]').count(),expected+1,'Feedback markers must survive plan redraw');
  const sizes=await frame.locator('#aad-services-controls button,#aad-services-controls select').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
  assert.ok(sizes.every(h=>h>=44),'Pin controls must have touch-sized targets');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Outer page overflow');
  const overflow=await page.locator('#ashok-engine').evaluate(f=>{const w=f.contentWindow.innerWidth;return{width:w,scroll:f.contentDocument.documentElement.scrollWidth,items:[...f.contentDocument.querySelectorAll('main *')].filter(e=>!e.closest('.table-wrap')&&!(e instanceof f.contentWindow.SVGElement)&&e.getBoundingClientRect().right>w+2&&e.getBoundingClientRect().width>0).slice(0,20).map(e=>({tag:e.tagName,id:e.id,class:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,70)}))};});if(overflow.scroll>overflow.width+2)console.log('OVERFLOW',JSON.stringify(overflow));assert.ok(overflow.scroll<=overflow.width+2,'Embedded page overflow');
  assert.equal(await frame.locator('#aad-services-controls').evaluate(e=>e.scrollWidth>e.clientWidth+2),false,'MEP controls overflow');
  await page.screenshot({path:'/tmp/ashok-qa02-usability-'+width+'.png',fullPage:false});
  await page.reload({waitUntil:'networkidle'});await ready();
  assert.equal(await frame.locator('#aad-site-pins li').count(),expected+1,'Saved pins must survive reload');
  assert.equal((await pins()).pins.length,expected+1);
  await frame.locator('#aad-clear-pins').click();assert.equal((await pins()).pins.length,0);
  assert.equal(await frame.locator('[data-feedback-pin]').count(),0);
  assert.deepEqual(errors,[]);await context.close();
  console.log('ASHOK_USABILITY_PASS',width+'x'+height,touch?'touch':'mouse/keyboard','restore/corrupt-data/tap/export/redraw/reload/clear/tabs/MEP visibility/no-overflow');
 }
}finally{await browser.close();}
