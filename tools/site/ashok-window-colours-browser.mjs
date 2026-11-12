import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=process.env.PROJECT_SITE_URL||'http://127.0.0.1:5191/JP_Computer-Aided-Drawings/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const p=await browser.newPage({viewport}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const resp=await p.goto(root+'projects/ashok-adhikari/?edition=v3-3&panel=views&phase=ff&layout=split#views',{waitUntil:'domcontentloaded'});
  assert.equal(resp.status(),200);
  await p.waitForFunction(()=>window.ProjectWorkspace?.getDrawing()?.getState()?.ready,null,{timeout:65000});
  const frame=p.frameLocator('#ashok-engine');
  await frame.locator('#viewer2d .aad-window').first().waitFor({state:'attached',timeout:30000}); // SVG lines can have zero-height layout bounds while strokes render
  const proof=await p.locator('#ashok-engine').evaluate(el=>{
   const w=el.contentWindow,doc=el.contentDocument;
   const windowLines=[...doc.querySelectorAll('#viewer2d .aad-window')];
   const panes=[...doc.querySelectorAll('#viewer2d [data-aad-window-pane]')];
   const doors=[...doc.querySelectorAll('#viewer2d .aad-door')];
   const c=w.AADStudio.getViewColourProof();
   const colour=e=>getComputedStyle(e).stroke;
   return{active:w.AADStudio.getViewportProof().activeLevel,windowCount:windowLines.length,paneCount:panes.length,doorCount:doors.length,
    windowStroke:colour(windowLines[0]),paneStroke:colour(panes[0]),doorStroke:doors.length?colour(doors[0]):null,
    panePointer:panes[0].getAttribute('pointer-events'),
    windowWidth:windowLines[0].getAttribute('stroke-width'),
    colors3D:c.windows3D.filter(x=>x.id.endsWith('FF-W009-C4-C2-OWNER-20261112')),
    legend:c.legend,readOnlyProof:c,
    windowsVisible:windowLines.every(n=>getComputedStyle(n).display!=='none'&&Math.hypot(Number(n.getAttribute('x2'))-Number(n.getAttribute('x1')),Number(n.getAttribute('y2'))-Number(n.getAttribute('y1')))>0&&Number(n.getAttribute('stroke-width'))>0),
    doorCountOriginal:doors.length
   };
  });
  assert.equal(proof.active,'ff');
  assert.ok(proof.windowCount>0,'First-floor window geometry must be present');
  assert.equal(proof.paneCount,proof.windowCount,'Each window requires a second 2D pane track');
  assert.ok(proof.doorCount>0);
  assert.equal(proof.windowStroke,'rgb(11, 79, 158)');
  assert.equal(proof.paneStroke,'rgb(102, 212, 245)');
  assert.notEqual(proof.doorStroke,proof.windowStroke,'Door and window symbols must be distinct');
  assert.equal(proof.panePointer,'none','Window pane must not intercept click selection');
  assert.ok(proof.colors3D.length>=2,'Owner window must include a frame and glass mesh');
  assert.ok(proof.colors3D.some(x=>x.colour==='#0B4F9E'&&x.opacity===1));
  assert.ok(proof.colors3D.some(x=>x.colour==='#4EC3EB'&&Math.abs(x.opacity-.72)<.001));
  const legendWindow=proof.legend.find(x=>x.kind==='window');
  assert.ok(legendWindow);
  assert.match(legendWindow.swatch,/rgb\(11, 79, 158\)/);
  assert.equal(proof.windowsVisible,true);
  await p.screenshot({path:'/tmp/ashok-v33-window-visual-'+viewport.width+'.png'});
  await p.locator('#pw-phase').selectOption('gf');
  await p.waitForFunction(()=>window.ProjectWorkspace?.getDrawing()?.getState()?.phase==='gf',null,{timeout:15000});
  const gf=await p.locator('#ashok-engine').evaluate(el=>{
   const d=el.contentDocument;
   return{phase:el.contentWindow.AADStudio.getViewportProof().activeLevel,
    count:d.querySelectorAll('#viewer2d .aad-window').length,
    pane:d.querySelectorAll('#viewer2d [data-aad-window-pane]').length};
  });
  assert.equal(gf.phase,'gf');
  assert.ok(gf.count>0);
  assert.equal(gf.pane,gf.count);
  assert.deepEqual(errors,[]);
  console.log('ASHOK_WINDOW_VISUAL_2D_3D_BROWSER_PASS',JSON.stringify({viewport:viewport.width,ffWindows:proof.windowCount,ffDoors:proof.doorCount,frameAndGlass:proof.colors3D.map(x=>({colour:x.colour,opacity:x.opacity})),gfWindows:gf.count}));
  await p.close();
 }
}finally{await browser.close();}
