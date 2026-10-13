"""M10.2 native joined wall solids and exact OpenCascade section traces.

The section is obtained from BRepAlgoAPI_Section against a gp_Pln:
no sampled mesh, artificial thickness, or analytical rectangle substitutes.
"""
from __future__ import annotations
import hashlib
import html
import json
import math
from pathlib import Path
from .design_job import canonical
from .angled_network import load_network
from .oriented_job import check, footprint, world
from .oriented_executor import export_ifc, export_step, fuse_wall_network


def _hash(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def exact_section_edges(state):
    """OCC exact edge endpoints in the vertical plane orthogonal to host axis.

    For current straight/extruded test shapes every resulting edge is linear;
    reject rather than approximating a future spline or curved surface.
    """
    from OCP.BRepAlgoAPI import BRepAlgoAPI_Section
    from OCP.BRepAdaptor import BRepAdaptor_Curve
    from OCP.GeomAbs import GeomAbs_Line
    from OCP.TopAbs import TopAbs_EDGE
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopoDS import TopoDS
    from OCP.gp import gp_Dir, gp_Pln, gp_Pnt

    section = state["section"]
    host = state["by_id"][section["host_wall_id"]]
    c, s = math.cos(math.radians(host["yaw_deg"])), math.sin(math.radians(host["yaw_deg"]))
    x, y = world(host, section["offset_mm"], host["width_mm"] / 2)
    plane = gp_Pln(gp_Pnt(x, y, 0), gp_Dir(c, s, 0))
    op = BRepAlgoAPI_Section(fuse_wall_network(state), plane, False)
    op.ComputePCurveOn1(False)
    op.Approximation(False)
    op.Build()
    check(op.IsDone() and not op.Shape().IsNull(), "EXACT_SECTION_BOOLEAN_FAILED")
    section_shape = op.Shape()
    explorer = TopExp_Explorer(section_shape, TopAbs_EDGE)
    lines = []
    while explorer.More():
        edge_cast = getattr(TopoDS, "Edge_s", None) or getattr(TopoDS, "Edge", None)
        check(edge_cast is not None, "SECTION_EDGE_CAST_UNSUPPORTED")
        edge = edge_cast(explorer.Current())
        curve = BRepAdaptor_Curve(edge)
        check(curve.GetType() == GeomAbs_Line, "SECTION_NONLINEAR_UNSUPPORTED")
        lo, hi = curve.FirstParameter(), curve.LastParameter()
        check(math.isfinite(lo) and math.isfinite(hi), "SECTION_UNBOUNDED")
        p, q = curve.Value(lo), curve.Value(hi)
        values = []
        for point in (p, q):
            xworld, yworld, zworld = point.X(), point.Y(), point.Z()
            # Section horizontal coordinate measures offset from wall CENTERLINE.
            horizontal = -s*(xworld-x) + c*(yworld-y)
            normal_distance = c*(xworld-x) + s*(yworld-y)
            check(abs(normal_distance) < 0.005 and math.isfinite(zworld),
                  "SECTION_PROJECTION_INVALID")
            values.append([round(horizontal, 7), round(zworld, 7)])
        if math.dist(values[0], values[1]) > 1e-6:
            a, b = sorted(values)
            lines.append([a, b])
        explorer.Next()
    lines = sorted({json.dumps(line): line for line in lines}.values())
    check(len(lines) >= 4, "SECTION_EMPTY")
    return {
        "schema": "fabin-cad://exact-brep-section/0.1",
        "source_id": section["id"], "host_wall_id": host["id"],
        "plane_point_mm": [round(x, 7), round(y, 7), 0],
        "plane_normal": [round(c, 10), round(s, 10), 0],
        "plane_offset_mm": section["offset_mm"],
        "coordinates": "wall-centered horizontal offset in mm, world Z in mm",
        "algorithm": "OPENCASCADE_BREP_SECTION_EXACT_LINEAR_EDGES",
        "edges": lines,
        "engineering_approval": "HOLD",
    }


def section_svg(section):
    points = [pt for edge in section["edges"] for pt in edge]
    xs = [p[0] for p in points]; zs = [p[1] for p in points]
    minx, maxx, minz, maxz = min(xs)-180, max(xs)+180, min(zs)-180, max(zs)+180
    geometry = "".join(
        f'<line x1="{a[0]}" y1="{-a[1]}" x2="{b[0]}" y2="{-b[1]}" '
        f'stroke="#26475f" stroke-width="20"/>'
        for a,b in section["edges"])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="{minx} {-maxz} {maxx-minx} {maxz-minz}" '
            f'role="img" aria-label="Exact OCC BRep rotated wall cut section">'
            f'<rect x="{minx}" y="{-maxz}" width="{maxx-minx}" '
            f'height="{maxz-minz}" fill="#f4f9fb"/>{geometry}</svg>')


