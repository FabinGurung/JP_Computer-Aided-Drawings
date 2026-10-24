# M26 — PRIMARY AAD BUILDING ENGINE source-backed GF structure

## Why M26 exists

PRs #60–#65 were genuine code changes deployed through GitHub Actions/Pages, but they updated a side route `cad/aad/source-review` and M24 optional QA. The canonical Narayani AAD studio `projects/narayani-parajuli/aad/` was still using the dated `aad-building-v1.json` 4×3 AI-inferred member grid in `aad-building-core.mjs`. This was a real unsynchronized downstream system, not just a link problem.

## What the new architecture implements

The primary Narayani AAD project page now sends `structure=source-review` to the **same shared multistorey editor**; there is still one iframe to one shared state, not two independently synchronized HTML applications. `aad-reviewed-structural-intake.mjs` reads the original DXF ground-floor source ledger, frozen M70/M60/M40/V03 stage JSON/meta, the user's 13 QA decisions and the M25 message approval from governed project links. `aad-reviewed-structural-assembly.mjs` transforms them into **60 standardized AAD building elements**: 23 reviewed GF column locations (including proposed Ø350 I3 replacing the I4 working position), 21 original DXF footing outlines and 16 M70 GF/plinth beams. `createAADWorkspace` and `assembleBuilding` take an optional immutable review structure and use it on every rebuild/edit/undo/reset. The old inferred 4×3 structural **members** are not constructed in this mode. The historical manifest grid is preserved for legacy back-compat and source audit; direct plain `multistorey/?manifest=...` without `structure=source-review` remains old baseline for regression comparison.

The shared 2D plan now draws actual sourced column footprints (C4 rounds represented by 36-sided circular approximations), M70 beam lines and footing outlines alongside existing AAD floor walls; those element IDs are exactly the same objects that generate the main 3D meshes, component register and **conceptual** IFC4 (including `IfcFooting` with source footprint). All positions and source member identities come from the reconciled QA and stage links, not generative interpretation. The built-in coordinate proof validates the plan, Three.js and table against one model.

## Explicit limitations / release HOLD

Original architectural AAD floor nodes remain area-adjusted against architectural DXF, with a previous provisional source-to-AAD fit (~58 mm RMS across a matched sample) and no certified whole-building datum. DO NOT interpret near-alignment of columns and walls as a surveyed setting-out.

The review has only a GF/plinth member network. Upper-level structural columns/beams and continuous frame/load path are deliberately **not invented**. To render conceptual 3D, GF column visual heights (2.8m), footing thickness/vertical position (0.30m schematic) and beam y=0 position are not taken as designed dimensions; they are explicitly marked schematic, and the generated IFC4 is **not for construction**. Footing source plan dimensions (e.g. 1.8m at G1) differ from frozen M40/V03 (2.1m), and excavation/formwork >100mm extra working width is **unquantified** until exact per-side/site details are supplied. Original DXF CF1 still mentions I4 and has no verified replacement footing/load path at proposed I3.

The M25 message approval is user authorization to model and compare these choices, not engineering capacity/safety certification. Engineering HOLD stays active and no frozen stage, original DXF binary, approved engineering document or IFC release is overwritten.

## CI / complete integration verification

M26 smoke loads all 12 governed source files from the project paths and rebuilds a single `aad-building-assembly/1` with 23/21/16 members; ensures no legacy synthetic member IDs remain in source mode; checks independent IFC4 semantic references and 23 IfcColumn, 21 IfcFooting, 16 IfcBeam conceptual entities; checks editable wall changes preserve the same reviewed structure. Browser tests open the **primary** Narayani project AAD route (not the standalone QA route), test one actual 2D+3D+table engine, verify corresponding source member world coordinates and IFC download content. Existing synthetic AAD compatibility and cross-project multi-storey/IFC checks remain unchanged.
