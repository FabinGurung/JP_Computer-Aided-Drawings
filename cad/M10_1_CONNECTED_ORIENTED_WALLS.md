# M10.1 — Native oriented-wall network (synthetic-only)

## Status and scope

This is a bounded increment after completed M09.2/A9 SEQ31. It runs independently from the M08 synthetic demonstration and does not change the current CAD navigation or client project material. It generates real geometry from explicitly dimensioned, source-owned coordinates—not LLM-generated geometry.

The example contains three synthetic walls connected in a U footprint, with headings 0°, 90°, 180° and a hosted opening in the rotated wall. Its model coordinate frame uses millimetres: wall start (x,y,z), longitudinal local +X, wall thickness local +Y, positive heading about global +Z.

## Implemented

- Strict public-synthetic allowlisting and identity/units/dimension/host/joint validation, including level FKs, one-to-one joined endpoints, endpoint coincidence within 0.001 mm, matching wall base and height, and one connected wall graph.
- Rotation transforms applied consistently to wall footprint, hosted opening, IFC4 object placement, OpenCascade 3D boolean tool, and DXF geometry.
- Actual OpenCascade BRep opening subtraction and fused adjacent wall geometry, producing one STEP solid rather than overlap-counted standalone prisms.
- IFC4 IfcWall, IfcOpeningElement, and hosted IfcRelVoidsElement with rotated placements, deterministic IFC GUIDs and stable wall IDs.
- DXF LWPOLYLINE plan polygons, source wall/yaw XDATA, explicit joint point records and dashed opening review markers. DXF opening review is an annotation, not a plan Boolean.
- SVG plan, JSON connectivity proof, HTML synthetic review page and deterministic manifest with SHA-256 of all six outputs.
- Native geometric acceptance verifies IFC wall rotations/placements, 3D STEP solid count, fused opening volume and DXF corners, in addition to negative invalid-geometry tests.

Run via GitHub Actions: **CAD M10.1 Oriented Connected Walls Native QA**.

Local equivalent from repository root:

    python -m pip install -r backend/requirements.txt
    python -m unittest backend.tests.test_oriented_geometry -v
    python -m backend.cad_bridge.oriented_cli --preset synthetic-u-walls --repo-root . --out /tmp/cad-m10-evidence

The output directory must be new or empty. All files are labeled synthetic QA, release is prohibited, engineering_approval=HOLD, quantity_takeoff=BLOCKED, and private_execution_enabled=false.

## Deliberately not claimed

- Only orthogonal yaw values -180°, -90°, 0°, 90°, +180° are accepted. Arbitrary continuous angles, non-orthogonal junction mitres, stairs, curved walls, actual measured building sources, storey interactions and structural detailing are not implemented.
- This increment does not yet emit an exact intersected section cut of the rotated fused solid, nor a WebIFC browser representation of the new M10 sample. M08 browser regression remains separate and unchanged.
- No authorized private source resolver or human engineering approval exists. M09.2 private dispatcher remains blocked.
- The IFC files retain individually modeled walls and IFC openings; the STEP version additionally fuses all connected wall solids for geometric union checking. Neither model is a structural-analysis-ready mesh or certified as-built geometry.
- The U demonstration is not a construction design, QTO, quantity bill or official measurement.

## Reusable project architecture

New projects will eventually supply normalized and attested records for project ID, walls, local coordinates, orientation, level reference, dimensions, opening hosts and explicit joints. M10 currently consumes an exact allowlisted synthetic source fixture only. Real client sources must enter a distinct authenticated private execution path (M09.2 boundary) with per-project access controls and engineering review.

## Governance

Preserve SEQ31 frozen snapshots and original source revisions. After a successful GitHub PR merge, independently verify all native and prior regression checks, then register the exact new milestone in A9 Local/Main under the next available Local sequence with immutable PRE/POST copies, directed lineage and provider acknowledgment. Never manufacture completion of the blocked future features.
