/* Reusable architectural plan presentation, in the SAME world X/Z as the
 * editable floor graph. Dimensions are derived from project-owned bounds. */
const NS='http://www.w3.org/2000/svg';
export function drawPresentationPlan(svg,building,levelId,{grid=true,dimensions=true,furniture=true,selectedId=null,onSelect=()=>{},roofOnly=false}={}){
 const p=building.manifest.presentation;if(!p)return;
 const [x0,z0,x1,z1]=p.outerBounds,W=x1-x0,D=z1-z0,sourceDepth=p.sourceYLength||D;
 const [px0,pz0,px1,pz1]=p.plotBounds||p.outerBounds;
 const mm=n=>Math.round(n*1000).toLocaleString('en-US');
 const make=(tag,a={},txt)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(a))n.setAttribute(k,v);if(txt!==undefined)n.textContent=txt;return n;};
 const back=make('g',{'data-architectural-background':'true'}),front=make('g',{'data-architectural-dimensions':'true','pointer-events':'none'});
 svg.prepend(back);svg.append(front);svg.setAttribute('viewBox',[x0-2.5,z0-2.7,W+5,D+5.6].join(' '));
 const style=make('style',{},'.aad-dim{stroke:#627d78;stroke-width:.018;fill:none}.aad-dim-text{font:500 .21px system-ui;fill:#335d59;paint-order:stroke;stroke:#fcfaf3;stroke-width:.06}.aad-space-title{font:650 .23px system-ui;fill:#35554c;paint-order:stroke;stroke:#fffdf6;stroke-width:.07}.aad-space-size{font:400 .19px system-ui;fill:#64736a;paint-order:stroke;stroke:#fffdf6;stroke-width:.055}.aad-grid-label{font:400 .16px system-ui;fill:#7c9690}');
 back.append(style);
 style.textContent+='.aad-door{stroke:#a77848;fill:none}.aad-window{stroke:#62a2ad;fill:none}.aad-opening-swing{stroke:#a77848;stroke-width:.025;fill:none;pointer-events:none}.aad-column{stroke:#b37c2e;stroke-width:.025}.is-selected{stroke:#ef831b!important;stroke-width:.10!important}.aad-furnishing{cursor:pointer}.aad-furnishing.is-selected rect{stroke:#ef831b;stroke-width:.08}';
 // Override the studio's generic #viewer2d text rule, also in exported SVG.
 style.textContent=style.textContent.replaceAll('.aad-','#viewer2d .aad-');
 const plot=make('rect',{x:px0,y:pz0,width:px1-px0,height:pz1-pz0,fill:'#eff1e3',stroke:'#8d9d7e','stroke-width':.035});back.append(plot);
 back.append(make('rect',{x:x0,y:z0,width:W,height:D,fill:'#faf8ef'}));
 if(grid){
  const defs=make('defs');
  for(const[size,id,width,colour]of [[p.grid?.minor||.1,'minor',.004,'#cbded7'],[p.grid?.medium||.5,'medium',.008,'#b5cec4'],[p.grid?.major||1,'major',.013,'#94b7ab']]){
   const pattern=make('pattern',{id:'aad-grid-'+id,width:size,height:size,patternUnits:'userSpaceOnUse',patternTransform:`translate(${x0} ${z1})`});
   pattern.append(make('path',{d:`M${size} 0H0V${size}`,fill:'none',stroke:colour,'stroke-width':width}));defs.append(pattern);
  }back.append(defs);
  for(const id of ['minor','medium','major'])back.append(make('rect',{x:x0-2,y:z0-2,width:W+4,height:D+4,fill:`url(#aad-grid-${id})`,'pointer-events':'none','data-grid-spacing':id}));
  for(let x=0;x<=W;x+=(p.grid?.major||1))front.append(make('text',{x:x0+x,y:z0-.28,'text-anchor':'middle',class:'aad-grid-label'},Math.round(x*1000)));
  for(let y=0;y<=D;y+=(p.grid?.major||1))front.append(make('text',{x:x0-.25,y:sourceDepth-y+.05,'text-anchor':'end',class:'aad-grid-label'},Math.round(y*1000)));
 }
 const levels=roofOnly?[]:levelId==='all'?['GF','FF']:[levelId.toUpperCase()];
 for(const floor of levels){
  const rooms=p.roomEnvelopes[floor]||[];
  for(const r of rooms){
   const[x0,y0,x1,y1]=r.bbox,x=x0/1000,z=sourceDepth-y1/1000,w=(x1-x0)/1000,d=(y1-y0)/1000;
   back.append(make('rect',{x,y:z,width:w,height:d,fill:r.fill||'#ece6d7','fill-opacity':levelId==='all'?.10:.32,'pointer-events':'none'}));
   if(levelId!=='all'){
    const name=r.name.replace(' / INTERNAL FRONT-RIGHT DOMAIN','').replace(' / GUEST','').replace('COMMON MAIN BATHROOM','BATH + WC').replace('LIVING / LOUNGE','LIVING').replace('MAIN BEDROOM','MAIN BED').replace('HALL / ACCESS','HALL');
    front.append(make('text',{x:x+w/2,y:z+d/2-.13,'text-anchor':'middle',class:'aad-space-title'},name));
    const label=`${w.toFixed(2)}×${d.toFixed(2)} m`;
    front.append(make('text',{x:x+w/2,y:z+d/2+.15,'text-anchor':'middle',class:'aad-space-size',style:`font-size:${Math.min(.19,w/(label.length*.58))}px`},label));
   }
  }
 }
 if((furniture||roofOnly)&&levelId!=='all')for(const e of building.elements.filter(e=>(e.level===levelId||e.contextLevels?.includes(levelId))&&(roofOnly?e.roofAccess&&!e.roofCover:!e.roofPart)&&['furniture','fixture','stair','landing','auxiliary'].includes(e.kind))){
  const group=make('g',{'data-presentation-id':e.id,class:'aad-furnishing'+(e.id===selectedId?' is-selected':''),tabindex:0,role:'button','aria-label':e.name||e.id});
  group.addEventListener('click',event=>{event.stopPropagation();onSelect(e);});
  group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(e);}});
  for(const part of e.parts||[e])group.append(make('rect',{x:part.x-part.dx/2,y:part.z-part.dz/2,width:part.dx,height:part.dz,
   fill:part.colour||e.colour||'#c8b69a',stroke:'#8d9581','stroke-width':.018,rx:.025,'fill-opacity':.76}));
  // Add furnishings below the wall lines, keeping all element selection intact.
  back.append(group);
 }
 const north=make('g',{transform:`translate(${x1+1.15} ${z0-.55}) rotate(${(p.northRotationDeg||0)-45})`});north.append(make('path',{d:'M-.35 .35L.35 -.35M.35 -.35L.07 -.27M.35 -.35L.27 -.07',fill:'none',stroke:'#a56e43','stroke-width':.065}));north.append(make('text',{x:.5,y:-.45,class:'aad-space-title'},'N'));front.append(north);
 if(roofOnly)front.append(make('text',{x:x0+W/2,y:z0+3.1,'text-anchor':'middle',class:'aad-space-title'},'ROOF ACCESS · 18 RISERS · 2400 mm ENCLOSURE CLEAR HEIGHT'));
 front.append(make('text',{x:x1+.9,y:z0+.35,class:'aad-grid-label'},p.rearCaption||''));
 front.append(make('text',{x:x0+W/2,y:z1+2.55,'text-anchor':'middle',class:'aad-space-size'},(p.frontCaption||'FRONT')+' · dimensions in mm'));
 if(dimensions){
  const dim=(x1,z1,x2,z2,label)=>{
   front.append(make('path',{d:`M${x1} ${z1}L${x2} ${z2}`,class:'aad-dim'}));
   const horizontal=Math.abs(z2-z1)<.001;
   for(const[x,z]of [[x1,z1],[x2,z2]])front.append(make('path',{d:horizontal?`M${x-.08} ${z+.08}L${x+.08} ${z-.08}`:`M${x-.08} ${z-.08}L${x+.08} ${z+.08}`,class:'aad-dim'}));
   const txt=make('text',{x:(x1+x2)/2,y:(z1+z2)/2-.08,'text-anchor':'middle',class:'aad-dim-text'},label);
   if(!horizontal)txt.setAttribute('transform',`rotate(-90 ${(x1+x2)/2} ${(z1+z2)/2})`);front.append(txt);
  };
  const [bayW,bayD]=p.stairBay||[W,D];
  for(const x of [x0,x0+bayW,x1])front.append(make('path',{d:`M${x} ${z1}V${z1+1.3}`,class:'aad-dim'}));
  dim(x0,z1+1.1,x1,z1+1.1,mm(W)+' overall');dim(x0,z1+.55,x0+bayW,z1+.55,mm(bayW)+' stair bay');dim(x0+bayW,z1+.55,x1,z1+.55,mm(W-bayW)+' porch / balcony');
  for(const z of [z0,z1-bayD,z1])front.append(make('path',{d:`M${x0} ${z}H${x0-1.65}`,class:'aad-dim'}));
  dim(x0-1.45,z0,x0-1.45,z1,mm(D)+' overall');dim(x0-.85,z1-bayD,x0-.85,z1,mm(bayD)+' stair bay');
  front.append(make('text',{x:x0+W/2,y:z0-1.65,'text-anchor':'middle',class:'aad-space-size'},p.wallLegend||''));
  front.append(make('text',{x:x0+W/2,y:z0-1.28,'text-anchor':'middle',class:'aad-space-size'},[p.grid?.minor||.1,p.grid?.medium||.5,p.grid?.major||1].map(n=>Math.round(n*1000)).join(' / ')+' mm callable grid · outer-face dimensions'));
 }
}
