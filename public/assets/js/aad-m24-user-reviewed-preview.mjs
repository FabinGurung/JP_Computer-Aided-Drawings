/* M24 user-submitted visual QA is a non-certified working-preview transform.
 * Original DXF, M70/M60/M40/V03 frozen snapshot records are immutable.
 * Shape intent, excavation working clearance and structural approval are
 * intentionally distinct. Never write back to the source ledger.
 */
const round6=x=>Math.round(x*1e6)/1e6;
const finite=(v,l)=>{if(!Number.isFinite(v))throw Error("M24: "+l+" not finite");return v};
export function deriveUserQAPreview(dxf,m70,m23,qa){
 if(qa?.schema!=="jp-cad://narayani-user-reviewed-qa/1"||
    qa.projectId!==dxf.projectId||qa.projectId!==m70.projectId)
  throw Error("M24 QA source project/schema mismatch");
 if(qa.engineeringApproval!==false)throw Error("M24 cannot certify user's review as engineering approval");
 const expected=new Set(["C4","E2","E4","G4","H4","C3","F2","F3","G3","H3"].map(x=>"COL-"+x)
  .concat(["FOOT-G1","FOOT-CF1","JOINT-I3"]));
 if(qa.issues?.length!==13||qa.issues.some(x=>!expected.delete(x.id))||expected.size)
  throw Error("M24 QA requires exactly the 13 review decisions");
 if(qa.issues.some(x=>!x.recordedEvidence?.stage||!x.recordedEvidence?.dxf||
   !x.recordedEvidence?.site||!x.recordedEvidence?.engineer))
  throw Error("M24 QA evidence flags incomplete");
 const get=id=>qa.issues.find(x=>x.id===id);
 if(get("JOINT-I3")?.workingIntent!=="RELOCATE_WORKING_I4_C4_TO_M70_I3"||
    get("FOOT-G1")?.workingIntent!=="DISPLAY_DXF_FOOTING_OUTLINE")
  throw Error("M24 unsupported critical user proposal");
 const sourceCols=dxf.elements.filter(e=>e.kind==="column");
 const sourcePads=dxf.elements.filter(e=>e.kind==="footing");
 if(sourceCols.length!==23||sourcePads.length!==21||m70.records.length!==16||
    m23.columns.length!==23||m23.footings.length!==21)
  throw Error("M24 unexpected source stage counts");
 const byGrid=new Map(sourceCols.map(c=>[c.grid,c]));
 if(!byGrid.has("I4")||byGrid.has("I3"))throw Error("M24 source I4/I3 baseline changed");
 const grid=m70.grid;
 const t=m70.transform;
 const i3={x:round6(grid.x_mm.I/1000+t.xWorldEqualsStageXPlusM),
           z:round6(t.zWorldEqualsMMinusStageY-grid.y_mm["3"]/1000)};
 const i4=byGrid.get("I4");
 const moveDelta=round6(Math.hypot(i3.x-i4.x,i3.z-i4.z));
 if(Math.abs(moveDelta-.655)>.002)throw Error("M24 expected I4/I3 displacement differs from provenance");
 const columns=sourceCols.filter(c=>c.grid!=="I4").map(c=>{
  const diam=c.type==="C4"?.35:.4;
  return{id:"QA-"+c.id,kind:"qa-column",grid:c.grid,type:c.type,
   x:c.x,z:c.z,width:diam,depth:diam,circular:c.type==="C4",
   section:c.type==="C4"?"Ø350":"400×400",
   label:"USER-REVIEW DXF "+c.grid+" "+c.type+" (HOLD)",
   status:"USER_PREFERRED_DXF_COLUMN_NOT_ENGINEERING_APPROVED",
   source:{file:"USER_QA_DXF_PREFERENCE",entityHandle:c.source.entityHandle,
    dxfId:c.id,sourceMM:c.source.sourceMM,qaDecisionId:"COL-"+c.grid,
    reference:"Original structural DXF + user QA 2026-10-24"}};
 });
 columns.push({
  id:"QA-SC-I3",kind:"qa-column",grid:"I3",type:"C4",
  x:i3.x,z:i3.z,width:.35,depth:.35,circular:true,section:"Ø350",
  label:"PROPOSED Ø350 I3 (formerly I4) — ENGINEERING HOLD",
  status:"USER_PROPOSED_RELOCATION_655MM_FROM_I4_SUPPORT_AND_FOOTING_NOT_VERIFIED",
  source:{file:"USER_QA_I3_PROPOSAL",entityHandle:"QA-SC-I3",originalDXFColumnId:i4.id,
   originalSourceMM:i4.source.sourceMM,originalM60ColumnId:"M60-C4-I4",
   intersectingPlinthBeamIds:["PB-H3","PB-V9"],targetM70Grid:"I3",qaDecisionId:"JOINT-I3"}
 });
 if(columns.length!==23||new Set(columns.map(c=>c.grid)).size!==23)
  throw Error("M24 column occupancy invariant violated");
 const qaColById=new Map(columns.filter(x=>x.source.dxfId).map(x=>[x.source.dxfId,x]));
 const stagePadsByGrid=new Map(m23.footings.map(f=>[f.grid,f]));
 const footings=sourcePads.map(f=>{
  // Same original DXF footprint; its design/excavation meaning is under review.
  // Do not invent a footing at I3 or silently rehome the combined footing.
  const affected=f.columnIds.includes(i4.id);
  const grid=f.columnIds.length===1?byGrid.get(f.columnIds[0])?.grid:
   f.columnIds.includes(i4.id)?"H3/I4_DXF":"H2/I2_DXF";
  const stage=stagePadsByGrid.get(grid)||(
    f.type==="CF1"?(affected?stagePadsByGrid.get("H-I/4"):stagePadsByGrid.get("H-I/2")):null);
  const resolved=f.columnIds.filter(id=>qaColById.has(id)).map(id=>qaColById.get(id).id);
  const missing=f.columnIds.filter(id=>!qaColById.has(id));
  const g1=grid==="G1";
  const conflict=Boolean(affected||g1||stage&&
    (Math.abs(stage.dx-f.dx)>.001||Math.abs(stage.dz-f.dz)>.001||
     Math.hypot(stage.x-f.x,stage.z-f.z)>.02));
  return{
   id:"QA-"+f.id,kind:"qa-footing",type:f.type,grid:grid||f.id,
   x:f.x,z:f.z,dx:f.dx,dz:f.dz,width:f.dx,depth:f.dz,
   columnIds:resolved,orphanOriginalColumnIds:missing,
   originalDxfColumnIds:f.columnIds.slice(),
   conflict,label:"USER-REVIEW DXF footing "+(grid||f.id)+" "+
    f.dx.toFixed(2)+" × "+f.dz.toFixed(2)+" m (HOLD)",
   status:affected?"ORPHAN_DXF_I4_SUPPORT_AFTER_USER_REQUESTED_I3_RELOCATION__HOLD":
     g1?"G1_CONCRETE_VS_EXCAVATION_DIMENSION_NEEDS_DESIGN_AND_FIELD_VERIFICATION__HOLD":
       "USER_PREFERRED_DXF_FOOTING_OUTLINE_NOT_CONSTRUCTION_APPROVED",
   source:{file:"USER_QA_DXF_PREFERENCE",entityHandle:f.source.entityHandle,
    dxfId:f.id,sourceMM:f.source.sourceMM,
    comparisonM40V03Id:stage?.id||null,
    qaDecisionId:g1?"FOOT-G1":affected?"FOOT-CF1":null},
   stageComparison:stage?{id:stage.id,dx:stage.dx,dz:stage.dz,x:stage.x,z:stage.z}:null,
   excavationWorkingArea:g1?{separateFromConcrete:true,
    additionalClearanceMmText:">100",perSideUnspecified:true,
    actualExcavationSizeM:null,unapprovedStage2100Interpretation:true}:null
  };
 });
 if(footings.length!==21||columns.some(c=>c.grid==="I4")||
    !columns.some(c=>c.grid==="I3"&&c.section==="Ø350"))
  throw Error("M24 derived shape invariants failed");
 const g1=footings.find(f=>f.grid==="G1");
 if(!g1||g1.dx!==1.8||g1.dz!==1.8||g1.stageComparison.dx!==2.1)
  throw Error("M24 G1 evidence mismatch");
 const orphan=footings.filter(f=>f.orphanOriginalColumnIds.length);
 if(orphan.length!==1||!orphan[0].originalDxfColumnIds.includes(i4.id))
  throw Error("M24 original combined-footing orphan check failed");
 const discrepancies=[
  {code:"F3_RECORDED_DECISION_VS_NOTE",severity:"REQUIRES_CONFIRMATION",
   recordDecision:get("COL-F3").recordedDecision,
   note:get("COL-F3").note,workingInterpretation:"DXF per written note, not dropdown"},
  {code:"I3_NEW_VERTICAL_COLUMN_655MM_FROM_ORIGINAL_I4",severity:"ENGINEERING_HOLD",
   from:{grid:"I4",id:i4.id,x:i4.x,z:i4.z},
   to:{grid:"I3",id:"QA-SC-I3",x:i3.x,z:i3.z},
   displacementM:moveDelta,
   note:"User proposal; no verified footing/load-path/source drawing revision at I3"},
  {code:"CF1_ORPHAN_I4_SUPPORT",severity:"ENGINEERING_HOLD",
   footingId:orphan[0].id,missingColumnIds:orphan[0].orphanOriginalColumnIds,
   note:"Original DXF combined footing references a removed working I4 column; its pad remains at the drawn DXF position"},
  {code:"G1_FOOTING_CONCRETE_VS_EXCAVATION",severity:"ENGINEERING_HOLD",
   dxfFootingM:[g1.dx,g1.dz],m40V03SizeM:[2.1,2.1],
   extraWorkingSpaceMM:">100, side convention unknown",
   note:"Extra field allowance is for excavation/formwork working space; 2.1m cannot be silently treated as concrete or excavation size"},
  {code:"SIGNED_ENGINEER_APPROVAL_NOT_SUPPLIED",severity:"DOCUMENTARY_EVIDENCE_MISSING",
   note:"All four checkbox flags claimed true per user, but no drawing revision/signed engineering instruction is attached"}
 ];
 return{schema:"jp-cad://aad-m24-user-review-working-proposal/1",
  projectId:dxf.projectId,status:"ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION",
  engineeringApproval:false,sourceReviewRecordId:qa.recordedAt,
  sourcePreference:"DXF_COLUMNS_AND_FOOTING_OUTLINES__M70_GROUND_FLOOR_BEAMS",
  sourcePreservation:"NO_ORIGINAL_DXF_OR_FROZEN_STAGE_MODIFIED",
  counts:{workingColumns:columns.length,workingFootings:footings.length,governingM70BeamRuns:m70.records.length,
   originalDXFColumns:sourceCols.length,originalDXFFootings:sourcePads.length,
   originalM60Columns:m23.columns.length,originalM40Footings:m23.footings.length,
   orphanedCombinedFootings:orphan.length},
  columns,footings,discrepancies,qaIssues:qa.issues,
  footingSizingPolicy:{
   concreteFootprintSource:"Original DXF drawn outline (user proposal, not approved as build dimension)",
   excavationWorkingAreaSource:"User field practice; >100 mm additional working allowance (exact basis undetermined)",
   m40v03Records:"Frozen 2.1m G1 plan schedule preserved without conflating with excavation",
   autoExcavationDimensions:false
  }};
}
