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
  if(await p.locator('body[data-project]').count()){
   await p.locator('.pw-top').waitFor({timeout:12000});
   if(await p.locator('link[href*="project-workspace.css"]').count()!==1)throw Error(title+' missing shared project stylesheet');
   if(await p.locator('.pw-chapter-bar [role=tab]').count()!==4)throw Error(title+' missing common chapters');
   if(await p.locator('#pw-edition option').count()<1)throw Error(title+' missing source edition');
   if(await p.locator('.pw-top-links a[href$="/projects/"]').count()!==1)throw Error(title+' missing return to project library');
   continue;
  }
  await p.locator("#cad-global-navigation").waitFor({timeout:12000});
  // Theme stylesheet and global navigation are installed by deferred shell script.
  // Wait for exactly one linked stylesheet instead of racing the first DOM placeholder.
  await p.waitForFunction(()=>document.querySelectorAll('link[href*="cad-unified-theme.css"]').length===1,null,{timeout:15000});
  const sheet=await p.locator('link[href*="cad-unified-theme.css"]').count();
  if(sheet!==1)throw Error(title+" missing one shared stylesheet");
  // The shell is inserted by a deferred script. A partial/placeholder nav can
  // appear before its nested anchors are initialized under a busy CI browser.
  await p.waitForFunction(()=>document.querySelectorAll("#cad-global-navigation a").length>=7,null,{timeout:15000});
  const menu=await p.locator("#cad-global-navigation a").count();
  if(menu<7)throw Error(title+" missing global navigation");
  if(await p.locator('#cad-global-navigation .cad-global-links > a[href$="/cad/"]').count()!==0)
    throw Error(title+" incorrectly promotes legacy CAD editor to primary navigation");
  if(await p.locator('#cad-global-navigation .cad-global-links > a[href$="/cad/brief/"]').count()!==0)
    throw Error(title+" incorrectly promotes legacy mass preview to primary navigation");
 }
 await p.goto(prefix,{waitUntil:"networkidle"});
 const daylight=await p.locator("body").evaluate(e=>getComputedStyle(e).backgroundColor);
 if(!/rgb\(\s*248,\s*249,\s*250\s*\)/.test(daylight))throw Error("Home is not Lucid Blueprint daylight palette: "+daylight);
 const cards=await p.locator(".cad-tool").count();
 if(cards!==0)throw Error("Competing tool launcher cards still visible: "+cards);
 if(await p.locator('.cad-intro-main > a.cad-button').count()!==1)
   throw Error("Homepage must have exactly one primary product launch action");
 if(await p.locator(".cad-capability-strip > div").count()!==4)
   throw Error("Missing four concise steps for the single active product");
 if(await p.locator('a[href="./cad/"]').isVisible())
   throw Error("Legacy editor should be hidden in the closed advanced section");
 if(await p.locator("#capabilities .cad-detail").isVisible())throw Error("Advanced content must start collapsed");
 await p.locator("#capabilities summary").click();
 if(!(await p.locator("#capabilities .cad-detail").isVisible()))throw Error("Details expansion failed");
 if(!(await p.locator('#capabilities a[href="./cad/"]').isVisible()))throw Error("Archived CAD editor route must remain discoverable");
 if(!(await p.locator('#capabilities a[href="./cad/brief/"]').isVisible()))throw Error("Archived language preview must remain discoverable");
 await p.locator("#projects summary").click();
 await p.locator("#cards .project-card").first().waitFor({timeout:12000});
 await p.locator("#projectSearch").fill("narayani");
 if(await p.locator("#cards .project-card").count()!==1)throw Error("Preserved project search broken");
 await p.locator("#cad-global-navigation .cad-global-more > summary").click();
 for(const group of ["Older editors · experimental","Research & prototypes","Projects & history","Guides & reference"])
   if(!(await p.locator(".cad-more-group > summary").filter({hasText:group}).isVisible()))throw Error("More section hidden: "+group);
 await p.locator(".cad-more-group > summary").filter({hasText:"Research & prototypes"}).click();
 if(!(await p.getByRole("link",{name:"Research catalogue"}).isVisible()))throw Error("Nested research links unavailable");
 await p.locator(".cad-more-group > summary").filter({hasText:"Older editors · experimental"}).click();
 if(!(await p.locator("#cad-global-navigation").getByRole("link",{name:"Older CAD editor · prototype"}).isVisible()))throw Error("Legacy CAD editor path missing");
 if(errors.length)throw Error("Page errors: "+JSON.stringify(errors));
 await p.screenshot({path:"/tmp/cad-daylight-blueprint-home.png",fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await mobile.goto(prefix,{waitUntil:"networkidle"});
 await mobile.locator("#cad-global-navigation").waitFor();
 const noOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+5);
 if(!noOverflow)throw Error("Mobile dashboard horizontal overflow");
 await mobile.screenshot({path:"/tmp/cad-daylight-blueprint-mobile.png",fullPage:true});
 console.log("CAD_UNIFIED_NAV_AND_PROGRESSIVE_DISCLOSURE_PASS",JSON.stringify({routes:routes.length,competingPrimaryTools:cards,search:"narayani",theme:daylight,mobileOverflow:false}));
 await mobile.close();await p.close();
}finally{await browser.close();}