def plan_svg(state):
    walls = state["walls"]
    shapes = [footprint(w) for w in walls]
    coords = [p for rect in shapes for p in rect]
    xs, ys = [p[0] for p in coords], [p[1] for p in coords]
    left, bottom = min(xs)-500, min(ys)-500
    width, height = max(xs)-min(xs)+1000, max(ys)-min(ys)+1000
    lines = []
    for wall, points in zip(walls, shapes):
        poly=" ".join(f"{a:.6f},{b:.6f}" for a,b in points)
        lines.append(f'<polygon points="{poly}" fill="#6d96ad" '
                     f'stroke="#224254" stroke-width="15"/>')
        mx, my = world(wall, wall["length_mm"]/2, wall["width_mm"]/2)
        lines.append(f'<text x="{mx:.3f}" y="{my:.3f}" '
                     f'font-size="160" text-anchor="middle">{html.escape(wall["id"])}</text>')
    for o in state["openings"]:
        host=state["by_id"][o["host_id"]]
        x1,y1=world(host,o["offset_mm"],-25)
        x2,y2=world(host,o["offset_mm"]+o["width_mm"],-25)
        lines.append(f'<line x1="{x1:.3f}" y1="{y1:.3f}" '
                     f'x2="{x2:.3f}" y2="{y2:.3f}" stroke="#bb2c56" '
                     f'stroke-width="55" stroke-dasharray="80,80"/>')
    for joint in state["joints"]:
        wall=state["by_id"][joint["wall_a"]]
        x,y=world(wall,joint["position_a_mm"],wall["width_mm"]/2)
        lines.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="65" '
                     f'fill="#f0a02f" stroke="#223f53" stroke-width="12"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{left} '
            f'{bottom} {width} {height}" role="img" '
            f'aria-label="Arbitrary angle and T junction synthetic floor plan">'
            f'<rect x="{left}" y="{bottom}" width="{width}" '
            f'height="{height}" fill="#f5fafc"/>{"".join(lines)}</svg>')


def export_dxf(state, path):
    import ezdxf
    doc=ezdxf.new("R2013"); doc.units=4
    for name,color in (("M10_2_WALL",7),("M10_2_OPENING",6),("M10_2_JOINT",3)):
        doc.layers.new(name,dxfattribs={"color":color})
    doc.appids.new("FABIN_CAD")
    ms=doc.modelspace()
    for wall in state["walls"]:
        ent=ms.add_lwpolyline(footprint(wall),close=True,
                              dxfattribs={"layer":"M10_2_WALL"})
        ent.set_xdata("FABIN_CAD",[(1000,wall["id"]),
                    (1000,"SOURCE_CENTERLINE_YAW="+str(wall["yaw_deg"])),
                    (1000,"SYNTHETIC_QA_ONLY")])
    for item in state["openings"]:
        host=state["by_id"][item["host_id"]]
        p=world(host,item["offset_mm"],-12)
        q=world(host,item["offset_mm"]+item["width_mm"],-12)
        ent=ms.add_line(p,q,dxfattribs={"layer":"M10_2_OPENING"})
        ent.set_xdata("FABIN_CAD",[(1000,item["id"]),
                      (1000,item["host_id"]),(1000,"ANNOTATION_NOT_BOOLEAN")])
    for joint in state["joints"]:
        wall=state["by_id"][joint["wall_a"]]
        pos=world(wall,joint["position_a_mm"],wall["width_mm"]/2)
        ent=ms.add_point(pos,dxfattribs={"layer":"M10_2_JOINT"})
        ent.set_xdata("FABIN_CAD",[(1000,joint["id"]),
                      (1000,joint["wall_a"]),(1000,joint["wall_b"])])
    doc.saveas(str(path))
    return {"format":"DXF_ROTATED_NETWORK","engine":"ezdxf",
            "walls":len(state["walls"]), "joints":len(state["joints"]),
            "opening_display":"ANNOTATION_NOT_BOOLEAN"}


