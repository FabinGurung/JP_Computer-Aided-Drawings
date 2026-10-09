# M05 — native CAD block reconciled column review (not an approved BIM model)

The CAD engine is reusable: take a locally authorized structural DXF and an approved-for-review 2D column layout **using either the independent generic project grid observations schema or the legacy corrected v0.6 JSON schema**, then produce a portable 2D semantic review package. The library is not hard-coded to Narayani's dimensions, positions or any project private provider URL. Generic projects use the same source-handle/footprint contract; the Narayani v0.6 parser is an optional legacy compatibility adapter.

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

## Private-source QA boundary

Project-specific CAD coordinates, block geometry, SHA-256 values, private source IDs, handle maps and corrected source layouts belong in the governed private project record, not in this public software repository.

The generic software has passed native geometry tests and private-project integration checks, while the derived private review package is supplied separately to its authorized user. A source-hashed review package can always be rebuilt from authorized original DXF and local observations.

## Future gates
Explicitly verified structural elevations, levels, heights, circular 3D solids, actual footing geometry, wall/opening semantics and source revision reconciliation must precede editable BIM 3D or construction/QTO authority. Treat the project's M80 codal status as HOLD.

## New project generic input (no software redevelopment)

Create a local JSON file in this format and provide the actual DXF handles, project coordinates and intended physical sizes from the project's drawings. The example is **illustrative only**, not a built model:

```json
{
  "schema": "fabin-cad://column-grid-observations/0.1",
  "status": "SOURCE_GRID_OBSERVATIONS_UNVERIFIED",
  "project": {"id": "DEMO-A-001"},
  "coordinate_frame": {"units": "mm", "origin": "A1"},
  "columns": [
    {"grid": "A1", "column_type": "C1", "shape": "rectangular",
     "x_mm": 0, "y_mm": 0, "width_mm": 400, "depth_mm": 400,
     "source_dxf_symbol_handle": "AD86B"},
    {"grid": "B1", "column_type": "C4", "shape": "circular",
     "x_mm": 4900, "y_mm": 0, "diameter_mm": 350,
     "source_dxf_symbol_handle": "AD86C"}
  ]
}
```

The values/handles above are examples. They **will not match** arbitrary DXF sources: the reconciler checks actual modelspace handle ownership, physical geometry size, translated centres, native source hash and tolerances, rejecting input rather than inventing missing data. Existing M01–M04 software is reused. Real height/elevation constraints are still required for BIM 3D.
