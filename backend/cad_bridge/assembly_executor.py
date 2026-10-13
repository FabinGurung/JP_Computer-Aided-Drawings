"""M11.1 integrated native assembly from pinned M10.2 source + typed instances.

Outputs are public synthetic QA only, not structural assemblies, load paths,
design checks, BOQ/QTO, certified shop models, or client deliverables.
"""
from __future__ import annotations

import hashlib
import html
from pathlib import Path

from .assembly_job import read_assembly, RESULT_SCHEMA
from .angled_executor import (
    exact_section_edges, export_dxf as export_wall_dxf,
    plan_svg as baseline_plan_svg, section_svg,
)
from .design_job import canonical
from .oriented_executor import export_ifc as export_wall_ifc, fuse_wall_network
from .oriented_job import check

IFC_CLASSES = {
    "footing": "IfcFooting",
    "column": "IfcColumn",
    "beam": "IfcBeam",
    "slab": "IfcSlab",
}


def source_geometry(record, templates):
    """Resolve template/instance FKs into explicit boxes, in source mm."""
    result = []
    for item in record:
        temp = templates[item["template_id"]]
        result.append({
            **item,
            "kind": temp["kind"],
            "length_mm": temp["length_mm"],
            "width_mm": temp["width_mm"],
            "height_mm": temp["height_mm"],
        })
    return result


def export_ifc(state, boxes, path):
    """Use verified wall/opening IFC, then add native typed IFC products."""
    import uuid
    import numpy as np
    import ifcopenshell
    import ifcopenshell.api.geometry
    import ifcopenshell.api.root
    import ifcopenshell.api.spatial

    export_wall_ifc(state, path)
    f = ifcopenshell.open(str(path))
    bodies = f.by_type("IfcGeometricRepresentationSubContext")
    body = next((c for c in bodies if c.ContextIdentifier == "Body"), None)
    check(body is not None, "IFC_BODY_MISSING")
    storeys = {x.Name: x for x in f.by_type("IfcBuildingStorey")}
    for b in boxes:
        obj = ifcopenshell.api.root.create_entity(
            f, ifc_class=IFC_CLASSES[b["kind"]], name=b["id"])
        obj.Tag = b["id"]
        obj.GlobalId = ifcopenshell.guid.compress(
            uuid.uuid5(uuid.NAMESPACE_URL,
                state["source"]["project_id"] + "/M11/" + b["id"]).hex)
        obj.Description = (
            "SYNTHETIC_QA_ONLY | TEMPLATE=" + b["template_id"] +
            " | GROUP=" + b["group_id"] + " | NOT_ISSUED_FOR_CONSTRUCTION")
        profile = f.create_entity(
            "IfcRectangleProfileDef", ProfileType="AREA",
            XDim=b["length_mm"] / 1000, YDim=b["width_mm"] / 1000)
        rep = ifcopenshell.api.geometry.add_profile_representation(
            f, context=body, profile=profile, depth=b["height_mm"]/1000)
        ifcopenshell.api.geometry.assign_representation(
            f, product=obj, representation=rep)
        matrix = np.eye(4)
        matrix[:3, 3] = [
            (b["x_mm"] + b["length_mm"]/2)/1000,
            (b["y_mm"] + b["width_mm"]/2)/1000,
            b["z_mm"]/1000,
        ]
        ifcopenshell.api.geometry.edit_object_placement(
            f, product=obj, matrix=matrix, is_si=True)
        ifcopenshell.api.spatial.assign_container(
            f, relating_structure=storeys[b["level_id"]], products=[obj])
    f.write(str(path))
    return {
        "engine": "IfcOpenShell",
        "format": "IFC4_TYPED_SYNTHETIC_ASSEMBLY",
        "baseline_walls": len(state["walls"]),
        "opening_count": len(state["openings"]),
        "component_instances": len(boxes),
    }


