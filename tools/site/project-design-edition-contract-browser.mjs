import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {PROJECTS,ALL_WORKSPACE_PROJECTS} from '../../public/assets/js/project-workspace-config.mjs';

const root=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  for(const [slug,project] of Object.entries(ALL_WORKSPACE_PROJECTS)){
   const p=await browser.newPage({viewport}),errors=[];
   p.on('pageerror',err=>errors.push(err.message));
   const edition=project.editions[0];
   const url=root+'projects/'+slug+'/?edition='+encodeURIComponent(edition.id)+'&panel=views&phase='+encodeURIComponent(project.defaultLevel)+'&layout=split#views';
   const res=await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(res.status(),200,slug);
   await p.waitForFunction(id=>document.getElementById('pw-edition-provenance')?.dataset.editionId===id,edition.id,{timeout:45000});
   const status=await p.evaluate(()=>{
    const prov=document.getElementById('pw-edition-provenance');
    return{edition:document.getElementById('pw-edition').value,source:prov.dataset.sourceRef,kind:prov.dataset.kind,
     lifecycle:prov.dataset.lifecycle,contract:prov.innerText,
     urlEdition:new URL(location.href).searchParams.get('edition'),requestDisabled:document.getElementById('pw-new-edition').disabled,
     sourceHref:prov.querySelector('a')?.href||null,options:[...document.getElementById('pw-edition').options].map(o=>o.value)};
   });
   assert.equal(status.edition,edition.id);
   assert.equal(status.urlEdition,edition.id);
   assert.equal(status.kind,edition.kind);
   assert.equal(status.lifecycle,edition.lifecycle);
   assert.equal(status.source,edition.sourceRef||'');
   assert.ok(status.contract.includes('Shared engine 1.4.0'));
   assert.deepEqual(status.options,project.editions.map(x=>x.id));
   assert.equal(status.requestDisabled,Boolean(project.synthetic));
   // The source-version rail closes after navigation on mobile. Reopen it
   // before each separate edit/edition action, as a real mobile user would.
   const ensureEditionRail=async()=>{
    if(viewport.width<=760 && !(await p.locator('#pw-edition').isVisible())){
     await p.locator('#pw-menu').click();
     await p.locator('#pw-edition').waitFor({state:'visible',timeout:12000});
    }
   };
   await ensureEditionRail();
   if(edition.sourceRef){
    assert.ok(status.sourceHref?.endsWith('/'+edition.sourceRef),slug+' source link must preserve unique registered source');
   }else assert.equal(status.sourceHref,null);
   if(!project.synthetic){
    await p.locator('#pw-new-edition').click();
    assert.equal(await p.locator('#pw-change-request').evaluate(n=>n.open),true);
    assert.equal(await p.locator('#pw-request-type').inputValue(),'request-modify');
    const handover=JSON.parse(await p.locator('#pw-request-export-preview').inputValue());
    assert.equal(handover.schema,'jp-cad://aad-new-design-edition-request/1');
    assert.equal(handover.baselineEditionId,edition.id);
    assert.equal(handover.projectSlug,slug);
    assert.equal(handover.preservesPreviousEdition,true);
    assert.equal(handover.status,'LOCAL_OWNER_REQUEST_NOT_APPLIED');
    assert.equal(handover.policyVersion,'1.4.0');
    assert.equal(handover.baselineSourceRef,edition.sourceRef);
    assert.equal(await p.locator('#pw-edition').inputValue(),edition.id,'Local request may not mutate selected edition');
    assert.equal(await p.locator('#pw-request-list li').count(),0,'New-edition control may not invent accepted edits');
   }else{
    assert.equal(status.edition,'template-empty');
    assert.equal(await p.locator('#pw-edit-direct').isHidden(),true);
   }
   if(slug==='ashok-adhikari'){
    await ensureEditionRail();
    await p.locator('#pw-edition').selectOption('v3-2');
    await p.waitForFunction(()=>document.getElementById('pw-edition-provenance')?.dataset.editionId==='v3-2',{timeout:10000});
    assert.ok((await p.locator('#pw-edition-provenance').innerText()).includes('Previous: v3-grid'));
    assert.equal(new URL(p.url()).searchParams.get('edition'),'v3-2');
    assert.ok((await p.locator('#pw-edit-direct').getAttribute('href')).includes('aad-building-v3-2-review.json'));
    await ensureEditionRail();
    await p.locator('#pw-edition').selectOption('v3-3');
    await p.waitForFunction(()=>document.getElementById('pw-edition-provenance')?.dataset.editionId==='v3-3',{timeout:10000});
    assert.ok((await p.locator('#pw-edition-provenance').innerText()).includes('Released for architectural review'));
    assert.ok((await p.locator('#pw-edition-provenance').innerText()).includes('Verified architectural review milestone'));
    assert.ok((await p.locator('#pw-edition-provenance a').last().getAttribute('href')).includes('ashok-v3.3.0-window-visibility-review.1'));
   }
   if(slug==='ramachandra-devkota'){
    assert.equal(await p.locator('#pw-edit-direct').isHidden(),true);
    assert.ok((await p.locator('#pw-edition-provenance').innerText()).includes('Public model not admitted'));
   }
   assert.deepEqual(errors,[],slug+' browser page errors');
   console.log('PROJECT_EDITION_1_4_BROWSER_PASS',viewport.width,slug,edition.id,edition.kind);
   await p.close();
  }
 }
}finally{await browser.close();}
