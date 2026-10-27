/* Shared AAD discipline/element-type register and selection language.
 * One assembled building array is the authority for 3D, 2D and the schedule.
 * Disciplines are UI grouping, not an IFC semantic/structural code approval.
 */
const CATEGORIES={
 furniture:["Architecture","Furniture","Schematic furnishing envelope; manufacturer and final selection unverified"],
 fixture:["Architecture","Fixtures","Source-constrained sanitary or kitchen fixture envelope"],
 floor:["Architecture","Floor finishes","Architectural floor surface; thickness is a display assumption"],
 guard:["Architecture","Guards","Proposed guard coordination geometry; fixings and capacity not designed"],
 site:["Other","Site context","Site or vehicle coordination envelope"],
 landscape:["Other","Landscape","Illustrative landscape object"],
 auxiliary:["Architecture","External service enclosure","Source-constrained external WC enclosure; municipal position unverified"],
 wall:["Architecture","Walls","Plan wall (may be load-bearing; not classified by this grouping)"],
 door:["Architecture","Doors","Hosted architectural door opening"],
 window:["Architecture","Windows","Hosted architectural window opening"],
 stair:["Architecture","Stairs","Conceptual staircase / stair flight; structural adequacy unverified"],
 column:["Structure","Columns","Conceptual structural column; dimensions and capacity unverified"],
 beam:["Structure","Beams","Conceptual structural beam; dimensions and capacity unverified"],
 footing:["Structure","Footings","Source-derived or conceptual footing footprint; thickness, founding depth and reinforced capacity not verified"],
 slab:["Structure","Floor slabs","Conceptual floor slab; engineering design not certified"],
 landing:["Structure","Landings","Conceptual stair landing; engineering design not certified"],
 roof:["Structure","Roofs","Conceptual roof plate; engineering design not certified"]
};
const PLAN_SHAPES=new Set(["wall","door","window","column","footing"]);
const CLASS_ORDER=["Architecture","Structure","Other"];
const numeric=(n)=>Number.isFinite(n)?n:Infinity;
export function classifyAADComponent(e){
 const [discipline,type,meaning]=CATEGORIES[e.kind]||["Other","Other components","Conceptual model element"];
 return{discipline,type,meaning};
}
export function describeAADSelection(e){
 const cls=classifyAADComponent(e);
 return{
  name:e.name||e.id,kind:e.kind,discipline:cls.discipline,meaning:cls.meaning,
  representation:(PLAN_SHAPES.has(e.kind)||(e.previewOnly&&e.kind==="beam"))?"ACTUAL_2D_GEOMETRY_AND_3D":"2D_LOCATION_ONLY__3D_GEOMETRY",
  representationHint:(PLAN_SHAPES.has(e.kind)||(e.previewOnly&&e.kind==="beam"))?
   "2D highlights this element's drawn plan geometry. The 3D highlight and table use the same BIM ID.":
   "The orange 2D dot is only the element's world-coordinate locator, not a physical dot or a drawn footprint. Its 3D geometry and table record share this BIM ID.",
  evidence:e.provenance?.basis||e.status||"UNVERIFIED",
  sourceId:e.provenance?.sourceId||null
 };
}
export function buildAADComponentGroups(building,filters={}){
 if(!building||!Array.isArray(building.levels)||!Array.isArray(building.elements))
  throw Error("Expected AAD building assembly for register");
 const o={level:filters.level||"all",discipline:filters.discipline||"all",
  kind:filters.kind||"all",search:String(filters.search||"").trim().toLowerCase(),
  sort:filters.sort||"id"};
 if(!["id","name","x","z","kind"].includes(o.sort))throw Error("Invalid AAD register sort");
 const all=building.elements.filter(e=>Boolean(e.ifcType)),hits=all.filter(e=>{
  const cls=classifyAADComponent(e),hay=[
   e.id,e.name,e.kind,e.ifcType,e.status,e.source,cls.discipline,cls.type,
   e.provenance?.basis,e.provenance?.sourceId,e.provenance?.locator
  ].filter(x=>x!==undefined&&x!==null).join(" ").toLowerCase();
  return (o.level==="all"||e.level===o.level) &&
   (o.discipline==="all"||cls.discipline===o.discipline) &&
   (o.kind==="all"||e.kind===o.kind) &&
   (!o.search||hay.includes(o.search));
 });
 const cmp=(a,b)=>{
  if(o.sort==="x"||o.sort==="z")return numeric(a[o.sort])-numeric(b[o.sort])||a.id.localeCompare(b.id);
  if(o.sort==="kind")return a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id);
  return String(a[o.sort]||a.id).localeCompare(String(b[o.sort]||b.id),undefined,{numeric:true});
 };
 const groups=building.levels.map(l=>{
  const levelItems=hits.filter(e=>e.level===l.id);
  const disciplines=CLASS_ORDER.map(d=>{
   const its=levelItems.filter(e=>classifyAADComponent(e).discipline===d);
   const types=[...new Set(its.map(e=>e.kind))].sort((a,b)=>
    (classifyAADComponent({kind:a}).type.localeCompare(classifyAADComponent({kind:b}).type)));
   return{name:d,count:its.length,types:types.map(kind=>({
    kind,name:classifyAADComponent({kind}).type,
    items:its.filter(e=>e.kind===kind).sort(cmp)
   }))};
  }).filter(d=>d.count);
  return{level:l.id,name:l.name,elevation:l.elevation,count:levelItems.length,disciplines};
 }).filter(l=>l.count>0);
 return{total:all.length,matching:hits.length,groups,filters:o};
}
