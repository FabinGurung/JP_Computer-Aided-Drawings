/* Reusable column-axis REVIEW overlay for authored, unapproved presentation markers.
 * Axes identify visible candidate column locations; NEVER infer a column at
 * an empty grid intersection or validate the building load path from geometry.
 */
const NS='http://www.w3.org/2000/svg';
const roundMm=m=>Math.round(m*1000);
const requireFinite=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n))throw Error('Invalid column-axis '+label);};
function assert(condition,message){if(!condition)throw Error('Column-axis review grid: '+message);}
export function inspectColumnAxisGrid(manifest){
 const p=manifest?.presentation,grid=p?.columnAxisGrid;
 if(!grid)return null;
 assert(grid.schema==='jp-cad://review-column-axes/1','schema must be explicitly review only');
 assert(/STRUCTURAL_NOT_VERIFIED/.test(grid.status),'missing structural status qualifier');
 assert(manifest.representation==='ARCHITECTURAL_REVIEW_ONLY','never present marker axes on an engineered issued model');
 assert(Array.isArray(grid.letterAxes)&&grid.letterAxes.length>=2,'letter axes missing');
 assert(Array.isArray(grid.numberAxes)&&grid.numberAxes.length>=2,'number axes missing');
 assert(Array.isArray(grid.levels)&&grid.levels.length>=2,'levels missing');
 assert(Array.isArray(p.elements),'presentation column markers missing');
 const xs=grid.letterAxes,zs=grid.numberAxes,epsilon=grid.toleranceMm??1;
 assert(epsilon>0&&epsilon<=10,'coordinate matching tolerance not in mm review range');
 for(let i=0;i<xs.length;i++){const a=xs[i];requireFinite(a.xMm,'X');assert(/^[A-Z]+$/.test(a.label),'letter designation');if(i)assert(a.xMm>xs[i-1].xMm+epsilon,'letter axes must increase in X');}
 for(let i=0;i<zs.length;i++){const a=zs[i];requireFinite(a.zMm,'Z');assert(/^[1-9][0-9]*$/.test(a.label),'number designation');if(i)assert(a.zMm<zs[i-1].zMm-epsilon,'number axes must run front to rear');}
 assert(new Set(xs.map(a=>a.label)).size===xs.length,'duplicate letter');
 assert(new Set(zs.map(a=>a.label)).size===zs.length,'duplicate row');
 const gridCells=new Set(xs.flatMap(x=>zs.map(z=>x.label+z.label)));
 const knownEmpty=new Set(grid.knownEmptyIntersections||[]);
 for(const id of knownEmpty)assert(gridCells.has(id),'unknown empty intersection '+id);
 const markersByLevel={};
 for(const level of grid.levels){
  const markers=p.elements.filter(e=>e.level===level&&e.kind==='column');
  const occupied=new Set();
  markersByLevel[level]=markers.map(e=>{
   requireFinite(e.x,'marker X');requireFinite(e.z,'marker Z');
   const x=xs.filter(a=>Math.abs(a.xMm-roundMm(e.x))<=epsilon);
   const z=zs.filter(a=>Math.abs(a.zMm-roundMm(e.z))<=epsilon);
   assert(x.length===1&&z.length===1,'marker does not match exactly one grid intersection '+e.id);
   const id=x[0].label+z[0].label;
   assert(e.axisReference===id,'marker reference/position differs '+e.id+' expected '+id);
   assert(!occupied.has(id),'duplicate marker '+level+' / '+id);
   occupied.add(id);
   return {id,elementId:e.id,level,xMm:roundMm(e.x),zMm:roundMm(e.z),status:e.status};
  });
  assert(markers.length===grid.countPerLevel,'candidate count differs on '+level);
  assert([...gridCells].filter(id=>!occupied.has(id)).sort().join('|')===[...knownEmpty].sort().join('|'),'a missing intersection was inferred or changed on '+level);
 }
 const actual=[...new Set(grid.levels.flatMap(level=>markersByLevel[level].map(e=>e.id)))].sort();
 for(const level of grid.levels)assert(markersByLevel[level].map(m=>m.id).sort().join('|')===actual.join('|'),'GF/FF candidate markers not registered');
 return{grid,markersByLevel,markerIds:actual,knownEmpty:[...knownEmpty]};
}
export function drawColumnAxisOverlay(target,manifest,levelId,{enabled=true,roofOnly=false,outerBounds}={}){
 const contract=inspectColumnAxisGrid(manifest);
 if(!enabled||roofOnly||!contract||!outerBounds)return null;
 const {grid,markersByLevel}=contract;
 if(levelId!=='all'&&!grid.levels.includes(levelId))return null;
 const [x0,z0,x1,z1]=outerBounds;
 const el=(name,props={},value)=>{const n=document.createElementNS(NS,name);for(const [k,v] of Object.entries(props))n.setAttribute(k,String(v));if(value!==undefined)n.textContent=value;return n;};
 const group=el('g',{'data-column-axis-overlay':'review','pointer-events':'none','aria-label':'Provisional column axes; not verified structural locations'});
 target.append(group);
 const lineLayer=el('g',{'data-column-axis-lines':'true'}),labels=el('g',{'data-column-axis-bubbles':'true'});
 group.append(lineLayer,labels);
 const bubble=(x,z,label,type,side)=>{
  const g=el('g',{'data-column-axis':label,'data-axis-direction':type,'data-axis-side':side});
  g.append(el('circle',{cx:x,cy:z,r:.235,fill:'#fffdf9',stroke:'#665082','stroke-width':.046}));
  g.append(el('text',{x,y:z+.009,'text-anchor':'middle','dominant-baseline':'middle',fill:'#483467','font-family':'system-ui,sans-serif','font-size':'.245','font-weight':'750'},label));
  labels.append(g);
 };
 for(const axis of grid.letterAxes){
  const x=axis.xMm/1000;
  lineLayer.append(el('line',{x1:x,y1:z0-.52,x2:x,y2:z1+1.75,'stroke':'#846d9c','stroke-width':'.031','stroke-dasharray':'.20 .13','data-axis-line':axis.label,'opacity':'.88'}));
  bubble(x,z0-.87,axis.label,'letter','rear');
  bubble(x,z1+1.96,axis.label,'letter','front');
 }
 for(const axis of grid.numberAxes){
  const z=axis.zMm/1000;
  lineLayer.append(el('line',{x1:x0-1.8,y1:z,x2:x1+1.72,y2:z,'stroke':'#846d9c','stroke-width':'.031','stroke-dasharray':'.20 .13','data-axis-line':axis.label,'opacity':'.88'}));
  bubble(x0-2.07,z,axis.label,'number','left');
  bubble(x1+1.95,z,axis.label,'number','right');
 }
 const floors=levelId==='all'?grid.levels:[levelId],rendered=new Set();
 for(const level of floors)for(const marker of markersByLevel[level]){
  if(rendered.has(marker.id))continue;rendered.add(marker.id);
  const x=marker.xMm/1000,z=marker.zMm/1000;
  const lbl=el('text',{x:x+.25,y:z-.24,'text-anchor':'start','font-size':'.22','font-weight':'750','font-family':'system-ui,sans-serif',fill:'#563b7e','paint-order':'stroke',stroke:'#fffdf6','stroke-width':'.09','stroke-linejoin':'round','data-column-axis-node':marker.id},marker.id);
  labels.append(lbl);
 }
 // Ashok's east coordinate inspector replaces its on-plan provenance caption. Other projects retain it when there is no such inspector.
 if(!manifest.presentation?.coordinateGrid)labels.append(el('text',{x:(x0+x1)/2,y:z0-2.13,'text-anchor':'middle','font-size':'.22','font-weight':'750','font-family':'system-ui,sans-serif',fill:'#654b79','data-column-axis-disclaimer':'true'},'COLUMN AXES · PROVISIONAL MARKERS / NOT ENGINEERED'));
 return group;
}
