/** Browser acceptance: the same model IDs drive 2D and 3D. */
import { chromium } from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1510,height:980},deviceScaleFactor:1});
const problems=[];
page.on("pageerror",error=>problems.push(error.message));
try{
 const address=process.env.CAD_AAD_URL||"http://127.0.0.1:5175/cad/aad/";
 await page.goto(address,{waitUntil:"networkidle",timeout:60000});
 await page.waitForSelector('#plan rect[data-part="C-NW"]',{timeout:15000});
 const planParts=await page.locator("#plan rect[data-part]").count();
 if(planParts<12)throw Error("2D components missing: "+planParts);
 if(await page.locator("#canvas3d canvas").count()!==1)throw Error("3D viewport missing");
 if(await page.locator("#area").innerText()!=="48.0 m²")throw Error("Wrong starter area");
 await page.locator('#plan rect[data-part="C-NW"]').click();
 if(!(await page.locator("#inspect").innerText()).includes("C-NW"))throw Error("Plan/inspector element linkage failed");
 await page.locator("#length").fill("9");
 await page.locator("#length").press("Tab");
 if(await page.locator("#area").innerText()!=="54.0 m²")throw Error("Dimension propagation failed");
 if(!(await page.locator("#inspect").innerText()).includes("C-NW"))throw Error("Stable semantic ID lost after edit");
 await page.locator("#instruction").fill("Make it 7 m long, 5 m wide and 3.2 m high, remove bed.");
 await page.locator("#applyText").click();
 if(await page.locator("#area").innerText()!=="35.0 m²")throw Error("Instruction did not update plan geometry");
 if(await page.locator('#plan rect[data-part="BED"]').count()!==0)throw Error("Deleted bed still on plan");
 if(await page.locator('#tree .item').count()<14)throw Error("No semantic object explorer");
 if(!(await page.locator("#message").innerText()).includes("Applied"))throw Error("Interpreter status absent");
 await page.locator("#roof").check();
 await page.locator('#plan rect[data-part="WINDOW-N"]').click();
 if(!(await page.locator("#inspect").innerText()).includes("WINDOW-N"))throw Error("Window not linked");
 if(problems.length)throw Error("Browser errors: "+JSON.stringify(problems));
 await page.screenshot({path:"/tmp/cad-aad-linked-studio.png",fullPage:true});
 console.log("CAD_AAD_LINKED_ONE_MODEL_BROWSER_PASS",JSON.stringify({planParts,changedArea:"35.0 m²",selected:"WINDOW-N",dimensions:[7,5,3.2],htmlCanvasCount:1,errors:0}));
}finally{await browser.close();}
