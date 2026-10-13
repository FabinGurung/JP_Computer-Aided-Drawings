"""M10.1 native rotated-wall geometry: IFC4 + OCCT fused STEP + ezdxf.

Every output uses the same source-owned local-to-world transform. No client
inputs or CAD automation are executed outside allowlisted synthetic fixtures.
"""
from __future__ import annotations
import hashlib
import html
import math
import uuid
from pathlib import Path
from .design_job import canonical
from .oriented_job import check, footprint, load_oriented, rotation, world, RESULT_SCHEMA


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _guid(project, entity):
    import ifcopenshell
    return ifcopenshell.guid.compress(
        uuid.uuid5(uuid.NAMESPACE_URL, project + "/M10/" + entity).hex)


def _placement(wall, length, thickness, offset=0, sill=0):
    """Centered IFC profile, local XY rotation, global world center, z offset."""
    import numpy as np
    matrix = np.eye(4)
    c, s = rotation(wall["yaw_deg"])
    matrix[0, 0] = c; matrix[0, 1] = -s
    matrix[1, 0] = s; matrix[1, 1] = c
    xx, yy = world(wall, offset + length / 2, thickness / 2)
    matrix[0, 3] = xx / 1000
    matrix[1, 3] = yy / 1000
    matrix[2, 3] = (wall["z_mm"] + sill) / 1000
    return matrix


def export_ifc(state, filename):
    import ifcopenshell
    import ifcopenshell.api.aggregate
    import ifcopenshell.api.context
    import ifcopenshell.api.geometry
    import ifcopenshell.api.project
    import ifcopenshell.api.root
    import ifcopenshell.api.spatial
    import ifcopenshell.api.unit
    f = ifcopenshell.api.project.create_file(version="IFC4")
    project_id = state["source"]["project_id"]
    project = ifcopenshell.api.root.create_entity(
        f, ifc_class="IfcProject", name=project_id + " SYNTHETIC M10")
    ifcopenshell.api.unit.assign_unit(
        f, units=[ifcopenshell.api.unit.add_si_unit(f, unit_type="LENGTHUNIT")])
    model = ifcopenshell.api.context.add_context(f, context_type="Model")
    body = ifcopenshell.api.context.add_context(
        f, context_type="Model", context_identifier="Body",
        target_view="MODEL_VIEW", parent=model)
    site = ifcopenshell.api.root.create_entity(
        f, ifc_class="IfcSite", name="Synthetic QA only")
    building = ifcopenshell.api.root.create_entity(
        f, ifc_class="IfcBuilding", name="Rotated connected synthetic walls")
    ifcopenshell.api.aggregate.assign_object(f, relating_object=project, products=[site])
    ifcopenshell.api.aggregate.assign_object(f, relating_object=site, products=[building])
    storeys = {}
    for level, z in state["levels"].items():
        st = ifcopenshell.api.root.create_entity(f, ifc_class="IfcBuildingStorey", name=level)
        st.Elevation = z / 1000
        ifcopenshell.api.aggregate.assign_object(f, relating_object=building, products=[st])
        storeys[level] = st
    created = {}

    def swept(product, wall, length, width, height, *, offset=0, sill=0):
        profile = f.create_entity(
            "IfcRectangleProfileDef", ProfileType="AREA",
            XDim=length / 1000, YDim=width / 1000)
        shape = ifcopenshell.api.geometry.add_profile_representation(
            f, context=body, profile=profile, depth=height / 1000)
        ifcopenshell.api.geometry.assign_representation(
            f, product=product, representation=shape)
        ifcopenshell.api.geometry.edit_object_placement(
            f, product=product,
            matrix=_placement(wall, length, width, offset, sill), is_si=True)

    for wall in state["walls"]:
        obj = ifcopenshell.api.root.create_entity(
            f, ifc_class="IfcWall", name=wall["id"])
        obj.GlobalId = _guid(project_id, wall["id"])
        obj.Tag = wall["id"]
        obj.Description = ("SYNTHETIC_QA_ONLY | ROTATED_M10 | "
                           "NOT_ISSUED_FOR_CONSTRUCTION")
        swept(obj, wall, wall["length_mm"], wall["width_mm"], wall["height_mm"])
        ifcopenshell.api.spatial.assign_container(
            f, relating_structure=storeys[wall["level_id"]], products=[obj])
        created[wall["id"]] = obj
    for o in state["openings"]:
        host = state["by_id"][o["host_id"]]
        obj = ifcopenshell.api.root.create_entity(
            f, ifc_class="IfcOpeningElement", name=o["id"])
        obj.GlobalId = _guid(project_id, o["id"]); obj.Tag = o["id"]
        obj.Description = "SYNTHETIC_QA_ONLY | ROTATED_WALL_VOID"
        # Openings extend 2mm each side through wall thickness.
        # Use a normal-offset placement computed from the host-local +Y axis.
        swept(obj, host, o["width_mm"], host["width_mm"] + 4,
              o["height_mm"], offset=o["offset_mm"], sill=o["sill_mm"])
        mat = _placement(host, o["width_mm"], host["width_mm"],
                         o["offset_mm"], o["sill_mm"])
        ifcopenshell.api.geometry.edit_object_placement(
            f, product=obj, matrix=mat, is_si=True)
        f.create_entity("IfcRelVoidsElement",
                        GlobalId=_guid(project_id, "VOID-" + o["id"]),
                        RelatingBuildingElement=created[o["host_id"]],
                        RelatedOpeningElement=obj)
    f.write(str(filename))
    return {"engine": "IfcOpenShell", "format": "IFC4_ROTATED_WALLS",
            "walls": len(state["walls"]), "openings": len(state["openings"])}


