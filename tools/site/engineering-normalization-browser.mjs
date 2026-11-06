import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const widths=(process.env.PROJECT_WIDTHS||'390,1440').split(',').map(Number);
const sites=['narayani-parajuli','harisharan-adhikari','ashok-adhikari','ramachandra-devkota','example-empty'];
const count={'narayani-parajuli':7,'harisharan-adhikari':10,'ashok-adhikari':1,'ramachandra-devkota':0,'example-empty':0};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of widths){
  for(const slug of sites){
   const p=await browser.newPage({viewport:{width,height:940}});
   const errors=[];p.on('pageerror',e=>errors.push(e.message));
   const response=await p.goto(base+'projects/'+slug+'/?panel=packages',{waitUntil:'domcontentloaded'});
   assert.equal(response?.status(),200,slug);
   await p.waitForSelector('.pw-normalized-item',{timeout:20000});
   assert.equal(await p.locator('.pw-normalized-item').count(),16,slug);
   assert.equal(await p.locator('.pw-package-card').count(),count[slug],slug);
   assert.equal(await p.locator('.pw-chapter-bar [role=tab]').count(),5,slug);
   assert.ok(await p.locator('#pw-inspector').isVisible());
   assert.ok(await p.locator('#pw-dock').isVisible());
   assert.equal(await p.locator('#pw-tab-packages').getAttribute('aria-selected'),'true');
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'workspace overflow '+slug+'/'+width);
   await p.locator('#package-slot-columns summary').click();
   assert.match(await p.locator('#package-slot-columns').innerText(),/Calculation register/);
   assert.match(await p.locator('#package-slot-columns').innerText(),/Field QA/);
   if(width<760){
    await p.locator('#pw-menu').click();
    assert.equal(await p.locator('#pw-rail').isVisible(),true);
    assert.equal(await p.locator('#pw-sub-packages [data-normal-slot]').count(),16);
    await p.keyboard.press('Escape');
    assert.equal(await p.locator('#pw-rail').isVisible(),false);
   }
   if(slug==='example-empty'){
    assert.equal(await p.locator('.pw-package-card').count(),0);
    assert.match(await p.locator('#pw-content').innerText(),/FICTIONAL|TEMPLATE ONLY/);
    assert.match(await p.locator('.pw-normalized-summary').innerText(),/0 \/ 16/);
    assert.match(await p.locator('#pw-body').innerText(),/Not admitted|No admitted|FICTIONAL|TEMPLATE ONLY/i);
   }
   if(slug==='narayani-parajuli')assert.match(await p.locator('#package-slot-tank').innerText(),/ENGINEERING HOLD/);
   assert.deepEqual(errors,[],'workspace browser errors '+slug);
   await p.goto(base+'projects/'+slug+'/memory-wall/',{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>Boolean(window.ProjectMemoryPalace),null,{timeout:15000});
   assert.equal(await p.locator('.memory-chapter h2').count(),7);
   assert.equal(await p.locator('.memory-poster h4').count(),28);
   assert.equal(await p.locator('.memory-toc a.level3').count(),28);
   assert.equal(await p.locator('.memory-table tbody tr').count(),16);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'memory palace overflow '+slug+'/'+width);
   const synthetic=await p.evaluate(()=>window.ProjectMemoryPalace.synthetic);
   assert.equal(synthetic,slug==='example-empty');
   assert.deepEqual(errors,[],'memory palace browser errors '+slug);
   await p.close();
   console.log('ENGINEERING_MEMORY_BROWSER_PASS',slug,width);
  }
  const pp=await browser.newPage({viewport:{width,height:900}});
  for(const route of ['memory-wall/pages/','templates/project-workspace/']){
   const response=await pp.goto(base+route,{waitUntil:'domcontentloaded'});
   assert.equal(response?.status(),200,route);
   assert.ok(await pp.locator('.memory-toc a.level3').count()>=20);
   assert.ok(await pp.locator('.memory-chapter h2').count()>=5);
   assert.ok(await pp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'public guide overflow '+route+'/'+width);
  }
  await pp.close();
 }
}finally{await browser.close();}
