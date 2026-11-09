import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of [390,1440])for(const [slug,phase,count] of [['narayani-parajuli','gf',23],['harisharan-adhikari','ground',18]]){
  const p=await b.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const r=await p.goto(base+'projects/'+slug+'/?panel=views&phase='+phase,{waitUntil:'domcontentloaded'});
  assert.equal(r.status(),200);
  await p.waitForFunction(()=>window.ProjectWorkspace?.getLineage()?.axisStatus==='SOURCE_MARKS_REGISTERED_REVIEW_ONLY',null,{timeout:65000});
  let lineage=await p.evaluate(()=>window.ProjectWorkspace.getLineage());
  assert.equal(lineage.axisIds.length,count);
  assert.equal(lineage.constructionApproved,false);
  assert.match(await p.locator('#pw-axis-proof').innerText(),/source-marked locations/);
  assert.equal(await p.locator('#pw-axis-proof a').count(),1);
  assert.equal(await p.locator('#pw-axis-proof a').getAttribute('target'),'_blank');
  for(const chapter of ['boq','gantt','packages','sources']){
   await p.locator('#pw-tab-'+chapter).click();
   await p.waitForFunction(c=>window.ProjectWorkspace?.getLineage()?.chapter===c,chapter);
   lineage=await p.evaluate(()=>window.ProjectWorkspace.getLineage());
   assert.equal(lineage.axisIds.length,count);
   assert.equal(lineage.axisStatus,'SOURCE_MARKS_REGISTERED_REVIEW_ONLY');
  }
  if(slug==='narayani-parajuli'){
   await p.locator('#pw-tab-views').click();
   await p.locator('#pw-phase').selectOption('ff');
   await p.waitForFunction(()=>window.ProjectWorkspace.getLineage()?.phase==='ff');
   assert.equal(await p.locator('#pw-axis-proof').getAttribute('data-axis-status'),'AXES_NOT_ADMITTED');
   assert.deepEqual(await p.evaluate(()=>window.ProjectWorkspace.getLineage().axisIds),[]);
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  assert.deepEqual(errors,[]);
  await p.close();
  console.log('CAD_NATIVE_SOURCE_AXIS_UI_PASS',slug,width);
 }
}finally{await b.close();}
