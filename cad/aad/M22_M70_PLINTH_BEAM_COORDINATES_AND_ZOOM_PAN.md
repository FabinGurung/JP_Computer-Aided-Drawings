# M22 — Restore 2D zoom/pan and link frozen M70 plinth-beam network

## Original system and missing controls

The reusable source review `cad/aad/source-review/` renders from `public/assets/js/aad-source-ground-floor.mjs` to a 2D SVG (`createElementNS`), a Three.js perspective renderer with `OrbitControls` and a plain DOM HTML schedule. All three use a common element array and stable source IDs. 3D orbit/pan/zoom existed; 2D previously displayed a fixed viewBox with no wheel/pinch zoom or pointer drag.

`aad-source-svg-navigation.mjs` now maintains a zoomable/pannable 2D world-coordinate viewport without changing underlying CAD objects; offers wheel zoom at cursor, touch pinch, one-finger drag pan, toolbar zoom/fit, and drag-vs-click separation. Existing coordinate inspection still uses SVG `getScreenCTM().inverse()` and 3D camera-ray Y=0 ground projection. The 3D toolbar adds a reset button. None of this writes to DXF or BIM.

## Existing M70 stage is a separate, frozen plinth source

Existing immutable public payloads:
- `public/stages/m70/meta.json` — frozen M70 v0.5, source-artifact SHA256 `0681e8633d07b82c8d1e1463cc0155fe0edc4aa3fd3b776b2f910d464e6c8e99`.
- `public/stages/m70/stage-data.json` — spatial_db with 16 source-native PB runs `PB-H1`…`PB-H7`, `PB-V1`…`PB-V9`; total centreline **134.184228 m** (source total 134.18422787561238 m); section **230x300 mm**; project `PRJ-000007`.

`aad-m70-plinth-bridge.mjs` registers the M70 local 9x7 grid (X mm east; Y mm north) against **all 23 original DXF-derived column/grid records**. Correspondence uses common grid IDs (e.g. I4, H3) and robust median translation; M70 +Y maps to AAD -Z. Fail closed if max residual exceeds 1 mm, grid count differs, an ID collides or a beam span and grid endpoints disagree.

The bridge generates 16 linked `plinth-beam` review objects with stable source IDs, 2D centreline, 3D schematic rectangular section **230×300 mm**, and an HTML register; every element records frozen stage and run ID. No copy of the 659 kB frozen stage is created. The project adapter `public/data/projects/narayani-parajuli/aad-source-stage-links-v1.json` links the source preview to M70. The shared viewer loads optional project adapters, not project-specific beam coordinates coded in the engine.

**Source precedence** is unchanged: original structural DXF is the authority for columns/footings/source beam drawings; M70 is frozen project-specific evidence for the **plinth-level** network. The 32 originally extracted **ground-floor paired-edge beam candidates** remain available via their own toggle/table filter but are hidden by default when M70 loads so they cannot masquerade as plinth beams. They are NOT deleted, overwritten, snapped, or reclassified. Architectural DXF controls wall edges.

## Critical observation: I3 is not I4

M70 `PB-H3` (C3→I3) and `PB-V9` (I2→I3) meet at **grid I3**, world X ≈ 21.000 m, Z ≈ 6.125 m. The previous extracted GF candidates `SB-GF-018` and `SB-GF-020` required ~132 mm line extensions to intersect there. Existing original-DXF column `SC-I4` is at X≈21.000 m, Z≈5.470 m, about **655 mm away**. M70 confirms **I3 as a plinth-beam endpoint**, but the current 23-column ledger contains no `SC-I3`. This does **not** authorize relocating `SC-I4` or inventing an `SC-I3` column: investigate structural drawing node, support and grid nomenclature first.

## Release and regression gates

- Verify 23 DXF control coincident locations against M70 grid (≤1 mm), 16 runs, 230×300 mm section and 134.184228 m total.
- Reject wrong project, shifted M70 grid and invalid spans. Preserve source ledger 23/21/32/74 counts unchanged.
- Test 2D SVG, 3D Three.js and table share the same stable PB-H3 coordinates.
- Test mouse-wheel zoom, button fit/zoom, drag pan and no zoom-state reset on selection, plus existing mobile picker and SC-I4 evidence.
- Preserve engineering **HOLD**, G1 footing conflict, source files and frozen M70 v0.5 file history. M70 reinforcement/fabrication data remain frozen as originally published; the viewer does not recompute BBS.
