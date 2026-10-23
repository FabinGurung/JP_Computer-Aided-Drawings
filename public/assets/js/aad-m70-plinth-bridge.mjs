/* Reusable, read-only M70 plinth-beam spatial bridge.
 * Frozen M70 stage geometry is preserved; only a tested translation +
 * northing inversion maps to the original DXF-registered world X/Z metres.
 * Column/footing source authority remains the original structural DXF.
 */
const meanMedian=values=>{const a=values.slice().sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2};
const round6=x=>Math.round(x*1e6)/1e6;
const requireFinite=(v,label)=>{if(!Number.isFinite(v))throw Error(label+" must be finite");return v};
export function bridgeM70Plinth(sourceReview,stage,metadata=null){
 if(sourceReview?.projectId!=="PRJ-000007"||stage?.project_id!==sourceReview.projectId)
  throw Error("M70 stage/source-review project ID mismatch");
 if(stage.spatial_db?.rows?.length!==16)throw Error("Frozen M70 expected 16 source-native PB runs");
 if(metadata&&(metadata.stage!=="M70"||metadata.status!=="FROZEN"))throw Error("M70 stage metadata must identify a frozen stage");
 const grid=stage.spatial_db.grid, x=grid.x_mm,y=grid.y_mm;
 if(!x||!y||Object.keys(x).length!==9||Object.keys(y).length!==7)
  throw Error("M70 grid axes inconsistent with frozen 9x7 source frame");
 const columns=sourceReview.elements.filter(e=>e.kind==="column");
 const controls=columns.map(c=>{
  const key=c.grid,letter=key?.match(/^[A-I]/)?.[0],number=key?.match(/[1-7]$/)?.[0];
  if(!(letter in x)||!(number in y))throw Error("Cannot register M70 grid to column "+c.id);
  return{columnId:c.id,sourceGrid:key,m70x:x[letter]/1000,m70y:y[number]/1000,
   dx:c.x-x[letter]/1000,dz:c.z+y[number]/1000};
 });
 if(controls.length!==23)throw Error("Require 23 source structural column controls before plinth registration");
 const tx=meanMedian(controls.map(c=>c.dx)),tz=meanMedian(controls.map(c=>c.dz));
 const residuals=controls.map(c=>({
  columnId:c.columnId,grid:c.sourceGrid,
  residualM:round6(Math.hypot(c.dx-tx,c.dz-tz))
 }));
 const maxResidual=Math.max(...residuals.map(r=>r.residualM));
 if(maxResidual>.001)throw Error("M70 to original structural-DXF registration >1mm residual: "+maxResidual);
 const ids=new Set(sourceReview.elements.map(e=>e.id));
 const records=stage.spatial_db.rows.map(r=>{
  if(ids.has(r.run_id))throw Error("M70 ID collides with DXF component "+r.run_id);
  ids.add(r.run_id);
  for(const p of ["x1_mm","y1_mm","x2_mm","y2_mm","centerline_length_m"])requireFinite(r[p],r.run_id+"."+p);
  const ax=round6(r.x1_mm/1000+tx),az=round6(tz-r.y1_mm/1000);
  const bx=round6(r.x2_mm/1000+tx),bz=round6(tz-r.y2_mm/1000);
  const calcLen=Math.hypot(bx-ax,bz-az);
  if(Math.abs(calcLen-r.centerline_length_m)>.000005)throw Error("M70 run length discrepancy "+r.run_id);
  const from=r.from_grid.match(/^([A-I])([1-7])$/),to=r.to_grid.match(/^([A-I])([1-7])$/);
  if(!from||!to)throw Error("Invalid M70 run-grid reference "+r.run_id);
  for(const [p,g] of [[{x:ax,z:az},from],[{x:bx,z:bz},to]]){
   if(Math.hypot(p.x-(x[g[1]]/1000+tx),p.z-(tz-y[g[2]]/1000))>.000005)
    throw Error("M70 run endpoint does not match its source grid "+r.run_id);
  }
  return{
   id:r.run_id,kind:"plinth-beam",x:round6((ax+bx)/2),z:round6((az+bz)/2),
   ax,az,bx,bz,width:.23,depth:.30,level:"PLINTH",
   label:"Plinth beam "+r.run_key+" · "+r.from_grid+" → "+r.to_grid,
   fromGrid:r.from_grid,toGrid:r.to_grid,lengthM:round6(calcLen),
   status:"FROZEN_M70_SOURCE_DERIVED_PLINTH_NETWORK__ENGINEERING_HOLD",
   source:{file:"M70_FROZEN_STAGE",stage:"M70",runId:r.run_id,
    entityHandle:r.run_id,sourceMM:[r.x1_mm,r.y1_mm,r.x2_mm,r.y2_mm],
    stageArtifact:"public/stages/m70/stage-data.json",
    stageSnapshotId:stage.snapshot_id,
    sourceArtifactSha256:metadata?.source_sha256||null}
  };
 });
 const total=records.reduce((v,b)=>v+b.lengthM,0);
 const frozen=stage.spatial_db.package_totals?.centerline_length_m;
 if(Math.abs(total-frozen)>.000025)throw Error("M70 network aggregate length inconsistent with frozen stage");
 return{
  schema:"jp-cad://aad-m70-plinth-bridge/1",stage:"M70",projectId:stage.project_id,
  stageStatus:metadata?.status||"FROZEN_SOURCE_SNAPSHOT",snapshotId:stage.snapshot_id,
  sourcePriority:"ORIGINAL_STRUCTURAL_DXF_COLUMNS_AND_FOOTINGS_THEN_STAGE_M70_PLINTH_NETWORK",
  declaredSectionMM:{width:230,depth:300},
  transform:{xWorldEqualsStageXPlusM:round6(tx),zWorldEqualsMMinusStageY:round6(tz),
   signedY:"M70 positive local Y maps to negative world Z",
   method:"23 matching structural DXF column grid IDs; median translation, no rotation/no scale"},
  registrationControlCount:controls.length,maxColumnResidualM:maxResidual,
  residuals,runCount:records.length,centerlineLengthM:round6(total),
  records,
  warnings:[
   "M70 frozen public stage geometry is a plinth-level beam-run authority; structural DXF retains precedence for columns, footings and original structural members.",
   "The source-review GF DXF beam-edge candidates are a separate drawing/level interpretation and must not be silently relabeled as plinth beams.",
   "M70 I3 intersection (PB-H3 and PB-V9) is a beam-grid node; no SC-I3 column is present in current 23-column DXF candidate ledger. Do not relocate SC-I4 automatically.",
   "3D member elevations are schematic and not structural approval; retain ENGINEERING HOLD."
  ]
 };
}