def _occt_piece(wall, bounds):
    from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox
    from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
    from OCP.gp import gp_Pnt, gp_Trsf, gp_Ax1, gp_Dir, gp_Vec
    u0, v0, z0, u1, v1, z1 = bounds
    box = BRepPrimAPI_MakeBox(
        gp_Pnt(u0, v0, z0), gp_Pnt(u1, v1, z1)).Shape()
    tr = gp_Trsf()
    tr.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)),
                   math.radians(wall["yaw_deg"]))
    tr.SetTranslationPart(gp_Vec(wall["x_mm"], wall["y_mm"], wall["z_mm"]))
    return BRepBuilderAPI_Transform(box, tr, True).Shape()


def make_solids(state):
    """One cut solid per wall with true 3D local-coordinate openings."""
    from OCP.BRepAlgoAPI import BRepAlgoAPI_Cut
    result = []
    for wall in state["walls"]:
        shape = _occt_piece(
            wall, (0, 0, 0, wall["length_mm"],
                   wall["width_mm"], wall["height_mm"]))
        for opening in state["openings"]:
            if opening["host_id"] != wall["id"]:
                continue
            cutter = _occt_piece(
                wall, (opening["offset_mm"], -2, opening["sill_mm"],
                       opening["offset_mm"] + opening["width_mm"],
                       wall["width_mm"] + 2,
                       opening["sill_mm"] + opening["height_mm"]))
            cut = BRepAlgoAPI_Cut(shape, cutter)
            cut.Build()
            check(cut.IsDone() and not cut.Shape().IsNull(), "OPENING_BOOLEAN_FAILED")
            shape = cut.Shape()
        result.append(shape)
    return result


def fuse_wall_network(state):
    """Explicitly unite connected wall solids; do not double-count corner overlap."""
    from OCP.BRepAlgoAPI import BRepAlgoAPI_Fuse
    solids = make_solids(state)
    assembled = solids[0]
    for nxt in solids[1:]:
        joined = BRepAlgoAPI_Fuse(assembled, nxt)
        joined.Build()
        check(joined.IsDone() and not joined.Shape().IsNull(), "WALL_FUSE_FAILED")
        assembled = joined.Shape()
    return assembled


