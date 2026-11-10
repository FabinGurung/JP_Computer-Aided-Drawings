/** CAD Knowledge Centre browser QA: accessible navigation and mobile/desktop layout. */
import {chromium} from "playwright";
import assert from "node:assert/strict";
const prefix=process.env.CAD_SITE_URL||"http://127.0.0.1:5191/jp-drawing-coordination/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 for(const [device,width,height] of [["desktop",1366,900],["mobile",390,840]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const url=new URL("knowledge-centre/",prefix).href;
  const resp=await page.goto(url,{waitUntil:"networkidle",timeout:45000});
  assert(resp&&resp.status()===200,device+" page HTTP error");
  assert.equal(await page.locator("h1").count(),1,device+" requires one heading");
  assert.equal(await page.locator(".kc-section").count(),6,device+" requires six clear sections");
  assert.equal(await page.locator("#cad-global-navigation").count(),1,device+" missing shared shell");
  assert.equal(await page.locator('#cad-global-navigation a[aria-current="page"]').count(),1,device+" current page nav wrong");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(overflow<=2,device+" horizontal overflow: "+overflow);
  assert.equal(errors.length,0,device+" JavaScript errors: "+errors.join("; "));
  await page.locator('.kc-toc a[href="#publishing"]').click();
  assert.equal(await page.locator("#publishing h2").innerText(),"From source to public view");
  const target=await page.locator('a[href="../templates/project-workspace/control-tower/"]').first().getAttribute("href");
  assert(target,"Control Tower link missing");
  const resolved=new URL(target,url);
  const targetResp=await page.request.get(resolved.href);
  assert(targetResp.ok(),device+" existing Control Tower route missing");
  await page.close();
 }
 console.log("CAD_KNOWLEDGE_CENTRE_BROWSER_PASS desktop mobile");
}finally{await browser.close();}
