import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
// @ts-ignore Static calculation module is also imported directly by Node source tests.
import {calculate,assembly} from '../../public/assets/js/harisharan-takeoff.mjs';
const $=(id:string)=>document.getElementById(id)!;
const fmt=(n:number,d=2)=>n.toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});
const escapeHtml=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let source:any,result:any;
const text=(id:string,v:string)=>{$(id).textContent=v;};
function settings(){const tie=Number(($('tie-scenario') as HTMLSelectElement).value);return {rccCementKgM3:Number(($('cement-content') as HTMLInputElement).value),columnTieDiameter:tie,columnTieSpacing:tie===8?.125:.1,footingMats:Number(($('mats') as HTMLSelectElement).value),footCover:Number(($('foot-cover') as HTMLInputElement).value)/1000,steelWastePercent:Number(($('steel-waste') as HTMLInputElement).value),cementWastePercent:Number(($('cement-waste') as HTMLInputElement).value)};}
function update(){try{
 result=calculate(source,settings());text('fatal','');
 text('steel-net',fmt(result.totalSteel/1000)+' t');text('cement-net',fmt(result.cementBags,1)+' bags');text('rcc-net',fmt(result.rcc)+' m³');text('pcc-net',fmt(result.pcc)+' m³');text('column-height',fmt(result.columnHeight)+' m');
 text('allowance-note',`With the selected ${result.settings.steelWastePercent}% steel waste allowance: ${fmt(result.steelWithAllowance/1000)} t. With ${result.settings.cementWastePercent}% handling allowance: ${result.cementAllowanceBags} bags. These remain incomplete planning subtotals: allowances do not supply the missing bar details, footing geometry or excluded works.`);
 $('diameters').innerHTML=result.byDiameter.map((r:any)=>`<tr><td>Ø${r.diameter} mm</td><td class="num">${fmt(r.length)}</td><td class="num">${fmt(r.kg)}</td></tr>`).join('')+`<tr><th>Total net</th><td class="num">—</td><th class="num">${fmt(result.totalSteel)}</th></tr>`;
 const groups:Record<string,number>={};for(const r of result.concrete)groups[r.stage]=(groups[r.stage]||0)+r.volume;
 $('cement-stages').innerHTML=Object.entries(groups).map(([stage,v])=>{const bags=stage==='PCC below pads'?result.pccCement/50:v*result.settings.rccCementKgM3/50;return `<tr><td>${stage}</td><td class="num">${fmt(v,3)}</td><td class="num">${fmt(bags,1)}</td></tr>`;}).join('')+`<tr><th>Total scenario</th><td class="num">${fmt(result.rcc+result.pcc,3)}</td><th class="num">${fmt(result.cementBags,1)}</th></tr>`;
 const sg:Record<string,number>={};for(const r of result.steel)sg[r.stage]=(sg[r.stage]||0)+r.kg;const max=Math.max(...Object.values(sg));
 $('steel-chart').innerHTML=Object.entries(sg).map(([name,v])=>`<div class="bar-row"><span><label>${name}</label><strong>${fmt(v,0)} kg</strong></span><div class="bar-track"><b style="width:${v/max*100}%"></b></div></div>`).join('');
 $('concrete-ledger').innerHTML=result.concrete.map((v:any)=>`<tr><td>${v.id}</td><td class="num">${fmt(v.volume,4)}</td><td class="formula">${escapeHtml(v.formula)}</td><td>${v.ref}</td></tr>`).join('');
 text('strap-total',`12 spans · ${fmt(result.strapLength,3)} m centreline`);text('plinth-total',`27 spans · ${fmt(result.plinthLength,3)} m centreline`);
 text('load-status',`${source.revision} loaded · 3 supplied files · source conflicts open · calculations recalculated`);
 }catch(e){text('fatal',String(e));}
}
function download(name:string,body:string,type:string){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function csv(rows:any[],keys:string[]){return keys.join(',')+'\n'+rows.map(r=>keys.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(',')).join('\n');}
let controls:OrbitControls|undefined,camera:THREE.PerspectiveCamera|undefined;
function switchView(plan:boolean){$('viewer').hidden=plan;$('plan').hidden=!plan;$('view-3d').setAttribute('aria-pressed',String(!plan));$('view-plan').setAttribute('aria-pressed',String(plan));}
function selectItem(e:any){text('selection',`${e.id} · ${e.description} · ${e.ref}. Provisional visualization; see quantities and review issues.`);}
function drawPlan(){const a=assembly(source),d=source.dimensions,items:string[]=[];const scale=13,ox=50,oz=40,H=410;const x=(n:number)=>ox+n*scale,z=(n:number)=>H-oz-n*scale;
 const shapes:any[]=[];for(const n of a.nodes){const fx=n.footing==='F1'?2.55:2.1,fz=n.footing==='F1'?2.55:2.7;const cx=n.side==='left'?.825:n.side==='right'?-.825:0;const item={id:'PAD-'+n.id,description:`${n.footing} footing ${fx} × ${fz} m, full 0.60 m envelope`,ref:'STR-01/02'};const i=shapes.push(item)-1;items.push(`<rect data-item="${i}" x="${x(n.x+cx-fx/2)}" y="${z(n.z+fz/2)}" width="${fx*scale}" height="${fz*scale}" fill="#d1c398" stroke="#8b7b53"/>`);}
 for(const b of a.plinth){const i=shapes.push({id:b.id,description:`plinth beam ${fmt(b.length,3)} m c/c, 300 × 350 mm`,ref:'STR-04/05'})-1;items.push(`<line data-item="${i}" x1="${x(b.a.x)}" y1="${z(b.a.z)}" x2="${x(b.b.x)}" y2="${z(b.b.z)}" stroke="#197c79" stroke-width="5"/>`);}
 for(const n of a.nodes){const i=shapes.push({id:n.id,description:`${n.type} column 450 × 450 mm`,ref:'STR-01/03'})-1;items.push(`<rect data-item="${i}" x="${x(n.x-.225)}" y="${z(n.z+.225)}" width="${d.column*scale}" height="${d.column*scale}" fill="#cb8750"/><text x="${x(n.x)+7}" y="${z(n.z)-6}" font-size="8" fill="#163f46">${n.id}</text>`);}
 $('plan').innerHTML=`<svg viewBox="0 0 260 410" role="img" aria-label="Foundation grid plan showing 18 pads and 27 plinth spans"><text x="18" y="17" font-size="9">Local grid · metres · north not registered</text>${items.join('')}<text x="18" y="398" font-size="8">D5/E4 scaled from PDF · dimension closure unresolved</text></svg>`;
 $('plan').querySelectorAll('[data-item]').forEach(el=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',shapes[Number((el as HTMLElement).dataset.item)].id);const choose=()=>selectItem(shapes[Number((el as HTMLElement).dataset.item)]);el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if((e as KeyboardEvent).key==='Enter')choose();});});
}
function draw3d(){try{
 const host=$('viewer'),renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));host.prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#eff5f6');camera=new THREE.PerspectiveCamera(40,1,.01,250);camera.position.set(30,25,39);
 controls=new OrbitControls(camera,renderer.domElement);controls.target.set(5.6,-.6,12.5);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2.02;controls.minDistance=6;controls.maxDistance=85;controls.update();controls.saveState();
 scene.add(new THREE.HemisphereLight(0xffffff,0xb4c4c7,2.5));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(15,30,10);scene.add(sun);
 const grid=new THREE.GridHelper(40,40,0xc2d4d6,0xdce7e8);grid.position.set(5.5,-1.51,12.5);scene.add(grid);const meshes:THREE.Mesh[]=[];
 const add=(id:string,desc:string,ref:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number,angle=0)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial({color,roughness:.85}));mesh.position.set(x,y,z);mesh.rotation.y=angle;mesh.userData={id,description:desc,ref};scene.add(mesh);meshes.push(mesh);const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0x31505a,transparent:true,opacity:.35}));mesh.add(edges);};
 const a=assembly(source),d=source.dimensions;
 for(const n of a.nodes){const sx=n.footing==='F1'?2.55:2.1,sz=n.footing==='F1'?2.55:2.7,offset=n.side==='left'?.825:n.side==='right'?-.825:0;add('PAD-'+n.id,`${n.footing}, ${sx} × ${sz} × 0.60 m rectangular envelope`,'STR-01/02',n.x+offset,-1.2,n.z,sx,.6,sz,0xbaa778);add(n.id,`${n.type}, 450 × 450 mm column to plinth`,'STR-01/03',n.x,-.9+result.columnHeight/2,n.z,.45,result.columnHeight,.45,0xcb8750);}
 for(const [arr,type,width,depth,y,color,ref] of [[a.straps,'strap',.45,.8,-1.1,0x648e9c,'STR-04/06'],[a.plinth,'plinth',.3,.35,.55-.175,0x197c79,'STR-04/05']] as any[]){for(const b of arr){const dx=b.b.x-b.a.x,dz=b.b.z-b.a.z;add(b.id,`${type} beam ${fmt(b.length,3)} m c/c; ${width} × ${depth} m`,ref,(b.a.x+b.b.x)/2,y,(b.a.z+b.b.z)/2,width,depth,b.length-.45,color,Math.atan2(dx,dz));}}
 const resize=()=>{if(!camera)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 const ray=new THREE.Raycaster(),pt=new THREE.Vector2();let start={x:0,y:0},selected:THREE.Mesh|undefined;
 renderer.domElement.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};});renderer.domElement.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)return;const r=renderer.domElement.getBoundingClientRect();pt.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pt,camera!);const hit=ray.intersectObjects(meshes,false)[0];if(hit){if(selected)(selected.material as THREE.MeshStandardMaterial).emissive.set(0);selected=hit.object as THREE.Mesh;(selected.material as THREE.MeshStandardMaterial).emissive.set(0x225544);selectItem(selected.userData);}});
 renderer.setAnimationLoop(()=>{if(!host.hidden){controls!.update();renderer.render(scene,camera!);}});
 }catch(e){$('model-fallback').hidden=false;switchView(true);text('load-status','3D unavailable; all quantities and plan are available.');}}