def make_step_compound(state, boxes):
    """One exact fused wall BRep + one independent, unfused solid per component."""
    from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox
    from OCP.BRep import BRep_Builder
    from OCP.TopoDS import TopoDS_Compound
    from OCP.gp import gp_Pnt
    compound = TopoDS_Compound()
    builder = BRep_Builder()
    builder.MakeCompound(compound)
    builder.Add(compound, fuse_wall_network(state))
    for b in boxes:
        start = gp_Pnt(b["x_mm"], b["y_mm"], b["z_mm"])
        end = gp_Pnt(
            b["x_mm"] + b["length_mm"],
            b["y_mm"] + b["width_mm"],
            b["z_mm"] + b["height_mm"],
        )
        solid = BRepPrimAPI_MakeBox(start, end).Shape()
        check(not solid.IsNull(), "COMPONENT_BREP_INVALID")
        builder.Add(compound, solid)
    return compound


def export_step(state, boxes, path):
    from OCP.STEPControl import STEPControl_Writer, STEPControl_AsIs
    from OCP.IFSelect import IFSelect_RetDone
    writer = STEPControl_Writer()
    check(writer.Transfer(make_step_compound(state, boxes), STEPControl_AsIs)
          == IFSelect_RetDone, "STEP_TRANSFER_FAILED")
    check(writer.Write(str(path)) == IFSelect_RetDone, "STEP_WRITE_FAILED")
    return {
        "engine": "OpenCascade/OCP",
        "format": "STEP_ASSEMBLY_UNFUSED_COMPONENTS",
        "baseline_fused_walls": 1,
        "component_solids": len(boxes),
        "nonstructural_connection_claim": False,
    }


def export_dxf(state, boxes, path):
    import ezdxf
    export_wall_dxf(state, path)
    doc = ezdxf.readfile(path)
    doc.appids.get("FABIN_CAD")
    for kind in IFC_CLASSES:
        doc.layers.new("M11_" + kind.upper(),
                       dxfattribs={"color": {"footing":1,"column":3,
                                            "beam":2,"slab":8}[kind]})
    space = doc.modelspace()
    for b in boxes:
        x,y=b["x_mm"],b["y_mm"]
        l,w=b["length_mm"],b["width_mm"]
        entity=space.add_lwpolyline(
            [(x,y),(x+l,y),(x+l,y+w),(x,y+w)],
            close=True, dxfattribs={"layer":"M11_"+b["kind"].upper()})
        entity.set_xdata("FABIN_CAD", [
            (1000,b["id"]), (1000,b["template_id"]),
            (1000,b["group_id"]), (1000,"SYNTHETIC_QA_ONLY"),
        ])
    doc.saveas(path)
    return {
        "engine":"ezdxf","format":"DXF_SYNTHETIC_TYPED_PLAN",
        "baseline_walls":len(state["walls"]),
        "component_footprints":len(boxes),
        "opening_display":"ANNOTATION_NOT_BOOLEAN",
    }


