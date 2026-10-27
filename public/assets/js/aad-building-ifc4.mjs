/* CAD/AAD reusable IFC4 STEP writer · deterministic model-to-IFC relationships.
 * IFC space coordinates: X = AAD X, Y = AAD map Z, Z = AAD elevation Y.
 * Export classification means exported IFC entities, not engineering acceptance.
 * The browser/UI and CI must check the resulting file with web-ifc independently.
 */
const alp="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
function guid(input){
 let a=0x811c9dc5,b=0x91e10da5,c=0x51e0c3e7,d=0x7f4a7c15;
 for(let i=0;i<input.length;i++){
  const n=input.charCodeAt(i);
  a=Math.imul(a^n,16777619)>>>0;
  b=(Math.imul(b^n,2246822519)^a)>>>0;
  c=(Math.imul(c^(n+i),3266489917)^b)>>>0;
  d=(Math.imul(d^n,668265263)^c)>>>0;
 }
 let big=(BigInt(a)<<96n)|(BigInt(b)<<64n)|(BigInt(c)<<32n)|BigInt(d);
 let chars="";for(let i=0;i<22;i++){chars=alp[Number(big&63n)]+chars;big>>=6n;}
 return chars;
}
const num=n=>{
 if(!Number.isFinite(n))throw Error("Cannot write non-finite IFC metric coordinate");
 const s=(Math.round(n*1e6)/1e6).toString();
 return s.includes(".")||s.includes("e")?s:s+".";
};
const quote=v=>"'"+String(v??"").replaceAll("'","''").replace(/[^\x20-\x7E]/g,"?")+"'";
const list=xs=>"("+xs.join(",")+")";
class Step{
 constructor(){this.records=[];this.next=1;this.typeCounts={};}
 add(name,...values){
  const id=this.next++;
  this.records.push("#"+id+"="+name+"("+values.join(",")+");");
  this.typeCounts[name]=(this.typeCounts[name]||0)+1;
  return "#"+id;
 }
 ref(id){return id;}
}
export function writeIFC4(building){
 if(building?.schema!=="jp-cad://aad-building-assembly/1")throw Error("Only validated assembled AAD buildings can be exported");
 if(building.diagnostics.some(d=>d.severity==="ERROR"))throw Error("Resolve geometry errors before IFC export");
 const s=new Step();
 const meter=s.add("IFCSIUNIT","*", ".LENGTHUNIT.", "$", ".METRE.");
 const sqm=s.add("IFCSIUNIT","*", ".AREAUNIT.", "$", ".SQUARE_METRE.");
 const cbm=s.add("IFCSIUNIT","*", ".VOLUMEUNIT.", "$", ".CUBIC_METRE.");
 const units=s.add("IFCUNITASSIGNMENT",list([meter,sqm,cbm]));
 const pt=(x,y,z)=>s.add("IFCCARTESIANPOINT",list([num(x),num(y),num(z)]));
 const dir=(x,y,z)=>s.add("IFCDIRECTION",list([num(x),num(y),num(z)]));
 const zero=pt(0,0,0),up=dir(0,0,1),east=dir(1,0,0);
 const zero2=s.add('IFCCARTESIANPOINT','(0.,0.)'),east2=s.add('IFCDIRECTION','(1.,0.)');
 const profileAxis=s.add('IFCAXIS2PLACEMENT2D',zero2,east2);
 const axis=(x,y,z,angle=0)=>{
  const origin=pt(x,y,z),rotation=dir(Math.cos(angle),Math.sin(angle),0);
  return s.add("IFCAXIS2PLACEMENT3D",origin,up,rotation);
 };
 const baseAxis=s.add("IFCAXIS2PLACEMENT3D",zero,up,east);
 const shapeContext=s.add("IFCGEOMETRICREPRESENTATIONCONTEXT","$","'Model'","3","1.E-5",baseAxis,"$");
 const model=s.add("IFCPROJECT",quote(guid(building.projectId+":PROJECT")),"$",quote(building.name),quote("AAD v1 conceptual geometry, engineering HOLD"),
  "$","$","$",list([shapeContext]),units);
 const globalPlacement=s.add("IFCLOCALPLACEMENT","$",baseAxis);
 const site=s.add("IFCSITE",quote(guid(building.projectId+":SITE")),"$",quote(building.name+" — local coordinates"),"$","$",
  globalPlacement,"$","$",".ELEMENT.","$","$","$","$","$");
 const shell=s.add("IFCBUILDING",quote(guid(building.projectId+":BUILDING")),"$",quote(building.name),"$","$",globalPlacement,
  "$","$",".ELEMENT.","$","$","$");
 const aggregate=(name,parent,children)=>s.add("IFCRELAGGREGATES",quote(guid(building.projectId+":AGG:"+name)),"$",quote(name),
  "$",parent,list(children));
 aggregate("Project sites",model,[site]);
 aggregate("Site buildings",site,[shell]);
 const storeys=new Map(),storeyRefs=[];
 for(const l of building.levels){
  const place=s.add("IFCLOCALPLACEMENT",globalPlacement,axis(0,0,l.elevation));
  const obj=s.add("IFCBUILDINGSTOREY",quote(guid(building.projectId+":STOREY:"+l.id)),"$",quote(l.name),"$","$",place,"$",
   "$",".ELEMENT.",num(l.elevation));
  storeyRefs.push(obj);storeys.set(l.id,{placement:place,obj,elevation:l.elevation,contained:[]});
 }
 aggregate("Building storeys",shell,storeyRefs);
 const idToRef=new Map(),openingLinks=[];
 const polyline=(points)=>{
  const ids=points.map(p=>pt(p.x,p.z,0)).map(id=>{
   // A 2D IFC point is required for a planar profile.
   return id;
  });
  return ids;
 };
 const profilePoly=(world)=>{
  const make2d=p=>s.add("IFCCARTESIANPOINT",list([num(p.x),num(p.z)]));
  const closed=world.map(make2d);
  closed.push(closed[0]);
  return s.add("IFCPOLYLINE",list(closed));
 };
 const profileFor=(element)=>{
  if(element.profile){
   const outer=[...element.profile];
   const a=outer.reduce((v,p,i)=>{const q=outer[(i+1)%outer.length];return v+p.x*q.z-q.x*p.z},0);
   if(a<0)outer.reverse();
   const main=profilePoly(outer);
   if(element.holes?.length){
    const holes=element.holes.map(h=>{
     const poly=[...h];
     const sign=poly.reduce((v,p,i)=>{const q=poly[(i+1)%poly.length];return v+p.x*q.z-q.x*p.z},0);
     if(sign>0)poly.reverse();
     return profilePoly(poly);
    });
    return s.add("IFCARBITRARYPROFILEDEFWITHVOIDS",".AREA.","$",main,list(holes));
   }
   return s.add("IFCARBITRARYCLOSEDPROFILEDEF",".AREA.","$",main);
  }
  return s.add("IFCRECTANGLEPROFILEDEF",".AREA.","$",profileAxis,num(element.dx),num(element.dz));
 };
 function makeGeometry(element,story){
  let items=[],placement;
  if(element.steps?.length||element.parts?.length){
   placement=s.add("IFCLOCALPLACEMENT",story.placement,axis(0,0,0));
   for(const part of element.parts||element.steps){
    const profile=s.add("IFCRECTANGLEPROFILEDEF",".AREA.","$",profileAxis,num(part.dx),num(part.dz));
    let position;
    if(part.rotationZ){
     const a=part.rotationZ*Math.PI/180,normal=dir(-Math.sin(a),0,Math.cos(a)),along=dir(Math.cos(a),0,Math.sin(a));
     const origin=pt(part.x+Math.sin(a)*part.dy/2,part.z,part.y-Math.cos(a)*part.dy/2-story.elevation);
     position=s.add('IFCAXIS2PLACEMENT3D',origin,normal,along);
    }else position=axis(part.x,part.z,part.y-part.dy/2-story.elevation);
    items.push(s.add("IFCEXTRUDEDAREASOLID",profile,position,up,num(part.dy)));
   }
  }else if(element.profile){
   placement=s.add("IFCLOCALPLACEMENT",story.placement,axis(0,0,element.y-element.dy/2-story.elevation));
   const profile=profileFor(element);
   items.push(s.add("IFCEXTRUDEDAREASOLID",profile,baseAxis,up,num(element.dy)));
  }else{
   const angle=(element.rotationDeg||0)*Math.PI/180;
   placement=s.add("IFCLOCALPLACEMENT",story.placement,axis(element.x,element.z,element.y-element.dy/2-story.elevation,angle));
   const profile=profileFor(element);
   items.push(s.add("IFCEXTRUDEDAREASOLID",profile,baseAxis,up,num(element.dy)));
  }
  const rep=s.add("IFCSHAPEREPRESENTATION",shapeContext,"'Body'","'SweptSolid'",list(items));
  return{placement,body:s.add("IFCPRODUCTDEFINITIONSHAPE","$","$",list([rep]))};
 }
 for(const e of building.elements){
  if(!e.ifcType||!storeys.has(e.level))continue;
  const story=storeys.get(e.level),g=makeGeometry(e,story);
  const base=[quote(guid(e.id)),"$",quote(e.name||e.id),quote(e.status||"DRAFT"),"$",g.placement,g.body,quote(e.id)];
  let ref;
  if(e.ifcType==="IfcDoor")ref=s.add("IFCDOOR",...base,num(e.dy),num(e.dx),".NOTDEFINED.",".NOTDEFINED.","$");
  else if(e.ifcType==="IfcWindow")ref=s.add("IFCWINDOW",...base,num(e.dy),num(e.dx),".NOTDEFINED.",".NOTDEFINED.","$");
  else if(e.ifcType==="IfcStairFlight")ref=s.add("IFCSTAIRFLIGHT",...base,
   String(e.numberOfRisers||9),String(e.numberOfRisers||9),num(e.riserHeight||.1667),num(e.treadLength||.28),".STRAIGHT.");
  else{
   const predefined=e.ifcType==="IfcSlab"?(e.kind==="roof"?".ROOF.":".FLOOR."):
    e.ifcType==="IfcColumn"?".COLUMN.":e.ifcType==="IfcBeam"?".BEAM.":e.ifcType==="IfcFooting"?".PAD_FOOTING.":".NOTDEFINED.";
   ref=s.add(e.ifcType.toUpperCase(),...base,predefined);
  }
  idToRef.set(e.id,ref);story.contained.push(ref);
  if(e.host&&["IfcDoor","IfcWindow"].includes(e.ifcType))openingLinks.push({e,productRef:ref,story});
 }
 for(const {e,productRef,story} of openingLinks){
  const wall=idToRef.get(e.host);if(!wall)throw Error("Cannot relate unhosted IFC opening "+e.id);
  const depth=Math.max(e.dz+.08,.25);
  const opening={...e,dz:depth,dx:e.dx+.015,dy:e.dy+.015,y:e.y};
  const g=makeGeometry(opening,story);
  const openingRef=s.add("IFCOPENINGELEMENT",quote(guid(e.id+":OPENING")),"$",quote("Opening for "+e.id),"$","$",g.placement,g.body,quote(e.id+":OPEN"),".OPENING.");
  s.add("IFCRELVOIDSELEMENT",quote(guid(e.id+":VOID")),"$","$","$",wall,openingRef);
  s.add("IFCRELFILLSELEMENT",quote(guid(e.id+":FILL")),"$","$","$",openingRef,productRef);
 }
 for(const [id,story] of storeys){
  if(story.contained.length)s.add("IFCRELCONTAINEDINSPATIALSTRUCTURE",quote(guid(building.projectId+":CONTAIN:"+id)),
    "$",quote("Elements in "+id),"$",list(story.contained),story.obj);
 }
 const names={IfcDoor:s.typeCounts.IFCDOOR||0,IfcWindow:s.typeCounts.IFCWINDOW||0,IfcWall:s.typeCounts.IFCWALL||0,
  IfcColumn:s.typeCounts.IFCCOLUMN||0,IfcBeam:s.typeCounts.IFCBEAM||0,IfcFooting:s.typeCounts.IFCFOOTING||0,IfcSlab:s.typeCounts.IFCSLAB||0,
  IfcStairFlight:s.typeCounts.IFCSTAIRFLIGHT||0};
 const filename=building.projectId.replaceAll(/[^A-Za-z0-9_-]/g,"_")+"_AAD_CONCEPTUAL_"+building.levels.length+"STOREY_IFC4.ifc";
 const header=["ISO-10303-21;","HEADER;",
  "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
  "FILE_NAME("+quote(filename)+","+quote("2026-10-19T00:00:00")+","+list([quote("CAD AAD")])+","+list([quote("Project owner")])+",'Shared AAD engine','Conceptual project, ENGINEERING HOLD','');",
  "FILE_SCHEMA(('IFC4'));","ENDSEC;","DATA;"];
 const result=header.concat(s.records,"ENDSEC;","END-ISO-10303-21;","").join("\n");
 return{filename,text:result,counts:names,entityCount:s.records.length,globalIds:idToRef.size,ifcSchema:"IFC4",
  note:"IFC4 conceptual geometry with storey hierarchy. Owner-reviewed structural plan locations may be source-derived; column heights, footing depth and plinth vertical placement are schematic. Engineering HOLD; NOT FOR CONSTRUCTION."};
}
export function checkIfcReferences(text){
 if(!text.startsWith("ISO-10303-21;")||!text.includes("FILE_SCHEMA(('IFC4'))"))throw Error("Not a parsed IFC4 STEP file");
 const set=new Set(),refs=[],counts={};
 for(const line of text.split("\n")){
  const match=/^#(\d+)=(IFC[A-Z0-9_]+)\((.*)\);$/.exec(line);
  if(!match)continue;
  const id=Number(match[1]),body=match[3],type=match[2];
  if(set.has(id))throw Error("Duplicate IFC express ID "+id);
  set.add(id);counts[type]=(counts[type]||0)+1;
  for(const pointer of body.matchAll(/#(\d+)/g))refs.push(Number(pointer[1]));
 }
 for(const pointer of refs)if(!set.has(pointer))throw Error("Broken IFC STEP reference #"+pointer);
 if(!counts.IFCPROJECT||!counts.IFCBUILDING||!counts.IFCBUILDINGSTOREY||!counts.IFCRELCONTAINEDINSPATIALSTRUCTURE)
  throw Error("Missing IFC spatial hierarchy");
 if(!counts.IFCRELVOIDSELEMENT||!counts.IFCRELFILLSELEMENT)throw Error("Missing IFC wall-hosted opening relations");
 return{lines:set.size,counts};
}
