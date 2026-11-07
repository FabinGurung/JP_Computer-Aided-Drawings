import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const stageCounts={v02:18,v03:18,m40:18,m50:18,m60:18,m70:39,m80:0};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const width of [390,1440]){
  for(const [stage,count] of Object.entries(stageCounts)){
   const p=await browser.newPage({viewport:{width,height:850},acceptDownloads:true}),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   const response=await p.goto(base+'projects/harisharan-adhikari/stages/'+stage+'/',{waitUntil:'domcontentloaded'});
   assert.equal(response?.status(),200,stage);
   await p.waitForFunction(()=>Boolean(window.HarisharanStageWorkspace),null,{timeout:20000});
   const state=await p.evaluate(()=>window.HarisharanStageWorkspace.getState());
   assert.equal(state.stage,stage);assert.equal(state.recordCount,count,stage);
   assert.equal(await p.locator('.hs-stage-tabs a').count(),7);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'site x-overflow '+width+'/'+stage);
   assert.equal(await p.locator('[data-select-member].hs-member').count(),count);
   if(count){
    const first=await p.locator('[data-select-member].hs-member').first().getAttribute('data-select-member');
    assert.equal(state.selectedId,first);
    assert.ok(await p.locator('.hs-metric').count()>=4);
    await p.locator('[data-select-member].hs-member').nth(1).click();
    const state2=await p.evaluate(()=>window.HarisharanStageWorkspace.getState());
    assert.notEqual(state2.selectedId,first);
    assert.equal(new URL(p.url()).searchParams.get('member'),state2.selectedId);
    await p.locator('#hs-mats').selectOption('1');
    const state3=await p.evaluate(()=>window.HarisharanStageWorkspace.getState());
    assert.equal(state3.scenario.footingMats,1);
    await p.locator('#hs-mats').selectOption('2');
    assert.equal((await p.evaluate(()=>window.HarisharanStageWorkspace.getState())).scenario.footingMats,2);
    if(stage==='v03'){
      const f1=await p.evaluate(()=>window.HarisharanStageWorkspace.getMember('F-A1'));
      assert.equal(f1.steelRows.length,2);
      assert.ok(f1.steelRows.some(r=>r.diameterMm===16));
    }
    if(stage==='m50'){
      const d=await p.evaluate(()=>window.HarisharanStageWorkspace.getMember('DOWEL-A1'));
      assert.equal(d.independentDowelSteelKg,null);
      assert.match(await p.locator('#hs-inspector').innerText(),/not a separate dowel quantity|NON-ADDITIVE/i);
    }
    if(stage==='m60'){
      await p.locator('[data-select-member="COL-A1"].hs-member').click();
      await p.locator('#hs-lo').fill('0');
      await p.locator('#hs-lo').dispatchEvent('change');
      await p.locator('#hs-hi').fill('0.55');
      await p.locator('#hs-hi').dispatchEvent('change');
      assert.match(await p.locator('.hs-metrics-inline').innerText(),/0.55/);
      const row=await p.evaluate(()=>window.HarisharanStageWorkspace.getMember('COL-A1'));
      assert.ok(row.steelRows.some(b=>b.id==='CT-A1'));
    }
    if(stage==='m70'){
      const member='PB-A1-B1';await p.locator('[data-select-member="'+member+'"].hs-member').click();
      const pl=await p.evaluate(id=>window.HarisharanStageWorkspace.getMember(id),member);
      assert.equal(pl.steelRows.length,3);assert.equal(pl.steelRows.find(r=>r.id.endsWith('-8')).count,44);
      await p.locator('#hs-kind').selectOption('strap');
      const st=await p.evaluate(()=>window.HarisharanStageWorkspace.getState());
      assert.equal(st.selectedId.startsWith('ST-'),true);
      const rect=await p.evaluate(()=>window.HarisharanStageWorkspace.getMember('ST-A1-B1'));assert.equal(rect.steelRows.length,2);
    }
    if(stage==='v02'){
      const bl=await p.evaluate(()=>window.HarisharanStageWorkspace.getMember('PCC-A1'));
      assert.ok(bl.concreteM3>0&&bl.steelRows.length===0);
    }
    await p.locator('#hs-export').click();
    const inspect=await p.evaluate(()=>window.HarisharanStageWorkspace.getState());
    assert.equal(inspect.issueForConstruction,false);
   }else{
    assert.match(await p.locator('#hs-inspector').innerText(),/source admission HOLD/i);
    assert.match(await p.locator('#hs-inspector').innerText(),/unknown.*not zero/i);
   }
   assert.deepEqual(errors,[],'JS page errors '+width+'/'+stage);
   console.log('HARISHARAN_SEVEN_STAGES_BROWSER_PASS',stage,width);
   await p.close();
  }
 }
}finally{await browser.close()}
