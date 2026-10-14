"""M11.2: synthetic rotated multistorey native assembly and exact common section.

Surface contact is verified by native BRep distance, nonoverlap and finite
planar contact patch; this is NOT a structurally verified load-path model.
"""
from __future__ import annotations
import hashlib
import html
import json
import math
import uuid
from pathlib import Path
from .assembly_multilevel import load_multilevel, RESULT_SCHEMA
from .assembly_executor import source_geometry, export_ifc as old_export_ifc, export_dxf as old_export_dxf, assembly_plan
from .assembly_executor import IFC_CLASSES
from .design_job import canonical
from .oriented_executor import fuse_wall_network
from .oriented_job import check


def shape_instance(box):
    from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox
    from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
    from OCP.gp import gp_Pnt, gp_Trsf, gp_Ax1, gp_Dir, gp_Vec
    local = BRepPrimAPI_MakeBox(
        gp_Pnt(0, 0, 0),
        gp_Pnt(box['length_mm'], box['width_mm'], box['height_mm'])).Shape()
    transform = gp_Trsf()
    transform.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)),
                          math.radians(box['yaw_deg']))
    transform.SetTranslationPart(gp_Vec(box['x_mm'], box['y_mm'], box['z_mm']))
    shape = BRepBuilderAPI_Transform(local, transform, True).Shape()
    check(not shape.IsNull(), 'COMPONENT_BREP_INVALID')
    return shape


def xy_polygon(box):
    c,s=math.cos(math.radians(box['yaw_deg'])), math.sin(math.radians(box['yaw_deg']))
    return [(box['x_mm']+c*u-s*v,box['y_mm']+s*u+c*v)
            for u,v in ((0,0),(box['length_mm'],0),
                        (box['length_mm'],box['width_mm']),(0,box['width_mm']))]


def overlap_area(a,b):
    """Area of the exact intersection of two convex component footprints."""
    result=list(a)
    for i in range(len(b)):
        p,q=b[i],b[(i+1)%len(b)]
        def cross(x): return (q[0]-p[0])*(x[1]-p[1])-(q[1]-p[1])*(x[0]-p[0])
        def cut(s,t):
            x,y=cross(s),cross(t)
            if abs(x-y)<1e-13: return t
            ratio=x/(x-y)
            return (s[0]+ratio*(t[0]-s[0]), s[1]+ratio*(t[1]-s[1]))
        past=result;result=[]
        if not past:break
        for j,t in enumerate(past):
            s=past[j-1];inside_t=cross(t)>=-1e-9;inside_s=cross(s)>=-1e-9
            if inside_t:
                if not inside_s: result.append(cut(s,t))
                result.append(t)
            elif inside_s:result.append(cut(s,t))
    if len(result)<3:return 0.0
    return abs(sum(result[i][0]*result[(i+1)%len(result)][1]
                   -result[(i+1)%len(result)][0]*result[i][1]
                   for i in range(len(result)))/2)


def verify_contacts(contacts, boxes, shapes):
    from OCP.BRepExtrema import BRepExtrema_DistShapeShape
    from OCP.BRepAlgoAPI import BRepAlgoAPI_Common
    from OCP.BRepGProp import BRepGProp
    from OCP.GProp import GProp_GProps
    found=[]
    for relation in contacts:
        a,b=relation['component_a'],relation['component_b']
        aa,bb=boxes[a],boxes[b]
        za0,za1=aa['z_mm'],aa['z_mm']+aa['height_mm']
        zb0,zb1=bb['z_mm'],bb['z_mm']+bb['height_mm']
        check(min(abs(za1-zb0),abs(zb1-za0))<=0.001,
              'CONTACT_NOT_OPPOSING_HORIZONTAL_FACES')
        area=overlap_area(xy_polygon(aa),xy_polygon(bb))
        check(area > 100, 'CONTACT_PATCH_TOO_SMALL')
        metric=BRepExtrema_DistShapeShape(shapes[a],shapes[b]);metric.Perform()
        check(metric.IsDone() and metric.Value() <= 0.001,
              'CONTACT_BREP_DISTANCE_FAIL')
        intersection=BRepAlgoAPI_Common(shapes[a],shapes[b]);intersection.Build()
        check(intersection.IsDone() and not intersection.Shape().IsNull(),
              'CONTACT_COMMON_FAILED')
        mass=GProp_GProps();BRepGProp.VolumeProperties_s(intersection.Shape(),mass)
        check(abs(mass.Mass()) <= 1.0, 'CONTACT_SOLIDS_OVERLAP')
        found.append({'id':relation['id'],'component_a':a,'component_b':b,
                      'relation':'SURFACE_TOUCH_ONLY','patch_area_mm2':round(area,5),
                      'native_distance_mm':round(metric.Value(),8),
                      'native_overlap_volume_mm3':round(mass.Mass(),8),
                      'structural_capacity_verified':False})
    return sorted(found,key=lambda x:x['id'])


