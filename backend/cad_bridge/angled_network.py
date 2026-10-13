"""M10.2 arbitrary-yaw synthetic wall networks and exact slice source contract.

Wall origin is a CENTERLINE reference (unlike M10.1's outer-face origin).
This module converts to the existing native engine's outer-face representation,
without altering historical M10.1 data or exports.
"""
from __future__ import annotations
import hashlib
import json
import math
from pathlib import Path
from .design_job import identity, num
from .oriented_job import check, world

SOURCE_SCHEMA = "fabin-cad://oriented-design-source/0.2"


def _keys(obj, expected, error):
    check(type(obj) is dict and set(obj) == set(expected), error)


def _position(wall, along):
    theta = math.radians(wall["yaw_deg"])
    return (wall["x_mm"] + math.cos(theta)*along,
            wall["y_mm"] + math.sin(theta)*along)


def load_network(path, repo_root):
    root = Path(repo_root).resolve()
    source = Path(path).resolve()
    allowed = (root / "design_jobs" / "synthetic").resolve()
    check(source.is_relative_to(allowed) and source.is_file(), "PATH_NOT_ALLOWED")
    raw = source.read_bytes()
    check(0 < len(raw) < 100000, "SOURCE_SIZE_INVALID")
    try:
        record = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise ValueError("M10_REJECTED:JSON_INVALID") from None
    _keys(record, ("schema", "status", "project_id", "units", "levels",
                   "walls", "openings", "joints", "section"), "SCHEMA_INVALID")
    check(record["schema"] == SOURCE_SCHEMA and
          record["status"] == "SYNTHETIC_QA_ONLY", "AUTHORITY_BLOCKED")
    check(identity(record["project_id"]) and record["units"] == "mm",
          "PROJECT_UNITS_INVALID")

    levels = record["levels"]
    check(type(levels) is list and 1 <= len(levels) <= 10, "LEVELS_INVALID")
    level_ids = {}
    for lev in levels:
        _keys(lev, ("id", "z_mm"), "LEVEL_INVALID")
        check(identity(lev["id"]) and lev["id"] not in level_ids and
              num(lev["z_mm"]) and abs(lev["z_mm"]) < 100000, "LEVEL_INVALID")
        level_ids[lev["id"]] = lev["z_mm"]

    walls = record["walls"]
    check(type(walls) is list and 2 <= len(walls) <= 24, "WALLS_INVALID")
    ids, originals, transformed = set(), {}, []
    for wall in walls:
        _keys(wall, ("id", "level_id", "source_id", "x_mm", "y_mm", "z_mm",
                     "length_mm", "width_mm", "height_mm", "yaw_deg"),
              "WALL_SCHEMA_INVALID")
        check(identity(wall["id"]) and wall["id"] not in ids and
              wall["level_id"] in level_ids and wall["source_id"] == "SYNTHETIC_SPEC",
              "WALL_IDENTITY_INVALID")
        ids.add(wall["id"])
        check(all(num(wall[x]) for x in ("x_mm", "y_mm", "z_mm",
                                        "length_mm", "width_mm", "height_mm",
                                        "yaw_deg")), "WALL_NUMBER_INVALID")
        check(all(abs(wall[x]) < 1e6 for x in ("x_mm", "y_mm", "z_mm")) and
              100 <= wall["length_mm"] <= 100000 and
              50 <= wall["width_mm"] <= 1000 and
              100 <= wall["height_mm"] <= 10000 and
              -180 <= wall["yaw_deg"] <= 180,
              "WALL_DIMENSIONS_INVALID")
        check(abs(wall["z_mm"] - level_ids[wall["level_id"]]) < 1e-6,
              "WALL_LEVEL_INVALID")
        originals[wall["id"]] = wall
        theta = math.radians(wall["yaw_deg"])
        # Centerline to outer face for existing OCP, DXF and IFC tools.
        shifted = dict(wall)
        shifted["x_mm"] += math.sin(theta)*wall["width_mm"]/2
        shifted["y_mm"] -= math.cos(theta)*wall["width_mm"]/2
        transformed.append(shifted)
    by_id = {w["id"]: w for w in transformed}

    openings = record["openings"]
    check(type(openings) is list and 1 <= len(openings) <= 48, "OPENINGS_INVALID")
    opening_by_host = {}
    for item in openings:
        _keys(item, ("id", "host_id", "source_id", "offset_mm",
                     "sill_mm", "width_mm", "height_mm"), "OPENING_SCHEMA_INVALID")
        check(identity(item["id"]) and item["id"] not in ids and
              item["host_id"] in by_id and item["source_id"] == "SYNTHETIC_SPEC",
              "OPENING_HOST_INVALID")
        ids.add(item["id"])
        check(all(num(item[k]) for k in ("offset_mm", "sill_mm",
                                        "width_mm", "height_mm")),
              "OPENING_NUMBER_INVALID")
        host = by_id[item["host_id"]]
        check(item["offset_mm"] > 0 and item["sill_mm"] > 0 and
              item["width_mm"] > 0 and item["height_mm"] > 0 and
              item["offset_mm"] + item["width_mm"] < host["length_mm"] and
              item["sill_mm"] + item["height_mm"] < host["height_mm"],
              "OPENING_NOT_CONTAINED")
        box = (item["offset_mm"], item["sill_mm"],
               item["offset_mm"] + item["width_mm"],
               item["sill_mm"] + item["height_mm"])
        for prev in opening_by_host.get(item["host_id"], ()):
            check(not (box[0] < prev[2] and box[2] > prev[0] and
                       box[1] < prev[3] and box[3] > prev[1]),
                  "OVERLAPPING_OPENINGS")
        opening_by_host.setdefault(item["host_id"], []).append(box)

    joints = record["joints"]
    check(type(joints) is list and 1 <= len(joints) <= 36, "JOINTS_INVALID")
    graph = {w["id"]: set() for w in walls}
    junction_keys = set()
    has_interior = False
    for joint in joints:
        _keys(joint, ("id", "wall_a", "position_a_mm",
                      "wall_b", "position_b_mm"), "JOINT_SCHEMA_INVALID")
        a, b = joint["wall_a"], joint["wall_b"]
        check(identity(joint["id"]) and joint["id"] not in ids and
              a in originals and b in originals and a != b,
              "JOINT_IDENTITY_INVALID")
        ids.add(joint["id"])
        p, q = joint["position_a_mm"], joint["position_b_mm"]
        check(num(p) and num(q), "JOINT_POSITION_INVALID")
        check(0 <= p <= originals[a]["length_mm"] and
              0 <= q <= originals[b]["length_mm"], "JOINT_POSITION_INVALID")
        terminal_a = p in (0, originals[a]["length_mm"])
        terminal_b = q in (0, originals[b]["length_mm"])
        check(terminal_a or terminal_b, "JOINT_NEEDS_ENDPOINT")
        has_interior |= not terminal_a or not terminal_b
        identity_key = tuple(sorted(((a, float(p)), (b, float(q)))))
        check(identity_key not in junction_keys, "JOINT_DUPLICATE")
        junction_keys.add(identity_key)
        wa, wb = originals[a], originals[b]
        check(abs(wa["z_mm"] - wb["z_mm"]) <= 0.001 and
              abs(wa["height_mm"] - wb["height_mm"]) <= 0.001 and
              math.dist(_position(wa, p), _position(wb, q)) <= 0.001,
              "JOINT_GEOMETRY_MISMATCH")
        graph[a].add(b); graph[b].add(a)
    reached = {walls[0]["id"]}
    while True:
        new = reached | set().union(*(graph[k] for k in reached))
        if new == reached: break
        reached = new
    check(len(reached) == len(walls), "DISCONNECTED_WALL_GRAPH")

    section = record["section"]
    _keys(section, ("id", "host_wall_id", "offset_mm"),
          "SECTION_SCHEMA_INVALID")
    check(identity(section["id"]) and section["id"] not in ids and
          section["host_wall_id"] in by_id and num(section["offset_mm"]),
          "SECTION_IDENTITY_INVALID")
    host = by_id[section["host_wall_id"]]
    check(1 < section["offset_mm"] < host["length_mm"] - 1,
          "SECTION_OUTSIDE_WALL")
    check(any(o["host_id"] == host["id"] and
              o["offset_mm"] < section["offset_mm"] <
              o["offset_mm"] + o["width_mm"] for o in openings),
          "SECTION_MUST_INTERSECT_VOID")
    check(has_interior, "T_JUNCTION_REQUIRED")
    check(any(abs(w["yaw_deg"] / 90 -
                  round(w["yaw_deg"] / 90)) > 1e-5 for w in walls),
          "NONORTHOGONAL_WALL_REQUIRED")
    return {
        "source": record, "source_sha256": hashlib.sha256(raw).hexdigest(),
        "walls": transformed, "by_id": by_id, "openings": openings,
        "joints": joints, "section": section, "levels": level_ids,
        "state": "SYNTHETIC_QA_ONLY", "source_positions": originals,
    }
