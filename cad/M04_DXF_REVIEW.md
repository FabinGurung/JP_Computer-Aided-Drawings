# CAD M04 — Native DXF source review and Narayani intake boundary

The shared CAD engine remains one application. This milestone adds **conservative 2D source geometry intake** via installed ezdxf and a read-only browser overlay; it does not silently promote CAD lines to BIM structural objects.

## Native conversion
```bash
python -m backend.cad_bridge.dxf_intake \
 --dxf "/path/to/authorized/structural.dxf" --source-id "SOURCE-RECORD-001" \
 --xmin 790000 --ymin -131000 --xmax 814000 --ymax -116000 \
 --out "/private/workspace/dxf-review.json"
```
The region values above illustrate a **previously verified Narayani structural CAD coordinate window**. They are not global settings for other projects. Change them for each source after checking its origin/units.

The CLI validates true DXF millimetres, hashes the complete original source, reads model-space native entities, conservatively selects geometry whose complete endpoints fall in the chosen region, retains handles, native layer names and local XY millimetre coordinates; refuses 0/unknown units and runaway region output. Straight lines, straight LWPOLYLINE and circles/arcs supported. Bulged polyline edges and INSERT block expansions are *explicitly unsupported*, not distorted into false geometry. This is only a **partial view**, not a full drawing reconstruction.

## Browser
Select **Open DXF review JSON** in the CAD studio to visualize native coordinates as independent Three.js plan linework. Layer summary, source ID and geometry count display, while existing editable building geometry stays unchanged. Browser import rejects missing SHA, unexpected schema, unsupported entities and false approval claims.

## Actual Narayani source findings
- Project `PRJ-000007` index contains immutable structural DXF `NAR-SRC-STR-003`, SHA-256 `55a4b9828f569ece9c78063a60d56484c71e13563d9e73faf76a701bc182d1cf`; `AC1021`, `$INSUNITS=4`.
- The separate architectural DXF source `NAR-SRC-ARC-003` is a large gzip archive; do not imply it has been parsed in this run.
- Existing CAD-native v0.2 semantic inventory, plinth-beam topology and source extraction stay `WORKING_NOT_CURRENT`. The project-owned v0.6 corrected column geometry and v0.7 interaction evidence remain separate.
- Original private CAD/DWG/PDF and project-derived geometry **must not be checked into this public repository**.
- Geometry selection is strictly bounded to avoid drawing detail/title-block artifacts being treated as building walls.

## Not yet implemented
No automatic wall/opening classification, block expansion, native IFC geometry editing, DWG decoding, private source synchronization or approval status promotion. A semantic mapping and human review step is required before any 2D DXF geometry becomes editable 3D BIM geometry.
