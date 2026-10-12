"""M09.2 revision-aware CAD evidence. Public synthetic-only, never approval."""
from __future__ import annotations
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from .design_job import canonical
from .governed_job import (
    ContractError, HEX64, REVISION, confined_file, ensure, object_exact,
    read_contract, valid_id,
)

SCHEMA = "fabin-cad://source-bundle/0.2"
RESULT_SCHEMA = "fabin-cad://source-bundle-validation/0.2"
EVIDENCE_SCHEMA = "fabin-cad://synthetic-evidence/0.1"
ROLES = frozenset({"GEOMETRY", "BRIEF", "CONSTRAINT"})
LIFECYCLES = frozenset({"CURRENT", "SUPERSEDED"})


def transition_review_state(current, event, *, sha_verified=False):
    """Public evidence bookkeeping only; cannot grant a human approval."""
    allowed = {
        ("HOLD", "SHA256_VERIFIED"): "SOURCE_VERIFIED",
        ("SOURCE_VERIFIED", "REQUEST_HUMAN_REVIEW"): "ENGINEER_REVIEW_REQUIRED",
    }
    target = allowed.get((current, event))
    ensure(target is not None and
           (event != "SHA256_VERIFIED" or sha_verified), "APPROVAL_TRANSITION_BLOCKED")
    return target


def _read_json(path, *, maximum=100000):
    blob = Path(path).read_bytes()
    ensure(0 < len(blob) < maximum, "DOCUMENT_SIZE_INVALID")
    try:
        result = json.loads(blob)
    except (ValueError, UnicodeDecodeError):
        raise ContractError("JSON_INVALID") from None
    ensure(type(result) is dict, "SCHEMA_INVALID")
    return result, blob


def _read_evidence(path, *, primary, project_id, source_id):
    payload, _ = _read_json(path)
    if primary:
        ensure(payload.get("schema") == "fabin-cad://design-source/0.1",
               "GEOMETRY_EVIDENCE_INVALID")
    else:
        object_exact(payload, ("schema", "project_id", "source_id", "status", "summary"),
                     "EVIDENCE_SCHEMA_INVALID")
        ensure(payload["schema"] == EVIDENCE_SCHEMA and
               isinstance(payload["summary"], str) and 0 < len(payload["summary"]) <= 240,
               "EVIDENCE_SCHEMA_INVALID")
    ensure(payload.get("project_id") == project_id and
           payload.get("status") == "SYNTHETIC_QA_ONLY", "EVIDENCE_PROJECT_MISMATCH")
    if not primary:
        ensure(payload["source_id"] == source_id, "EVIDENCE_SOURCE_MISMATCH")


def _validate_revisions(documents):
    by_id = {d["artifact_id"]: d for d in documents}
    by_source = defaultdict(list)
    successors = defaultdict(list)
    for d in documents:
        by_source[d["source_id"]].append(d)
        predecessor = d["supersedes"]
        if predecessor is None:
            continue
        ensure(predecessor != d["artifact_id"] and predecessor in by_id,
               "REVISION_PARENT_MISSING")
        previous = by_id[predecessor]
        ensure(previous["source_id"] == d["source_id"] and
               previous["role"] == d["role"] and
               previous["revision"] != d["revision"] and
               previous["lifecycle"] == "SUPERSEDED", "REVISION_CROSS_SOURCE")
        successors[predecessor].append(d["artifact_id"])
    for family in by_source.values():
        current = [d for d in family if d["lifecycle"] == "CURRENT"]
        ensure(len(current) == 1, "REVISION_CURRENT_NOT_UNIQUE")
        ensure(len({d["role"] for d in family}) == 1, "REVISION_ROLE_MISMATCH")
        for d in family:
            if d["lifecycle"] == "SUPERSEDED":
                ensure(len(successors[d["artifact_id"]]) == 1, "REVISION_CHAIN_INCOMPLETE")
            else:
                ensure(not successors[d["artifact_id"]], "REVISION_CURRENT_HAS_SUCCESSOR")
        visited = set()
        node = current[0]
        while node:
            ensure(node["artifact_id"] not in visited, "REVISION_CYCLE")
            visited.add(node["artifact_id"])
            predecessor = node["supersedes"]
            node = by_id[predecessor] if predecessor is not None else None
        ensure(len(visited) == len(family), "REVISION_CHAIN_INCOMPLETE")
    return by_source


