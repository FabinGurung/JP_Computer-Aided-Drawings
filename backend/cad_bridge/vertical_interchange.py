"""M07 source-gated interoperable column geometry. Local CLI only.

DXF native symbols -> M05 source-reconciled plan -> M06 user-attested verticals
-> exact rectangles and cylinders in IFC4 (IfcOpenShell), STEP (OCP) and DXF.
All output geometry is PROVISIONAL_NOT_FIELD_ISSUED; no quantity authority.
"""
from __future__ import annotations
from pathlib import Path
import hashlib,json,math,re,uuid
from typing import Any

SCHEMA="fabin-cad://source-linked-interchange/0.1"
def check(v:Any,reason:str)->None:
    if not v:raise ValueError("M07 interchange rejected: "+reason)
def number(v:Any)->bool:
    return type(v) in (float,int) and math.isfinite(v)
def parse(path:str|Path)->dict:
    p=Path(path)
    check(p.is_file() and p.stat().st_size<=2_000_000,"JSON input missing or oversized")
    data=json.loads(p.read_text(encoding="utf-8"))
    check(isinstance(data,dict),"JSON input must be object")
    return data
def digest(path:str|Path)->str:
    h=hashlib.sha256()
    with Path(path).open("rb") as stream:
        for b in iter(lambda:stream.read(1024*1024),b""):h.update(b)
    return h.hexdigest()