def export_step(state, filename):
    from OCP.STEPControl import STEPControl_Writer, STEPControl_AsIs
    from OCP.IFSelect import IFSelect_RetDone
    writer = STEPControl_Writer()
    check(writer.Transfer(fuse_wall_network(state), STEPControl_AsIs)
          == IFSelect_RetDone, "STEP_TRANSFER_FAILED")
    check(writer.Write(str(filename)) == IFSelect_RetDone, "STEP_WRITE_FAILED")
    return {"engine": "OpenCascade/OCP", "format": "STEP_FUSED_ROTATED_WALL_NETWORK",
            "walls": len(state["walls"]), "openings": len(state["openings"])}


def export_dxf(state, filename):
    import ezdxf
    doc = ezdxf.new("R2013"); doc.units = 4
    doc.layers.new("M10_WALL", dxfattribs={"color": 7})
    doc.layers.new("M10_OPENING", dxfattribs={"color": 6})
    doc.layers.new("M10_JOINT", dxfattribs={"color": 3})
    doc.appids.new("FABIN_CAD")
    ms = doc.modelspace()
    for w in state["walls"]:
        shape = ms.add_lwpolyline(footprint(w), close=True,
                                dxfattribs={"layer": "M10_WALL"})
        shape.set_xdata("FABIN_CAD", [
            (1000, w["id"]), (1000, "SYNTHETIC_QA_ONLY"),
            (1000, "YAW_DEG=" + str(w["yaw_deg"]))])
    for o in state["openings"]:
        w = state["by_id"][o["host_id"]]
        p = world(w, o["offset_mm"], -10)
        q = world(w, o["offset_mm"] + o["width_mm"], -10)
        obj = ms.add_line(p, q, dxfattribs={"layer": "M10_OPENING"})
        obj.set_xdata("FABIN_CAD", [
            (1000, o["id"]), (1000, o["host_id"]),
            (1000, "PLAN_MARKER_NOT_SUBTRACTED")])
    for j in state["joints"]:
        w = state["by_id"][j["wall_a"]]
        u = 0 if j["endpoint_a"] == "START" else w["length_mm"]
        point = world(w, u, 0)
        marker = ms.add_point(point, dxfattribs={"layer": "M10_JOINT"})
        marker.set_xdata("FABIN_CAD", [
            (1000, j["id"]), (1000, j["wall_a"]),
            (1000, j["wall_b"])])
    doc.saveas(str(filename))
    return {"engine": "ezdxf", "format": "DXF_ROTATED_PLAN",
            "walls": len(state["walls"]), "joints": len(state["joints"]),
            "opening_display": "ANNOTATION_ONLY"}


def svg_plan(state):
    footprints = [footprint(w) for w in state["walls"]]
    coords = [point for corners in footprints for point in corners]
    xs = [p[0] for p in coords]; ys = [p[1] for p in coords]
    x0, y0 = min(xs) - 650, min(ys) - 650
    width, height = max(xs) - min(xs) + 1300, max(ys) - min(ys) + 1300
    parts = []
    for w, polygon in zip(state["walls"], footprints):
        points = " ".join(f"{x:.6f},{y:.6f}" for x, y in polygon)
        middle = world(w, w["length_mm"] / 2, w["width_mm"] / 2)
        parts.append(
            f'<polygon points="{points}" fill="#446a89" stroke="#173a4c" '
            f'stroke-width="20" fill-opacity=".7"/>'
            f'<text x="{middle[0]:.3f}" y="{middle[1]:.3f}" '
            f'font-size="180" text-anchor="middle">{html.escape(w["id"])}</text>')
    for o in state["openings"]:
        host = state["by_id"][o["host_id"]]
        a = world(host, o["offset_mm"], -25)
        b = world(host, o["offset_mm"] + o["width_mm"], -25)
        parts.append(
            f'<line x1="{a[0]:.3f}" y1="{a[1]:.3f}" '
            f'x2="{b[0]:.3f}" y2="{b[1]:.3f}" '
            f'stroke="#b61e53" stroke-width="65" stroke-dasharray="100,80"/>')
    for j in state["joints"]:
        host = state["by_id"][j["wall_a"]]
        u = 0 if j["endpoint_a"] == "START" else host["length_mm"]
        p = world(host, u, 0)
        parts.append(
            f'<circle cx="{p[0]:.3f}" cy="{p[1]:.3f}" r="90" '
            f'fill="#f4a333" stroke="#12364b" stroke-width="22"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="{x0} {y0} {width} {height}" role="img" '
            f'aria-label="Synthetic rotated-wall connected plan">'
            f'<rect x="{x0}" y="{y0}" width="{width}" height="{height}" fill="#f5fafc"/>'
            f'{"".join(parts)}</svg>')


