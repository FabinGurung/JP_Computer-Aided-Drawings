"""Independent IFC4 parser acceptance using pinned IfcOpenShell.
Checks actual schema/entity relationships and geometry representations, not only
the JavaScript writer's lexical checks. Never upgrades an engineering HOLD.
"""
import argparse
import json
from pathlib import Path
import ifcopenshell

p=argparse.ArgumentParser()
p.add_argument("--folder",default="dist/data/projects/narayani-parajuli")
a=p.parse_args()
folder=Path(a.folder)
manifest=json.loads((folder/"NARAYANI_BLOCK_B_AAD_BIM_A01_QA.json").read_text())
file=folder/manifest["ifcFile"]
assert file.is_file(),file
model=ifcopenshell.open(str(file))
assert model.schema=="IFC4",model.schema

def count(kind):return len(model.by_type(kind))
expected={"IfcProject":1,"IfcSite":1,"IfcBuilding":1,"IfcBuildingStorey":3,
 "IfcWall":68,"IfcDoor":20,"IfcWindow":23,"IfcStairFlight":4,
 "IfcRelVoidsElement":43,"IfcRelFillsElement":43,
 "IfcRelContainedInSpatialStructure":3,"IfcRelAggregates":3}
for kind,n in expected.items():
 got=count(kind)
 assert got==n,f"{kind}: expected {n}, got {got}"
levels=model.by_type("IfcBuildingStorey")
assert len({round(st.Elevation,3) for st in levels})==3,"Repeated storey elevations"
assert {round(st.Elevation,3) for st in levels}=={0,3,6}
assert all(st.ObjectPlacement and st.ObjectPlacement.is_a("IfcLocalPlacement") for st in levels)
assert all(st.ContainsElements for st in levels),"Storey missing contained elements"
for kind in ("IfcWall","IfcDoor","IfcWindow","IfcSlab","IfcColumn","IfcBeam","IfcFooting","IfcStairFlight"):
 for obj in model.by_type(kind):
  assert obj.GlobalId and len(obj.GlobalId)==22,(kind,obj)
  assert obj.ObjectPlacement and obj.Representation,(kind,obj)
  assert len(obj.ContainedInStructure)==1,(kind,obj.GlobalId)
  rel=obj.ContainedInStructure[0]
  assert rel.RelatingStructure.is_a("IfcBuildingStorey"),(kind,obj.GlobalId)
for rel in model.by_type("IfcRelVoidsElement"):
 assert rel.RelatingBuildingElement.is_a("IfcWall")
 assert rel.RelatedOpeningElement.is_a("IfcOpeningElement")
for rel in model.by_type("IfcRelFillsElement"):
 assert rel.RelatedBuildingElement.is_a() in ("IfcDoor","IfcWindow")
 assert rel.RelatingOpeningElement.is_a("IfcOpeningElement")
assert count("IfcColumn")==23,"Source-reviewed 23 GF columns required"
assert count("IfcBeam")==16,"Frozen M70 16 GF beams required"
assert count("IfcFooting")==21,"Original DXF 21 footing outlines required"
assert not any("BEAM-X" in x.Name or "BEAM-Z" in x.Name for x in model.by_type("IfcBeam"))

assert count("IfcSlab")>=5
assert count("IfcArbitraryProfileDefWithVoids")>=2
report={
 "parser":"ifcopenshell", "schema":model.schema,
 "parsed":True,"stage":"BIM_INTERCHANGE_PARSED_ENGINEERING_HOLD",
 "counts":{kind:count(kind) for kind in expected},
 "columns":count("IfcColumn"),"beams":count("IfcBeam"),"footings":count("IfcFooting"),"slabs":count("IfcSlab"),
 "stairFlights":count("IfcStairFlight"),
 "geometryEntities":count("IfcExtrudedAreaSolid"),
 "metadata":"User-reviewed source GF geometry, with schematic column height, footing depth and beam elevation, provisional architectural datum, I3/CF1/G1 HOLD, upper storeys not structural; NOT for construction"
}
assert report["geometryEntities"]>120,report
(folder/"NARAYANI_BLOCK_B_AAD_BIM_A01_IFC_ROUNDTRIP.json").write_text(json.dumps(report,indent=2)+"\n")
print("AAD_INDEPENDENT_IFCOPENSHELL_ROUNDTRIP_PASS",json.dumps(report))
