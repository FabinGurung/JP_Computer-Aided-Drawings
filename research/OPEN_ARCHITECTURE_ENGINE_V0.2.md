# Open Architecture Engine v0.2 — openings, rooms and synchronized derivation

Status: RESEARCH ONLY / NOT ENGINEERING AUTHORITY / NOT PRODUCTION

Base provenance:
- repository: `FabinGurung/JP_Computer-Aided-Drawings`
- base tag: `open-architecture-engine-v0.1.0`
- base commit: `e0e9ea195e420e14c32eb1e49ff9b83c512dacb0`
- research branch: `research/open-architecture-engine-v0.2`

Purpose:
extend the v0.1 canonical-model proof without changing Narayani or the approved Pages branch. v0.2 proves that wall-hosted openings, door/window fixtures, closed-loop room detection and dimensions can remain synchronized across deterministic 2D and 3D outputs.

Canonical source:
`models/open-architecture-engine-v0.2/poc-model.json`

Generator:
`tools/open_architecture/generate_v02.py`

Generated outputs:
- `plan.svg` — derived plan with wall gaps, door/window symbols and dimensions
- `plan.dxf` — derived CAD linework with wall/opening-aware layers
- `model.gltf` — derived 3D geometry with actual wall voids
- `rooms.json` — derived closed-loop room record
- `dimensions.json` — derived overall/opening dimensions
- `manifest.json` — source hash, IDs, scope, limitations and non-regression declaration

## Canonical relationship rule

Openings own placement on their host wall. Door/window fixture objects reference an opening instead of duplicating arbitrary world coordinates.

Example semantics:

```text
opening.element_id
opening.wall_id
opening.offset_mm
opening.width_mm
opening.height_mm
opening.sill_mm

door.opening_id
window.opening_id
```

This keeps 2D, DXF and 3D geometry dependent on one host-relative definition.

## v0.2 bounded scope

Implemented:
- one storey
- quadrilateral slab
- axis-defined walls with stable IDs
- wall-hosted openings with stable IDs
- one door and one window fixture
- actual 3D voids through wall decomposition
- closed-wall-centreline room detection
- deterministic room ID derived from boundary wall IDs
- overall and opening dimensions
- synchronized SVG / DXF / glTF generation
- mutation acceptance test

Not implemented:
- multi-storey editor
- snapping / geometric constraints
- undo / redo transactions
- stairs / roofs
- sections / elevations
- materials / reusable family library
- production Three.js editor
- quantity authority
- IFC output

IFC remains intentionally gated. It must use real IfcOpenShell generation and validation in the next milestone; no fake IFC is emitted here.

## Acceptance proof

`python tools/open_architecture/generate_v02.py --acceptance-check`

The acceptance check changes the canonical window width by +100 mm in memory and requires:
1. `plan.svg` changes;
2. `plan.dxf` changes;
3. `model.gltf` changes;
4. `dimensions.json` changes;
5. `manifest.json` changes;
6. canonical element IDs remain stable;
7. derived room IDs remain stable;
8. `rooms.json` remains stable because the wall boundary did not change.

CI additionally regenerates committed v0.2 outputs, verifies v0.1 remains reproducible, and runs the existing TypeScript/Vite checks.

## Authority and non-regression

This branch is software/research evidence only. It does not confer architectural, structural, codal, construction or client approval.

Narayani project stage files are not to be changed by this milestone. The approved GitHub Pages publication branch is also not mutated merely to prove v0.2.
