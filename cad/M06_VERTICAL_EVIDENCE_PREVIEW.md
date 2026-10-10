# CAD M06 — provisional 3D from source-referenced vertical observations

The five-engine CAD software remains reusable. A separate, versioned `fabin-cad://vertical-observations/0.1` package can add vertical dimensions to an M05 2D column review without changing the original source model, Narayani files or any other project.

## Input workflow

1. In CAD Studio, **Open M05 column review JSON**.
2. Click **Download blank height template**. The software carries forward the project ID, M05 source SHA and layout SHA, and all existing column grid IDs. It deliberately leaves level `z_mm` entries `null` and source records empty.
3. Read the authorized project's elevations/sections externally. In the JSON, fill in absolute local `z_mm` levels and add referenced sources with `id`, opaque `record_id`, `kind` SECTION/ELEVATION/SURVEY/OTHER and `review=USER_REVIEWED_NOT_AUTHORIZED`.
4. For each level and segment, list the appropriate local source IDs. Segments map existing M05 `grid` IDs from a lower level to a higher one.
5. Import the filled JSON into the same CAD Studio. It rejects unknown source refs, null levels, mismatched project/source revision, reversed or overlapping segments, missing dimensions, and wrong approval/status codes.
6. **View 3D** shows transparent rectangular/circular provisional columns. Tap an existing column ID to view its DXF handle and M05 plan origin. **Return to M05 plan** clears the overlay and restores the original review.

All positions and footprint dimensions remain those of the checked M05 plan. These heights are explicitly *user-attested*, NOT independently authenticated or approved. The renderer does not produce approved IFC, quantities, reinforcement, or construction documentation. Source file bytes and private Drive URLs are never uploaded by the public app.

## Supported inputs and restrictions

The `project_id`, `plan_source_sha256` and `plan_layout_sha256` must exactly match the active M05 package. `levels` contain unique IDs with signed millimetre Z coordinates and source IDs; `segments` connect unique M05 column/grid IDs to ordered levels. Multiple non-overlapping segments per column are supported. Zero/negative height, overlaps, missing source cross-reference or mismatched hashes block the entire load. A new project uses the *same* software with a different project package.

The original Narayani architectural set contains elevation and section drawings according to the live project index, but the presence of those drawings does not make exact heights independently checked. No Narayani 3D preview has been claimed based on guessed elevations. The Narayani M05 23-column geometry stays 2D until appropriately referenced and reviewed vertical inputs are available.

No changes are made to the established M01–M05 model kernel, raw DXF or user-owned project files. M80/codal and construction issue remain HOLD. Git snapshot rollback: `snapshot/pre-cad-m06-vertical-intake-20261010`.
