# M23 — Narayani structural stages: authority, contradictions, and source review

**User-clarified working hierarchy**: the **plinth-beam network is the ground-floor beam network**, and the frozen **M70** stage is authoritative for that network. The 32 separate paired-edge candidates extracted from the structural DXF are **archival comparison evidence**, not co-equal ground-floor beams. The previous description that M70 and GF beams were distinct structural levels was wrong.

The four public frozen stage snapshots are referenced, never edited or duplicated:
- `public/stages/m70/stage-data.json` / meta: **16 PB runs**, 230×300 mm, **134.18422787561238 m** centerline; local grid.
- `public/stages/m60/stage-data.json` / meta: **23 column first-lift records**, source C1/C2/C3 rectangular 400×400 mm and C4 circular Ø350 mm (specific section values stored by row).
- `public/stages/m40/stage-data.json` / meta: **21 RCC footing records**, 19 isolated and two 4.0×1.5 m CF1; type-specific plan geometry, taper/depth and materials.
- `public/stages/v03/stage-data.json` / meta: **21 matching foundation reinforcement rows**, including type/plan size, cover, bars and installed reinforcement.

**Critical correction:** the old statement that 23 M60 columns match the 23 structural DXF columns was false; M70's *nine-by-seven grid axes* matched DXF registered control points, not M60's *column occupancy*. M60-exclusive columns are **C4,E2,E4,G4,H4**; DXF-column-ledger-exclusive columns are **C3,F2,F3,G3,H3**. Matching totals are NOT matching layout. M60 I4 remains a **C4 Ø350 mm** column; there is no M60 I3 column. M70 PB-H3 and PB-V9 instead meet at **I3**, X≈21.000 m, Z≈6.125 m. No new column or support was invented and SC-I4 was not relocated. At D7, the actual M60 row's X coordinate also differs by ~76 mm from the frozen M70 grid axis, which requires documented review and must never be hidden by snapping.

M40 and V03 agree on 21 plan sizes. **G1**: both give IF3 **2.1×2.1 m**; original DXF footage is **1.8×1.8 m**. This is an unresolved dimensional conflict, not a stage automatic construction approval. **CF1 H-I/4** in M40/V03 is supported by M60 H4 + I4; the original DXF CF1 outline associates with H3 + I4 (support grid disagreement). The project must retain both sets of source IDs, positions, stage models and drawn geometries while engineering verification remains HOLD.

The new `aad-m23-governed-stages.mjs` compiles **derived presentation records** with M60/M40/V03 source references and a discrepancy register, based on the shared M70 registration transform. The unified source review displays M70 beam runs, M60 columns and M40/V03 footings by default, with structural DXF candidates accessible in separate comparison toggles. It does not change the source files, old AAD manifest, actual engineering calculations, or IFC. The per-stage links are project-specific; logic stays generic and reusable.

QA requires project and frozen stage checks, M40↔V03 per-footing type and dimensional agreement, coherent 23/21 source counts, 5+5 column-position set-difference review, original drawn G1 discrepancy, I3/I4 distinction, source-linked 2D/3D/table coordinate parity, mobile cursor/pan non-regression and full existing AAD/IFC testing. **ENGINEERING HOLD / NOT FOR CONSTRUCTION** persists. Revert the M23 PR to roll back the viewer without altering source histories.