def section_shape(shape, plane):
    from OCP.BRepAlgoAPI import BRepAlgoAPI_Section
    from OCP.BRepAdaptor import BRepAdaptor_Curve
    from OCP.GeomAbs import GeomAbs_Line
    from OCP.TopoDS import TopoDS
    from OCP.TopAbs import TopAbs_EDGE
    from OCP.TopExp import TopExp_Explorer
    op=BRepAlgoAPI_Section(shape,plane,False)
    op.Approximation(False);op.Build()
    check(op.IsDone(),'BRep_SECTION_FAILED')
    edges=[]
    iterator=TopExp_Explorer(op.Shape(),TopAbs_EDGE)
    cast=getattr(TopoDS,'Edge_s',None) or getattr(TopoDS,'Edge',None)
    check(cast is not None,'BRep_EDGE_CAST_UNAVAILABLE')
    while iterator.More():
        curve=BRepAdaptor_Curve(cast(iterator.Current()))
        check(curve.GetType()==GeomAbs_Line,'NONLINEAR_SECTION_NOT_SUPPORTED')
        a,b=curve.Value(curve.FirstParameter()),curve.Value(curve.LastParameter())
        pt1=[round(a.Y(),6),round(a.Z(),6)]
        pt2=[round(b.Y(),6),round(b.Z(),6)]
        if math.dist(pt1,pt2)>0.000001:edges.append(sorted([pt1,pt2]))
        iterator.Next()
    return list({json.dumps(v):v for v in edges}.values())


def exact_assembly_section(state,boxes,shapes,section):
    """One shared section plane through native fused walls and ALL components."""
    from OCP.BRep import BRep_Builder
    from OCP.TopoDS import TopoDS_Compound
    from OCP.gp import gp_Pnt,gp_Dir,gp_Pln
    check(section['axis']=='X','SECTION_AXIS_CURRENTLY_X_ONLY')
    x=section['position_mm']
    plane=gp_Pln(gp_Pnt(x,0,0),gp_Dir(1,0,0))
    compound=TopoDS_Compound();builder=BRep_Builder();builder.MakeCompound(compound)
    wall=fuse_wall_network(state)
    builder.Add(compound,wall)
    for shape in shapes.values():builder.Add(compound,shape)
    all_edges=section_shape(compound,plane)
    check(len(all_edges)>=4,'ASSEMBLY_SECTION_EMPTY')
    participants={}
    wall_edges=section_shape(wall,plane)
    if wall_edges:participants['FUSED_M10_2_WALL_NETWORK']=len(wall_edges)
    for name,shape in shapes.items():
        part=section_shape(shape,plane)
        if part:participants[name]=len(part)
    check(len([k for k in participants if k!='FUSED_M10_2_WALL_NETWORK'])>=3,
          'SECTION_DOES_NOT_CROSS_ASSEMBLY')
    check(any(boxes[name]['level_id']=='First' for name in participants
              if name in boxes), 'SECTION_MISSING_UPPER_LEVEL')
    return {'schema':'fabin-cad://exact-assembly-section/0.2',
            'id':section['id'],'plane_axis':'X','plane_at_mm':x,
            'coordinates':'Y_MM_Z_MM','algorithm':'OCP_BREP_SECTION_EXACT_LINEAR_EDGES',
            'edges':sorted(all_edges),'intersection_contributors':participants,
            'section_includes_new_components':True,
            'engineering_approval':'HOLD'}


def section_svg(item):
    lines=item['edges'];pts=[p for a,b in lines for p in (a,b)]
    left=min(p[0] for p in pts)-200;right=max(p[0] for p in pts)+200
    low=min(p[1] for p in pts)-200;high=max(p[1] for p in pts)+200
    strokes=''.join(f'<line x1="{a[0]}" y1="{-a[1]}" x2="{b[0]}" y2="{-b[1]}" stroke="#183d55" stroke-width="12"/>' for a,b in lines)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{left} {-high} '
            f'{right-left} {high-low}" aria-label="Exact assembly-wide native section">'
            f'{strokes}</svg>')


