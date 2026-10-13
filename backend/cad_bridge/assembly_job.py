"""M11.1 deterministic reusable assembly schema and foreign-key validator.

Public synthetic inputs only. Template dimensions are reusable; instances own
the coordinates. Component groups are metadata, NOT structural connections.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from .angled_network import load_network
from .design_job import identity, num
from .oriented_job import check

SCHEMA = "fabin-cad://synthetic-assembly-job/0.1"
RESULT_SCHEMA = "fabin-cad://synthetic-assembly-result/0.1"
KINDS = frozenset(("footing", "column", "beam", "slab"))


def exact_object(value, keys, code):
    check(type(value) is dict and set(value) == set(keys), code)


def confined(root, path):
    check(isinstance(path, str) and
          path.startswith("design_jobs/synthetic/") and
          not Path(path).is_absolute() and ".." not in Path(path).parts,
          "SOURCE_PATH_REJECTED")
    base = (root / "design_jobs" / "synthetic").resolve()
    target = (root / path).resolve()
    check(target.is_relative_to(base) and target.is_file(),
          "SOURCE_PATH_REJECTED")
    return target


def read_assembly(path, repo_root):
    root = Path(repo_root).resolve()
    job = Path(path).resolve()
    check(job.is_relative_to((root / "design_jobs" / "synthetic").resolve()) and
          job.is_file(), "JOB_PATH_REJECTED")
    raw = job.read_bytes()
    check(0 < len(raw) <= 100000, "JOB_SIZE_REJECTED")
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise ValueError("M10_REJECTED:ASSEMBLY_JSON_INVALID") from None
    exact_object(data, ("schema", "status", "assembly_id", "project_id",
                        "source", "groups", "templates", "instances"),
                 "ASSEMBLY_SCHEMA_INVALID")
    check(data["schema"] == SCHEMA and data["status"] == "SYNTHETIC_QA_ONLY",
          "ASSEMBLY_AUTHORITY_BLOCKED")
    check(identity(data["assembly_id"]) and identity(data["project_id"]),
          "ASSEMBLY_IDS_INVALID")
    source = data["source"]
    exact_object(source, ("path", "git_blob_sha1"), "SOURCE_RECORD_INVALID")
    source_file = confined(root, source["path"])
    check(isinstance(source["git_blob_sha1"], str) and
          len(source["git_blob_sha1"]) == 40 and
          all(x in "0123456789abcdef" for x in source["git_blob_sha1"]),
          "SOURCE_GIT_BLOB_INVALID")
    data_bytes = source_file.read_bytes()
    git_blob = hashlib.sha1(
        ("blob " + str(len(data_bytes)) + "\0").encode("ascii") +
        data_bytes
    ).hexdigest()
    check(git_blob == source["git_blob_sha1"], "SOURCE_PIN_MISMATCH")
    baseline = load_network(source_file, root)
    check(baseline["source"]["project_id"] == data["project_id"],
          "PROJECT_FOREIGN_KEY_INVALID")

    all_ids = {
        baseline["source"]["project_id"],
        *(entry["id"] for entry in baseline["walls"]),
        *(entry["id"] for entry in baseline["openings"]),
        *(entry["id"] for entry in baseline["joints"]),
        baseline["section"]["id"],
        data["assembly_id"],
    }
    groups = data["groups"]
    check(type(groups) is list and 1 <= len(groups) <= 12, "GROUP_COUNT_INVALID")
    group_ids = set()
    for group in groups:
        exact_object(group, ("id", "label"), "GROUP_SCHEMA_INVALID")
        check(identity(group["id"]) and group["id"] not in all_ids and
              group["id"] not in group_ids and
              isinstance(group["label"], str) and
              1 <= len(group["label"]) <= 100 and
              group["label"].strip() == group["label"],
              "GROUP_IDENTITY_INVALID")
        group_ids.add(group["id"])
    all_ids.update(group_ids)

    templates = data["templates"]
    check(type(templates) is list and 1 <= len(templates) <= 16,
          "TEMPLATE_COUNT_INVALID")
    by_template = {}
    for template in templates:
        exact_object(template, ("id", "kind", "length_mm", "width_mm", "height_mm"),
                     "TEMPLATE_SCHEMA_INVALID")
        name = template["id"]
        check(identity(name) and name not in all_ids and
              name not in by_template and template["kind"] in KINDS,
              "TEMPLATE_IDENTITY_INVALID")
        check(all(num(template[k]) for k in
                  ("length_mm", "width_mm", "height_mm")),
              "TEMPLATE_NUMERIC_INVALID")
        check(all(10 <= template[k] <= 20000 for k in
                  ("length_mm", "width_mm", "height_mm")),
              "TEMPLATE_DIMENSIONS_INVALID")
        by_template[name] = template
    all_ids.update(by_template)

    instances = data["instances"]
    check(type(instances) is list and 2 <= len(instances) <= 40,
          "INSTANCE_COUNT_INVALID")
    instance_ids = set()
    active_templates = set()
    active_groups = set()
    for instance in instances:
        exact_object(
            instance, ("id", "template_id", "group_id", "level_id",
                       "source_id", "x_mm", "y_mm", "z_mm", "yaw_deg"),
            "INSTANCE_SCHEMA_INVALID")
        name = instance["id"]
        check(identity(name) and name not in all_ids and
              name not in instance_ids and
              instance["template_id"] in by_template and
              instance["group_id"] in group_ids and
              instance["level_id"] in baseline["levels"] and
              instance["source_id"] == "SYNTHETIC_SPEC",
              "INSTANCE_FOREIGN_KEY_INVALID")
        instance_ids.add(name)
        active_templates.add(instance["template_id"])
        active_groups.add(instance["group_id"])
        check(all(num(instance[k]) for k in
                  ("x_mm", "y_mm", "z_mm", "yaw_deg")),
              "INSTANCE_NUMERIC_INVALID")
        check(all(abs(instance[k]) < 1000000 for k in
                  ("x_mm", "y_mm", "z_mm")),
              "INSTANCE_COORDINATE_INVALID")
        check(-1500 <= instance["z_mm"] -
              baseline["levels"][instance["level_id"]] <= 15000,
              "INSTANCE_LEVEL_FRAME_INVALID")
        # First M11 release explicitly uses axis-aligned accessory primitives.
        # Rotated walls remain supported by the pinned M10.2 baseline.
        check(instance["yaw_deg"] == 0, "INSTANCE_ROTATION_UNSUPPORTED")
    check(active_templates == set(by_template) and
          active_groups == group_ids, "UNUSED_TEMPLATE_OR_GROUP")

    edges = []
    for template in templates:
        edges.append({
            "from_id": data["assembly_id"], "relation": "DEFINES_TEMPLATE",
            "to_id": template["id"]
        })
    for group in groups:
        edges.append({
            "from_id": data["assembly_id"], "relation": "HAS_GROUP",
            "to_id": group["id"]
        })
    for instance in instances:
        edges.extend((
            {"from_id": instance["id"], "relation": "INSTANCE_OF",
             "to_id": instance["template_id"]},
            {"from_id": instance["id"], "relation": "GROUPED_IN",
             "to_id": instance["group_id"]},
            {"from_id": instance["id"], "relation": "ON_LEVEL",
             "to_id": instance["level_id"]},
        ))
    edges.sort(key=lambda e: (e["from_id"], e["relation"], e["to_id"]))
    return {
        "job": data,
        "job_sha256": hashlib.sha256(raw).hexdigest(),
        "baseline": baseline,
        "source_sha256": hashlib.sha256(data_bytes).hexdigest(),
        "templates": by_template,
        "instances": instances,
        "groups": groups,
        "edges": edges,
        "status": "SYNTHETIC_QA_ONLY",
    }
