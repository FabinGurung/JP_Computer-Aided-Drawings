import assert from "node:assert/strict";
import {createAADWorkspace} from "../../public/assets/js/aad-unified-workspace.mjs";
import {writeIFC4,checkIfcReferences} from "../../public/assets/js/aad-building-ifc4.mjs";
import {derivePlanRooms} from "../../public/assets/js/aad-topology.mjs";
const single={
 schema:"jp-cad://linked-one-bay-demo/0.5",height:3,
 floorGraph:{nodes:[{id:"A",x:0,z:0},{id:"B",x:10,z:0},{id:"C",x:10,z:8},{id:"D",x:0,z:8}],
 walls:[{id:"E1",a:"A",b:"B",thickness:.2},{id:"E2",a:"B",b:"C",thickness:.2},
 {id:"E3",a:"C",b:"D",thickness:.2},{id:"E4",a:"D",b:"A",thickness:.2}],
 perimeter:["E1","E2","E3","E4"],openings:[],labels:{}}
};
const manifest={
 schema:"jp-cad://aad-building/1",projectId:"SYN-TOP",name:"Synthetic shared AAD topology smoke",
 levels:[
 {id:"gf",name:"Ground",elevation:0,height:3,sourceArea:80,model:"a.json",transform:{x:0,z:0,rotationDeg:0}},
 {id:"ff",name:"First",elevation:3,height:3,sourceArea:80,model:"b.json",transform:{x:0,z:0,rotationDeg:0}}],
 structural:{columns:{gridX:[2,8],gridZ:[2,6],sizeX:.3,sizeZ:.3},
  beams:{widthX:.25,widthZ:.25,depth:.45},slabs:{thickness:.18,roofThickness:.18}}
};
const models={gf:structuredClone(single),ff:structuredClone(single)};
const state=createAADWorkspace(manifest,models);
assert.equal(state.rooms("gf").length,1,"Baseline rectangular space should form one planar face");
assert.equal(state.rooms("gf")[0].area,80);
const original=state.snapshot().assembly;
let result=state.topology("gf","addWall",{start:{x:5,z:0},end:{x:5,z:8},thickness:.15});
assert.equal(result.result.ids.length,1);
assert.equal(result.result.intersections,0);
assert.equal(state.rooms("gf").length,2,"A connecting partition creates two closed faces");
assert.deepEqual(state.rooms("gf").map(r=>r.area).sort((a,b)=>a-b),[40,40]);
let graph=state.snapshot().models.gf.floorGraph;
assert.equal(graph.perimeter.length,6,"Source exterior walls split at two T-junctions");
assert.equal(graph.walls.length,7,"Four source walls + 2 exterior split walls + one interior");
assert.equal(state.snapshot().assembly.counts.wall,11,"Both floors and split segments assembled");
assert.equal(state.snapshot().assembly.area.model,160);
const firstWall=result.result.ids[0];
const opened=state.topology("gf","addOpening",{wallId:firstWall,kind:"door",offset:1,width:.9,height:2.1,sill:0});
assert.ok(opened.result.id.startsWith("AID-"));
const item=state.snapshot().assembly.elements.find(e=>e.id==="SYN-TOP:gf:"+opened.result.id);
assert.equal(item.ifcType,"IfcDoor");
assert.equal(item.host,"SYN-TOP:gf:"+firstWall);
assert.equal(item.source,"AI_AUTHORED_HOSTED_OPENING");
const before=JSON.stringify(state.bundle());
assert.throws(()=>state.topology("gf","addOpening",{wallId:firstWall,kind:"window",offset:1.2,width:1}),/overlap/i);
assert.equal(JSON.stringify(state.bundle()),before,"Failed topology edits must be atomic");
const cross=state.topology("gf","addWall",{start:{x:0,z:4},end:{x:10,z:4},thickness:.12});
assert.equal(cross.result.ids.length,2,"Crossing of interior vertical wall splits horizontal wall into two segments");
assert.equal(state.rooms("gf").length,4);
assert.deepEqual(state.rooms("gf").map(r=>r.area).sort((a,b)=>a-b),[20,20,20,20]);
assert.equal(state.snapshot().assembly.area.model,160);
const nonadd=state.snapshot().models.gf.floorGraph;
const remove=state.topology("gf","removeOpening",{id:opened.result.id});
assert.equal(remove.result.removedOpeningId,opened.result.id);
const join=state.topology("gf","joinWalls",{firstId:cross.result.ids[0],secondId:cross.result.ids[1]});
assert.equal(join.result.wallId,cross.result.ids[0]);
const split=state.topology("gf","splitWall",{wallId:join.result.wallId,offset:3});
assert.ok(split.result.nodeId);
assert.ok(state.snapshot().models.gf.floorGraph.nodes.some(n=>n.id===split.result.nodeId));
assert.ok(state.rooms("gf").length>=4);
const exported=writeIFC4(state.snapshot().assembly);
const checked=checkIfcReferences(exported.text);
assert.equal(checked.counts.IFCBUILDINGSTOREY,2);
assert.equal(checked.counts.IFCRELVOIDSELEMENT,0); // no openings remain
const another=createAADWorkspace(manifest,models);
another.restore(state.bundle());
assert.deepEqual(another.rooms("gf").map(r=>r.area).sort(),state.rooms("gf").map(r=>r.area).sort());
assert.equal(another.snapshot().assembly.counts.wall,state.snapshot().assembly.counts.wall);
assert.equal(another.snapshot().assembly.area.model,160);
assert.throws(()=>another.topology("gf","removeWall",{wallId:"E1"}),/Exterior perimeter/);
assert.throws(()=>another.topology("gf","addWall",{start:{x:-2,z:4},end:{x:5,z:4}}),/footprint/);
const kept=another.snapshot().assembly;
another.reset();assert.equal(another.rooms("gf").length,1);
assert.equal(another.snapshot().assembly.counts.wall,8);
assert.equal(another.snapshot().models.gf.floorGraph.perimeter.length,4);
console.log("AAD_TEMPLATE_TOPOLOGY_ROOMS_DRAFT_IFC_PASS",JSON.stringify({
 partitionFaces:4,sourceArea:160,createdOpening:opened.result.id,
 ifcEntities:checked.lines,storeys:2,redoRestores:true,rollbackOnInvalid:true}));
