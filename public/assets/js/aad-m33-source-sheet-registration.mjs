/* M33 — repeatable source-sheet geometry registration to ORIGINAL GF structural DXF
 * controls. This calibrates relative DRAWING FRAMES only. No building survey datum,
 * individual beam support assignment, capacity or upper-floor column verification.
 */
const r6=v=>Math.round(v*1e6)/1e6;
const r3=v=>Math.round(v*1e3)/1e3;
const median=v=>v.slice().sort((a,b)=>a-b)[Math.floor(v.length/2)];
const assert=(condition,msg)=>{if(!condition)throw Error("M33 "+msg);};
export function deriveM33ColumnProximity(src,m32,m28){
 assert(src?.schema==="jp-cad://aad-source-gf-review/1","source GF review schema");
 assert(src.projectId===m32?.projectId&&m32.projectId===m28?.projectId,"project lineage");
 assert(m32?.schema==="jp-cad://aad-m32-native-beam-strip-register/1","original source strips");
 assert(m32.issuedForConstruction===false&&m32.ifcMemberCountAdded===0,"source-only input");
 assert(src.columns?.length===23,"23 source column controls");
 assert(m28.i3?.replacesOriginal==="SC-I4"&&m28.i3?.relocationM===.655,"owner-approved I3 from I4");
 const old=src.columns.find(c=>c[1]==="I4");
 assert(Boolean(old),"source I4 must be retained as immutable original evidence");
 const columns=src.columns.filter(c=>c[1]!=="I4")
  .map(c=>({id:c[0],grid:c[1],sourceXMM:c[3],sourceYMM:c[4],
    sourceFrameX:c[3]/1000,sourceFrameZ:-c[4]/1000,
    workingSelection:"SOURCE_ORIGINAL_DXF"}));
 columns.push({id:"PRJ-000007:gf:QA-COL:I3",grid:"I3",sourceXMM:old[3],
  sourceYMM:old[4]-655,sourceFrameX:old[3]/1000,
  sourceFrameZ:-old[4]/1000+.655,
  workingSelection:"M28_OWNER_APPROVED_RELOCATION_FROM_ORIGINAL_I4"});
 assert(columns.length===23&&new Set(columns.map(c=>c.grid)).size===23,"unique 23 working controls");
 const axes=m32.commonStrictSheetNormalizedAxesM;
 assert(Array.isArray(axes)&&axes.length===17,"17 strict source drawing axes");
 const calibration=[{grid:"A1",axis:axes[1][0]},{grid:"F6",axis:axes[12][0]},
  {grid:"G6",axis:axes[11][0]}];
 const witnesses=[{grid:"H6",axis:axes[10][0]},{grid:"I2",axis:axes[9][0]}];
 const offset=median(calibration.map(a=>a.axis-columns.find(c=>c.grid===a.grid).sourceFrameX));
 assert(Math.abs(offset+762.3649)<.002,"source drawing x-translation drift");
 const witnessesAll=[...calibration.map(x=>({...x,role:"CALIBRATION"})),
  ...witnesses.map(x=>({...x,role:"HELD_OUT_INDEPENDENT_CHECK"}))].map(c=>{
  const p=columns.find(x=>x.grid===c.grid);
  return{grid:c.grid,role:c.role,sourceAxisXM:r6(c.axis),
   originalGFColumnXSourceM:r6(p.sourceFrameX),residualXmm:r3((p.sourceFrameX+offset-c.axis)*1000)};
 });
 assert(Math.max(...witnessesAll.map(x=>Math.abs(x.residualXmm)))<1.25,
  "five-control source sheet-to-GF structural line registration >1.25mm");
 const reg=src.registration,trans=reg.structuralToArchitecturalMM,origin=reg.originArchitecturalMM;
 assert(reg.scale===1&&reg.rotationDeg===0,"unsupported historic source frame");
 const toAAD={dxM:r6((trans.dx-origin.x)/1000-offset),
  dzM:r6((origin.y-trans.dy)/1000),rotationDeg:0,
  xFormula:"AAD_X = source_sheet_X + dxM",
  zFormula:"AAD_Z = source_sheet_Z + dzM"};
 const ownerColumn=columns.find(c=>c.grid==="I3");
 assert(Math.hypot(ownerColumn.sourceFrameX+(trans.dx-origin.x)/1000-m28.i3.centerXM,
 ownerColumn.sourceFrameZ+(origin.y-trans.dy)/1000-m28.i3.centerZM)<.000005,
 "M28 I3 derived working centre in same AAD coordinate frame");
 const positioned=columns.map(c=>({...c,
  x:r6(c.sourceFrameX+offset),z:r6(c.sourceFrameZ),
  xAAD:r6(c.sourceFrameX+(trans.dx-origin.x)/1000),
  zAAD:r6(c.sourceFrameZ+(origin.y-trans.dy)/1000)}));
 const threshold=.25,nearest=p=>positioned.map(c=>({grid:c.grid,
  sourceColumnId:c.id,distanceM:Math.hypot(p[0]-c.x,p[1]-c.z)}))
  .sort((a,b)=>a.distanceM-b.distanceM)[0];
 const strips=axes.map((axis,i)=>{
  assert(axis.length===4&&axis.every(Number.isFinite),"axis invalid");
  const a=nearest([axis[0],axis[1]]),b=nearest([axis[2],axis[3]]);
  return{candidateId:"M32-STRIP-"+String(i+1).padStart(3,"0"),
   sourceGFLineHandles:m32.floorSource.gf.pairedHandles[i].slice(),
   sheetRelativeAxisM:axis.slice(),
   endpointProximity:[a,b].map(x=>({nearestGrid:x.grid,columnSourceId:x.sourceColumnId,
    distanceM:r6(x.distanceM),within250mm:x.distanceM<=threshold})),
   bothEndsWithin250mm:a.distanceM<=threshold&&b.distanceM<=threshold,
   sourceInference:"DRAWING_ENDPOINT_PROXIMITY_NOT_MEMBER_SUPPORT",
   upperLevelContinuity:"NOT_VERIFIED"};
 });
 assert(strips.length===17,"expected 17 source strips");
 const proximate=strips.flatMap(x=>x.endpointProximity).filter(x=>x.within250mm).length;
 const paired=strips.filter(x=>x.bothEndsWithin250mm).length;
 assert(proximate===29&&paired===12,"source/threshold drift");
 return{schema:"jp-cad://aad-m33-gf-drawing-frame-column-proximity/1",
  projectId:src.projectId,stage:"M33",issuedForConstruction:false,
  validationStatus:"SOURCE_GROUND_FLOOR_RELATIVE_DRAWING_FRAME_ONLY_NOT_SURVEYED",
  ownerWorkingGeometry:"APPROVED_M25_M28",
  sourceProvenance:{structuralDxfSHA256:m32.sourceOriginalDXFSha256,
   originalDXFColumns:23,sourceNativeLineHandles:34,
   m32CandidateSource:"aad-m32-beam-strip-source-register.json",
   columnSource:"aad-source-gf-review-v1.json",
   i3OwnerSelectionSource:"aad-m28-reconciliation-20261027.json"},
  calibration:{method:"Median translation from A1, F6, G6 independently matched vertical drawn column axes; H6 and I2 held out as witnesses",
   sourceSheetXTranslationM:r6(offset),sourceSheetZTranslationM:0,
   controlWitnesses:witnessesAll,maximumWitnessResidualMm:r3(Math.max(...witnessesAll.map(x=>Math.abs(x.residualXmm)))),
   sourceSheetToAADGF:toAAD,
   warning:"This is internal DXF drawing-frame correlation. It cannot substitute for independent architectural/structural site control or upper-floor registered column schedule."},
  endpointToleranceM:threshold,
  summary:{strictStripCandidates:17,totalStripEndpoints:34,GFColumnCandidates:23,
   endpointsWithin250mm:proximate,stripsBothEndsWithin250mm:paired,
   stripsWithUnmatchedEndpoint:17-paired,verifiedStructuralSupportConnections:0,
   verifiedUpperFloorColumnControls:0,verifiedUpperFloorBeamMembersAdded:0},
  columns:positioned.map(c=>({id:c.id,grid:c.grid,xSheetM:c.x,zSheetM:c.z,
   xAADGF:c.xAAD,zAADGF:c.zAAD,workingSelection:c.workingSelection})),
  stripEndpointProximity:strips,
  unresolved:["Five original strict strip records lack a second endpoint within 250mm of owner-selected GF column centres.",
   "Even close endpoints are geometric proximity only, not support reactions or verified beam-member connectivity.",
   "Original FF/SF sheet linework is repeated; independent FF/SF column schedules and reactions not registered.",
   "Common architectural survey datum, actual section/rebar, footing size and strength checks remain open.",
   "Do not infer individual upper-storey IFC beams, frame continuity or structural certification."]};
}