def export_ifc(state,old_boxes,added,levels,path):
    import numpy as np
    import ifcopenshell
    import ifcopenshell.api.aggregate
    import ifcopenshell.api.geometry
    import ifcopenshell.api.root
    import ifcopenshell.api.spatial
    old_export_ifc(state,old_boxes,path)
    f=ifcopenshell.open(str(path))
    body=next(c for c in f.by_type('IfcGeometricRepresentationSubContext')
              if c.ContextIdentifier=='Body')
    building=f.by_type('IfcBuilding')[0]
    storeys={x.Name:x for x in f.by_type('IfcBuildingStorey')}
    for label,z in levels.items():
        if label not in storeys:
            storey=ifcopenshell.api.root.create_entity(
                f,ifc_class='IfcBuildingStorey',name=label)
            storey.Elevation=z/1000
            ifcopenshell.api.aggregate.assign_object(f,relating_object=building,
                                                     products=[storey])
            storeys[label]=storey
    for b in added:
        obj=ifcopenshell.api.root.create_entity(
            f,ifc_class=IFC_CLASSES[b['kind']],name=b['id'])
        obj.Tag=b['id']
        obj.GlobalId=ifcopenshell.guid.compress(
            uuid.uuid5(uuid.NAMESPACE_URL,
                       state['source']['project_id']+'/M11.2/'+b['id']).hex)
        obj.Description=('SYNTHETIC_QA_ONLY | TEMPLATE='+b['template_id']+
                         ' | CONTACT_GEOMETRY_ONLY | ENGINEERING_HOLD')
        profile=f.create_entity('IfcRectangleProfileDef',ProfileType='AREA',
                 XDim=b['length_mm']/1000,YDim=b['width_mm']/1000)
        rep=ifcopenshell.api.geometry.add_profile_representation(
            f,context=body,profile=profile,depth=b['height_mm']/1000)
        ifcopenshell.api.geometry.assign_representation(f,product=obj,representation=rep)
        c,s=math.cos(math.radians(b['yaw_deg'])), math.sin(math.radians(b['yaw_deg']))
        matrix=np.eye(4);matrix[0,0]=c;matrix[0,1]=-s
        matrix[1,0]=s;matrix[1,1]=c
        matrix[:3,3]=[(b['x_mm']+c*b['length_mm']/2-s*b['width_mm']/2)/1000,
                     (b['y_mm']+s*b['length_mm']/2+c*b['width_mm']/2)/1000,
                     b['z_mm']/1000]
        ifcopenshell.api.geometry.edit_object_placement(f,product=obj,matrix=matrix,
                                                         is_si=True)
        ifcopenshell.api.spatial.assign_container(
            f,relating_structure=storeys[b['level_id']],products=[obj])
    f.write(str(path))


def export_step(state,shapes,path):
    from OCP.BRep import BRep_Builder
    from OCP.TopoDS import TopoDS_Compound
    from OCP.STEPControl import STEPControl_Writer,STEPControl_AsIs
    from OCP.IFSelect import IFSelect_RetDone
    compound=TopoDS_Compound();builder=BRep_Builder();builder.MakeCompound(compound)
    builder.Add(compound,fuse_wall_network(state))
    for item in shapes.values():builder.Add(compound,item)
    writer=STEPControl_Writer()
    check(writer.Transfer(compound,STEPControl_AsIs)==IFSelect_RetDone,
          'STEP_TRANSFER_FAILED')
    check(writer.Write(str(path))==IFSelect_RetDone,'STEP_WRITE_FAILED')


def export_dxf(state,old_boxes,added,path):
    import ezdxf
    old_export_dxf(state,old_boxes,path)
    doc=ezdxf.readfile(path)
    for k in IFC_CLASSES:doc.layers.new('M11_2_'+k.upper(),dxfattribs={'color':4})
    space=doc.modelspace()
    for b in added:
        poly=space.add_lwpolyline(xy_polygon(b),close=True,
                dxfattribs={'layer':'M11_2_'+b['kind'].upper()})
        poly.set_xdata('FABIN_CAD',[
            (1000,b['id']),(1000,b['template_id']),
            (1000,b['level_id']),(1000,'SYNTHETIC_QA_ONLY')])
    doc.saveas(path)