def assembly_plan(state, boxes):
    base = baseline_plan_svg(state)
    sequence = {"slab":0, "footing":1, "beam":2, "column":3}
    shapes=[]
    for b in sorted(boxes, key=lambda b: sequence[b["kind"]]):
        x,y=b["x_mm"],b["y_mm"]
        shapes.append(
            f'<rect x="{x}" y="{y}" width="{b["length_mm"]}" '
            f'height="{b["width_mm"]}" fill="none" '
            f'stroke="#953d71" stroke-width="18" stroke-dasharray="90,50"/>')
        shapes.append(
            f'<text x="{x+30}" y="{y+min(b["width_mm"],300)/2}" '
            f'font-size="140" fill="#67224f">{html.escape(b["id"])}</text>')
    check(base.endswith("</svg>"),"BASELINE_SVG_INVALID")
    return base[:-6] + "".join(shapes) + "</svg>"


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def build_assembly(job_path, root, out):
    target = Path(out)
    check(not target.exists() or
          (target.is_dir() and not any(target.iterdir())),
          "OUTPUT_MUST_BE_EMPTY")
    model = read_assembly(job_path, root)
    target.mkdir(parents=True,exist_ok=True)
    state = model["baseline"]
    boxes = source_geometry(model["instances"], model["templates"])
    records = []
    for name, exporter in (
        ("assembly.ifc",export_ifc),
        ("assembly.step",export_step),
        ("assembly.dxf",export_dxf),
    ):
        path=target/name
        result=exporter(state,boxes,path)
        check(path.is_file() and path.stat().st_size>100,
              "NATIVE_EXPORT_EMPTY")
        records.append({**result,"name":name,"sha256":digest(path),
                        "bytes":path.stat().st_size})
    section=exact_section_edges(state)
    plan=assembly_plan(state,boxes)
    (target/"plan.svg").write_text(plan,encoding="utf8")
    (target/"section.json").write_bytes(canonical(section))
    (target/"section.svg").write_text(section_svg(section),encoding="utf8")
    links={
        "schema":"fabin-cad://assembly-identity-graph/0.1",
        "project_id":model["job"]["project_id"],
        "assembly_id":model["job"]["assembly_id"],
        "baseline_source_sha256":model["source_sha256"],
        "templates": sorted(model["job"]["templates"],key=lambda x:x["id"]),
        "groups": sorted(model["groups"],key=lambda x:x["id"]),
        "instances": sorted(model["instances"],key=lambda x:x["id"]),
        "edges":model["edges"],
        "engineering_approval":"HOLD",
        "source_classification":"SYNTHETIC_QA_ONLY",
        "structural_connections_asserted":False,
    }
    (target/"assembly-graph.json").write_bytes(canonical(links))
    page=('<html lang="en"><meta charset="utf-8"><meta name="viewport" '
          'content="width=device-width,initial-scale=1">'
          '<title>CAD M11.1 Reusable synthetic assembly</title>'
          '<style>body{font:16px system-ui;max-width:980px;margin:auto;'
          'padding:22px;background:#edf5fa;color:#16394f}'
          'figure{background:white;padding:18px;border-radius:12px}'
          'svg{max-width:100%;height:auto}</style>'
          '<h1>M11.1 Reusable component assembly · synthetic QA</h1>'
          '<p>Templates are reused by independent positioned instances.'
          ' This is not a structural design, quantity takeoff or '
          'approved construction model.</p><figure><h2>Plan and components</h2>'
          +plan+'</figure><figure><h2>Baseline exact native section</h2>'
          +section_svg(section)+'</figure></html>')
    (target/"index.html").write_text(page,encoding="utf8")
    for name in ("plan.svg","section.json","section.svg",
                 "assembly-graph.json","index.html"):
        path=target/name
        records.append({
            "name":name,"format":("JSON" if name.endswith(".json")
                                  else "SVG_REVIEW" if name.endswith(".svg")
                                  else "HTML_STATIC"),
            "sha256":digest(path),"bytes":path.stat().st_size,
        })
    result={
        "schema":RESULT_SCHEMA,
        "status":"SYNTHETIC_QA_ONLY",
        "project_id":model["job"]["project_id"],
        "assembly_id":model["job"]["assembly_id"],
        "job_sha256":model["job_sha256"],
        "source_sha256":model["source_sha256"],
        "source_git_blob_sha1":model["job"]["source"]["git_blob_sha1"],
        "baseline_walls":len(state["walls"]),
        "baseline_openings":len(state["openings"]),
        "component_templates":len(model["templates"]),
        "component_instances":len(boxes),
        "groups":len(model["groups"]),
        "lineage_edges":len(model["edges"]),
        "component_counts":{k:sum(b["kind"]==k for b in boxes)
                            for k in sorted(IFC_CLASSES)},
        "engineering_approval":"HOLD",
        "quantity_takeoff":"BLOCKED",
        "private_execution_enabled":False,
        "release_authorized":False,
        "structural_design_verified":False,
        "ai_geometry_generation":"NONE",
        "outputs":records,
    }
    (target/"manifest.json").write_bytes(canonical(result))
    return result
