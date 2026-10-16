/** Cross-page product navigation QA: no changes to historical project engines. */
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const prefix=process.env.CAD_SITE_URL || "http://127.0.0.1:5177/";
const routes=[
 ["","CAD home"],["cad/aad/","AI Design Studio"],["cad/brief/","Language preview"],
 ["cad/","CAD Studio"],["guide/","How It Works"],["projects/","Projects"],
 ["projects/narayani-parajuli/","Narayani public hub"],
 ["projects/ramachandra-devkota/","Ramachandra public hub"],
 ["research/","Research"],["research/open-architecture-engine/","Research archive"],
 ["research/open-architecture-engine/v0.2/","Research v0.2"],
 ["releases/","Releases"],["source/","Sources"]];
try{
 const p=await browser.newPage({viewport:{width:1366,height:920}});
 const errors=[];p.on("pageerror",e=>errors.push(e.message));
 for(const [route,title] of routes){
  const response=await p.goto(new URL(route,prefix).href,{waitUntil:"domcontentloaded",timeout:45000});
  if(!response||response.status()>=400)throw Error(title+" route unavailable: "+response?.status());
  await p.locator("#cad-global-navigation").waitFor({timeout:12000});
  const sheet=await p.locator('link[href*="cad-unified-theme.css"]').count();
  if(sheet!==1)throw Error(title+" missing one shared stylesheet");
  const menu=await p.locator("#cad-global-navigation a").count();
  if(menu<8)throw Error(title+" missing global navigation");
 }
 await p.goto(prefix,{waitUntil:"networkidle"});
 const dark=await p.locator("body").evaluate(e=>getComputedStyle(e).backgroundColor);
 if(!/rgb\((\s*9,\s*21,\s*34|\s*8,\s*18,\s*31)/.test(dark))throw Error("Home is not unified midnight palette: "+dark);
 const cards=await p.locator(".cad-tool").count();
 if(cards!==3)throw Error("Default product journeys are not exactly three: "+cards);
 if(await p.locator("#capabilities .cad-detail").isVisible())throw Error("Advanced content must start collapsed");
 await p.locator("#capabilities summary").click();
 if(!(await p.locator("#capabilities .cad-detail").isVisible()))throw Error("Details expansion failed");
 await p.locator("#projects summary").click();
 await p.locator("#cards .project-card").first().waitFor({timeout:12000});
 await p.locator("#projectSearch").fill("narayani");
 if(await p.locator("#cards .project-card").count()!==1)throw Error("Preserved project search broken");
 await p.locator("#cad-global-navigation .cad-global-more summary").click();
 if(!(await p.getByRole("link",{name:"Research & prototypes"}).isVisible()))throw Error("More menu closed unexpectedly");
 if(errors.length)throw Error("Page errors: "+JSON.stringify(errors));
 await p.screenshot({path:"/tmp/cad-midnight-blueprint-home.png",fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await mobile.goto(prefix,{waitUntil:"networkidle"});
 await mobile.locator("#cad-global-navigation").waitFor();
 const noOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+5);
 if(!noOverflow)throw Error("Mobile dashboard horizontal overflow");
 await mobile.screenshot({path:"/tmp/cad-midnight-blueprint-mobile.png",fullPage:true});
 console.log("CAD_UNIFIED_NAV_AND_PROGRESSIVE_DISCLOSURE_PASS",JSON.stringify({routes:routes.length,journeys:cards,search:"narayani",theme:dark,mobileOverflow:false}));
 await mobile.close();await p.close();
}finally{await browser.close();}