def build(job_path,repo_root,out):
    target=Path(out)
    check(not target.exists() or (target.is_dir() and not any(target.iterdir())),
          'OUTPUT_MUST_BE_EMPTY')
    model=load_multilevel(job_path,repo_root)
    state=model['baseline'];target.mkdir(parents=True,exist_ok=True)
    old_boxes=source_geometry(model['old']['instances'],model['old']['templates'])
    new_boxes=source_geometry(model['job']['instances'],model['templates'])
    all_boxes=old_boxes+new_boxes
    by_id={b['id']:b for b in all_boxes}
    shapes={name:shape_instance(box) for name,box in by_id.items()}
    contacts=verify_contacts(model['contacts'],by_id,shapes)
    exact=exact_assembly_section(state,by_id,shapes,model['job']['section'])
    export_ifc(state,old_boxes,new_boxes,model['levels'],target/'assembly.ifc')
    export_step(state,shapes,target/'assembly.step')
    export_dxf(state,old_boxes,new_boxes,target/'assembly.dxf')
    plan=assembly_plan(state,old_boxes)
    check(plan.endswith('</svg>'),'BASE_PLAN_INVALID')
    overlay=[]
    for b in new_boxes:
        vertices=' '.join(f'{x:.6f},{y:.6f}' for x,y in xy_polygon(b))
        overlay.append(f'<polygon points="{vertices}" fill="none" '
                       f'stroke="#a63b68" stroke-width="25"/>')
        overlay.append(f'<text x="{b["x_mm"]}" y="{b["y_mm"]}" '
                       f'font-size="125">{html.escape(b["id"])}</text>')
    plan=plan[:-6]+''.join(overlay)+'</svg>'
    (target/'plan.svg').write_text(plan,encoding='utf8')
    (target/'section.json').write_bytes(canonical(exact))
    (target/'section.svg').write_text(section_svg(exact),encoding='utf8')
    evidence={'schema':'fabin-cad://surface-contact-proof/0.2',
              'contacts':contacts,'source':'SYNTHETIC_QA_ONLY',
              'native_distance_check':True,'planar_patch_check':True,
              'structural_load_path_verified':False}
    (target/'contacts.json').write_bytes(canonical(evidence))
    verified_links=[{'from_id':x['component_a'],
                     'relation':'GEOMETRIC_SURFACE_CONTACT',
                     'to_id':x['component_b']} for x in contacts]
    lineage=sorted(model['edges']+verified_links,
                   key=lambda x:(x['from_id'],x['relation'],x['to_id']))
    graph={'schema':'fabin-cad://assembly-identity-graph/0.2',
           'assembly_id':model['job']['assembly_id'],
           'extends_assembly_id':model['old']['job']['assembly_id'],
           'project_id':model['job']['project_id'],
           'edges':lineage, 'surface_contact_evidence':contacts,
           'structural_connectivity_verified':False}
    (target/'assembly-graph.json').write_bytes(canonical(graph))
    page=('<html lang="en"><meta charset="utf-8"><title>M11.2 Native assembly</title>'
          '<meta name="viewport" content="width=device-width,initial-scale=1">'
          '<h1>M11.2 Two-level rotated synthetic assembly</h1>'
          '<p>Geometric surface contacts only; not structurally approved.</p>'
          '<h2>Plan</h2>'+plan+'<h2>Exact full assembly section</h2>'+
          section_svg(exact)+'</html>')
    (target/'index.html').write_text(page,encoding='utf8')
    names=['assembly.ifc','assembly.step','assembly.dxf','plan.svg',
           'section.json','section.svg','contacts.json',
           'assembly-graph.json','index.html']
    outputs=[{'name':name,'bytes':(target/name).stat().st_size,
              'sha256':hashlib.sha256((target/name).read_bytes()).hexdigest()}
             for name in names]
    manifest={'schema':RESULT_SCHEMA,'status':'SYNTHETIC_QA_ONLY',
              'project_id':model['job']['project_id'],
              'assembly_id':model['job']['assembly_id'],
              'job_sha256':model['job_sha256'],
              'base_assembly_sha256':model['base_sha256'],
              'component_instances':len(all_boxes),
              'levels':len(model['levels']),
              'rotated_components':sum(b['yaw_deg']!=0 for b in all_boxes),
              'contacts_verified':len(contacts),
              'lineage_edges':len(lineage),
              'section_includes_new_components':True,
              'section_algorithm':'OCP_BREP_SECTION_EXACT_LINEAR_EDGES',
              'engineering_approval':'HOLD','quantity_takeoff':'BLOCKED',
              'private_execution_enabled':False,
              'structural_design_verified':False,'release_authorized':False,
              'outputs':outputs}
    (target/'manifest.json').write_bytes(canonical(manifest))
    return manifest
