const NS='http://www.w3.org/2000/svg';
export const plotToWorld=(x,y,f)=>({x:x/1000+f.originX,z:f.originZ-y/1000});
export const worldToPlot=(x,z,f)=>({xMm:Math.round((x-f.originX)*1000),yMm:Math.round((f.originZ-z)*1000)});
export function normalizeSitePins(value,frame){
 if(!Array.isArray(value))return [];
 return value.filter(p=>p&&typeof p.xMm==='number'&&typeof p.yMm==='number'&&Number.isFinite(p.xMm)&&Number.isFinite(p.yMm)&&p.xMm>=0&&p.yMm>=0&&p.xMm<=frame.widthMm&&p.yMm<=frame.lengthMm).map(p=>({xMm:Math.round(p.xMm),yMm:Math.round(p.yMm),label:typeof p.label==='string'&&p.label.trim()?p.label.trim().slice(0,80):'Other correction'}));
}
export function siteConflicts(assets,f){return assets.map(a=>{const r=[a.xMm-a.widthMm/2,a.yMm-a.lengthMm/2,a.xMm+a.widthMm/2,a.yMm+a.lengthMm/2],overlap=b=>Array.isArray(b)&&r[2]>b[0]&&r[0]<b[2]&&r[3]>b[1]&&r[1]<b[3];return{id:a.id,outsidePlot:r[0]<0||r[1]<0||r[2]>f.widthMm||r[3]>f.lengthMm,plinthOverlap:overlap(f.plinthRect),wcOverlap:overlap(f.outsideWCRect)};});}
export function drawServicesPlan(svg,building){
 const s=building.manifest.services;if(!s)return;const old=svg.querySelector('[data-mep-overlay]');old?.remove();const g=document.createElementNS(NS,'g');g.dataset.mepOverlay='true';
 const add=(tag,attrs,text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;g.append(n);return n;};
 for(const r of s.routes){const e=building.elements.find(e=>e.id.endsWith(':MEP-'+r.id));add('polyline',{points:r.points.map(p=>p.x+','+p.z).join(' '),fill:'none',stroke:e?.colour||'#975839','stroke-width':r.system.startsWith('E')?.035:.055,'pointer-events':'none'});}
 for(const a of s.assets){const p=plotToWorld(a.xMm,a.yMm,s.siteFrame),w=a.widthMm/1000,h=a.lengthMm/1000;add(a.id==='SOAK'?'ellipse':'rect',a.id==='SOAK'?{cx:p.x,cy:p.z,rx:w/2,ry:h/2,fill:'#be9ed380',stroke:'#b33f4a','stroke-width':.06}:{x:p.x-w/2,y:p.z-h/2,width:w,height:h,fill:'#cb936b80',stroke:'#b33f4a','stroke-width':.06});add('text',{x:p.x+w/2+.15,y:p.z,style:'font:600 .22px system-ui;fill:#713d39;paint-order:stroke;stroke:white;stroke-width:.07;pointer-events:none'},a.id+' · '+a.xMm+', '+a.yMm+' mm');}
 svg.append(g);
}
export function installSitePicker(getBuilding){
 const svg=document.getElementById('viewer2d'),read=document.getElementById('aad-site-readout'),list=document.getElementById('aad-site-pins'),notice=document.getElementById('aad-pin-status');let pins=[],loadedProject=null,down=null;
 const key=()=> 'aad-site-pins-v2:'+getBuilding()?.projectId;
 const say=text=>{if(notice)notice.textContent=text;};
 const draw=()=>{
  list.replaceChildren();svg.querySelector('[data-site-feedback]')?.remove();
  const frame=getBuilding()?.manifest.services?.siteFrame;if(!frame)return;
  const marks=document.createElementNS(NS,'g');marks.dataset.siteFeedback='true';marks.setAttribute('pointer-events','none');
  for(const [i,p]of pins.entries()){
   const li=document.createElement('li');li.textContent=p.label+': plot X '+p.xMm+', Y '+p.yMm+' mm';list.append(li);
   const q=plotToWorld(p.xMm,p.yMm,frame),mark=document.createElementNS(NS,'circle');
   for(const[k,v]of Object.entries({cx:q.x,cy:q.z,r:.13,fill:'#e85138',stroke:'white','stroke-width':.04,'data-feedback-pin':i}))mark.setAttribute(k,v);
   const title=document.createElementNS(NS,'title');title.textContent='Feedback '+(i+1)+' · '+li.textContent;mark.append(title);marks.append(mark);
  }svg.append(marks);
 };
 const sync=()=>{
  const b=getBuilding(),frame=b?.manifest.services?.siteFrame;read.hidden=!frame;if(!frame)return;
  if(b.projectId!==loadedProject){
   loadedProject=b.projectId;try{pins=normalizeSitePins(JSON.parse(localStorage.getItem(key())||'[]'),frame);}catch{pins=[];say('Saved pins could not be read. You can still add and download pins.');}
  }draw();
 };
 const loc=ev=>{const matrix=svg.getScreenCTM();if(!matrix||!getBuilding()?.manifest.services)return null;const p=svg.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;const q=p.matrixTransform(matrix.inverse());return worldToPlot(q.x,q.y,getBuilding().manifest.services.siteFrame);};
 const report=p=>{if(!p)return;const f=getBuilding().manifest.services.siteFrame;read.textContent=`Plot X ${p.xMm} · Y ${p.yMm} mm · building X ${p.xMm-f.buildingOffsetX} · Y ${p.yMm-f.buildingOffsetY} mm`;};
 svg.addEventListener('pointermove',ev=>report(loc(ev)));
 svg.addEventListener('pointerdown',ev=>{
  const point=loc(ev);report(point);if(document.getElementById('aad-pin-mode').checked&&getBuilding()?.manifest.services){down={x:ev.clientX,y:ev.clientY,point};ev.stopImmediatePropagation();}
 },true);
 svg.addEventListener('click',ev=>{
  if(!document.getElementById('aad-pin-mode').checked||!getBuilding()?.manifest.services)return;
  ev.stopImmediatePropagation();sync();
  if(down&&Math.hypot(ev.clientX-down.x,ev.clientY-down.y)>8){down=null;say('Drag ignored. Tap or click once to place a feedback pin.');return;}
  const p=down?.point||loc(ev);down=null;if(!p)return;report(p);const f=getBuilding().manifest.services.siteFrame;
  if(p.xMm<0||p.yMm<0||p.xMm>f.widthMm||p.yMm>f.lengthMm){read.textContent='Outside plot — choose a point inside the boundary.';return;}
  pins=normalizeSitePins([...pins,{...p,label:document.getElementById('aad-pin-label').value}],f);
  try{localStorage.setItem(key(),JSON.stringify(pins));say('Feedback pin saved on this device. Download it to share a requested change.');}catch{say('Device storage is unavailable. Download pins before leaving this page.');}draw();
 },true);
 document.getElementById('aad-export-pins').addEventListener('click',()=>{sync();const u=URL.createObjectURL(new Blob([JSON.stringify({project:getBuilding()?.projectId,version:'v2',coordinateBasis:'plot front-left mm',pins},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=(getBuilding()?.projectId||'project')+'_v2_Location_Pins.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
 document.getElementById('aad-clear-pins').addEventListener('click',()=>{sync();pins=[];try{localStorage.removeItem(key());say('Feedback pins cleared on this device.');}catch{say('Pins cleared for this session. Device storage is unavailable.');}draw();});
 return{sync};
}