async function boot(){const response=await fetch(new URL('../../data/projects/harisharan-adhikari/takeoff.json',location.href));if(!response.ok)throw Error(`Source file HTTP ${response.status}`);source=await response.json();update();drawPlan();draw3d();
 $('issues').innerHTML=source.issues.map((v:any)=>`<details class="issue"><summary>${v.id} · ${escapeHtml(v.title)}</summary><p>${escapeHtml(v.detail)}</p></details>`).join('');
 $('exclusions').innerHTML=source.exclusions.slice(1).map((v:string)=>`<li>${escapeHtml(v)}</li>`).join('');
 $('source-files').innerHTML=source.sources.map((v:any)=>`<p class="tiny"><strong>${v.id}</strong> · ${escapeHtml(v.filename)}${v.pages?' · '+v.pages+' sheets':''}<br><span class="proof">SHA-256 ${v.sha256}</span></p>`).join('');
 $('references').innerHTML=source.references.map((v:any)=>`<li><a href="${escapeHtml(v.url)}" target="_blank" rel="noopener">${escapeHtml(v.title)}</a></li>`).join('');
 for(const id of ['cement-content','tie-scenario','mats','foot-cover','steel-waste','cement-waste'])$(id).addEventListener('change',update);
 $('reset-inputs').onclick=()=>{for(const [id,val] of Object.entries({'cement-content':350,'tie-scenario':8,mats:2,'foot-cover':50,'steel-waste':5,'cement-waste':3}))($(id) as HTMLInputElement).value=String(val);update();};
 $('view-3d').onclick=()=>switchView(false);$('view-plan').onclick=()=>switchView(true);$('fit').onclick=()=>controls?.reset();$('print').onclick=()=>window.print();
 $('download-steel').onclick=()=>download('Harisharan_R000001_PROVISIONAL_steel.csv',csv(result.steel,['id','stage','diameter','count','cut','length','kg','ref','note']),'text/csv');
 $('download-concrete').onclick=()=>download('Harisharan_R000001_PROVISIONAL_concrete.csv',csv(result.concrete,['id','stage','volume','formula','ref']),'text/csv');
 $('download-scenario').onclick=()=>download('Harisharan_R000001_PROVISIONAL_scenario.json',JSON.stringify({revision:source.revision,status:source.status,issueForConstruction:false,settings:result.settings,result,issues:source.issues,exclusions:source.exclusions},null,2),'application/json');}
boot().catch(e=>{text('fatal',`Unable to load project: ${String(e)}`);text('load-status','Project load failed. Quantities unavailable.');});
