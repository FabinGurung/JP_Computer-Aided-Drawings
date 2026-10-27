import assert from 'node:assert/strict';
import fs from 'node:fs';
import {IfcAPI,IFCDOOR,IFCWINDOW,IFCWALL,IFCRELVOIDSELEMENT} from 'web-ifc';
// Parse the generated exchange file with the independent pinned WASM engine.
const api=new IfcAPI();api.SetWasmPath(process.cwd()+'/node_modules/web-ifc/',true);await api.Init();
const id=api.OpenModel(new Uint8Array(fs.readFileSync('/tmp/ashok-qa02-conceptual.ifc')));
assert.equal(api.GetLineIDsWithType(id,IFCDOOR).size(),14);assert.equal(api.GetLineIDsWithType(id,IFCWINDOW).size(),18);
assert.equal(api.GetLineIDsWithType(id,IFCWALL).size(),49);assert.equal(api.GetLineIDsWithType(id,IFCRELVOIDSELEMENT).size(),32);
let meshes=0;api.StreamAllMeshes(id,()=>meshes++);assert.ok(meshes>=190,'Missing native IFC geometry');
api.CloseModel(id);console.log('ASHOK_QA02_INDEPENDENT_IFC_GEOMETRY_PASS',JSON.stringify({doors:14,windows:18,walls:49,voids:32,meshes}));
