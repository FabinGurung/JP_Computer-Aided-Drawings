/* Shared CAD navigation. Product routes only; no app state or engine mutations. */
(() => {
  "use strict";
  const script=document.currentScript;
  if (!script) return;
  const prefix=script.getAttribute("data-cad-root") || "./";
  const root=new URL(prefix,document.baseURI);
  const build=(slug)=>new URL(slug,root).href;
  const clean=(path)=>path.replace(/(?:index\.html)?\/?$/,"/");
  const current=clean(location.pathname);
  const pages=[
    ["Home",""],
    ["Design Studio","cad/aad/"],
    ["Projects","projects/"],
    ["How It Works","guide/"]
  ];
  const more=[
    ["Research & prototypes","research/"],
    ["Releases & history","releases/"],
    ["Source catalogue","source/"]
  ];
  const nav=document.createElement("nav");
  nav.className="cad-global-nav";
  nav.setAttribute("aria-label","CAD main navigation");
  nav.id="cad-global-navigation";
  const skip=document.createElement("a");
  skip.className="cad-global-skip";skip.textContent="Skip to content";skip.href="#cad-main-content";
  nav.appendChild(skip);
  const brand=document.createElement("a");
  brand.className="cad-global-brand";brand.href=build("");
  brand.append("◈ CAD ");const mark=document.createElement("b");mark.textContent="/ Design Workspace";brand.append(mark);nav.append(brand);
  const menu=document.createElement("div");menu.className="cad-global-links";
  for(const [title,slug] of pages){
    const a=document.createElement("a");a.textContent=title;a.href=build(slug);
    if(clean(new URL(a.href).pathname)===current)a.setAttribute("aria-current","page");
    menu.append(a);
  }
  const details=document.createElement("details");details.className="cad-global-more";
  const summary=document.createElement("summary");summary.textContent="More";details.append(summary);
  const pop=document.createElement("div");pop.className="cad-global-popover";
  for(const [title,slug] of more){
    const a=document.createElement("a");a.textContent=title;a.href=build(slug);
    if(clean(new URL(a.href).pathname)===current)a.setAttribute("aria-current","page");
    pop.append(a);
  }
  details.append(pop);menu.append(details);nav.append(menu);
  const status=document.createElement("span");
  status.className="cad-global-tag";status.textContent="ENGINEERING DRAFT · SOURCE-GOVERNED";
  nav.append(status);
  const first=document.body.firstChild;
  document.body.insertBefore(nav,first);
  const main=document.querySelector("main") || document.querySelector(".app") || document.querySelector(".wrap");
  if(main && !main.id)main.id="cad-main-content";
  document.body.classList.add("cad-shell-ready");
  // Keep progressive menus closed after choosing a link and on Escape.
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape" && details.open){details.open=false;summary.focus();}
  });
})();
