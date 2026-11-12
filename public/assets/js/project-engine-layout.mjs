// Presentation adapter only: existing engine state, IDs, edits and export code
// remain authoritative. This never constructs or substitutes project geometry.
export function installProjectEngine(adapter,kind='aad'){
 if(new URL(location.href).searchParams.get('workspace')!=='standard')return;
 const $=id=>document.getElementById(id);document.body.dataset.projectEngine=kind;
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../css/project-engine.css',import.meta.url);document.head.append(css);css.addEventListener('load',()=>adapter.fit?.());
 const main=document.querySelector('main');
 function disclosure(title,node,open=false){const d=document.createElement('details');d.className='pe-disclosure';d.open=open;const s=document.createElement('summary');s.textContent=title;d.append(s,node);return d;}
 if(kind==='aad'){
  // Standalone editors need floor/view controls; embeds already have parent controls.
  if(document.body.dataset.aadEmbed!=='true'){
   const scope=document.createElement('nav');scope.id='pe-standalone-scope';
   scope.setAttribute('aria-label','Editor floor and drawing view');
   for(const id of ['aad-storey','aad-view-mode']){
    const label=$(id)?.closest('label');if(label)scope.append(label);
   }
   $('aad-edit-history-panel').before(scope);
   const style=document.createElement('style');
   style.textContent='#pe-standalone-scope{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid #d6e2e5;background:#f3f8fa}#pe-standalone-scope label{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;font-weight:750}#pe-standalone-scope select{min-height:38px;max-width:210px;border-radius:6px;border:1px solid #b7cbd2;background:white;padding:6px 10px;color:#21424e}@media(max-width:600px){#pe-standalone-scope{gap:8px}#pe-standalone-scope label{width:100%}#pe-standalone-scope select{flex:1;max-width:none}}';
   document.head.append(style);
  }
  const aside=$('aad-inspector'),selection=$('selection').closest('section');aside.prepend(selection);
  const presentation=$('aad-presentation-controls'),groups=[...presentation.querySelectorAll('fieldset')];
  if(groups[2])aside.insertBefore(disclosure('Drawing layers',groups[2],true),selection.nextSibling);
  const services=$('aad-services-controls');if(!services.hidden)aside.append(disclosure('MEP & location feedback',services));
  for(const s of [...aside.children])if(s.tagName==='SECTION'&&s!==selection)aside.append(disclosure(s.querySelector('h2')?.textContent||'Review tools',s));
  const dock=document.createElement('div');dock.id='pe-bottom';main.append(dock);
  const audit=$('aad-audit-register'),rooms=$('aad-derived-room-panel');dock.append(disclosure('Component register · selected floor / all components',audit),disclosure('Derived room areas',rooms));
  const exportBar=document.createElement('div');exportBar.className='pe-export-bar';
  for(const id of ['fit','download-ifc','download-json','aad-save-working','aad-import-working','aad-import-file','aad-undo','aad-reset'])exportBar.append($(id));
  if(groups[3])exportBar.append(groups[3]);dock.append(disclosure('Drafts, exports and plan tools',exportBar));
  const summary=document.createElement('section');summary.id='pe-measurements';summary.className='pe-measurements';dock.prepend(summary);
  function measurements(){const s=adapter.getState(),elements=s.elements||[],phase=s.phase;const list=phase==='all'?elements:elements.filter(e=>e.level===(phase==='substructure'?'gf':phase==='roof'?'ff':phase));const kinds=[...new Set(list.map(e=>e.kind))];summary.innerHTML='<h2>2.1 · Phase measurement basis</h2><p>Unpriced modeled component counts. No accepted RCC mix, checked reinforcement schedule or priced BOQ is supplied. Geometric drafts do not establish procurement quantities.</p><div class="table-wrap"><table><thead><tr><th>Type</th><th>Modeled count</th><th>Unit</th><th>Basis</th></tr></thead><tbody>'+kinds.map(k=>'<tr><td>'+k+'</td><td>'+list.filter(e=>e.kind===k).length+'</td><td>nr</td><td>Current model · engineering review open</td></tr>').join('')+'</tbody></table></div>';}
  const nativePanel=adapter.setPanel;adapter.setPanel=panel=>{document.body.dataset.enginePanel=panel;nativePanel?.(panel);const boq=panel==='boq';dock.querySelector('details').open=boq;summary.hidden=!boq;measurements();};
  const nativeLevel=adapter.setLevel;adapter.setLevel=phase=>{nativeLevel(phase);measurements();};
 }else{
  document.querySelector('#panel-studio .workspace').classList.add('pe-har-layout');
  const aside=document.querySelector('#panel-studio aside'),layers=document.createElement('div');layers.className='pe-layer-tools';
  for(const id of ['discipline','slab-display'])layers.append($(id).closest('label'));
  $('selection').after(disclosure('Drawing layers',layers,true));
  const settings=aside.querySelector('[data-open="scenarios"]')||document.createElement('button');settings.textContent='Material / planning assumptions';settings.onclick=()=>{if(parent!==window)parent.postMessage({type:'project-workspace-section',section:'scenarios'},location.origin);};
  const boundary=[...aside.querySelectorAll('h3')].find(h=>h.textContent.includes('Model boundary'));if(boundary){const content=document.createElement('div');let n=boundary.nextSibling;while(n){const next=n.nextSibling;if(n!==settings)content.append(n);n=next;}boundary.remove();aside.append(disclosure('Source scope & assumptions',content));}aside.append(settings);
 }
 window.ProjectDrawing=adapter;document.dispatchEvent(new Event('project-drawing-state'));
}
