/* Reusable SVG world-XZ viewport navigation. No CAD records are mutated.
 * Viewbox is the sole camera authority; hover/pin coordinates still use
 * inverse SVG getScreenCTM() in the calling editor after pan and zoom.
 */
export function createAADSvgNavigator(svg,getFit,{onChange=()=>{}}={}){
 if(!svg||typeof getFit!=="function")throw Error("SVG + fit bounds required");
 let view=null,fit=null,dragged=false,moving=false;
 const fingers=new Map();let pinch=null;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const rect=()=>svg.getBoundingClientRect();
 const screenPoint=(x,y)=>{
  const ctm=svg.getScreenCTM();if(!ctm)return null;
  const p=svg.createSVGPoint();p.x=x;p.y=y;
  const q=p.matrixTransform(ctm.inverse());return{x:q.x,z:q.y};
 };
 const publish=()=>{
  if(!view)return;
  svg.setAttribute("viewBox",[view.x,view.y,view.w,view.h].join(" "));
  onChange({...view});
 };
 const ensure=()=>{
  if(!view){
   fit=getFit();view={...fit};
   if(!(view.w>0&&view.h>0))throw Error("Invalid SVG world extents");
  }
  publish();
 };
 const zoom=(factor,clientX,clientY)=>{
  ensure();
  const b=rect();const anchor=screenPoint(clientX??b.left+b.width/2,clientY??b.top+b.height/2);
  if(!anchor)return;
  const relative=clamp(factor,fit.w/view.w/40,fit.w/view.w*2.5);
  if(!(relative>0))return;
  view={x:anchor.x-(anchor.x-view.x)*relative,
   y:anchor.z-(anchor.z-view.y)*relative,w:view.w*relative,h:view.h*relative};
  publish();
 };
 const pan=(from,to)=>{
  const a=screenPoint(from.x,from.y),b=screenPoint(to.x,to.y);
  if(!a||!b)return;
  view.x+=a.x-b.x;view.y+=a.z-b.z;publish();
 };
 const reset=()=>{fit=getFit();view={...fit};publish();};
 const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 svg.style.touchAction="none";
 svg.addEventListener("wheel",e=>{
  e.preventDefault();zoom(Math.exp(clamp(e.deltaY,-280,280)*.0014),e.clientX,e.clientY);
 },{passive:false});
 svg.addEventListener("pointerdown",e=>{
  if(e.button!==0&&e.pointerType==="mouse")return;
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
  if(fingers.size>=2){
   const [a,b]=[...fingers.values()].slice(0,2);
   pinch={distance:dist(a,b),middle:mid(a,b)};moving=true;
   try{svg.setPointerCapture(e.pointerId);}catch{}
  }
 });
 svg.addEventListener("pointermove",e=>{
  const p=fingers.get(e.pointerId);if(!p)return;
  const next={x:e.clientX,y:e.clientY};
  if(fingers.size>=2){
   const points=[...fingers.entries()].map(([id,val])=>id===e.pointerId?next:val).slice(0,2);
   const d=dist(points[0],points[1]),m=mid(points[0],points[1]);
   if(pinch&&d>5&&pinch.distance>5){
    pan(pinch.middle,m);zoom(pinch.distance/d,m.x,m.y);
    pinch={distance:d,middle:m};
   }
   moving=true;dragged=true;
  }else{
   const length=Math.hypot(next.x-p.startX,next.y-p.startY);
   if(length>5)moving=true;
   if(moving){
    pan({x:p.x,y:p.y},next);dragged=true;
    try{svg.setPointerCapture(e.pointerId);}catch{}
   }
  }
  p.x=next.x;p.y=next.y;
 });
 const end=e=>{
  fingers.delete(e.pointerId);
  try{if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);}catch{}
  if(fingers.size===0){moving=false;pinch=null;}
 };
 svg.addEventListener("pointerup",end);
 svg.addEventListener("pointercancel",end);
 svg.addEventListener("lostpointercapture",e=>{fingers.delete(e.pointerId);});
 // Mouse/pointer clicks after a drag must not create a false pin or selection.
 svg.addEventListener("click",e=>{
  if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false;}
 },true);
 return{apply:ensure,reset,zoomIn:()=>zoom(.75),zoomOut:()=>zoom(1.333333),
  zoom,worldFromScreen:screenPoint,view:()=>view?{...view}:null,
  consumeDragged:()=>{const x=dragged;dragged=false;return x;}};
}