def read_source_bundle(bundle_path, repo_root):
    root = Path(repo_root).resolve()
    relative = (str(Path(bundle_path).resolve().relative_to(root))
                if Path(bundle_path).resolve().is_relative_to(root) else "")
    file = confined_file(root, relative)
    bundle, original_bytes = _read_json(file)
    object_exact(bundle,
                 ("schema", "bundle_id", "project_id", "classification",
                  "engineering_approval", "governed_contract", "documents"),
                 "BUNDLE_SCHEMA_INVALID")
    ensure(bundle["schema"] == SCHEMA and valid_id(bundle["bundle_id"]) and
           valid_id(bundle["project_id"]), "BUNDLE_SCHEMA_INVALID")
    ensure(bundle["classification"] == "SYNTHETIC_QA_ONLY" and
           bundle["engineering_approval"] == "HOLD", "APPROVAL_BLOCKED")
    contract_path = confined_file(root, bundle["governed_contract"])
    contract = read_contract(contract_path, root)
    ensure(contract["project_id"] == bundle["project_id"], "PROJECT_FK_INVALID")
    documents = bundle["documents"]
    ensure(type(documents) is list and 2 <= len(documents) <= 32,
           "DOCUMENT_COUNT_INVALID")
    ids, distinct_paths, revisions, geometries, normalized = set(), set(), set(), [], []
    for doc in documents:
        object_exact(
            doc, ("artifact_id", "source_id", "revision", "role", "lifecycle",
                  "path", "sha256", "authority_state", "supersedes"),
            "DOCUMENT_RECORD_INVALID")
        identity = doc["artifact_id"]
        ensure(valid_id(identity) and identity not in ids and
               valid_id(doc["source_id"]), "SOURCE_PK_INVALID")
        ids.add(identity)
        ensure(isinstance(doc["revision"], str) and
               REVISION.fullmatch(doc["revision"]) is not None and
               (doc["source_id"], doc["revision"]) not in revisions,
               "SOURCE_REVISION_DUPLICATE")
        revisions.add((doc["source_id"], doc["revision"]))
        ensure(doc["role"] in ROLES and doc["lifecycle"] in LIFECYCLES,
               "DOCUMENT_ROLE_INVALID")
        ensure(doc["authority_state"] == "SYNTHETIC_FIXTURE",
               "SOURCE_AUTHORITY_BLOCKED")
        ensure(isinstance(doc["sha256"], str) and
               HEX64.fullmatch(doc["sha256"]) is not None, "SOURCE_HASH_INVALID")
        ensure(doc["supersedes"] is None or valid_id(doc["supersedes"]),
               "REVISION_PARENT_INVALID")
        path = confined_file(root, doc["path"])
        ensure(path not in distinct_paths, "SOURCE_PATH_REUSED")
        distinct_paths.add(path)
        actual_sha = hashlib.sha256(path.read_bytes()).hexdigest()
        ensure(actual_sha == doc["sha256"], "SOURCE_HASH_MISMATCH")
        _read_evidence(path, primary=doc["role"] == "GEOMETRY",
                       project_id=bundle["project_id"], source_id=doc["source_id"])
        if doc["role"] == "GEOMETRY":
            geometries.append(doc)
        normalized.append(dict(doc))
    by_source = _validate_revisions(normalized)
    ensure(len(geometries) == 1 and
           geometries[0]["lifecycle"] == "CURRENT" and
           geometries[0]["source_id"] == "SYNTHETIC_SPEC" and
           geometries[0]["sha256"] == contract["source_sha256"] and
           geometries[0]["revision"] == contract["source_revisions"][0]["revision"],
           "GEOMETRY_CONTRACT_MISMATCH")
    edges = []
    for doc in sorted(normalized, key=lambda x: x["artifact_id"]):
        edges.append({"from_id": bundle["bundle_id"], "relation": "REFERENCES",
                      "to_id": doc["artifact_id"], "role": "SOURCE_DOCUMENT"})
        if doc["supersedes"] is not None:
            edges.append({"from_id": doc["artifact_id"], "relation": "SUPERSEDES",
                          "to_id": doc["supersedes"], "role": "REVISION"})
    stage = transition_review_state("HOLD", "SHA256_VERIFIED", sha_verified=True)
    stage = transition_review_state(stage, "REQUEST_HUMAN_REVIEW")
    seed = {
        "schema": SCHEMA, "bundle_id": bundle["bundle_id"],
        "project_id": bundle["project_id"],
        "governed_contract_sha256": hashlib.sha256(contract_path.read_bytes()).hexdigest(),
        "documents": sorted([
            {k: doc[k] for k in ("artifact_id", "source_id", "revision", "sha256",
                                  "supersedes", "lifecycle", "role")}
            for doc in normalized
        ], key=lambda d: d["artifact_id"])
    }
    run_key = hashlib.sha256(canonical(seed)).hexdigest()
    return {
        "schema": RESULT_SCHEMA, "validation": "PASS",
        "bundle_id": bundle["bundle_id"], "project_id": bundle["project_id"],
        "classification": "SYNTHETIC_QA_ONLY", "source_evidence_stage": stage,
        "engineering_approval": "HOLD", "release_authorized": False,
        "quantity_takeoff": "BLOCKED", "private_execution_enabled": False,
        "bundle_sha256": hashlib.sha256(original_bytes).hexdigest(),
        "governed_contract_sha256": seed["governed_contract_sha256"],
        "run_key": run_key, "output_id": "m09-bundle-" + run_key[:24],
        "documents": seed["documents"],
        "current_sources": sorted(
            [source_id, next(d["artifact_id"] for d in docs if d["lifecycle"] == "CURRENT")]
            for source_id, docs in by_source.items()),
        "edges": sorted(edges, key=lambda e: (e["from_id"], e["relation"], e["to_id"]))
    }


def write_bundle_validation(bundle_path, repo_root, out):
    result = read_source_bundle(bundle_path, repo_root)
    with Path(out).open("xb") as handle:
        handle.write(canonical(result))
    return result
