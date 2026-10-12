"""M09.1 governed execution contract: validate before any native CAD engine runs.

This module validates *public synthetic fixtures only*. Real-project execution needs
a separate authenticated/private authority and is intentionally unsupported.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from .design_job import canonical, load

SCHEMA = "fabin-cad://governed-job/0.1"
RESULT_SCHEMA = "fabin-cad://governed-job-validation/0.1"
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
IDENTITY = re.compile(r"[A-Za-z][A-Za-z0-9_-]{2,79}\Z")
REVISION = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,79}\Z")


class ContractError(ValueError):
    def __init__(self, code: str):
        self.code = code
        super().__init__("M09_REJECTED:" + code)


def ensure(condition, code):
    if not condition:
        raise ContractError(code)


def object_exact(value, fields, code):
    ensure(type(value) is dict and set(value) == set(fields), code)
    return value


def valid_id(value):
    return isinstance(value, str) and IDENTITY.fullmatch(value) is not None


def confined_file(root, relative):
    ensure(isinstance(relative, str) and relative.startswith("design_jobs/synthetic/"), "PATH_NOT_ALLOWED")
    ensure(not Path(relative).is_absolute() and ".." not in Path(relative).parts and "\\" not in relative, "PATH_NOT_ALLOWED")
    base = (root / "design_jobs" / "synthetic").resolve()
    resolved = (root / relative).resolve()
    ensure(resolved.is_relative_to(base) and resolved.is_file(), "PATH_NOT_ALLOWED")
    return resolved


def read_contract(path, root):
    root = Path(root).resolve()
    file = Path(path).resolve()
    base = (root / "design_jobs" / "synthetic").resolve()
    ensure(file.is_relative_to(base) and file.is_file(), "PATH_NOT_ALLOWED")
    data = file.read_bytes()
    ensure(0 < len(data) < 100000, "DOCUMENT_SIZE_INVALID")
    try:
        doc = json.loads(data)
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ContractError("JSON_INVALID") from None
    object_exact(doc, ("schema", "execution_id", "project", "design_job", "sources"), "SCHEMA_INVALID")
    ensure(doc["schema"] == SCHEMA and valid_id(doc["execution_id"]), "SCHEMA_INVALID")
    project = object_exact(doc["project"], ("project_id", "classification", "approval_state"), "PROJECT_INVALID")
    ensure(valid_id(project["project_id"]), "PROJECT_INVALID")
    ensure(project["classification"] == "SYNTHETIC_QA_ONLY" and project["approval_state"] == "HOLD", "APPROVAL_BLOCKED")
    job = object_exact(doc["design_job"], ("path", "sha256"), "JOB_INVALID")
    ensure(isinstance(job["sha256"], str) and HEX64.fullmatch(job["sha256"]), "JOB_HASH_INVALID")
    job_file = confined_file(root, job["path"])
    actual_job_sha = hashlib.sha256(job_file.read_bytes()).hexdigest()
    ensure(job["sha256"] == actual_job_sha, "JOB_HASH_MISMATCH")
    sources = doc["sources"]
    ensure(isinstance(sources, list) and len(sources) == 1, "SOURCE_CARDINALITY_INVALID")
    source = object_exact(sources[0],
        ("source_id", "revision", "path", "sha256", "authority_state"), "SOURCE_RECORD_INVALID")
    ensure(valid_id(source["source_id"]) and isinstance(source["revision"], str)
           and REVISION.fullmatch(source["revision"]) is not None, "SOURCE_IDENTITY_INVALID")
    ensure(source["authority_state"] == "SYNTHETIC_FIXTURE", "SOURCE_AUTHORITY_BLOCKED")
    ensure(isinstance(source["sha256"], str) and HEX64.fullmatch(source["sha256"]), "SOURCE_HASH_INVALID")
    source_file = confined_file(root, source["path"])
    actual_source_sha = hashlib.sha256(source_file.read_bytes()).hexdigest()
    ensure(actual_source_sha == source["sha256"], "SOURCE_HASH_MISMATCH")

    # The established M08 geometry validator is the canonical native job parser.
    # It also checks dimensions, level/host references, geometry and source SHA.
    try:
        state = load(job_file, root)
    except (ValueError, OSError, TypeError, KeyError, json.JSONDecodeError):
        raise ContractError("DESIGN_JOB_REJECTED") from None
    ensure(state["job"]["project_id"] == project["project_id"]
           and state["job"]["source"]["path"] == source["path"]
           and state["source_sha256"] == source["sha256"], "CROSS_DOCUMENT_MISMATCH")
    all_objects = state["elements"] + state["openings"]
    ensure(all(obj.get("source_id") == source["source_id"] for obj in all_objects), "SOURCE_FK_INVALID")
    level_ids = set(state["levels"])
    element_ids = {item["id"] for item in state["elements"]}
    edges = []
    for level in sorted(level_ids):
        edges.append({"from_id": level, "relation": "REFERENCES", "to_id": source["source_id"],
                      "role": "LEVEL_SOURCE"})
    for item in sorted(state["elements"], key=lambda e: e["id"]):
        ensure(item["level_id"] in level_ids, "LEVEL_FK_INVALID")
        edges.extend((
            {"from_id": item["id"], "relation": "REFERENCES", "to_id": item["source_id"], "role": "SOURCE"},
            {"from_id": item["id"], "relation": "REFERENCES", "to_id": item["level_id"], "role": "LEVEL"},
        ))
    for opening in sorted(state["openings"], key=lambda e: e["id"]):
        ensure(opening["host_id"] in element_ids, "HOST_FK_INVALID")
        edges.extend((
            {"from_id": opening["id"], "relation": "REFERENCES", "to_id": opening["source_id"], "role": "SOURCE"},
            {"from_id": opening["id"], "relation": "REFERENCES", "to_id": opening["host_id"], "role": "HOST"},
        ))
    # No timestamp, randomness or machine-dependent absolute paths in the identity.
    seed = {"schema": SCHEMA, "execution_id": doc["execution_id"],
            "project_id": project["project_id"], "design_job_sha256": actual_job_sha,
            "source_sha256": actual_source_sha, "revision": source["revision"]}
    run_key = hashlib.sha256(canonical(seed)).hexdigest()
    return {
        "schema": RESULT_SCHEMA, "validation": "PASS",
        "classification": "SYNTHETIC_QA_ONLY", "engineering_approval": "HOLD",
        "release_authorized": False, "private_execution_enabled": False,
        "execution_id": doc["execution_id"], "project_id": project["project_id"],
        "run_key": run_key, "output_id": "m09-" + run_key[:24],
        "contract_sha256": hashlib.sha256(data).hexdigest(),
        "design_job_sha256": actual_job_sha, "source_sha256": actual_source_sha,
        "source_revisions": [{ "source_id": source["source_id"], "revision": source["revision"],
                               "sha256": actual_source_sha }],
        "objects": len(all_objects), "edges": edges,
    }


def write_validation(contract_path, repo_root, output):
    """Fail closed on existing outputs. Exact repeat yields the same run key."""
    result = read_contract(contract_path, repo_root)
    path = Path(output)
    # No partial or overwritten acceptance file on rerun/collision.
    with path.open("xb") as fp:
        fp.write(canonical(result))
    return result
