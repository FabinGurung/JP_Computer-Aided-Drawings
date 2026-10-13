"""M10.1 bounded oriented wall source; synthetic-only geometric truth.

One explicit coordinate frame in millimetres: walls start at (x,y,z),
run along local +X, have thickness along local +Y, and rotate about +Z.
No private files, client measurements or inferred dimensions are accepted.
"""
from __future__ import annotations
import hashlib
import json
import math
from pathlib import Path
from .design_job import canonical, identity, num

SOURCE_SCHEMA = "fabin-cad://oriented-design-source/0.1"
RESULT_SCHEMA = "fabin-cad://oriented-design-result/0.1"


def check(ok, code):
    if not ok:
        raise ValueError("M10_REJECTED:" + code)


def rotation(yaw):
    angle = math.radians(yaw)
    c, s = math.cos(angle), math.sin(angle)
    return (0 if abs(c) < 1e-12 else c, 0 if abs(s) < 1e-12 else s)


def world(wall, u, v):
    """Transform LOCAL (u,v) to global (x,y) with one reviewed yaw."""
    c, s = rotation(wall["yaw_deg"])
    return (wall["x_mm"] + c*u - s*v, wall["y_mm"] + s*u + c*v)


def endpoint(wall, direction):
    return world(wall, 0 if direction == "START" else wall["length_mm"], 0)


def footprint(wall):
    return [world(wall, u, v) for u, v in (
        (0, 0), (wall["length_mm"], 0),
        (wall["length_mm"], wall["width_mm"]), (0, wall["width_mm"]))]