def build(source_path,repo_root,out):
    target=Path(out)
    check(not target.exists() or
          (target.is_dir() and not any(target.iterdir())),
          "OUTPUT_MUST_BE_EMPTY")
    state=load_network(source_path,repo_root)
    target.mkdir(parents=True,exist_ok=True)
    outputs=[]
    for name,method in (("design.ifc",export_ifc),
                        ("design.step",export_step),
                        ("design.dxf",export_dxf)):
        file=target/name
        attrs=method(state,file)
        check(file.is_file() and file.stat().st_size>100,"EXPORT_EMPTY")
        outputs.append({**attrs,"name":name,
                        "sha256":_hash(file),"bytes":file.stat().st_size})
    sec=exact_section_edges(state)
    (target/"section.json").write_bytes(canonical(sec))
    (target/"section.svg").write_text(section_svg(sec),encoding="utf-8")
    (target/"plan.svg").write_text(plan_svg(state),encoding="utf-8")
    page=('<html lang="en"><meta charset="utf-8"><meta name="viewport" '
          'content="width=device-width,initial-scale=1">'
          '<title>M10.2 native exact section — synthetic QA only</title>'
          '<style>body{font:16px system-ui;max-width:1060px;margin:auto;'
          'padding:20px;background:#edf4f9;color:#193f50}'
          'figure{background:#fff;padding:15px;border-radius:12px}'
          'svg{max-width:100%;height:auto}</style>'
          '<h1>M10.2 Arbitrary yaw, T-junction and exact section</h1>'
          '<p>Unapproved synthetic QA; not a survey, not issued for construction, '
          'no quantity takeoff, no private client records.</p><figure><h2>Plan</h2>'
          +plan_svg(state)+'</figure><figure><h2>Exact BRep section</h2>'
          +section_svg(sec)+'</figure></html>')
    (target/"index.html").write_text(page,encoding="utf-8")
    for name in ("section.json","section.svg","plan.svg","index.html"):
        file=target/name
        outputs.append({"name":name,"sha256":_hash(file),
                        "bytes":file.stat().st_size,
                        "format":("EXACT_BREP_SECTION_JSON" if name=="section.json"
                                  else "SVG_REVIEW" if name.endswith("svg")
                                  else "HTML_STATIC")})
    manifest={
      "schema":"fabin-cad://oriented-design-result/0.2",
      "project_id":state["source"]["project_id"],"status":"SYNTHETIC_QA_ONLY",
      "source_sha256":state["source_sha256"],
      "walls":len(state["walls"]),"openings":len(state["openings"]),
      "joints":len(state["joints"]),"section_edges":len(sec["edges"]),
      "section_method":"OPENCASCADE_BREP_SECTION_EXACT_LINEAR_EDGES",
      "engineering_approval":"HOLD","quantity_takeoff":"BLOCKED",
      "private_execution_enabled":False,"release_authorized":False,
      "ai_geometry_generation":"NONE","outputs":outputs,
    }
    (target/"manifest.json").write_bytes(canonical(manifest))
    return manifest
