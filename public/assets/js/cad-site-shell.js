/* One product-first navbar with accessible, progressively disclosed libraries. */
(()=>{"use strict";
 const source=document.currentScript;if(!source)return;
 const root=new URL(source.getAttribute("data-cad-root")||"./",document.baseURI);
 const path=(slug)=>new URL(slug,root).href;
 const normalized=(u)=>new URL(u,document.baseURI).pathname.replace(/(?:index\\.html)?\\/?$/,"/");
 const current=normalized(location.href);
 const nav=document.createElement("nav");nav.id="cad-global-navigation";nav.className="cad-global-nav";nav.setAttribute("aria-label","CAD main navigation");
 const link=(name,slug)=>{
  const a=document.createElement("a");a.textContent=name;a.href=path(slug);
  if(normalized(a.href)===current)a.setAttribute("aria-current","page");
  return a;
 };
 const skip=document.createElement("a");skip.className="cad-global-skip";skip.href="#cad-main-content";skip.textContent="Skip to content";nav.append(skip);
 const brand=link("◈ CAD · Design Studio","");brand.className="cad-global-brand";nav.append(brand);
 const menu=document.createElement("div");menu.className="cad-global-links";
 for(const [title,slug] of [["Home",""],["Design Studio","cad/aad/"],["Projects","projects/"],["How It Works","guide/"]])menu.append(link(title,slug));
 const more=document.createElement("details");more.className="cad-global-more";
 const trigger=document.createElement("summary");trigger.textContent="More";more.append(trigger);
 const popup=document.createElement("div");popup.className="cad-global-popover";
 const groups=[
  ["Earlier design tools",[["Previous CAD editor","cad/"],["Words-to-mass prototype","cad/brief/"]]],
  ["Research & prototypes",[["Research catalogue","research/"],["Canonical geometry v0.2","research/open-architecture-engine/v0.2/"],["Original geometry proof","research/open-architecture-engine/"]]],
  ["Projects & history",[["Project library","projects/"],["Release history","releases/"],["Source catalogue","source/"]]],
  ["Guides & reference",[["How the system works","guide/"],["AI Design Studio","cad/aad/"]]]
 ];
 for(const [groupName,entries] of groups){
  const section=document.createElement("details");section.className="cad-more-group";
  const heading=document.createElement("summary");heading.textContent=groupName;section.append(heading);
  const links=document.createElement("div");links.className="cad-more-group-links";
  for(const [name,slug] of entries)links.append(link(name,slug));
  section.append(links);popup.append(section);
 }
 more.append(popup);menu.append(more);nav.append(menu);
 const status=document.createElement("span");status.className="cad-global-tag";status.textContent="ILLUSTRATIVE DRAFT";nav.append(status);
 document.body.insertBefore(nav,document.body.firstChild);
 const main=document.querySelector("main")||document.querySelector(".app")||document.querySelector(".wrap");
 if(main&&!main.id)main.id="cad-main-content";
 document.body.classList.add("cad-shell-ready");
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&more.open){more.open=false;trigger.focus();}});
 document.addEventListener("pointerdown",e=>{if(more.open&&!more.contains(e.target))more.open=false;});
})();