# M05 — native CAD block reconciled column review (not an approved BIM model)

The CAD engine is reusable: take a locally authorized structural DXF and an approved-for-review 2D column layout **in the supported corrected v0.6 JSON schema**, then produce a portable 2D semantic review package. The library is not hard-coded to Narayani's dimensions, positions or any project private provider URL. Future schema adapters may support other DXF layouts.

## Private conversion
```bash
python -m backend.cad_bridge.column_reconcile --dxf /private/structural.dxf \
  --layout /private/corrected-site-layout.html --source-id SOURCE-001 \
  --expected-sha256 YOUR_VERIFIED_NATIVE_SOURCE_SHA256 \
  --out /private/source-reviewed-columns.json
```

The converter checks original DXF SHA before loading; verifies AC1021 and $INSUNITS=4; resolves each **model-space INSERT** by source handle; calls ezdxf's transformed block geometry bbox; checks corrected grid coordinates and exact physical circle/rectangle sizes within 1mm; estimates the XY grid-to-DXF translation as median of all verified block geometric centres; fails shut on any outlier, stale SHA or conflicting size. CAD block insertion coordinates **ARE NOT column centres**.

The output `fabin-cad://semantic-column-review/0.1` contains only 2D plan footprints, exact source handles, geometrical size, coordinate alignment, deviations and SHA provenance. All elevations and column heights are null, and construction/semantic promotion gates remain BLOCKED; it does not make 3D columns, footings or rebar. Source architecture DXF and private source records never enter public repository files.

## Browser
Open the single shared `/cad/` application and import the locally generated M05 review JSON in **Semantic source review**. Inspect selectable rectangular and circular columns, source IDs/handles, grid centres and review residuals. CAD primitive plan view remains isolated from synthetic starter, its derived sections, M04 raw DXF layer and IFC read-only imports. Invalid imports cannot erase a valid previous review. Remove review to return to draft model.

## Narayani verified in the private source session
The existing corrected v0.6 layout has **23** source-handle identified columns (17 rectangular 400x400 mm and 6 circular diameter 350 mm). Resolving the native source's INSERT internal geometry yields translation approximately +756005.039257 mm East, -129533.739670 mm North from the corrected A1 grid, max difference about 0.643 mm. The six C4 INSERT **base points are remotely offset** from the physical column geometry, hence a naive INSERT-coordinate approach is materially wrong.

The user-facing private package should stay in the conversation or private project store until approved. Original structural DXF and corrected site review are governed Drive evidence. No automatic read/write to private Drive, no field issuance and no architectural source conversion claimed.

## Future gates
Explicitly verified structural elevations, levels, heights, circular 3D solids, actual footing geometry, wall/opening semantics and source revision reconciliation must precede editable BIM 3D or construction/QTO authority. Treat the project's M80 codal status as HOLD.
