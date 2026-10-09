"""Real installed engines, not mock implementations. The web site hosts only browser code."""
from __future__ import annotations
from pathlib import Path
from .model import dims_m
def export_dxf(model:dict,output:str|Path)->dict:
    import ezdxf
    doc=ezdxf.new("R2013");doc.units=4;ms=doc.modelspace()
    for name,color in {"slab":8,"wall":7,"column":3,"footing":1,"beam":2}.items():
        doc.layers.new(name.upper(),dxfattribs={"color":color})
    for e in model["elements"]:
        x,y=e["x_mm"],e["y_mm"];length,width=e["length_mm"],e["width_mm"]
        ms.add_lwpolyline([(x,y),(x+length,y),(x+length,y+width),(x,y+width)],
                          close=True,dxfattribs={"layer":e["kind"].upper()})
    doc.saveas(str(output))
    return {"engine":"ezdxf","elements":len(model["elements"]),"output":str(output)}

def export_ifc(model:dict,output:str|Path)->dict:
    import uuid
    import numpy as np
    import ifcopenshell
    import ifcopenshell.api.aggregate
    import ifcopenshell.api.context
    import ifcopenshell.api.geometry
    import ifcopenshell.api.project
    import ifcopenshell.api.root
    import ifcopenshell.api.spatial
    import ifcopenshell.api.unit
    file=ifcopenshell.api.project.create_file(version="IFC4")
    project=ifcopenshell.api.root.create_entity(file,ifc_class="IfcProject",name=model["project_id"])
    unit=ifcopenshell.api.unit.add_si_unit(file,unit_type="LENGTHUNIT")
    ifcopenshell.api.unit.assign_unit(file,units=[unit])
    context=ifcopenshell.api.context.add_context(file,context_type="Model")
    body=ifcopenshell.api.context.add_context(file,context_type="Model",
                context_identifier="Body",target_view="MODEL_VIEW",parent=context)
    site=ifcopenshell.api.root.create_entity(file,ifc_class="IfcSite",name="Demo site")
    building=ifcopenshell.api.root.create_entity(file,ifc_class="IfcBuilding",name="Demo building")
    ifcopenshell.api.aggregate.assign_object(file,relating_object=project,products=[site])
    ifcopenshell.api.aggregate.assign_object(file,relating_object=site,products=[building])
    levels={}
    mapping={"wall":"IfcWall","slab":"IfcSlab","column":"IfcColumn","beam":"IfcBeam","footing":"IfcFooting"}
    for e in model["elements"]:
        level=e["level"]
        if level not in levels:
            storey=ifcopenshell.api.root.create_entity(file,ifc_class="IfcBuildingStorey",name=level)
            ifcopenshell.api.aggregate.assign_object(file,relating_object=building,products=[storey])
            levels[level]=storey
        item=ifcopenshell.api.root.create_entity(file,ifc_class=mapping[e["kind"]],name=e["id"])
        item.Tag=e["id"]
        item.GlobalId=ifcopenshell.guid.compress(uuid.uuid5(uuid.NAMESPACE_URL,model["project_id"]+"/"+e["id"]).hex)
        length,width,height=dims_m(e)
        verts=[(0,0,0),(length,0,0),(length,width,0),(0,width,0),
               (0,0,height),(length,0,height),(length,width,height),(0,width,height)]
        faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        rep=ifcopenshell.api.geometry.add_mesh_representation(file,context=body,vertices=[verts],faces=[faces])
        ifcopenshell.api.geometry.assign_representation(file,product=item,representation=rep)
        transform=np.eye(4);transform[:3,3]=[e["x_mm"]/1000,e["y_mm"]/1000,e["z_mm"]/1000]
        ifcopenshell.api.geometry.edit_object_placement(file,product=item,matrix=transform,is_si=True)
        ifcopenshell.api.spatial.assign_container(file,relating_structure=levels[level],products=[item])
    file.write(str(output))
    return {"engine":"IfcOpenShell","elements":len(model["elements"]),"storeys":len(levels),"output":str(output)}

def occt_compound(model:dict):
    from OCP.BRep import BRep_Builder
    from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox
    from OCP.TopoDS import TopoDS_Compound
    from OCP.gp import gp_Pnt
    comp=TopoDS_Compound();builder=BRep_Builder();builder.MakeCompound(comp)
    for e in model["elements"]:
        x,y,z=e["x_mm"],e["y_mm"],e["z_mm"]
        solid=BRepPrimAPI_MakeBox(gp_Pnt(x,y,z),gp_Pnt(x+e["length_mm"],y+e["width_mm"],z+e["height_mm"])).Shape()
        builder.Add(comp,solid)
    return comp

def export_step(model:dict,output:str|Path)->dict:
    from OCP.STEPControl import STEPControl_Writer, STEPControl_AsIs
    from OCP.IFSelect import IFSelect_RetDone
    writer=STEPControl_Writer()
    shape=occt_compound(model)
    assert writer.Transfer(shape,STEPControl_AsIs)==IFSelect_RetDone
    if writer.Write(str(output))!=IFSelect_RetDone:raise RuntimeError("OCCT STEP writer failed")
    return {"engine":"OpenCascade/OCP","elements":len(model["elements"]),"output":str(output)}

def section_edges(model:dict,z_mm:float)->dict:
    """OCCT exact solid-plane intersection; return count only, not a fabricated section drawing."""
    from OCP.BRepAlgoAPI import BRepAlgoAPI_Section
    from OCP.gp import gp_Pln,gp_Pnt,gp_Dir
    from OCP.TopAbs import TopAbs_EDGE
    from OCP.TopExp import TopExp_Explorer
    section=BRepAlgoAPI_Section(occt_compound(model),gp_Pln(gp_Pnt(0,0,z_mm),gp_Dir(0,0,1)),False)
    section.Build()
    if not section.IsDone():raise RuntimeError("OCCT geometric section failed")
    count=0;explorer=TopExp_Explorer(section.Shape(),TopAbs_EDGE)
    while explorer.More():count+=1;explorer.Next()
    return {"engine":"OpenCascade/OCP","section_z_mm":z_mm,"edge_count":count}
