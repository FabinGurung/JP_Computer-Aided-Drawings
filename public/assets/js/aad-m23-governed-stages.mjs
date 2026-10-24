/* M23: governed source-stage assembly; never change frozen M70/M60/M40/V03
 * stage snapshots or original structural/architectural DXF extraction.
 * Stage view is a RECONCILED DISPLAY, with all discrepancies surfaced.
 */
const round6=n=>Math.round(n*1e6)/1e6;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const fail=msg=>{throw Error("M23 source-stage HOLD: "+msg)};
const stages={
 column:"M60_FROZEN_STAGE",footing:"M40_FROZEN_STAGE",
 rebar:"V03_FROZEN_STAGE"
};
export function reconcileM23Stages(dxf,m70,m60,m40,v03,metas={}){
 if(dxf.projectId!=="PRJ-000007"||m70.projectId!==dxf.projectId)
  fail("Project identity mismatch");
 for(const st of ["m60","m40","v03"]){
  const meta=metas[st];
  if(meta&&(meta.status!=="FROZEN"||meta.stage!==st.toUpperCase()))
   fail("Metadata not frozen / stage mismatch: "+st);
 }
 if(m60.rows?.length!==23||m40.rows?.length!==21||v03.DB?.rows?.length!==21)
  fail("Unexpected source component counts for M60/M40/V03");
 const xGrid=m70.stagesOriginalGrid?.x_mm||m70.grid?.x_mm;
 const yGrid=m70.stagesOriginalGrid?.y_mm||m70.grid?.y_mm;
 if(!xGrid||!yGrid)fail("M70 9×7 grid axis authority not attached");
 const tx=m70.transform.xWorldEqualsStageXPlusM,tz=m70.transform.zWorldEqualsMMinusStageY;
 if(!Number.isFinite(tx)||!Number.isFinite(tz))fail("Unregistered M70 reference");
 const xy=(x,y)=>({x:round6(x/1000+tx),z:round6(tz-y/1000)});
 const gridPt=grid=>{
  const g=String(grid).match(/^([A-I])([1-7])$/);
  if(!g||!Number.isFinite(xGrid[g[1]])||!Number.isFinite(yGrid[g[2]]))
   fail("Unresolvable native grid "+grid);
  return xy(xGrid[g[1]],yGrid[g[2]]);
 };
 const dxfCols=dxf.elements.filter(e=>e.kind==="column");
 const dxColByGrid=new Map(dxfCols.map(c=>[c.grid,c]));
 const m60Set=new Set(m60.rows.map(x=>x.grid_ref));
 if(m60Set.size!==23)fail("M60 duplicated column grid references");
 const columns=m60.rows.map(r=>{
  if(!/^C[1-4]$/.test(r.column_type)||!/^\d{3}×\d{3}$|^Ø\d{3}$/.test(r.section))
   fail("Unexpected M60 column type/section "+r.structure_id);
  const p=xy(r.x_mm,r.y_mm),g=gridPt(r.grid_ref);
  const expectedOffset=dist(p,g);
  if(expectedOffset>.1)fail("M60 column >100mm from named stage grid "+r.grid_ref);
  const source=dxColByGrid.get(r.grid_ref);
  const dxDistance=source?dist(p,source):null;
  const dimension=r.section.startsWith("Ø")?Number(r.section.slice(1))/1000:Number(r.section.split("×")[0])/1000;
  const el={id:r.structure_id,kind:"stage-column",grid:r.grid_ref,type:r.column_type,
   x:p.x,z:p.z,width:dimension,depth:dimension,circular:r.section.startsWith("Ø"),
   section:r.section,stemHeightM:r.stem_height_footing_top_to_plinth_m,
   label:"M60 "+r.column_type+" · "+r.grid_ref+" · "+r.section,
   status:(!source||dxDistance>.01)?"STAGE_M60_WITH_DXF_DISCREPANCY__HOLD":
    "FROZEN_M60_COLUMN_SOURCE_CORROBORATED_BY_DXF__HOLD",
   source:{file:stages.column,entityHandle:r.structure_id,stageId:"M60",
    stageSnapshotId:m60.database_id,sourceMM:[r.x_mm,r.y_mm],
    sourceArtifactSha256:metas.m60?.source_sha256||null},
   otherSource:{dxfColumnId:source?.id||null,distanceToDxfM:dxDistance===null?null:round6(dxDistance),
    stageGridDeviationM:round6(expectedOffset)}};
  return el;
 });
 const colMap=new Map(columns.map(c=>[c.grid,c]));
 const rebarById=new Map(v03.DB.rows.map(r=>[r.structure_id,r]));
 if(rebarById.size!==21)fail("V03 duplicate foundation IDs");
 const dxfFoot=dxf.elements.filter(e=>e.kind==="footing");
 const linkedFoot=new Set();
 const footings=m40.rows.map(r=>{
  const v=rebarById.get(r.structure_id);
  if(!v||v.structure_type!==r.structure_type||v.plan_size_m[0]!==r.plan_length_m||
    v.plan_size_m[1]!==r.plan_width_m)
   fail("Footing dimension/type disagreement between M40 and V03: "+r.structure_id);
  let p,gridReferences;
  if(r.structure_type==="CF1"){
   const g=String(r.grid_ref).match(/^([A-I])-([A-I])\/([1-7])$/);
   if(!g)fail("Invalid M40 CF1 bay "+r.grid_ref);
   const a=gridPt(g[1]+g[3]),b=gridPt(g[2]+g[3]);
   p={x:round6((a.x+b.x)/2),z:round6((a.z+b.z)/2)};
   gridReferences=[g[1]+g[3],g[2]+g[3]];
  }else{
   p=gridPt(r.grid_ref);gridReferences=[r.grid_ref];
  }
  const actualSupports=gridReferences.map(g=>colMap.get(g));
  if(actualSupports.some(v=>!v))fail("M40 foundation has no M60 column at its grid");
  // Native DXF comparison uses the same footprint category plus support grid
  // for isolated foundations and the closest CF1 by centre for combined pads.
  let candidates=dxfFoot.filter(f=>f.type===r.structure_type||f.kind==="footing"&&f.type===r.structure_type);
  if(r.structure_type!=="CF1")
   candidates=candidates.filter(f=>f.columnIds?.some(id=>dxColByGrid.get(r.grid_ref)?.id===id));
  candidates=candidates.filter(f=>!linkedFoot.has(f.id)).sort((a,b)=>dist(a,p)-dist(b,p));
  let match=candidates[0]||null;
  if(match)linkedFoot.add(match.id);
  const positionDeltaM=match?dist(match,p):null;
  const dimensionMismatch=Boolean(match&&(Math.abs(match.dx-r.plan_length_m)>.001||Math.abs(match.dz-r.plan_width_m)>.001));
  const disagreement=!match||positionDeltaM>.01||dimensionMismatch;
  const footprint={id:r.structure_id,kind:"stage-footing",
   grid:r.grid_ref,x:p.x,z:p.z,dx:r.plan_length_m,dz:r.plan_width_m,
   type:r.structure_type,label:"M40 "+r.structure_type+" · "+r.grid_ref+" · "+
    r.plan_length_m+"×"+r.plan_width_m+" m",width:r.plan_length_m,depth:r.plan_width_m,
   columnIds:actualSupports.map(c=>c.id),drawingDepthM:r.drawing_depth_m,
   upperPlateauM:[r.upper_plateau_length_m,r.upper_plateau_width_m],
   rebar:{sourceId:v.source_id,barSpec:v.bar_spec,coverMm:v.cover_mm,
    totalPieces:v.total_pieces,installedWeightKg:v.installed_weight_kg},
   conflict:disagreement,
   status:disagreement?"M40_V03_CORROBORATED_FOOTING__DXF_DISCREPANCY_HOLD":
    "FROZEN_M40_V03_CORROBORATED_BY_DXF__HOLD",
   source:{file:stages.footing,entityHandle:r.structure_id,stageId:"M40",
    associatedV03StructureId:v.structure_id,
    sourceArtifactSha256:metas.m40?.source_sha256||null,
    rebarArtifactSha256:metas.v03?.source_sha256||null,
    sourceMM:[p.x*1000,p.z*1000]},
   otherSource:{dxfFootingId:match?.id||null,positionDeltaM:positionDeltaM===null?null:round6(positionDeltaM),
    dxfPlanSizeM:match?[match.dx,match.dz]:null,stagePlanSizeM:[r.plan_length_m,r.plan_width_m],
    dimensionMismatch,matchedBy:r.structure_type==="CF1"?"TYPE_AND_CLOSEST_LOCATION":"SUPPORT_GRID_AND_TYPE"}};
  return footprint;
 });
 const dxSet=new Set(dxfCols.map(e=>e.grid));
 const m60Only=[...m60Set].filter(g=>!dxSet.has(g)).sort();
 const dxfOnly=[...dxSet].filter(g=>!m60Set.has(g)).sort();
 const columnGeometryDisagreements=columns.filter(c=>c.status.includes("DISCREPANCY"));
 const footingGeometryDisagreements=footings.filter(f=>f.conflict);
 const issues=[
  {code:"M60_DXF_COLUMN_GRID_SET_DIFFERENCE",severity:"HOLD",
   m60Only,dxfOnly,note:"M60 does not share the same 23 column grid identities as the original structural DXF extract"},
  {code:"M40_V03_DXF_FOOTING_RECONCILIATION",severity:"HOLD",
   mismatchingStageFootings:footingGeometryDisagreements.map(e=>e.id),
   note:"M40 and V03 agree with each other; source DXF footing mismatches remain independently visible"},
  {code:"M70_I3_VS_M60_I4_SUPPORT_REVIEW",severity:"HOLD",
   note:"M70 H3/V9 intersect at I3; M60 has an I4 column, no I3 column; neither was moved"},
 ];
 return{schema:"jp-cad://aad-m23-governed-stage-reconciliation/1",
  status:"ENGINEERING_HOLD_UNRESOLVED_SOURCE_CLASHES",
  rules:{groundFloorBeam:"M70_FROZEN_PLINTH_NETWORK_SUPREME",
   column:"M60_COLUMN_FIRST_LIFT_STAGE_WITH_DXF_COMPARISON",
   footingGeometry:"M40_RCC_V03_REBAR_CORROBORATION_WITH_DXF_COMPARISON",
   allOriginalRecords:"IMMUTABLE_PROVENANCE"},
  counts:{stageColumns:columns.length,stageFootings:footings.length,m70GroundFloorBeams:m70.records.length,
   dxfColumns:dxfCols.length,dxfFootings:dxfFoot.length,dxfBeamCandidateArchives:dxf.elements.filter(e=>e.kind==="beam").length},
  columns,footings,issues,
  mismatches:{m60Only,dxfOnly,columnGeometryDisagreements:columnGeometryDisagreements.map(e=>({id:e.id,grid:e.grid,...e.otherSource})),
   footingGeometryDisagreements:footingGeometryDisagreements.map(e=>({id:e.id,grid:e.grid,...e.otherSource}))},
  interpretation:"These source snapshots are independent derived archives. Stage precedence controls the displayed review layer; disagreements remain HOLD until structural engineer resolves original drawing supersession, grid and member geometry."
 };
}
