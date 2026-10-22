# M19 — Correct structural positions at the earliest unverified authority

## Immediate audit finding (PRJ-000007 / Narayani)

The production project manifest `public/data/projects/narayani-parajuli/aad-building-v1.json` explicitly labels the 4x3 grid **AI_INFERRED_4x3_AXIS_GRID_NOT_DXF_CERTIFIED**. Its world-XZ coordinates are `gridX=[6.8,11.1,15.4,19.7]` and `gridZ=[3.4,7.0,10.6]` metres; the engine generates 0.3x0.3 m conceptual column elements on the eligible intersections and 0.25x0.45 m beams between eligible adjacent axes. These values were **not** independently extracted and registered from the architectural and structural source drawings.

Historical floor registrations are also assumptions: GF (0,0), FF (-0.267,-0.717), SF (-0.447,-0.717), no rotation. The 2D/3D/table parity checks established only that they use the same derived IFC-classified assembly coordinates, not that structural members align correctly with the architectural plan.

Existing source evidence in the manifest:
- Architectural DXF Drive ID `1owyqD67FUnBh5KbuvqidTZiJzi_BC1mv` (source name: `narayni architecture drw revised.dxf`).
- Structural DXF Drive ID `13k901-pejMY7lE_0VepomzxUZFiZyzox` (source name: `narayani str drg revised plan.dxf`).
- The project's `MODEL_QA_MANIFEST_v2.json` documents unreconciled source/perimeter and registration assumptions.

An independent **wall centreline proximity check** of the original ground-floor conceptual grid found 0 of 12 centres within 0.20 m of the modeled wall centre-lines; 8 of 12 farther than 0.50 m. This is a strong coordination-review signal, **not** a structural design rule: intentionally freestanding columns are possible. The submitted M19 guard recomputes each column's nearest wall from the current assembled model at runtime, rather than encoding any client-specific distances or approval guesses. It also reports beam midpoint proximity as descriptive metadata, not support verification.

## Recovery/edit sequence

1. Preserve current source and deployment as a versioned rollback. **Do not rewrite the original DXFs or old commits**. The current display is an unapproved conceptual model, not an accurate structural placement authority.
2. Determine the source drawing units, scale, origin, plan orientation, named footing/column centres, beam routes and architectural common registration points. Compare architectural wall nodes with the actual structural DXF control points; use explicit correspondences (at least sufficient independent, non-collinear reference points to establish/validate any 2D transform). Flag any ambiguity; do not extrapolate a structural datum from area schedule matching.
3. Record the verified common architectural/world datum, transformation, source sheet/layer/block/element references and any AI-inferred individual positions. **A user's wall junction point may be intended as a column**, but graph nodes are geometry edit handles until explicitly mapped to structurally sourced column IDs.
4. Correct the earliest applicable input(s): `levels[].transform` if storeys are incorrectly registered; `structural.columns.gridX/gridZ` if the actual scheme is a regular grid. **If column locations are irregular or beam routes do not follow these adjacent axes, extend the structural source schema with explicit member centre-lines, stable IDs, column/support correspondence and level alignment before changing the project.** Do not distort real geometry to satisfy the current 4x3 grid.
5. Regenerate the **same shared building assembly** and review coordinated 2D plan, Three.js model, BIM schedule and IFC4. QA must verify member identifiers, column/beam arrangement, vertical support paths, wall/room interference, clear openings, structural source citations and floor registration independently. A correct mesh/table coordinate match alone is not acceptance.
6. Use a new branch and PR; preserve the previous deployment and audit trail. Keep `issueForConstruction=false`, engineering HOLD and unverified original design until a structural professional has assessed actual capacity, load paths and detailing.

## Shared engine preventive guard

`public/assets/js/aad-structural-registration-audit.mjs` examines nearest architectural wall centre-lines to each assembled column on each storey, and records per-column and per-beam review distances. `aad-building-core.mjs` emits explicit nonfatal warnings and embeds `structuralAlignment` in the assembled model; the shared inspector and QA panel show why the conceptual grid must be reviewed. The source label is taken from the manifest, avoiding the former misleading hard-coded `AUTHORIZED_CONCEPTUAL_GRID` label.

The review tolerance (default **0.20 m**) is only a software discrepancy threshold; it is **not a code limit and is not grounds for snapping the building**. Off-wall columns and beams may be legitimate. No actual beam or column has been moved by this PR. Retest once a properly registered source scheme becomes available.

## Prevention in future design briefs

Plain-language requests, dictation and sketches are valid starting evidence; source provenance can be user intention, AI inference, photographs or structural drawings. Mark every column/beam as `INFERRED/UNVERIFIED` unless its position is linked to the appropriate project-specific structural/architectural reference. Never upgrade provenance just because geometry passes IFC/2D/3D/table consistency tests.
