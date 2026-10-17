/** CAD synthetic 2D/3D frame connectivity graph.
 * Orthogonal gridlines own the four frame nodes. All beam endpoints, column
 * centers and diagram joint markers must derive from these same nodes.
 * Visual connectivity is NOT design-code verification or joint detailing.
 */
import type {Draft, ColumnSection} from "./editable_model";
export type GridKey="west"|"east"|"north"|"south";
export type JointId="J-NW"|"J-NE"|"J-SW"|"J-SE";
export type ColumnId="C-NW"|"C-NE"|"C-SW"|"C-SE";
export type BeamId="B-N"|"B-S"|"B-W"|"B-E";
export type FrameJoint={id:JointId;column:ColumnId;x:number;y:number;z:number;beams:BeamId[]};
export type FrameSpan={id:BeamId;start:JointId;end:JointId;axis:"x"|"z";centerlineLength:number;clearLength:number};
export type FrameGraph={joints:FrameJoint[];spans:FrameSpan[]};
export const JOINT_IDS:JointId[]=["J-NW","J-NE","J-SW","J-SE"];
export const SPAN_LINKS:ReadonlyArray<readonly [BeamId,JointId,JointId,"x"|"z"]>=[
 ["B-N","J-NW","J-NE","x"],
 ["B-S","J-SW","J-SE","x"],
 ["B-W","J-NW","J-SW","z"],
 ["B-E","J-NE","J-SE","z"]
] as const;
const r=(n:number)=>Math.round(n*1000)/1000;
export function columnAt(p:Draft,id:ColumnId):ColumnSection{
 return p.columnSizes[id]??{x:.28,z:.28};
}
export function deriveFrameGraph(p:Draft):FrameGraph{
 const g=p.grid,top=p.height-.16;
 const joints:FrameJoint[]=[
  {id:"J-NW",column:"C-NW",x:g.west,y:top,z:g.north,beams:["B-N","B-W"]},
  {id:"J-NE",column:"C-NE",x:p.length-g.east,y:top,z:g.north,beams:["B-N","B-E"]},
  {id:"J-SW",column:"C-SW",x:g.west,y:top,z:p.width-g.south,beams:["B-S","B-W"]},
  {id:"J-SE",column:"C-SE",x:p.length-g.east,y:top,z:p.width-g.south,beams:["B-S","B-E"]}
 ];
 const byId=new Map(joints.map(j=>[j.id,j]));
 const spans=SPAN_LINKS.map(([id,start,end,axis]):FrameSpan=>{
  const a=byId.get(start)!,b=byId.get(end)!;
  const ca=columnAt(p,a.column),cb=columnAt(p,b.column);
  const centerlineLength=axis==="x"?b.x-a.x:b.z-a.z;
  const clearLength=centerlineLength-(axis==="x"?(ca.x+cb.x)/2:(ca.z+cb.z)/2);
  if(clearLength<=.5)throw Error("Connected beam span too short: "+id);
  return {id,start,end,axis,centerlineLength:r(centerlineLength),clearLength:r(clearLength)};
 });
 return {joints,spans};
}
export function incidentJoints(graph:FrameGraph,columnOrBeam:string):FrameJoint[]{
 return graph.joints.filter(j=>j.column===columnOrBeam||j.beams.includes(columnOrBeam as BeamId));
}