def build(plan:dict,vertical:dict,source_dxf:str|Path)->dict:
    import ezdxf
    from ezdxf import bbox
    check(plan.get("schema")=="fabin-cad://semantic-column-review/0.1" and plan.get("status")=="SEMANTIC_PLAN_REVIEW_ONLY","M05 schema")
    qa=plan.get("qa",{})
    check(qa.get("semantic_promotion")=="BLOCKED" and qa.get("construction_gate")=="NOT_FIELD_ISSUED","M05 authority guard")
    src=plan.get("source",{})
    expected=src.get("file_sha256","")
    check(isinstance(expected,str) and re.fullmatch("[a-f0-9]{64}",expected),"source fingerprint")
    check(digest(source_dxf)==expected,"original DXF source SHA mismatch")
    doc=ezdxf.readfile(str(source_dxf))
    check(doc.header.get("$INSUNITS")==4 and doc.dxfversion=="AC1021" and src.get("units")=="mm","native CAD units/version")
    cols=plan.get("columns")
    check(isinstance(cols,list) and 0<len(cols)<=500 and qa.get("column_count")==len(cols),"column count")
    check(vertical.get("schema")=="fabin-cad://vertical-observations/0.1" and vertical.get("status")=="PROVISIONAL_NOT_FIELD_ISSUED","M06 schema/status")
    check(vertical.get("project_id")==plan.get("project_id") and
          vertical.get("plan_source_sha256")==expected and
          vertical.get("plan_layout_sha256")==src.get("layout_sha256"),"M05 and M06 source linkage")
    project=plan.get("project_id")
    check(isinstance(project,str) and re.fullmatch("[A-Za-z0-9_-]{3,80}",project),"project ID")
    grid={};handles=set()
    tolerance=plan.get("alignment",{}).get("tolerance_mm")
    translation=plan.get("alignment",{}).get("translation_global_from_grid_mm")
    check(number(tolerance) and 0<tolerance<=5 and isinstance(translation,list) and len(translation)==2 and all(map(number,translation)),"plan transform")
    for c in cols:
        key=c.get("grid");handle=c.get("source_handle")
        check(isinstance(key,str) and re.fullmatch("[A-Z][0-9]{1,2}",key) and key not in grid,"grid ID")
        check(isinstance(handle,str) and re.fullmatch("[0-9A-Fa-f]{1,24}",handle) and handle not in handles,"DXF handle")
        handles.add(handle);grid[key]=c
        for name in ("x_mm","y_mm","width_mm","depth_mm"):
            check(number(c.get(name)),"plan numeric "+key)
        check(c["width_mm"]>0 and c["depth_mm"]>0 and c["width_mm"]<=10000 and c["depth_mm"]<=10000,"plan sizes")
        check(c.get("shape") in ("circular","rectangular"),"shape")
        if c["shape"]=="circular":check(abs(c["width_mm"]-c["depth_mm"])<=0.001,"circular dimensions")
        check(c.get("height_mm") is None and c.get("z_mm") is None,"M05 cannot include verified heights")
        check(c.get("geometry_review")=="DXF_BLOCK_GEOMETRY_CHECKED","source geometry status")
        entity=doc.entitydb.get(handle)
        check(entity is not None and entity.dxftype()=="INSERT" and entity.dxf.owner==doc.modelspace().block_record_handle,"native INSERT "+handle)
        box=bbox.extents([entity],fast=True)
        check(box.has_data,"native block bbox")
        wx=box.extmax.x-box.extmin.x;wy=box.extmax.y-box.extmin.y
        cx=(box.extmax.x+box.extmin.x)/2;cy=(box.extmax.y+box.extmin.y)/2
        check(abs(wx-c["width_mm"])<=tolerance and abs(wy-c["depth_mm"])<=tolerance,"native block dimensions "+key)
        check(math.hypot(cx-translation[0]-c["x_mm"],cy-translation[1]-c["y_mm"])<=tolerance,"native block location "+key)
        if c["shape"]=="circular":
            check(any(abs(e.dxf.radius*2-c["width_mm"])<=tolerance for e in entity.virtual_entities() if e.dxftype()=="CIRCLE"),"native circle missing")
    sources=vertical.get("vertical_sources")
    check(isinstance(sources,list) and 0<len(sources)<=500,"M06 source records")
    sid=set()
    for s in sources:
        check(isinstance(s,dict) and isinstance(s.get("id"),str) and re.fullmatch("[A-Za-z0-9_-]{2,80}",s["id"]) and s["id"] not in sid,"source ID")
        sid.add(s["id"])
        ref=s.get("record_id")
        check(isinstance(ref,str) and 0<len(ref)<=200 and not re.search(r"https?://|[?#]|\.\.|[/\\]",ref),"opaque source record ID only")
        check(s.get("review")=="USER_REVIEWED_NOT_AUTHORIZED" and s.get("kind") in ("SECTION","ELEVATION","SURVEY","OTHER"),"source asserted status")
    levels=vertical.get("levels")
    check(isinstance(levels,list) and 2<=len(levels)<=100,"vertical levels")
    lid={}
    for level in levels:
        name=level.get("id");z=level.get("z_mm")
        check(isinstance(name,str) and re.fullmatch("[A-Za-z0-9_-]{2,80}",name) and name not in lid,"level identity")
        check(number(z) and -20000<=z<=200000,"level coordinate")
        refs=level.get("source_ids")
        check(isinstance(refs,list) and bool(refs) and len(set(refs))==len(refs) and all(r in sid for r in refs),"level sources")
        lid[name]=z
    segments=vertical.get("segments")
    check(isinstance(segments,list) and 0<len(segments)<=2000,"segments")
    solids=[];intervals={};unique=set()
    for seg in segments:
        key=seg.get("grid");lo=seg.get("from_level");hi=seg.get("to_level")
        check(key in grid and lo in lid and hi in lid and lo!=hi,"segment relation")
        ref=seg.get("source_ids")
        check(isinstance(ref,list) and bool(ref) and len(set(ref))==len(ref) and all(r in sid for r in ref),"segment source")
        bot=lid[lo];top=lid[hi]
        check(100<=top-bot<=20000,"height range")
        segment_id=key+"/"+lo+"/"+hi
        check(segment_id not in unique,"duplicate interval");unique.add(segment_id)
        previous=intervals.setdefault(key,[])
        check(not any(bot<b and top>a for a,b in previous),"overlapping intervals")
        previous.append((bot,top));c=grid[key]
        stable=key+"__"+lo+"__"+hi
        solids.append({"id":stable,"grid":key,"shape":c["shape"],"column_type":c.get("column_type",""),
            "source_handle":c["source_handle"],"x_mm":c["x_mm"],"y_mm":c["y_mm"],
            "z_mm":bot,"height_mm":top-bot,"width_mm":c["width_mm"],"depth_mm":c["depth_mm"],
            "from_level":lo,"to_level":hi,"source_ids":list(ref)})
    return {"schema":SCHEMA,"status":"PROVISIONAL_NOT_FIELD_ISSUED","project_id":project,
            "source_sha256":expected,"layout_sha256":src["layout_sha256"],
            "datum_label":vertical.get("datum_label","UNVERIFIED"),"solids":solids,
            "qa":{"source_dxf_sha256":"MATCHED_NATIVE_BYTES","geometry":"EXACT_RECTANGLE_CIRCLE_NATIVE",
                  "vertical_provenance":"USER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED",
                  "engineering_approval":"HOLD","quantity_takeoff":"BLOCKED"}}


def export_dxf(interchange:dict,path:str|Path)->dict:
    """Plan source IDs retained through CAD XDATA; geometry stays truly circular."""
    import ezdxf
    doc=ezdxf.new("R2013");doc.units=4
    ms=doc.modelspace()
    doc.layers.new("M07_PROVISIONAL_COLUMNS",dxfattribs={"color":3})
    doc.appids.new("FABIN_CAD")
    for solid in interchange["solids"]:
        x=solid["x_mm"];y=solid["y_mm"]
        if solid["shape"]=="circular":
            e=ms.add_circle((x,y),solid["width_mm"]/2,dxfattribs={"layer":"M07_PROVISIONAL_COLUMNS"})
        else:
            a=solid["width_mm"]/2;b=solid["depth_mm"]/2
            e=ms.add_lwpolyline([(x-a,y-b),(x+a,y-b),(x+a,y+b),(x-a,y+b)],close=True,
                    dxfattribs={"layer":"M07_PROVISIONAL_COLUMNS"})
        e.set_xdata("FABIN_CAD",[(1000,solid["id"]),(1000,solid["source_handle"]),(1000,"NOT_FIELD_ISSUED")])
    doc.saveas(str(path))
    return {"engine":"ezdxf","shape_count":len(interchange["solids"]),"format":"DXF_PLAN",
            "status":interchange["status"]}

