/* CAD-owned reusable AAD project viewer. Project data is separate from the engine.
 * Source-DXF geometry and annotation are evidence; drawing approval is independent.
 */
(() => {
 "use strict";
 const root=document.querySelector("[data-aad-project]"); if(!root)return;
 const pack=window.AAD_PROJECT_PACKAGE;
 const byId=id=>document.getElementById(id);
 const svg=byId("aad-source-svg"),status=byId("aad-view-status"),table=byId("aad-dimension-list");
 const view={floor:"gf",zoom:1,panX:0,panY:0,layers:new Set(["W","O","S","G","D","F","A"]),showDims:true,showLabels:true};
 let floorData=null,drag=null;
 const escapeText=(s)=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 async function inflate(b64){
  const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
 }
 const colors={W:"#d0e4f9",O:"#6bd1f7",S:"#e3af72",G:"#5f748b",D:"#f9cd7c",F:"#a0bfc1",A:"#697d8b"};
 function render(){
  if(!floorData)return;
  const v=floorData,b=v.bounds_mm;const width=(b[2]-b[0])/10,height=(b[3]-b[1])/10;
  const centerX=width/2+view.panX,centerY=height/2+view.panY;
  const vw=width/view.zoom,vh=height/view.zoom;
  svg.setAttribute("viewBox",[centerX-vw/2,centerY-vh/2,vw,vh].join(" "));
  const groups={};
  for(const line of v.lines){const [x1,y1,x2,y2,k]=line;
   if(!view.layers.has(k))continue;
   (groups[k]??=[]).push("M"+x1+" "+y1+"L"+x2+" "+y2);
  }
  let out='<rect width="'+width+'" height="'+height+'" fill="#0d1724"/>';
  for(const [key,paths] of Object.entries(groups)){
   const thickness=key==="W"?8:key==="O"?5:key==="S"?4:2.6;
   out+='<path d="'+paths.join("")+'" fill="none" stroke="'+(colors[key]||colors.A)+'" stroke-width="'+thickness+'" opacity="'+(key==="G"?.4:1)+'" vector-effect="non-scaling-stroke"/>';
  }
  const textScale=Math.max(10,Math.min(22,width/120));
  if(view.showLabels)for(const [x,y,label] of v.annotations){
   if(label.length>65 && !/PLAN|AREA/i.test(label))continue;
   const value=label.slice(0,65);
   out+='<text x="'+x+'" y="'+y+'" fill="#c5f0e3" font-size="'+textScale+'" text-anchor="middle" paint-order="stroke" stroke="#0d1724" stroke-width="4">'+escapeText(value)+'</text>';
  }
  if(view.showDims)for(const [x,y,label] of v.dimensions){
   out+='<text x="'+x+'" y="'+y+'" fill="#ffda7f" font-size="'+Math.max(9,textScale*.8)+'" text-anchor="middle" paint-order="stroke" stroke="#0d1724" stroke-width="4">'+escapeText(label)+'</text>';
  }
  svg.innerHTML=out;
  byId("aad-area").textContent=Number.isFinite(v.area)?v.area.toFixed(2)+" m²":"Not tabulated";
  byId("aad-dim-count").textContent=v.dimensions.length+" measured dimension objects";
  byId("aad-entity-count").textContent=v.lines.length+" drawn vectors";
  table.innerHTML=v.dimensions.map(([x,y,d],i)=>'<tr><td>'+String(i+1).padStart(2,"0")+'</td><td>'+escapeText(d)+'</td><td>'+escapeText(Math.round((b[0]+x*10)/1000)+" m, "+Math.round((b[3]-y*10)/1000)+" m")+'</td></tr>').join("");
  status.textContent="Source-derived view · "+v.lines.length+" plotted segments · "+v.dimensions.length+" CAD measurements";
 }
 async function loadFloor(key){
  const item=pack.floors[key];if(!item)return;
  status.textContent="Opening extracted "+item.name+"…";view.floor=key;view.zoom=1;view.panX=0;view.panY=0;
  try{
   floorData=await inflate(item.gzip);
   byId("aad-floor-title").textContent=item.name+" · July 2026 revised";
   document.querySelectorAll("[data-floor]").forEach(e=>{e.setAttribute("aria-pressed",String(e.dataset.floor===key));});
   render();
  }catch(error){status.textContent="Unable to open DXF extraction: "+(error.message||String(error));}
 }
 root.addEventListener("click",e=>{
  const b=e.target.closest("[data-floor]");if(b){loadFloor(b.dataset.floor);return;}
  const z=e.target.closest("[data-zoom]");if(z){view.zoom=Math.max(.7,Math.min(8,view.zoom*(z.dataset.zoom==="in"?1.25:1/1.25)));render();return;}
  if(e.target.closest("[data-reset-view]")){view.zoom=1;view.panX=0;view.panY=0;render();}
 });
 root.querySelectorAll("[data-layer]").forEach(e=>e.addEventListener("change",()=>{if(e.checked)view.layers.add(e.dataset.layer);else view.layers.delete(e.dataset.layer);render();}));
 byId("aad-show-dims").onchange=e=>{view.showDims=e.target.checked;render();};
 byId("aad-show-labels").onchange=e=>{view.showLabels=e.target.checked;render();};
 svg.addEventListener("wheel",e=>{e.preventDefault();view.zoom=Math.max(.7,Math.min(8,view.zoom*(e.deltaY<0?1.12:1/1.12)));render();},{passive:false});
 svg.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,panX:view.panX,panY:view.panY};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener("pointermove",e=>{if(!drag||!floorData)return;const r=svg.getBoundingClientRect(),b=floorData.bounds_mm;view.panX=drag.panX-(e.clientX-drag.x)/r.width*((b[2]-b[0])/10/view.zoom);view.panY=drag.panY-(e.clientY-drag.y)/r.height*((b[3]-b[1])/10/view.zoom);render();});
 svg.addEventListener("pointerup",()=>{drag=null;});
 svg.addEventListener("pointercancel",()=>{drag=null;});
 loadFloor("gf");
})();
