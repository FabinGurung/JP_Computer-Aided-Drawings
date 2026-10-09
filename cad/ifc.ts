import * as THREE from "three";
import * as WebIFC from "web-ifc";
export type IfcReadResult={group:THREE.Group;count:number;schema:string};
export async function readIfc(data:ArrayBuffer,wasmBase:string):Promise<IfcReadResult>{
 const api=new WebIFC.IfcAPI();
 api.SetWasmPath(wasmBase,true);
 await api.Init();
 let modelID:number|undefined;
 const group=new THREE.Group();group.name="Read-only IFC import";group.rotation.x=-Math.PI/2;
 let count=0;
 try{
  modelID=api.OpenModel(new Uint8Array(data));
  api.StreamAllMeshes(modelID,(flat)=>{
   for(let i=0;i<flat.geometries.size();i++){
    const placed=flat.geometries.get(i),raw=api.GetGeometry(modelID!,placed.geometryExpressID);
    const interleaved=Float32Array.from(api.GetVertexArray(raw.GetVertexData(),raw.GetVertexDataSize()));
    const triangles=Uint32Array.from(api.GetIndexArray(raw.GetIndexData(),raw.GetIndexDataSize()));
    const positions=new Float32Array(interleaved.length/2),normals=new Float32Array(interleaved.length/2);
    for(let a=0,b=0;a<interleaved.length;a+=6,b+=3){positions[b]=interleaved[a]!;positions[b+1]=interleaved[a+1]!;positions[b+2]=interleaved[a+2]!;normals[b]=interleaved[a+3]!;normals[b+1]=interleaved[a+4]!;normals[b+2]=interleaved[a+5]!;}
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
    geometry.setAttribute("normal",new THREE.BufferAttribute(normals,3));
    geometry.setIndex(new THREE.BufferAttribute(triangles,1));geometry.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({color:new THREE.Color(placed.color.x,placed.color.y,placed.color.z),metalness:0.02,roughness:0.7,side:THREE.DoubleSide,transparent:placed.color.w<.98,opacity:placed.color.w});
    const mesh=new THREE.Mesh(geometry,material);mesh.name="IFC #"+flat.expressID;
    mesh.userData={ifcExpressId:flat.expressID,source:"IMPORTED_IFC_READ_ONLY"};
    mesh.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation));group.add(mesh);count++;
   }
  });
  return {group,count,schema:"IFC_Geometry_ReadOnly"};
 }catch(e){for(const m of group.children){if(m instanceof THREE.Mesh){m.geometry.dispose();(m.material as THREE.Material).dispose();}}throw e;}
 finally{if(modelID!==undefined)api.CloseModel(modelID);}
}
