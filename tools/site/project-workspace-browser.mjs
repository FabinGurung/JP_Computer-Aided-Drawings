import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/jp-drawing-coordination/';
const widths=(process.env.PROJECT_WIDTHS||'390,1440').split(',').map(Number);
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
async function ready(p,slug){if(slug==='ramachandra-devkota')return;await p.waitForFunction(()=>window.ProjectWorkspace?.getDrawing()?.getState().ready,null,{timeout:60000});await p.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.body?.dataset.projectEngine);}
async function chapter(p,id){await p.locator('#pw-tab-'+id).click();await p.waitForFunction(id=>window.ProjectWorkspace.getState().panel===id,id);}
try{
 for(const width of widths)for(const slug of ['harisharan-adhikari','ashok-adhikari','narayani-parajuli','ramachandra-devkota']){
  const p=await browser.newPage({viewport:{width,height:1000},acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const response=await p.goto(base+'projects/'+slug+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);await ready(p,slug);
  assert.equal(await p.locator('.pw-chapter-bar [role=tab]').count(),5);assert.equal(await p.locator('#pw-layout').inputValue(),'split');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'outer overflow '+slug+'/'+width);
  if(width<760){await p.locator('#pw-menu').click();assert.equal(await p.locator('#pw-rail').isVisible(),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#pw-rail').isVisible(),false);}
  const fr=p.frameLocator('iframe.pw-frame');
  if(slug!=='ramachandra-devkota'){
   const har=slug==='harisharan-adhikari';assert.equal(await fr.locator(har?'#plan':'#viewer2d').isVisible(),true);assert.equal(await fr.locator(har?'#viewport canvas':'#viewer3d canvas').isVisible(),true);
   const positions=await p.locator('iframe').evaluate((f,har)=>{const d=f.contentDocument,a=d.querySelector(har?'#plan':'#viewport2d').getBoundingClientRect(),b=d.querySelector(har?'#viewport':'#viewport3d').getBoundingClientRect();return{ax:a.x,ay:a.y,bx:b.x,by:b.y};},har);if(width>=1440)assert.ok(positions.ax<positions.bx,'plan must be left');else assert.ok(positions.ay<positions.by,'mobile plan must precede model');
   const next=har?'first':'ff';await p.locator('#pw-phase').selectOption(next);assert.equal(await p.evaluate(()=>window.ProjectWorkspace.getDrawing().getState().phase),next);
   if(har){
    const selected=await fr.locator('#plan [data-id]').first().getAttribute('data-id');await fr.locator('#plan [data-id]').first().press('Enter');const state=await p.evaluate(()=>window.ProjectWorkspace.getDrawing().getState());assert.equal(state.selectedId,selected);assert.equal(state.selectedMesh[0].id,selected);assert.ok(state.selectedMesh[0].emissive>0);
    const planIds=await fr.locator('#plan [data-id]').evaluateAll(ns=>ns.map(n=>n.dataset.id).sort());assert.deepEqual(planIds,[...state.visibleIds].sort(),'same visible floor IDs in 2D and 3D');
    await chapter(p,'boq');await fr.locator('[data-phase-quantity=first]').waitFor();assert.equal(await fr.locator('#har-phase-measurements [data-phase-quantity]').count(),1);assert.ok(await fr.locator('#rows tr').count()>50);await chapter(p,'gantt');assert.equal(await fr.locator('#activities tr').count(),34);
    const days=Number((await fr.locator('#programme-total').innerText()).match(/· (\d+) calendar/)[1]);await fr.locator('[data-duration=setup]').fill('12');await fr.locator('[data-duration=setup]').dispatchEvent('change');assert.match(await fr.locator('#programme-total').innerText(),new RegExp(String(days+10)));
    await chapter(p,'views');await p.locator('#pw-phase').selectOption('substructure');await chapter(p,'boq');assert.match(await fr.locator('#har-phase-measurements').innerText(),/11,492\.98/);
   }else{
    const item=await p.locator('iframe').evaluate(f=>{const s=f.contentWindow.AADStudio.getSnapshot().assembly;return s.elements.find(e=>e.kind==='wall'&&e.level==='ff').id;});await p.locator('iframe').evaluate((f,id)=>f.contentWindow.ProjectDrawing.select(id),item);assert.equal(await p.evaluate(()=>window.ProjectWorkspace.getDrawing().getState().selectedId),item);
    const proof=await p.locator('iframe').evaluate((f,id)=>f.contentWindow.AADStudio.getViewCoordinateProof(id),item);assert.ok(proof.plan);assert.ok(proof.mesh);assert.equal(proof.elementId,item);
    await chapter(p,'boq');assert.equal(await fr.locator('#pe-measurements').isVisible(),true);assert.ok(await fr.locator('#elements tr[data-element-id]').count()>0);await chapter(p,'gantt');assert.match(await p.locator('#pw-content').innerText(),/not|No|unknown/);
    if(slug==='ashok-adhikari'){
     await chapter(p,'views');if(width<760)await p.locator('#pw-menu').click();await p.locator('#pw-edition').selectOption('v1');await p.waitForFunction(()=>window.ProjectWorkspace.getDrawing()?.getState().ready&&window.ProjectWorkspace.getDrawing().getState().elements.every(e=>e.discipline!=='MEP'),null,{timeout:60000});assert.equal(await p.locator('iframe').evaluate(f=>!!f.contentWindow.AADStudio.getSnapshot().manifest.services),false);
     if(width<760)await p.locator('#pw-menu').click();await p.locator('#pw-edition').selectOption('v2');await p.waitForFunction(()=>!!window.ProjectWorkspace.getDrawing()?.getState().elements.some(e=>e.discipline==='MEP'),null,{timeout:60000});
     const controls=fr.locator('details').filter({has:fr.locator('#aad-services-controls')});await controls.locator('summary').first().click();assert.equal(await fr.locator('#aad-pin-mode').isVisible(),true);assert.equal(await fr.locator('#aad-services-controls').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true);
    }
   }
   await chapter(p,'views');await p.locator('#pw-layout').selectOption('plan');assert.equal(await fr.locator(har?'#viewport':'#viewport3d').isVisible(),false);await p.locator('#pw-layout').selectOption('split');if(har){await p.locator('#pw-fit').click();const proof=await p.evaluate(()=>window.ProjectWorkspace.getDrawing().getViewProof());assert.equal(proof.outside,0,'Fit must keep the actual model inside the viewport');}
   assert.equal(await p.locator('iframe').evaluate(f=>f.contentDocument.documentElement.scrollWidth<=f.contentWindow.innerWidth+2),true,'engine overflow '+slug+'/'+width);
  }else{assert.match(await p.locator('#pw-content').innerText(),/not been admitted|No admitted/);await chapter(p,'boq');assert.match(await p.locator('#pw-content').innerText(),/unknown|pending/);await chapter(p,'gantt');assert.match(await p.locator('#pw-content').innerText(),/start date unknown/);}

  // The packages are now a separate fifth chapter. The original frozen
  // source viewers are linked in place; the east and south panes are real UI.
  await chapter(p,'views');await p.locator('#pw-open-stages').click();
  await p.waitForFunction(()=>window.ProjectWorkspace.getState().panel==='packages');
  assert.match(p.url(),/panel=packages/);
  assert.equal(await p.locator('#pw-tab-packages').getAttribute('aria-selected'),'true');
  assert.ok(await p.locator('#pw-inspector').isVisible());
  assert.ok(await p.locator('#pw-dock').isVisible());
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'four-pane outer overflow '+slug+'/'+width);
  if(slug==='narayani-parajuli'){
   assert.equal(await p.locator('[data-package-id]').count(),7);
   assert.match(await p.locator('#pw-package-cards').innerText(),/PCC|Blinding/);
   assert.match(await p.locator('#pw-inspector').innerText(),/FROZEN/);
   await p.locator('[data-package-id=dowels]').click();
   await p.waitForFunction(()=>window.ProjectWorkspace.getState().stage==='dowels');
   assert.match(await p.locator('.pw-inspector-primary').getAttribute('href'),/\/stages\/m50\/$/);
   await p.locator('[data-package-id=tank]').click();
   assert.match(await p.locator('#pw-inspector').innerText(),/ENGINEERING HOLD/);
   assert.match(await p.locator('.pw-inspector-primary').getAttribute('href'),/\/stages\/m80\/$/);
   await p.locator('#pw-package-filter').selectOption('hold');
   assert.equal(await p.locator('[data-package-id]').count(),1);
   await p.locator('#pw-package-filter').selectOption('all');
   await p.locator('#pw-package-search').fill('Footing');
   assert.equal(await p.locator('[data-package-id]').count(),2);
   await p.locator('#pw-package-search').fill('');
  }else if(slug==='harisharan-adhikari'){
   assert.equal(await p.locator('[data-package-id]').count(),10);assert.ok(await p.locator('[data-package-id=rear-nine]').count()===1);
   assert.match(await p.locator('#pw-package-cards').innerText(),/Through plinth beam · rebar and cement/);
   await p.locator('[data-package-id=plinth-materials]').click();
   assert.match(await p.locator('.pw-inspector-primary').getAttribute('href'),/\/harisharan-adhikari\/plinth\/$/);
   assert.match(await p.locator('#pw-inspector').innerText(),/PROVISIONAL STUDY/);
  }else if(slug==='ashok-adhikari'){
   assert.equal(await p.locator('[data-package-id]').count(),1);
   assert.match(await p.locator('#pw-inspector').innerText(),/COORDINATION ONLY/);
   assert.match(await p.locator('#pw-package-cards').innerText(),/MEP/);
  }else{
   assert.equal(await p.locator('[data-package-id]').count(),0);
   assert.match(await p.locator('#pw-content').innerText(),/No admitted public package records/);
  }
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.ProjectWorkspace?.getState().panel==='packages');
  assert.match(p.url(),/panel=packages/);
  await chapter(p,'views');
  if(slug!=='ramachandra-devkota')await ready(p,slug);

  await chapter(p,'sources');await p.locator('#pw-source-0').waitFor();assert.ok(await p.locator('.pw-resource').count()>0);if(slug==='harisharan-adhikari'||slug==='narayani-parajuli')assert.doesNotMatch(await p.locator('#pw-content').innerText(),/4\.2 · Detailed material module|4\.2 · Work-package records/);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await chapter(p,'views');await p.screenshot({path:`/tmp/project-standard-${slug}-${width}.png`});await p.reload({waitUntil:'networkidle'});await ready(p,slug);assert.equal(await p.locator('#pw-layout').inputValue(),'split');assert.deepEqual(errors,[]);await p.close();console.log('PROJECT_STANDARD_BROWSER_PASS',slug,width);
 }
 const p=await browser.newPage();await p.goto(base+'projects/harisharan-adhikari/#materials');await p.waitForURL('**/plinth/#materials');assert.match(await p.title(),/Harisharan/);await p.close();
}finally{await browser.close();}