def export_ifc(interchange:dict,path:str|Path)->dict:
    """IFC4 parametric extruded Circle/Rectangle, rather than approximating circles with boxes."""
    import ifcopenshell
    import ifcopenshell.api.aggregate
    import ifcopenshell.api.context
    import ifcopenshell.api.geometry
    import ifcopenshell.api.project
    import ifcopenshell.api.root
    import ifcopenshell.api.spatial
    import ifcopenshell.api.unit
    import numpy as np
    file=ifcopenshell.api.project.create_file(version="IFC4")
    project=ifcopenshell.api.root.create_entity(file,ifc_class="IfcProject",name=interchange["project_id"]+" / PROVISIONAL")
    unit=ifcopenshell.api.unit.add_si_unit(file,unit_type="LENGTHUNIT")
    ifcopenshell.api.unit.assign_unit(file,units=[unit])
    context=ifcopenshell.api.context.add_context(file,context_type="Model")
    body=ifcopenshell.api.context.add_context(file,context_type="Model",
        context_identifier="Body",target_view="MODEL_VIEW",parent=context)
    site=ifcopenshell.api.root.create_entity(file,ifc_class="IfcSite",name="Local observation site")
    building=ifcopenshell.api.root.create_entity(file,ifc_class="IfcBuilding",name="Provisional observations")
    storey=ifcopenshell.api.root.create_entity(file,ifc_class="IfcBuildingStorey",name="OBSERVATIONS_ONLY")
    ifcopenshell.api.aggregate.assign_object(file,relating_object=project,products=[site])
    ifcopenshell.api.aggregate.assign_object(file,relating_object=site,products=[building])
    ifcopenshell.api.aggregate.assign_object(file,relating_object=building,products=[storey])
    for s in interchange["solids"]:
        item=ifcopenshell.api.root.create_entity(file,ifc_class="IfcColumn",name=s["grid"])
        item.Tag=s["id"]
        item.Description="PROVISIONAL_NOT_FIELD_ISSUED | native DXF handle "+s["source_handle"]
        item.GlobalId=ifcopenshell.guid.compress(uuid.uuid5(uuid.NAMESPACE_URL,
            interchange["project_id"]+"/M07/"+s["id"]).hex)
        w=s["width_mm"]/1000;h=s["depth_mm"]/1000
        if s["shape"]=="circular":
            profile=file.create_entity("IfcCircleProfileDef",ProfileType="AREA",Radius=w/2)
        else:
            profile=file.create_entity("IfcRectangleProfileDef",ProfileType="AREA",XDim=w,YDim=h)
        representation=ifcopenshell.api.geometry.add_profile_representation(file,context=body,
            profile=profile,depth=s["height_mm"]/1000)
        ifcopenshell.api.geometry.assign_representation(file,product=item,representation=representation)
        matrix=np.eye(4)
        matrix[:3,3]=[s["x_mm"]/1000,s["y_mm"]/1000,s["z_mm"]/1000]
        ifcopenshell.api.geometry.edit_object_placement(file,product=item,matrix=matrix,is_si=True)
        ifcopenshell.api.spatial.assign_container(file,relating_structure=storey,products=[item])
    file.write(str(path))
    return {"engine":"IfcOpenShell","shape_count":len(interchange["solids"]),"format":"IFC4",
            "status":interchange["status"]}

def make_occt(interchange:dict):
    """True analytical cylinders and BREP boxes, based on the same source IDs."""
    from OCP.BRep import BRep_Builder
    from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox,BRepPrimAPI_MakeCylinder
    from OCP.TopoDS import TopoDS_Compound
    from OCP.gp import gp_Pnt,gp_Ax2,gp_Dir
    compound=TopoDS_Compound();builder=BRep_Builder();builder.MakeCompound(compound)
    for s in interchange["solids"]:
        x=s["x_mm"];y=s["y_mm"];z=s["z_mm"];h=s["height_mm"]
        if s["shape"]=="circular":
            shape=BRepPrimAPI_MakeCylinder(gp_Ax2(gp_Pnt(x,y,z),gp_Dir(0,0,1)),s["width_mm"]/2,h).Shape()
        else:
            w=s["width_mm"]/2;d=s["depth_mm"]/2
            shape=BRepPrimAPI_MakeBox(gp_Pnt(x-w,y-d,z),gp_Pnt(x+w,y+d,z+h)).Shape()
        builder.Add(compound,shape)
    return compound

def export_step(interchange:dict,path:str|Path)->dict:
    from OCP.STEPControl import STEPControl_Writer,STEPControl_AsIs
    from OCP.IFSelect import IFSelect_RetDone
    w=STEPControl_Writer()
    if w.Transfer(make_occt(interchange),STEPControl_AsIs)!=IFSelect_RetDone:
        raise RuntimeError("OpenCascade transfer failed")
    if w.Write(str(path))!=IFSelect_RetDone:
        raise RuntimeError("OpenCascade STEP export failed")
    return {"engine":"OpenCascade/OCP","shape_count":len(interchange["solids"]),
            "format":"STEP_BREP","status":interchange["status"]}
