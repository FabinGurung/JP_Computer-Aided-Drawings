# M24 — User-reviewed correction proposal: DXF-preferred columns/footings

## Source & authority

User QA export generated at `2026-10-24T11:17:26.499Z`, 13 cases, references blob SHAs in `public/data/projects/narayani-parajuli/aad-user-qa-decisions-v1.json`. Frozen M70 16 beam runs remain the governing GF/plinth-beam system. Source authority for the user's **proposed** working columns/footings is the original structural DXF interpretation, with overrides specified in their submitted QA. All originals, frozen M60/M40/V03 and old source ledgers remain unchanged. This is a non-certified `qa=user-reviewed` preview, NOT an update to BIM, IFC or construction layout.

## Column reconciliation

- Reject 5 M60-only grids C4, E2, E4, G4, H4 in the **proposed** working layout.
- Retain the DXF source-column candidates C3, F2, F3, G3, H3 and all other non-I4 DXF columns.
- User directs remove I4 Ø350 from proposed active occupancy, place Ø350 on M70 beam junction **I3** at registered world X≈21.000162, Z≈6.125040 m. Original DXF/M60 I4 was X≈21.000162, Z≈5.470040 m: nominal relocation 655 mm in world Z. This is an explicit user working interpretation, **not proof of vertical support or footing**.
- F3 form value says `propose-stage` but user's written note says `recorded in dxf is right`. Working proposal uses note/DXF for preview, **not final approval**; discrepancy explicitly preserved.

## Footings, dimensions and working space

- User selects original 21 DXF drawn footing footprints including **G1 1.8×1.8 m**. Frozen M40/V03 say G1 IF3 2.1×2.1 m. Both are stored and discrepancy remains.
- User says in field they added **over 100 mm additional allowance** to provide side-formwork placement and manpower working space. This is a **separate excavation/working envelope**, NOT a concrete footing size, reinforcement geometry, or automatically confirmed explanation of M40 2.1 m. The source does not say if >100 mm applies per side, total or to which measurement line; no excavation quantity is generated until fixed measurement provenance exists.
- User prefers DXF CF1 combined footing. Yet the DXF CF1 support references original **SC-I4**, now omitted in the new working 23-column proposal. **Orphan support** must be visibly highlighted. NO rehoming the CF1 to I3, resizing, recomputation of reinforcement or invented vertical load path.
- M40/V03 21 footing plans and original DXF 21 raw footing outlines remain immutable, with cross-references.

## Engine workflow

Source-review app existing `/cad/aad/source-review/?data=...` remains **M23** by default. The new separate `/projects/narayani-parajuli/aad-qa-preview/` launcher supplies `qa=user-reviewed` to the same shared AAD source-review engine, adding derived `qa-column` and `qa-footing` source-linked elements while retaining original DXF/M60/M40/V03 comparison toggles. The QA geometry is a **read-only overlay** and never propagates back into structural analysis calculations, original DXF or IFC.

Testing: Git SHA-1 blob fingerprint of 5 original text sources matches the QA record, precise 23 and 21 counts, 16 M70 beam runs, 655mm I3 relocation, G1 drawn 1.8 vs frozen scheduled 2.1, explicit working-space unknown, orphan CF1 support, contradictory F3 decision, immutable input sources, browser element selection and source-coordinate proof in SVG, Three.js and table. Site build and inherited AAD/IFC suite remain release gates.

## Engineering HOLD

User checked stage, DXF, site and engineer evidence boxes on all 13 cases, but no signed instruction, drawing number or revision was attached. This is user attestations, not an independently verified engineer-approved correction. **Do not use for construction**, footing design, IFC issuance, excavation set-out, material quantity approval or automated certification. For resolution, obtain signed column/footing plan revision, I3 design/support confirmation, CF1 re-support footing detail, G1 designed RCC footprint vs excavation envelope size, and F3 contradictory choice clarification.