def load_oriented(source_path, repo_root):
    root = Path(repo_root).resolve()
    source = Path(source_path).resolve()
    permitted = (root / "design_jobs" / "synthetic").resolve()
    check(source.is_relative_to(permitted) and source.is_file(), "PATH_NOT_ALLOWED")
    raw = source.read_bytes()
    check(0 < len(raw) < 100000, "SOURCE_SIZE_INVALID")
    try:
        item = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise ValueError("M10_REJECTED:JSON_INVALID") from None
    check(type(item) is dict and set(item) == {
        "schema", "status", "project_id", "units", "levels",
        "walls", "openings", "joints"}, "SCHEMA_INVALID")
    check(item["schema"] == SOURCE_SCHEMA and item["status"] == "SYNTHETIC_QA_ONLY",
          "AUTHORITY_BLOCKED")
    check(identity(item["project_id"]) and item["units"] == "mm", "PROJECT_UNITS_INVALID")
    levels = item["levels"]
    check(type(levels) is list and 1 <= len(levels) <= 10, "LEVELS_INVALID")
    ids = set()
    level_by_id = {}
    for lev in levels:
        check(type(lev) is dict and set(lev) == {"id", "z_mm"} and
              identity(lev["id"]) and lev["id"] not in level_by_id and
              num(lev["z_mm"]) and abs(lev["z_mm"]) < 100000, "LEVEL_INVALID")
        level_by_id[lev["id"]] = lev["z_mm"]
    walls = item["walls"]
    check(type(walls) is list and 2 <= len(walls) <= 20, "WALLS_INVALID")
    by_id = {}
    for w in walls:
        check(type(w) is dict and set(w) == {
            "id", "level_id", "source_id", "x_mm", "y_mm", "z_mm",
            "length_mm", "width_mm", "height_mm", "yaw_deg"}, "WALL_SCHEMA_INVALID")
        check(identity(w["id"]) and w["id"] not in ids and
              w["level_id"] in level_by_id and w["source_id"] == "SYNTHETIC_SPEC",
              "WALL_IDENTITY_INVALID")
        ids.add(w["id"]); by_id[w["id"]] = w
        check(all(num(w[key]) for key in (
            "x_mm", "y_mm", "z_mm", "length_mm", "width_mm", "height_mm", "yaw_deg")),
              "WALL_NUMBER_INVALID")
        check(all(abs(w[key]) < 1000000 for key in ("x_mm", "y_mm", "z_mm")) and
              1 <= w["length_mm"] <= 100000 and 1 <= w["width_mm"] <= 10000 and
              1 <= w["height_mm"] <= 10000, "WALL_DIMENSIONS_INVALID")
        check(-180 <= w["yaw_deg"] <= 180 and
              abs(w["yaw_deg"] / 90 - round(w["yaw_deg"] / 90)) < 1e-9,
              "YAW_NOT_SUPPORTED")  # bounded first increment; no inferred arbitrary angle
        check(abs(w["z_mm"] - level_by_id[w["level_id"]]) < 1e-8, "WALL_LEVEL_INVALID")
    openings = item["openings"]
    check(type(openings) is list and 1 <= len(openings) <= 40, "OPENINGS_INVALID")
    by_host = {}
    for o in openings:
        check(type(o) is dict and set(o) == {
            "id", "host_id", "source_id", "offset_mm",
            "sill_mm", "width_mm", "height_mm"}, "OPENING_SCHEMA_INVALID")
        check(identity(o["id"]) and o["id"] not in ids and
              o["host_id"] in by_id and o["source_id"] == "SYNTHETIC_SPEC",
              "OPENING_HOST_INVALID")
        ids.add(o["id"])
        check(all(num(o[k]) for k in ("offset_mm", "sill_mm", "width_mm", "height_mm")),
              "OPENING_NUMBER_INVALID")
        host = by_id[o["host_id"]]
        check(o["offset_mm"] > 0 and o["sill_mm"] > 0 and o["width_mm"] > 0 and
              o["height_mm"] > 0 and o["offset_mm"] + o["width_mm"] < host["length_mm"] and
              o["sill_mm"] + o["height_mm"] < host["height_mm"], "OPENING_NOT_CONTAINED")
        box=(o["offset_mm"],o["sill_mm"],o["offset_mm"]+o["width_mm"],o["sill_mm"]+o["height_mm"])
        for prior in by_host.get(o["host_id"], []):
            check(not (box[0]<prior[2] and box[2]>prior[0] and
                       box[1]<prior[3] and box[3]>prior[1]), "OVERLAPPING_OPENINGS")
        by_host.setdefault(o["host_id"],[]).append(box)
    joints = item["joints"]
    check(type(joints) is list and 1 <= len(joints) <= 30, "JOINTS_INVALID")
    used = set()
    adjacency = {w["id"]: set() for w in walls}
    for j in joints:
        check(type(j) is dict and set(j)=={
            "id","wall_a","endpoint_a","wall_b","endpoint_b"}, "JOINT_SCHEMA_INVALID")
        check(identity(j["id"]) and j["id"] not in ids and
              j["wall_a"] in by_id and j["wall_b"] in by_id and
              j["wall_a"] != j["wall_b"] and
              j["endpoint_a"] in ("START","END") and
              j["endpoint_b"] in ("START","END"), "JOINT_IDENTITY_INVALID")
        ids.add(j["id"])
        for k in ("a","b"):
            pair=(j["wall_"+k],j["endpoint_"+k])
            check(pair not in used, "JOINT_ENDPOINT_REUSED")
            used.add(pair)
        p=endpoint(by_id[j["wall_a"]],j["endpoint_a"])
        q=endpoint(by_id[j["wall_b"]],j["endpoint_b"])
        check(math.dist(p,q)<=0.001 and
              abs(by_id[j["wall_a"]]["z_mm"]-by_id[j["wall_b"]]["z_mm"])<0.001 and
              abs(by_id[j["wall_a"]]["height_mm"]-by_id[j["wall_b"]]["height_mm"])<0.001,
              "JOINT_GEOMETRY_MISMATCH")
        adjacency[j["wall_a"]].add(j["wall_b"])
        adjacency[j["wall_b"]].add(j["wall_a"])
    reachable={walls[0]["id"]}
    while True:
        expanded=reachable | set().union(*(adjacency[x] for x in reachable))
        if expanded == reachable: break
        reachable=expanded
    check(len(reachable)==len(walls), "DISCONNECTED_WALL_GRAPH")
    return {"source":item,"source_sha256":hashlib.sha256(raw).hexdigest(),
            "walls":walls,"openings":openings,"joints":joints,"by_id":by_id,
            "levels":level_by_id,"state":"SYNTHETIC_QA_ONLY"}