def build(source_path, repo_root, output):
    target = Path(output)
    check(not target.exists() or
          (target.is_dir() and not any(target.iterdir())),
          "OUTPUT_MUST_BE_EMPTY")
    state = load_oriented(source_path, repo_root)
    target.mkdir(parents=True, exist_ok=True)
    records = []
    for name, exporter in (
        ("design.ifc", export_ifc),
        ("design.step", export_step),
        ("design.dxf", export_dxf),
    ):
        path = target / name
        record = exporter(state, path)
        check(path.is_file() and path.stat().st_size > 100, "EXPORT_EMPTY")
        records.append({**record, "name": name,
                        "sha256": digest(path), "bytes": path.stat().st_size})
    plan = svg_plan(state)
    (target / "plan.svg").write_text(plan, encoding="utf8")
    records.append({"name": "plan.svg", "format": "SVG_ORIENTED_PLAN",
                    "sha256": digest(target / "plan.svg"),
                    "bytes": (target / "plan.svg").stat().st_size})
    # Rotation/junction proof is a native geometry acceptance, NOT an accurate
    # section drawing or an engineering calculation.
    graph = {
        "schema": "fabin-cad://wall-network/0.1",
        "project_id": state["source"]["project_id"], "synthetic": True,
        "walls": [{"id": w["id"], "yaw_deg": w["yaw_deg"],
                    "footprint": footprint(w)} for w in state["walls"]],
        "joints": state["joints"],
        "engineering_approval": "HOLD",
    }
    (target / "connectivity.json").write_bytes(canonical(graph))
    records.append({"name": "connectivity.json", "format": "JSON_WALL_NETWORK",
                    "sha256": digest(target / "connectivity.json"),
                    "bytes": (target / "connectivity.json").stat().st_size})
    page = ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>M10 Rotated Wall Synthetic QA</title>'
            '<style>body{max-width:1000px;margin:auto;padding:24px;font:16px system-ui;'
            'background:#eff6fb;color:#14364b}svg{max-width:100%;height:auto}'
            'figure{background:white;border-radius:12px;padding:12px}</style>'
            '<h1>Rotated walls · synthetic geometry QA</h1>'
            '<strong>Not approved for construction or quantity takeoff.</strong>'
            '<p>Three connected walls and one hosted cut-out. DXF plan openings '
            'are annotations; true opening is cut in OpenCascade and IFC.</p>'
            '<figure>' + plan + '</figure></html>')
    (target / "index.html").write_text(page, encoding="utf8")
    records.append({"name": "index.html", "format": "HTML_STATIC",
                    "sha256": digest(target / "index.html"),
                    "bytes": (target / "index.html").stat().st_size})
    manifest = {
        "schema": RESULT_SCHEMA,
        "project_id": state["source"]["project_id"],
        "status": "SYNTHETIC_QA_ONLY",
        "source_sha256": state["source_sha256"],
        "walls": len(state["walls"]), "openings": len(state["openings"]),
        "joints": len(state["joints"]),
        "engineering_approval": "HOLD",
        "quantity_takeoff": "BLOCKED",
        "private_execution_enabled": False,
        "ai_geometry_generation": "NONE",
        "exact_section_export": "NOT_IMPLEMENTED",
        "outputs": records,
    }
    (target / "manifest.json").write_bytes(canonical(manifest))
    return manifest
