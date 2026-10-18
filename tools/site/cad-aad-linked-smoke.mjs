/** CAD AAD acceptance — visible pixels AND semantics, not DOM existence alone. */
import { chromium } from "playwright";
import { PNG } from "pngjs";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"]});
const variants=[{label:"desktop",width:1510,height:980},{label:"tablet",width:900,height:900},{label:"mobile",width:390,height:844}];
const pages=[];
function imageVariance(png,label,minBuckets=7){
 const {width,height,data}=PNG.sync.read(png);
 const unique=new Set();let n=0;
 for(let y=Math.floor(height*.12);y<height*.88;y+=Math.max(1,Math.floor(height/35))){
  for(let x=Math.floor(width*.12);x<width*.88;x+=Math.max(1,Math.floor(width/35))){
   const i=(y*width+x)*4;
   const a=data[i+3];if(a<30)continue;
   unique.add([Math.round(data[i]/12),Math.round(data[i+1]/12),Math.round(data[i+2]/12)].join(","));
   n++;
  }
 }
 if(n<50||unique.size<minBuckets)throw Error(label+" rendered as an empty/flat image: "+unique.size+" bucket colors over "+n+" samples");
 return unique.size;
}
try{
 for(const config of variants){
  const page=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:config.label==="tablet"?2:1});
  pages.push(page);
  const errors=[],consoleErrors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())});
  const address=process.env.CAD_AAD_URL||"http://127.0.0.1:5175/cad/aad/";
  await page.goto(address,{waitUntil:"networkidle",timeout:60000});
  // Private drafts must be discoverable at the top of the existing editor.
  const opener=page.locator('.aad-local-project label[for="upload"]');
  await opener.waitFor({state:"visible"});
  const isLinked=await opener.evaluate(x=>document.getElementById(x.htmlFor)?.getAttribute("type")==="file");
  if(!isLinked)throw Error("Open project control is not wired to the local JSON file input");
  if(!await opener.evaluate(x=>{const r=x.getBoundingClientRect();return r.width>80&&r.height>25;}))
    throw Error("Private model import CTA is visually unusable");

  await page.locator('#plan rect[data-part="C-NW"]').waitFor({timeout:20000});
  await page.locator('#threeStatus[data-state="ready"]').waitFor({timeout:20000});
  await page.locator('#planStatus[data-state="ready"]').waitFor({timeout:20000});
  const plane=page.locator("#plan");
  const parts=await page.locator("#plan rect[data-part]").count();
  if(parts<12)throw Error("Plan components missing: "+parts);
  const visible=await plane.evaluate(svg=>{
   const bounds=svg.getBoundingClientRect(),rects=[...svg.querySelectorAll("[data-part]")];
   return bounds.width>200&&bounds.height>200&&rects.every(r=>{
    const b=r.getBoundingClientRect(),style=getComputedStyle(r);
    return b.width>1&&b.height>1&&style.visibility!=="hidden"&&Number(style.opacity)>0;
   })&&rects.filter(r=>{const b=r.getBoundingClientRect();return b.left<bounds.right&&b.top<bounds.bottom&&b.right>bounds.left&&b.bottom>bounds.top}).length>=12;
  });
  if(!visible)throw Error("SVG has offscreen/invisible components ("+config.label+")");
  const canvas=page.locator("#canvas3d canvas");
  await canvas.waitFor({state:"visible"});
  const dimensions=await canvas.evaluate(x=>{const box=x.getBoundingClientRect();return{display:[box.width,box.height],buffer:[x.width,x.height]};});
  if(dimensions.display[0]<150||dimensions.display[1]<220)throw Error("3D canvas is too small ("+JSON.stringify(dimensions)+")");
  const threeShot=await canvas.screenshot({animations:"disabled"});
  const planShot=await plane.screenshot({animations:"disabled"});
  const fs=await import("node:fs/promises");
  await fs.writeFile("/tmp/cad-aad-daylight-3d-"+config.label+".png",threeShot);
  await fs.writeFile("/tmp/cad-aad-daylight-plan-"+config.label+".png",planShot);
  // Thin-line plan drawings have fewer coarse colour buckets than shaded 3D.
  // Spatial element visibility and all nonzero viewBox geometry are tested above.
  const threeColors=imageVariance(threeShot,config.label+" 3D",7);
  const planColors=imageVariance(planShot,config.label+" 2D",4);
  if(config.label==="desktop"){
   await page.locator("#modelFacts > summary").click();
   await page.locator("#displayOptions > summary").click();
   await page.locator("#saveOptions > summary").click();
   if(await page.locator("#area").innerText()!=="48.0 m²")throw Error("Starter footprint failed");
   await page.locator('#plan rect[data-part="C-NW"]').click();
   if(!(await page.locator("#inspect").innerText()).includes("C-NW"))throw Error("Plan selection missing");
   await page.locator("#length").fill("9");await page.locator("#length").press("Tab");
   if(await page.locator("#area").innerText()!=="54.0 m²")throw Error("Shared parametric geometry not updated");
   if(!(await page.locator("#inspect").innerText()).includes("C-NW"))throw Error("Stable component ID lost");
   await page.locator("#instruction").fill("Make it 7 m long, 5 m wide and 3.2 m high, remove bed.");
   await page.locator("#applyText").click();
   if(await page.locator("#area").innerText()!=="35.0 m²")throw Error("Words to model failed");
   if(await page.locator('#plan rect[data-part="BED"]').count()!==0)throw Error("Bed not removed");
   await page.locator("#dimensions").uncheck();
   if(await page.locator("#plan text").count()===0)throw Error("Plan disappeared after dimension display change");
   await page.locator("#dimensions").check();
   await page.locator('#plan rect[data-part="WINDOW-N"]').click();
   if(!(await page.locator("#inspect").innerText()).includes("WINDOW-N"))throw Error("Window not linked");
   await page.locator("#reset").click();
   if(await page.locator("#area").innerText()!=="48.0 m²")throw Error("Reset did not restore model");
   // Shared multi-room model: one/two/three room templates, connected
   // partitions with a physical interior door gap in the SAME 2D/3D solids.
   await page.locator("#roomCount").selectOption("2");
   await page.locator('#plan rect[data-part="ROOM-02"]').waitFor();
   if(await page.locator('#plan rect[data-part="PART-01-N"]').count()!==1 ||
      await page.locator('#plan rect[data-part="PART-01-S"]').count()!==1 ||
      await page.locator('#plan rect[data-part="INT-DOOR-01"]').count()!==1)
     throw Error("Two rooms did not create a shared hosted interior door wall");
   if(await page.locator('#plan text[data-room-label]').count()!==2)
     throw Error("Two-room semantic labels missing");
   const partBefore=Number(await page.locator('#plan rect[data-part="PART-01-N"]').getAttribute("x"));
   await page.locator("#roomSplit1").fill("4.5");await page.locator("#roomSplit1").press("Tab");
   const partAfter=Number(await page.locator('#plan rect[data-part="PART-01-N"]').getAttribute("x"));
   const insideDoor=Number(await page.locator('#plan rect[data-part="INT-DOOR-01"]').getAttribute("x"));
   if(!(partAfter>partBefore+8 && Math.abs(insideDoor-partAfter)<10))
     throw Error("Shared partition and interior door did not move together");
   await page.locator("#roomCount").selectOption("3");
   await page.locator('#plan rect[data-part="PART-02-N"]').waitFor();
   if(await page.locator('#plan rect[data-part="ROOM-03"]').count()!==1 ||
      await page.locator('#plan rect[data-part="INT-DOOR-02"]').count()!==1 ||
      await page.locator('#plan rect[data-part="FURN-ROOM-03-DESK"]').count()!==1)
     throw Error("Three-room template did not generate shared walls and reusable desk");
   await page.locator("#roomType2").selectOption("study");
   if(await page.locator('#plan rect[data-part="FURN-ROOM-02-DESK"]').count()!==1 ||
      await page.locator('#plan rect[data-part="FURN-ROOM-02-SOFA"]').count()!==0)
     throw Error("Changing room template did not rebuild furnishing");
   await page.locator('#plan rect[data-part="ROOM-02"]').click();
   if(!(await page.locator("#inspect").innerText()).includes("ROOM-02"))throw Error("Room zone not selectable");
   await page.locator("#roomCount").selectOption("1");
   if(await page.locator('#plan rect[data-part="PART-01-N"]').count()!==0)
     throw Error("Removing a room retained orphan shared-wall geometry");
   if(await page.locator('#plan text[data-room-label]').count()!==1)
     throw Error("Returning to one room lost the semantic room label");
   // Editable components are not independent overlays: each is serialized
   // in one draft and drives the SAME SVG plan and Three.js scene.
   await page.locator('#plan rect[data-part="WINDOW-N"]').click();
   if(!(await page.locator("#componentEditor").isVisible()))throw Error("Window inspector edit not shown");
   const oldNorthRight=Number(await page.locator('#plan rect[data-part="W-NR"]').getAttribute("x"));
   await page.locator("#partA").fill("2.5");await page.locator("#partB").fill("1.25");
   await page.locator("#applyPart").click();
   const newNorthRight=Number(await page.locator('#plan rect[data-part="W-NR"]').getAttribute("x"));
   if(!(newNorthRight<oldNorthRight))throw Error("Hosted window failed to regenerate north-wall jamb");
   if(!(await page.locator("#inspect").innerText()).includes("WINDOW-N"))throw Error("Edited window lost semantic selection");
   await page.locator('#plan rect[data-part="DOOR-S"]').click();
   const oldSouthRight=Number(await page.locator('#plan rect[data-part="W-SR"]').getAttribute("x"));
   await page.locator("#partA").fill("2.2");await page.locator("#partB").fill("1.1");
   await page.locator("#applyPart").click();
   if(!(Number(await page.locator('#plan rect[data-part="W-SR"]').getAttribute("x"))<oldSouthRight))
     throw Error("Door moved but hosted wall jamb did not follow");
   await page.locator('#plan rect[data-part="C-NW"]').click();
   const colWidthBefore=Number(await page.locator('#plan rect[data-part="C-NW"]').getAttribute("width"));
   await page.locator("#partA").fill(".36");await page.locator("#partB").fill(".38");
   await page.locator("#applyPart").click();
   if(!(Number(await page.locator('#plan rect[data-part="C-NW"]').getAttribute("width"))>colWidthBefore))
     throw Error("Column size edit absent in 2D plan");
   if(!(await page.locator("#inspect").innerText()).includes("C-NW"))throw Error("Column ID changed");
   const westPairBefore=Number(await page.locator('#plan rect[data-part="C-SW"]').getAttribute("x"));
   const northPairBefore=Number(await page.locator('#plan rect[data-part="C-NE"]').getAttribute("y"));
   const westBeamBefore=Number(await page.locator('#plan rect[data-part="B-N"]').getAttribute("x"));
   await page.locator("#partC").fill(".55"); // west shared grid
   await page.locator("#partD").fill(".45"); // north shared grid
   await page.locator("#applyPart").click();
   const westPairAfter=Number(await page.locator('#plan rect[data-part="C-SW"]').getAttribute("x"));
   const northPairAfter=Number(await page.locator('#plan rect[data-part="C-NE"]').getAttribute("y"));
   const westBeamAfter=Number(await page.locator('#plan rect[data-part="B-N"]').getAttribute("x"));
   if(!(westPairAfter>westPairBefore+10 && northPairAfter>northPairBefore+8 &&
        westBeamAfter>westBeamBefore+10))
     throw Error("Moving shared gridlines did not update paired columns and beam start");
   const gridJoints=await page.locator("#plan circle[data-joint]").count();
   if(gridJoints!==4)throw Error("Expected four stable linked frame nodes, found "+gridJoints);
   const jointX=Number(await page.locator('#plan circle[data-joint="J-NW"]').getAttribute("cx"));
   const columnWestX=Number(await page.locator('#plan rect[data-part="C-NW"]').getAttribute("x"));
   const columnWestWidth=Number(await page.locator('#plan rect[data-part="C-NW"]').getAttribute("width"));
   if(Math.abs(jointX-(columnWestX+columnWestWidth/2))>.3)
     throw Error("2D connection marker has detached from column center");
   const beamStart=Number(await page.locator('#plan rect[data-part="B-N"]').getAttribute("x"));
   const colEastX=Number(await page.locator('#plan rect[data-part="C-NE"]').getAttribute("x"));
   const beamSpan=Number(await page.locator('#plan rect[data-part="B-N"]').getAttribute("width"));
   if(Math.abs(beamStart-columnWestX-columnWestWidth)>.3 ||
      Math.abs(beamStart+beamSpan-colEastX)>.3)
     throw Error("Beam ends are not touching the connected column faces");
   if(!(await page.locator("#inspect").innerText()).includes("J-NW"))
     throw Error("Component inspector lacks dependent joint graph");
   await page.locator('#plan rect[data-part="B-N"]').click();
   const beamFootprintBefore=Number(await page.locator('#plan rect[data-part="B-N"]').getAttribute("height"));
   await page.locator("#partA").fill(".46");
   await page.locator("#partB").fill(".34");
   await page.locator("#applyPart").click();
   if(!(Number(await page.locator('#plan rect[data-part="B-N"]').getAttribute("height"))>beamFootprintBefore))
     throw Error("Beam width failed to propagate to plan footprint");
   if(!(await page.locator("#inspect").innerText()).includes("Vertical: 0.46 m"))
     throw Error("Selected beam depth did not update model geometry");
   await page.locator('#plan rect[data-part="W-NL"]').click();
   await page.locator("#partA").fill(".20");
   await page.locator("#applyPart").click();
   if(!(await page.locator("#partMessage").innerText()).includes("W-NL"))
     throw Error("Linked wall-thickness edit not acknowledged");
   await page.locator("#bed").check();
   await page.locator('#plan rect[data-part="BED"]').click();
   const oldBedX=Number(await page.locator('#plan rect[data-part="BED"]').getAttribute("x"));
   await page.locator("#partA").fill("2.1");await page.locator("#partB").fill("1.6");
   await page.locator("#partC").fill("2.15");await page.locator("#partD").fill("1.5");
   await page.locator("#applyPart").click();
   if(!(Number(await page.locator('#plan rect[data-part="BED"]').getAttribute("x"))>oldBedX))
     throw Error("Bed positioning did not update plan");
   // A corrupt/unknown-id draft must not silently enter the drawing model.
   if(await page.locator("#area").innerText()!=="48.0 m²")
     throw Error("Component editing unexpectedly altered building footprint");
   const saved=page.waitForEvent("download");
   await page.locator("#download").click();
   const downloaded=await saved;
   const fsDraft=await import("node:fs/promises");
   const serialized=JSON.parse(await fsDraft.readFile(await downloaded.path(),"utf8"));
   if(serialized.schema!=="jp-cad://linked-one-bay-demo/0.5"||!serialized.columnSizes["C-NW"]||
      serialized.beamDepths["B-N"]!==.46||serialized.beamWidths["B-N"]!==.34||
      serialized.grid.west!==.55||serialized.grid.north!==.45||
      serialized.windowX!==2.5||serialized.wallThickness!==.2||serialized.bedX!==2.1)
      throw Error("Versioned component changes missing from saved draft");
   const readback=await page.locator("#upload");
   await readback.setInputFiles({name:"linked-draft.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(serialized))});
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent?.includes("Loaded draft"),null,{timeout:12000});
   if(!(await page.locator("#message").innerText()).includes("Loaded draft") ||
      await page.locator('#plan rect[data-part="BED"]').count()!==1)
      throw Error("Validated draft reload lost the linked bed geometry");
   // Legacy v0.4 import must keep the previously validated multi-room model.
   const legacy4={...serialized,schema:"jp-cad://linked-one-bay-demo/0.4"};
   delete legacy4.floorGraph;delete legacy4.projectNote;
   await readback.setInputFiles({name:"legacy-v04.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(legacy4))});
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent?.includes("Loaded draft"),null,{timeout:12000});
   if(await page.locator("#roomCount").inputValue()!=="1")throw Error("v0.4 room-model migration failed");
   // v0.3 frame drafts upgrade to the new room schema without losing
   // their component sections, doors or shared frame connections.
   const legacy3={...serialized,schema:"jp-cad://linked-one-bay-demo/0.3"};
   for(const key of ["roomCount","roomSplit1","roomSplit2","roomTypes","interiorDoorZ","interiorDoorWidth","floorGraph","projectNote"])delete legacy3[key];
   await readback.setInputFiles({name:"legacy-v03.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(legacy3))});
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent?.includes("Loaded draft"),null,{timeout:12000});
   if(await page.locator("#roomCount").inputValue()!=="1")throw Error("v0.3 migration lost single-room default");
   // Older v0.2 draft is admitted with safe default aligned grid and beam widths.
   const legacy2={...serialized,schema:"jp-cad://linked-one-bay-demo/0.2"};
   delete legacy2.grid;delete legacy2.beamWidths;
   delete legacy2.floorGraph;delete legacy2.projectNote;
   for(const key of ["roomCount","roomSplit1","roomSplit2","roomTypes","interiorDoorZ","interiorDoorWidth"])delete legacy2[key];
   await readback.setInputFiles({name:"legacy-v02.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(legacy2))});
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent?.includes("Loaded draft"),null,{timeout:12000});
   const legacyGridX=Number(await page.locator('#plan circle[data-joint="J-NW"]').getAttribute("cx"));
   const legacyColX=Number(await page.locator('#plan rect[data-part="C-NW"]').getAttribute("x"));
   if(!(legacyGridX-legacyColX>2))throw Error("v0.2 migration lost graph markers");
   // Legacy 0.1 input is upgraded with centered hosted openings.
   const preLegacyWindowX=Number(await page.locator('#plan rect[data-part="WINDOW-N"]').getAttribute("x"));
   await readback.setInputFiles({name:"legacy-draft.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({
     schema:"jp-cad://linked-one-bay-demo/0.1",length:8,width:6,height:3,door:.95,window:1.4,bed:true
   }))});
   await page.waitForFunction(old=>Number(document.querySelector('#plan rect[data-part="WINDOW-N"]')?.getAttribute("x"))>old+10,preLegacyWindowX,{timeout:12000});
   await page.locator('#plan rect[data-part="WINDOW-N"]').waitFor();
   if(!(await page.locator("#message").innerText()).includes("Loaded draft"))
      throw Error("Legacy v0.1 migration failed");
   // Reject unknown per-component data and retain last known-good geometry.
   const illegal={...serialized,columnSizes:{"C-UNKNOWN":{x:.3,z:.3}}};
   await readback.setInputFiles({name:"invalid-draft.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(illegal))});
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent?.includes("Unknown column ID"),null,{timeout:12000});
   if(!(await page.locator("#message").innerText()).includes("Unknown column ID"))
     throw Error("Unsupported element accepted from untrusted draft");
   if(await page.locator("#area").innerText()!=="48.0 m²")throw Error("Bad draft mutated valid model");
   await page.locator("#reset").click();
   if(await page.locator("#partA").count()!==1)throw Error("Component editor was destroyed by reset");
   // v0.5 free-form orthogonal graph: one schema drives all SVG and meshes.
   await page.locator("#activateGraph").click();
   await page.locator('#plan rect[data-graph-wall="W-PART-1"]').waitFor();
   const initialZones=await page.locator('#plan text[data-room-label]').count();
   if(initialZones!==3||await page.locator('#roomTotal').innerText()!=="3")
     throw Error("Connected graph failed to auto-detect three enclosed rooms");
   if(await page.locator('#plan circle[data-wall-joint]').count()<4)
     throw Error("Connected intersections not projected into plan");
   if(await page.locator('#plan rect[data-part="D-INTER-1"]').count()!==1 ||
      await page.locator('#plan rect[data-part="W-NORTH"]').count()!==1)
     throw Error("Hosted multiple openings disappeared from 2D/3D model");
   const wallHandle=page.locator('#plan rect[data-graph-wall="W-PART-1"]');
   const firstA=Number(await wallHandle.getAttribute("x"));
   const handleBox=await wallHandle.boundingBox();
   if(!handleBox)throw Error("Draggable graph wall not visible");
   const centerX=handleBox.x+handleBox.width/2,centerY=handleBox.y+handleBox.height/2;
   await page.mouse.move(centerX,centerY);
   await page.mouse.down();
   await page.mouse.move(centerX+14,centerY,{steps:4});
   await page.mouse.up();
   const movedX=Number(await page.locator('#plan rect[data-graph-wall="W-PART-1"]').getAttribute("x"));
   if(movedX<=firstA+4)throw Error("Wall drag did not move connected gridline");
   if(await page.locator('#plan text[data-room-label]').count()!==3)
     throw Error("Automatic room detection broke after moving connected wall");
   await page.locator("#graphEditing .aad-graph-sub").nth(0).locator("summary").click();
   await page.locator("#graphX1").fill("0");
   await page.locator("#graphZ1").fill("3");
   await page.locator("#graphX2").fill("4.25");
   await page.locator("#graphZ2").fill("3");
   await page.locator("#addGraphWall").click();
   await page.locator('#plan rect[data-graph-wall="W-EDIT-1"]').waitFor();
   await page.locator("#graphEditing .aad-graph-sub").nth(1).locator("summary").click();
   await page.locator("#graphHostWall").selectOption("W-EDIT-1");
   await page.locator("#graphOpeningOffset").fill("1");
   await page.locator("#graphOpeningWidth").fill(".85");
   await page.locator("#addGraphOpening").click();
   if(await page.locator('#plan rect[data-part="O-EDIT-1"]').count()!==1)
     throw Error("Added door not hosted by edited partition");
   if(!(await page.locator("#download").isVisible()))await page.locator("#saveOptions > summary").click();
   const graphSave=page.waitForEvent("download");
   await page.locator("#download").click();
   const graphDownload=await graphSave;
   const graphJson=JSON.parse(await fsDraft.readFile(await graphDownload.path(),"utf8"));
   if(!graphJson.floorGraph||graphJson.schema!=="jp-cad://linked-one-bay-demo/0.5"||
      !graphJson.floorGraph.openings.some(x=>x.id==="O-EDIT-1"))
     throw Error("Free-form walls, openings and provenance not retained in one JSON document");
   await readback.setInputFiles({name:"v05-connected-plan.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(graphJson))});
   await page.locator('#plan rect[data-part="O-EDIT-1"]').waitFor();
   await page.locator("#undoGraph").click();
   if(await page.locator('#plan rect[data-part="O-EDIT-1"]').count()!==0)
     throw Error("Graph undo failed to remove latest hosted opening");
   // Angled partition added to the same shared model.
   await page.locator("#graphX1").fill("0");
   await page.locator("#graphZ1").fill("0");
   await page.locator("#graphX2").fill("3.5");
   await page.locator("#graphZ2").fill("6");
   await page.locator("#addGraphWall").click();
   await page.locator('#plan rect[data-graph-wall="W-EDIT-2"]').waitFor();
   if(await page.locator('#plan polygon[data-part^="ROOM-"]').count()<2)
     throw Error("Diagonal room detection missing polygonal zones");
   if(!(await page.locator('#plan rect[data-part="W-EDIT-2-SEG-00"]').getAttribute("transform"))?.includes("rotate("))
     throw Error("Angled wall did not rotate in plan");
   await page.locator("#graphHostWall").selectOption("W-EDIT-2");
   await page.locator("#graphOpeningKind").selectOption("window");
   await page.locator("#graphOpeningOffset").fill(".9");
   await page.locator("#graphOpeningWidth").fill(".8");
   await page.locator("#addGraphOpening").click();
   if(!(await page.locator('#plan rect[data-part="O-EDIT-1"]').getAttribute("transform"))?.includes("rotate("))
     throw Error("Hosted diagonal opening not rotated");
   const dxfSegments=[[0,0,8000,0],[8000,0,8000,6000],[8000,6000,0,6000],[0,6000,0,0],[0,0,8000,6000]];
   const dxfGroups=[[0,"SECTION"],[2,"HEADER"],[9,"$INSUNITS"],[70,4],[0,"ENDSEC"],
     [0,"SECTION"],[2,"ENTITIES"],...dxfSegments.flatMap(([x1,y1,x2,y2])=>
     [[0,"LINE"],[8,"A-WALL"],[10,x1],[20,y1],[11,x2],[21,y2]]),[0,"ENDSEC"],[0,"EOF"]];
   const dxfText=dxfGroups.map(g=>g.join("\n")).join("\n")+"\n";
   await page.locator("#dxfIntake > summary").click();
   await page.locator("#dxfUpload").setInputFiles({name:"synthetic-wall.dxf",mimeType:"text/plain",buffer:Buffer.from(dxfText)});
   await page.waitForFunction(()=>document.querySelector("#dxfStatus")?.textContent?.includes("millimeters"),null,{timeout:10000});
   await page.locator("#dxfBuild").click();
   if(await page.locator('#plan polygon[data-part^="ROOM-"]').count()!==2)
     throw Error("CAD-native diagonal tracing failed to derive two room polygons");
   if(await page.locator('#plan rect[data-graph-wall^="W-DXF-"]').count()!==5)
     throw Error("DXF five line segments not retained as wall edges");
   await page.locator("#disableGraph").click();
   if(await page.locator('#plan rect[data-graph-wall]').count()!==0)
     throw Error("Switching back to legacy template left orphan free-form geometry");
   await page.locator("#roomCount").selectOption("2");
   if(await page.locator('#plan rect[data-part="ROOM-02"]').count()!==1)
     throw Error("Legacy two-room template failed after leaving graph mode");
   await page.locator("#reset").click();
   // Public synthetic irregular-floor regression. No private client geometry.
   const polyNodes=[[1,1],[14,1],[14,4],[23,4],[23,13],[1,13],[14,13]]
     .map(([x,z],i)=>({id:"P"+(i+1),x,z}));
   const polyWalls=[
     ["OUT1","P1","P2"],["OUT2","P2","P3"],["OUT3","P3","P4"],
     ["OUT4","P4","P5"],["OUT5","P5","P6"],["OUT6","P6","P1"],
     ["SPLIT","P3","P7"]
   ].map(([id,a,b])=>({id,a,b,thickness:.20}));
   const polyDraft={...serialized,length:24,width:14,bed:false,
     columnSizes:{},beamDepths:{},beamWidths:{},
     projectNote:"PUBLIC SYNTHETIC TEST: irregular L footprint, no client data.",
     floorGraph:{nodes:polyNodes,walls:polyWalls,
       openings:[{id:"D1",wallId:"SPLIT",kind:"door",offset:1,width:.9,sill:0,height:2.1}],
       labels:{"ROOM-01":"Teaching zone A","ROOM-02":"Teaching zone B"},
       perimeter:["OUT1","OUT2","OUT3","OUT4","OUT5","OUT6"]}};
   await readback.setInputFiles({name:"synthetic-irregular.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(polyDraft))});
   await page.locator('#plan rect[data-part="D1"]').waitFor({timeout:12000});
   if(await page.locator("#area").innerText()!=="237.0 m²")throw Error("Irregular area did not follow polygon");
   if(await page.locator("#roomTotal").innerText()!=="2")throw Error("Irregular closed plan room count: "+await page.locator("#roomTotal").innerText()+"; "+await page.locator("#roomList").innerText());
   if(await page.locator('#plan rect[data-part="C-NW"]').count()!==0)
     throw Error("Synthetic one-bay structural column leaked into source-traced mode");
   if(await page.locator('#threeStatus[data-state="ready"]').count()!==1)
     throw Error("3D did not render irregular wall geometry");
   const polySave=page.waitForEvent("download");await page.locator("#download").click();
   const polyDownloaded=await polySave;
   const polyJSON=JSON.parse(await fsDraft.readFile(await polyDownloaded.path(),"utf8"));
   if(polyJSON.floorGraph.perimeter.length!==6||polyJSON.floorGraph.walls.length!==7)
     throw Error("Source perimeter was not retained across saved JSON");
   await page.locator("#reset").click();
   await page.screenshot({path:"/tmp/cad-aad-daylight-loaded.png",fullPage:true});
   // Force synthetic context-loss event: the plan remains usable.
   await page.evaluate(()=>document.querySelector("#canvas3d canvas")?.dispatchEvent(new Event("webglcontextlost",{cancelable:true})));
   await page.locator('#threeStatus[data-state="error"]').waitFor();
   if(await page.locator('#plan rect[data-part="C-NW"]').count()!==1)throw Error("2D plan died with WebGL context");
   if(!(await page.locator("#retry3d").isVisible()))throw Error("Missing 3D recovery affordance");
   await page.locator("#retry3d").click();
   await page.locator('#threeStatus[data-state="ready"]').waitFor({timeout:12000});
  }
  if(errors.length||consoleErrors.length)throw Error(config.label+" browser errors: "+JSON.stringify({errors,consoleErrors}));
  console.log("CAD_VISIBLE_PANELS_PASS",JSON.stringify({variant:config.label,threeColors,planColors,dimensions,components:parts}));
 }
}finally{await Promise.all(pages.map(x=>x.close()));await browser.close();}
