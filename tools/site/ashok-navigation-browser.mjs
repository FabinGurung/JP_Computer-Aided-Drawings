import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url=process.env.ASHOK_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/projects/ashok-adhikari/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
try{for(const [width,height]of [[320,740],[390,844],[844,390],[768,1024],[1440,950]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<1000,isMobile:width<1000}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle',timeout:90000});
 const frame=page.frameLocator('#ashok-engine');
 await frame.locator('#action-status').filter({hasText:'Shared AAD building assembly ready'}).waitFor({timeout:45000});
 assert.equal(await page.locator('.ashok-contents[aria-label] a').count(),12);
 assert.match(await page.locator('#version-v1').textContent(),/Preserved architectural baseline/);
 assert.match(await page.locator('#version-v2').textContent(),/Current coordination edition/);
 assert.match(await page.locator('#project-versions').textContent(),/separate sequence/);
 for(const link of await page.locator('.ashok-contents a[data-section]').all()){
  const section=await link.getAttribute('data-section'),href=await link.getAttribute('href');
  if(width<1000)await link.tap();else await link.click();
  assert.equal(await page.locator('#panel-'+section).isVisible(),true,width+'px contents '+href);
  assert.equal(await page.locator('#tab-'+section).getAttribute('aria-selected'),'true');
  assert.equal(new URL(page.url()).hash,href);
 }
 await page.locator('a[data-engine-target="aad-audit-register"]').click();
 await page.waitForFunction(()=>{const frame=document.getElementById('ashok-engine'),node=frame.contentDocument?.getElementById('aad-audit-register');if(!node)return false;const top=frame.getBoundingClientRect().top+node.getBoundingClientRect().top;const tabs=document.querySelector('.ashok-tabs').getBoundingClientRect().height;return top>=tabs&&top<=tabs+40;},null,{timeout:10000});
 const model=await page.locator('#ashok-engine').evaluate(f=>f.contentWindow.AADStudio.getSnapshot().assembly);
 const all=model.elements.filter(e=>e.ifcType),kinds=[...new Set(all.map(e=>e.kind))];
 const values=await frame.locator('#aad-audit-kind option').evaluateAll(es=>es.map(e=>e.value));
 assert.deepEqual(new Set(values),new Set(['all',...kinds]),'Every modeled component type must be available');
 const visibleBefore=await page.locator('#ashok-engine').evaluate(f=>f.contentWindow.AADStudio.getViewportProof());
 await frame.locator('#aad-audit-collapse').click();
 assert.equal(await frame.locator('#elements details[open]').count(),0);
 await frame.locator('#aad-audit-discipline').selectOption('MEP');
 assert.equal(await frame.locator('#elements tbody tr').count(),all.filter(e=>e.discipline==='MEP').length);
 assert.ok(await frame.locator('#elements details[open]').count()>0,'Filtering reveals matching groups');
 assert.equal(await frame.locator('#elements details:not([open])').count(),0);
 assert.match(await frame.locator('#aad-active-filters').textContent(),/MEP/);
 await frame.locator('#aad-audit-storey').selectOption('gf');
 const expected=all.filter(e=>e.discipline==='MEP'&&e.level==='gf');
 assert.equal(await frame.locator('#elements tbody tr').count(),expected.length);
 for(const kind of kinds){const label=await frame.locator('#aad-audit-kind option[value="'+kind+'"]').textContent();assert.ok(label.endsWith('· '+expected.filter(e=>e.kind===kind).length));}
 await frame.locator('#aad-audit-search').fill('unmatched-query-493857');
 assert.equal(await frame.locator('#elements tbody tr').count(),0);assert.match(await frame.locator('#aad-audit-empty').textContent(),/No components match/);
 await frame.locator('#aad-active-filters button[aria-label^="Remove search"]').click();assert.equal(await frame.locator('#elements tbody tr').count(),expected.length);
 await frame.locator('#aad-audit-clear').click();assert.equal(await frame.locator('#elements tbody tr').count(),all.length);
 assert.match(await frame.locator('#aad-active-filters').textContent(),/no table filters/);
 await frame.locator('#aad-audit-kind').selectOption('furniture');await frame.locator('#aad-audit-sort').selectOption('name');
 const rowIds=()=>frame.locator('.aad-audit-type tbody').evaluateAll(bs=>bs.map(b=>[...b.querySelectorAll('tr')].map(r=>r.dataset.elementId)));
 const asc=await rowIds();await frame.locator('#aad-audit-direction').selectOption('desc');assert.deepEqual(await rowIds(),asc.map(ids=>[...ids].reverse()));
 await frame.locator('#aad-audit-sort').selectOption('x');await frame.locator('#aad-audit-direction').selectOption('asc');
 const positions=await frame.locator('.aad-audit-type tbody').evaluateAll(bs=>bs.map(b=>[...b.querySelectorAll('tr')].map(r=>Number(r.cells[4].textContent))));
 for(const xs of positions)for(let i=1;i<xs.length;i++)assert.ok(xs[i]>=xs[i-1]);
 assert.deepEqual(await page.locator('#ashok-engine').evaluate(f=>f.contentWindow.AADStudio.getViewportProof()),visibleBefore,'Table filters must not change drawing visibility');
 await frame.locator('#aad-audit-expand').click();assert.equal(await frame.locator('#elements details:not([open])').count(),0);
 // Row keyboard selection and reset of a hiding search keep shared BIM selection accessible.
 const selected=all.find(e=>e.kind==='wall').id;
 await frame.locator('#aad-audit-search').fill('unmatched-query-493857');
 await page.locator('#ashok-engine').evaluate((f,id)=>f.contentWindow.AADStudio.selectElementById(id),selected);
 assert.equal(await frame.locator('#aad-audit-search').inputValue(),'');
 assert.equal(await frame.locator('tr[data-element-id="'+selected+'"]:visible').count(),1);
 await frame.locator('#aad-audit-clear').click();assert.equal(await frame.locator('#aad-audit-direction').inputValue(),'asc');
 assert.deepEqual(await frame.locator('#elements tr[data-element-id]').evaluateAll(rs=>rs.map(r=>r.dataset.elementId).sort()),all.map(e=>e.id).sort());
 for(const selector of ['#aad-presentation-controls','#aad-audit-filters','#aad-services-controls'])assert.equal(await frame.locator(selector).evaluate(e=>e.scrollWidth>e.clientWidth+2),false,selector+' overflow');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Project overflow');
 assert.ok(await page.locator('#ashok-engine').evaluate(f=>f.contentDocument.documentElement.scrollWidth<=f.contentWindow.innerWidth+2),'Studio overflow');
 const clipped=await frame.locator('#aad-audit-filters label,.control-group legend').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.textContent));assert.deepEqual(clipped,[]);
 await page.screenshot({path:'/tmp/ashok-navigation-'+width+'.png',fullPage:false});
 await page.locator('a[data-section="plans"]').first().click();await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#panel-plans').isVisible(),true,'Direct links survive reload');
 assert.deepEqual(errors,[]);await page.close();console.log('ASHOK_NAVIGATION_FILTER_SORT_PASS',width+'x'+height,'versions/contents/all-types/filter-counts/empty-reset/ascending-descending/row-reveal/preservation/no-overflow');
}}finally{await browser.close();}
// Devices without WebGL must retain the usable 2D register and exports.
const fallback=await chromium.launch({headless:true,args:['--no-sandbox','--disable-webgl']});
try{const page=await fallback.newPage({viewport:{width:390,height:844}});await page.goto(url,{waitUntil:'networkidle'});const frame=page.frameLocator('#ashok-engine');await frame.locator('#action-status').filter({hasText:'Shared AAD building assembly ready'}).waitFor({timeout:45000});assert.match(await frame.locator('#aad-renderer-status').textContent(),/2D plans/);assert.equal(await frame.locator('#viewer2d').isVisible(),true);await frame.locator('#aad-audit-discipline').selectOption('MEP');assert.ok(await frame.locator('#elements tbody tr').count()>0);const download=page.waitForEvent('download');await frame.locator('#aad-plan-export').click();assert.ok((await download).suggestedFilename().endsWith('.svg'));console.log('ASHOK_NO_WEBGL_2D_REGISTER_EXPORT_PASS');}finally{await fallback.close();}
