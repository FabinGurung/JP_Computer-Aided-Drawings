# Narayani DXF-first GF source preview — review milestone (Q1–Q12=A)

## Generated on development branch, not on public Pages

**Project:** PRJ-000007. The source-ledger for this preview is `public/data/projects/narayani-parajuli/aad-source-gf-review-v1.json`. Shared runtime is `cad/aad/source-review/`, the reusable normalization engine is `public/assets/js/aad-source-ground-floor.mjs`, and the lightweight project launcher is `public/projects/narayani-parajuli/aad-source-review/`.

The data/geometry remain on this branch pending human visual review. This stage intentionally does not rewrite `public/data/projects/narayani-parajuli/aad-building-v1.json`, does not modify original DXFs and does not publish the development preview to `main` GitHub Pages.

## Source precedence & native registration

- **Structural source:** `narayani str drg revised plan.dxf`, Google Drive `13k901-pejMY7lE_0VepomzxUZFiZyzox`, SHA-256 `55a4b9828f569ece9c78063a60d56484c71e13563d9e73faf76a701bc182d1cf`. Its column, beam and footing geometry outranks architectural geometry when representing structural locations.
- **Architectural source:** `narayni architecture drw revised.dxf`, Google Drive `1owyqD67FUnBh5KbuvqidTZiJzi_BC1mv`, SHA-256 `077e7b4ffd5ce3c5c9789f9d040ef32ee661175aedd5f2d1059dbbe18176e124`. Supplies architectural edges and plan context.
- Original files remain read-only; no 36/114 MB DXF is duplicated inside Git.
- Structural column-layout → architectural grid: X +4,726,898.70904949 mm, Y -20,355.19117306 mm, no rotation or rescaling. Display metres: x=(registered_arch_X - 5,482,903.586456111)/1000; z=(-137,338.8907486362 - registered_arch_Y)/1000.
- Column/footing centres and paired beam edges are recorded in **native structural DXF mm**, then transformed at runtime. Architectural wall edge endpoints remain in **native architectural DXF mm**. All 2D, 3D and register data come from the same normalized assembly.

## Ground-floor preview contents

- 23 `SC-...` **source column centre candidates**, with original text handles and C1/C2/C3/C4 type annotations. No AI grid and no invented cross sections.
- 19 individual native footing footprints and 2 CF1 combined footings, including linked `columnIds` and structural DXF entity handles.
- G1: preserve exactly the native **1.8 × 1.8 m** drawn footing rectangle, with conspicuous HOLD because the IF3 callout/schedule is **2.1 × 2.1 m**. Do not resolve discrepancy automatically.
- G3: preserve original structural centre, do not snap it to architectural walls.
- 32 paired-edge GF beams as **DXF source candidates**, with width 230 mm deduced from paired edge spacing; beam depths and verified connectivity are **not** attached member-by-member. The new reproducible endpoint proximity report measures 64 source-edge candidate endpoints against nearest DXF column centres (54 within 0.5 m, 10 farther). This is **not** a structural support graph or approval. Source edge endpoints may terminate at joins or represent partial linework. Their vertical 3D position is only a display aid.
- 32 original `LINE` entities and 12 original `LWPOLYLINE` records from the architectural DXF `wall 2` layer in the GF source area: **74 direct wall-edge segments** in total, retaining native CAD entity handles and polyline segment indices. These remain raw wall-edge source coverage, **not** a connected/closed room topology. Architectural block references, openings, and any remaining source wall components must be extracted and registered before claiming a complete ground-floor architectural rebuild.
- Original AAD upper floors and old AI rectangular columns/beams are **not imported** into this source review.

## Representation caveats

The shared view's 2D plan uses native registered metre positions; footing rectangles have true source plan width and depth. 3D column rod thickness/height, footing extrusion thickness, wall display elevations and beam display elevation are schematic so no unverified structural sizes are asserted. This first preview intentionally generates **linked 2D + 3D + source schedule only (Q12=A)**, not IFC.

## Browser-test debt and release rule

The previous failed PR #60 Actions run `39804374831` expected **32** architectural rendered edges even though the canonical ledger was extended to **74** (32 LINE + 42 LWPOLYLINE segments). The stale assertion is repaired; both unit and actual built-browser tests must pass on the **same latest commit** before any review-only public release. Publication does not mean the architectural topology or member connectivity is accepted. The new `aad-source-beam-support-review.mjs` adds a deterministic source-endpoint discrepancy ledger, flags unresolved candidate endpoints, and never snaps geometry.

## CI and review gates

`tools/site/aad-source-gf-review-smoke.mjs` checks counts, source identities, coordinate transforms, deterministic reconstruction, CF1 support associations and G1 conflict preservation. `tools/site/aad-source-gf-review-browser-smoke.mjs` checks Vite built Pages-base path, rendered source ID selection, 2D/3D/table column coordinate parity, filtering, native G1 dimensions and warning labels; screenshot artifact is retained. GitHub Actions workflow `aad-source-gf-review.yml` runs on the PR **without publishing GitHub Pages**.

**Publication scope:** The user requested an updated GitHub Pages review link after branch QA. A successful merge may expose this explicitly labeled **source-fidelity review-only** page on Pages for feedback. This is not approval of the live Narayani unified architectural BIM, source wall topology, member connectivity, IFC, or construction use. Do not replace `aad-building-v1.json` or treat this preview as an authoritative engineering member schedule. Keep all identified HOLDs and original DXF source hashes.
