import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of [1440,390]){
  for(const slug of ['ashok-adhikari','harisharan-adhikari','narayani-parajuli','ramachandra-devkota','example-empty']){
   const p=await b.newPage({viewport:{width,height:900}});
   const errors=[];p.on('pageerror',e=>errors.push(e.message));
   const r=await p.goto(base+'projects/'+slug+'/',{waitUntil:'domcontentloaded'});
   assert.equal(r.status(),200,slug+' routing');
   await p.locator('#pw-dock[data-review-id]').waitFor({timeout:75000});
   await p.locator('#pw-axis-proof[data-axis-status]').waitFor({timeout:15000});
   const state=await p.evaluate(()=>({
    d:document.getElementById('pw-dock').dataset.reviewId,
    axis:document.getElementById('pw-axis-proof').dataset.axisStatus,
    southChapters:document.querySelectorAll('#pw-dock [data-chapter]').length,
    southPackages:document.querySelectorAll('#pw-dock [data-dock-package],#pw-dock [data-rail-package]').length,
    edgeOverflow:document.documentElement.scrollWidth>innerWidth+2
   }));
   assert.equal(state.southChapters,0,'South duplicates top chapters');
   assert.equal(state.southPackages,0,'South duplicates west package list');
   assert.equal(state.edgeOverflow,false,'Horizontal overflow '+slug+'/'+width);
   assert.ok(state.d&&state.axis);
   assert.equal(await p.locator('#pw-review-next').count(),1);
   assert.equal(await p.locator('#pw-review-prev').count(),1);
   assert.equal(await p.locator('.pw-chapter-bar [role="tab"]').count(),5);
   const count=+(await p.locator('#pw-dock').getAttribute('data-review-count'));
   const original=state.d;
   if(count>1){
    await p.locator('#pw-review-next').click();
    await p.waitForFunction(value=>document.getElementById('pw-dock').dataset.reviewId!==value,original);
    await p.locator('#pw-review-prev').click();
    await p.waitForFunction(value=>document.getElementById('pw-dock').dataset.reviewId===value,original);
   }
   if(slug==='ashok-adhikari'){
    assert.equal(state.axis,'DISPLAY_REVIEW_ONLY');
    assert.match(await p.locator('#pw-axis-proof').innerText(),/proposed display markers/);
    for(const id of ['boq','gantt','packages','sources','views']){
     await p.locator('#pw-tab-'+id).click();
     await p.waitForFunction(id=>document.getElementById('pw-axis-proof').dataset.chapter===id,id);
     assert.equal(await p.locator('#pw-axis-proof').getAttribute('data-axis-status'),'DISPLAY_REVIEW_ONLY');
     assert.equal(await p.locator('#pw-dock').getAttribute('data-review-id'),original);
    }
   }else assert.equal(state.axis,'AXES_NOT_ADMITTED',slug+' should fail closed when no matching standard axis registry');
   assert.deepEqual(errors,[],'page JS errors '+slug+'/'+width);
   await p.close();
   console.log('CAD_CONTROL_TOWER_WORKSPACE_BROWSER_PASS',slug,width);
  }
 }
 const p=await b.newPage({viewport:{width:390,height:850}});
 const r=await p.goto(base+'templates/project-workspace/control-tower/',{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);
 await p.locator('#ct-gates li').first().waitFor({timeout:20000});
 assert.equal(await p.locator('#ct-project option').count(),5);
 await p.locator('#ct-project').selectOption('ashok-adhikari');
 assert.equal(await p.locator('#ct-gates li').count(),4);
 assert.match(await p.locator('#ct-state').innerText(),/V3_2_DISPLAY_ONLY/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await p.close();
 console.log('CAD_CONTROL_TOWER_PUBLIC_GUIDE_BROWSER_PASS');
}finally{await b.close();}
