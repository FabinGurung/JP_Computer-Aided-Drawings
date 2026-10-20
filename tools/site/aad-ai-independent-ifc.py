"""Independent IfcOpenShell parse acceptance for any AI-authored design output.
Usage: python tools/site/aad-ai-independent-ifc.py <IFC-path> <expected-storeys>
A STEP syntax check alone does not constitute IFC interoperability.
"""
import json
import sys
from pathlib import Path
import ifcopenshell
if len(sys.argv)!=3:
 raise SystemExit("Need IFC path and exact expected storey count")
file=Path(sys.argv[1])
expected=int(sys.argv[2])
assert 2<=expected<=12
assert file.is_file(),file
model=ifcopenshell.open(str(file))
assert model.schema=="IFC4",model.schema
def count(name):return len(model.by_type(name))
assert count("IfcProject")==1
assert count("IfcSite")==1
assert count("IfcBuilding")==1
assert count("IfcBuildingStorey")==expected
assert count("IfcRelAggregates")==3
assert count("IfcRelContainedInSpatialStructure")==expected
for kind in ("IfcWall","IfcSlab","IfcColumn","IfcBeam","IfcDoor","IfcWindow"):
 assert count(kind)>0,kind
 for item in model.by_type(kind):
  assert item.GlobalId and len(item.GlobalId)==22
  assert item.Representation and item.ObjectPlacement
  assert len(item.ContainedInStructure)==1,(kind,item.GlobalId)
for rel in model.by_type("IfcRelFillsElement"):
 assert rel.RelatingOpeningElement.is_a("IfcOpeningElement")
 assert rel.RelatedBuildingElement.is_a() in ("IfcDoor","IfcWindow")
for rel in model.by_type("IfcRelVoidsElement"):
 assert rel.RelatingBuildingElement.is_a("IfcWall")
assert count("IfcRelFillsElement")==count("IfcDoor")+count("IfcWindow")
assert count("IfcRelVoidsElement")==count("IfcDoor")+count("IfcWindow")
assert count("IfcExtrudedAreaSolid")>20
print("AAD_AI_IFCOPENSHELL_INDEPENDENT_PARSE_PASS",json.dumps({
 "schema":model.schema,"storeys":expected,"walls":count("IfcWall"),
 "doors":count("IfcDoor"),"windows":count("IfcWindow"),
 "columns":count("IfcColumn"),"beams":count("IfcBeam"),
 "voidRelationships":count("IfcRelVoidsElement"),
 "engineeringStatus":"NOT_STRUCTURALLY_VERIFIED"
}))
