/** M05: source-hashed DXF INSERT geometry reconciled with corrected local grid.
 * The objects are 2D review footprints. Z and height are explicitly unknown.
 */
export type ReviewedColumn={
 grid:string;column_type:string;shape:"rectangular"|"circular";
 x_mm:number;y_mm:number;width_mm:number;depth_mm:number;
 source_handle:string;native_centre_global_mm:number[];native_bbox_mm:number[];
 residual_mm:number;geometry_review:"DXF_BLOCK_GEOMETRY_CHECKED";
 vertical_review:"HEIGHT_AND_ELEVATION_UNVERIFIED";z_mm:null;height_mm:null;
};
export type SemanticReview={
 schema:"fabin-cad://semantic-column-review/0.1";
 status:"SEMANTIC_PLAN_REVIEW_ONLY";project_id:string;
 source:{source_id:string;file_sha256:string;layout_sha256:string;units:"mm";dxf_version:string};
 alignment:{method:"TRANSFORMED_INSERT_BLOCK_BBOX_CENTRE_TRANSLATION";rotation_deg:0;scale:1;translation_global_from_grid_mm:number[];tolerance_mm:number;maximum_residual_mm:number};
 columns:ReviewedColumn[];
 qa:{column_count:number;all_source_handles_unique:true;plan_geometry_gate:"CHECKED_FOR_2D_REVIEW_ONLY";vertical_geometry_gate:"HOLD_UNTIL_ELEVATIONS_AND_HEIGHTS_VERIFIED";construction_gate:"NOT_FIELD_ISSUED";semantic_promotion:"BLOCKED"};
};
const fail=(msg:string):never=>{throw Error("M05 review rejected: "+msg);};
const valid=(x:unknown):x is number=>typeof x==="number"&&Number.isFinite(x);
const two=(x:unknown):x is number[]=>Array.isArray(x)&&x.length===2&&x.every(valid);
const four=(x:unknown):x is number[]=>Array.isArray(x)&&x.length===4&&x.every(valid);
function requireCheck(x:unknown,msg:string):asserts x {if(!x)fail(msg);}
export function validateSemanticReview(value:unknown):SemanticReview{
 requireCheck(value&&typeof value==="object","expected JSON object");
 const data=value as Partial<SemanticReview>;
 requireCheck(data.schema==="fabin-cad://semantic-column-review/0.1"&&data.status==="SEMANTIC_PLAN_REVIEW_ONLY","schema/status");
 requireCheck(typeof data.project_id==="string"&&/^[A-Za-z0-9_-]{3,80}$/.test(data.project_id),"project id");
 const source=data.source;
 requireCheck(source&&/^[A-Za-z0-9_-]{3,80}$/.test(source.source_id)
   &&/^[a-f0-9]{64}$/.test(source.file_sha256)&&/^[a-f0-9]{64}$/.test(source.layout_sha256)
   &&source.units==="mm"&&/^AC\d{4}$/.test(source.dxf_version),"source fingerprints");
 const a=data.alignment;
 requireCheck(a&&a.method==="TRANSFORMED_INSERT_BLOCK_BBOX_CENTRE_TRANSLATION"
   &&a.rotation_deg===0&&a.scale===1&&two(a.translation_global_from_grid_mm)
   &&valid(a.tolerance_mm)&&a.tolerance_mm>0&&a.tolerance_mm<=5
   &&valid(a.maximum_residual_mm)&&a.maximum_residual_mm>=0&&a.maximum_residual_mm<=a.tolerance_mm,"coordinate transform");
 requireCheck(Array.isArray(data.columns)&&data.columns.length>0&&data.columns.length<=500,"column count");
 const ids=new Set<string>(),handles=new Set<string>();
 let residualMax=0;
 for(const c of data.columns){
  requireCheck(c&&/^[A-Z][0-9]{1,2}$/.test(c.grid)&&!ids.has(c.grid),"duplicate or invalid grid address");
  requireCheck(typeof c.column_type==="string"&&/^[A-Z][A-Z0-9_-]{1,24}$/.test(c.column_type),"column type");
  requireCheck(typeof c.source_handle==="string"&&/^[0-9A-Fa-f]{1,24}$/.test(c.source_handle)&&!handles.has(c.source_handle),"DXF handle");
  ids.add(c.grid);handles.add(c.source_handle);
  requireCheck(c.shape==="rectangular"||c.shape==="circular","shape");
  requireCheck([c.x_mm,c.y_mm,c.width_mm,c.depth_mm,c.residual_mm].every(valid)
   &&Math.abs(c.x_mm)<=1e6&&Math.abs(c.y_mm)<=1e6&&c.width_mm>0&&c.depth_mm>0
   &&c.width_mm<=10000&&c.depth_mm<=10000,"plan coordinates");
  requireCheck(two(c.native_centre_global_mm)&&four(c.native_bbox_mm),"physical CAD centre/bbox");
  requireCheck(c.residual_mm>=0&&c.residual_mm<=a.tolerance_mm,"residual bound");
  const physicalWidth=c.native_bbox_mm[2]!-c.native_bbox_mm[0]!,physicalDepth=c.native_bbox_mm[3]!-c.native_bbox_mm[1]!;
  requireCheck(Math.abs(physicalWidth-c.width_mm)<=a.tolerance_mm&&Math.abs(physicalDepth-c.depth_mm)<=a.tolerance_mm,"physical CAD bbox mismatch");
  requireCheck(Math.abs((c.native_bbox_mm[0]!+c.native_bbox_mm[2]!)/2-c.native_centre_global_mm[0]!)<.01
    &&Math.abs((c.native_bbox_mm[1]!+c.native_bbox_mm[3]!)/2-c.native_centre_global_mm[1]!)<.01,"physical CAD centre mismatch");
  const delta=Math.hypot(c.native_centre_global_mm[0]!-a.translation_global_from_grid_mm[0]!-c.x_mm,
    c.native_centre_global_mm[1]!-a.translation_global_from_grid_mm[1]!-c.y_mm);
  requireCheck(delta<=a.tolerance_mm+.000001&&Math.abs(delta-c.residual_mm)<.002,"coordinate alignment mismatch");
  residualMax=Math.max(residualMax,delta);
  requireCheck(c.shape!=="circular"||Math.abs(c.width_mm-c.depth_mm)<.001,"circular footprint must be round");
  requireCheck(c.geometry_review==="DXF_BLOCK_GEOMETRY_CHECKED"
    &&c.vertical_review==="HEIGHT_AND_ELEVATION_UNVERIFIED"
    &&c.height_mm===null&&c.z_mm===null,"unverified 3D geometry cannot be imported");
 }
 requireCheck(Math.abs(residualMax-a.maximum_residual_mm)<.002,"maximum source residual mismatch");
 const qa=data.qa;
 requireCheck(qa&&qa.column_count===data.columns.length&&qa.all_source_handles_unique===true
   &&qa.plan_geometry_gate==="CHECKED_FOR_2D_REVIEW_ONLY"
   &&qa.vertical_geometry_gate==="HOLD_UNTIL_ELEVATIONS_AND_HEIGHTS_VERIFIED"
   &&qa.construction_gate==="NOT_FIELD_ISSUED"&&qa.semantic_promotion==="BLOCKED",
   "missing 2D-only semantic safety gates");
 return structuredClone(data as SemanticReview);
}
