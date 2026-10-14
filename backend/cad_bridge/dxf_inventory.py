"""M12.1 private-local DXF inventory; no semantic or engineering approval.

No Drive credentials, HTTP source fetching, DWG masquerading or private uploads.
This process is an opt-in local/authorized-runner read-only intake operation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

import ezdxf

SCHEMA = "fabin-cad://dxf-intake-inventory/0.1"
SUPPORTED = frozenset({
    "LINE", "LWPOLYLINE", "POLYLINE", "ARC", "CIRCLE", "TEXT", "MTEXT",
    "INSERT", "DIMENSION", "HATCH", "SPLINE", "ELLIPSE", "POINT",
})
INSUNITS_MM = 4


def inventory(path, *, source_id, max_bytes=64_000_000, max_entities=150000):
    file = Path(path)
    if not file.is_file() or file.suffix.lower() != ".dxf":
        raise ValueError("DXF_FILE_REQUIRED")
    if not isinstance(source_id, str) or not (
        3 <= len(source_id) <= 80 and
        source_id.replace("-", "").replace("_", "").isalnum()):
        raise ValueError("SOURCE_ID_INVALID")
    size = file.stat().st_size
    if not (0 < size <= max_bytes):
        raise ValueError("DXF_SIZE_OUT_OF_POLICY")
    sha = hashlib.sha256()
    with file.open("rb") as fh:
        for data in iter(lambda: fh.read(1024 * 1024), b""):
            sha.update(data)
    try:
        doc = ezdxf.readfile(file)
    except Exception:
        raise ValueError("DXF_PARSE_FAILED") from None
    units = doc.header.get("$INSUNITS")
    if units != INSUNITS_MM:
        raise ValueError("DXF_MILLIMETRE_UNIT_DECLARATION_REQUIRED")
    kinds = Counter()
    layers = Counter()
    blocks = Counter()
    handles = set()
    unresolved = Counter()
    sample = []
    entities = doc.modelspace()
    count = 0
    for e in entities:
        count += 1
        if count > max_entities:
            raise ValueError("DXF_ENTITY_LIMIT")
        kind = e.dxftype()
        handle = str(e.dxf.handle)
        if handle in handles:
            raise ValueError("DXF_DUPLICATE_ENTITY_HANDLE")
        handles.add(handle)
        layer = str(e.dxf.layer)
        if not layer or len(layer) > 200:
            raise ValueError("DXF_LAYER_NAME_INVALID")
        kinds[kind] += 1
        layers[layer] += 1
        if kind == "INSERT":
            blocks[str(e.dxf.name)] += 1
        if kind not in SUPPORTED:
            unresolved["UNSUPPORTED_ENTITY_" + kind] += 1
        if kind in ("HATCH", "SPLINE", "ELLIPSE", "DIMENSION", "INSERT"):
            unresolved["NEEDS_EXPLICIT_EXPANSION_" + kind] += 1
        if kind == "LWPOLYLINE":
            try:
                if any(abs(point[4]) > 1e-12 for point in e.get_points("xyseb")):
                    unresolved["BULGE_CURVE_REQUIRES_REAL_ARC"] += 1
            except Exception:
                unresolved["POLYLINE_READ_FAILURE"] += 1
        if len(sample) < 12:
            sample.append({
                "source_entity_id": source_id + ":DXF:" + handle,
                "kind": kind, "layer": layer,
                "semantic_status": "UNCLASSIFIED",
            })
    if not count:
        raise ValueError("DXF_MODELSPACE_EMPTY")
    return {
        "schema": SCHEMA,
        "source_id": source_id,
        "status": "SOURCE_INVENTORY_ONLY",
        "file": {
            "sha256": sha.hexdigest(),
            "size_bytes": size,
            "dxf_version": doc.dxfversion,
            "units": "mm",
            "source_format": "DXF",
            "source_revision_verified": False,
            "conversion_provenance_verified": False,
        },
        "modelspace": {
            "entity_count": count,
            "entity_types": dict(sorted(kinds.items())),
            "layers": dict(sorted(layers.items())),
            "block_inserts": dict(sorted(blocks.items())),
            "unresolved": dict(sorted(unresolved.items())),
            "entity_sample": sample,
        },
        "gates": {
            "human_semantics": "UNCLASSIFIED",
            "real_project_bim_promotion": "BLOCKED",
            "coordinate_system_confirmed": False,
            "unit_inference_prohibited": True,
            "structural_design": "HOLD",
            "construction_release": "BLOCKED",
            "quantity_takeoff": "BLOCKED",
            "public_upload": False,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Read-only local DXF source evidence")
    parser.add_argument("--dxf", required=True)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    report = inventory(args.dxf, source_id=args.source_id)
    dest = Path(args.out)
    if dest.resolve() == Path(args.dxf).resolve():
        raise ValueError("OUTPUT_MUST_NOT_OVERWRITE_SOURCE")
    if dest.exists():
        raise ValueError("OUTPUT_MUST_BE_NEW")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"source_id": report["source_id"],
                      "status": report["status"],
                      "sha256": report["file"]["sha256"],
                      "entity_count": report["modelspace"]["entity_count"],
                      "out": str(dest)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
