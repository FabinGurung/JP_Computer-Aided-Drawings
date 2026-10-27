# Ashok architectural coordination edition 02 · 2026-10-27 NPT

The user authorized a practical furnished model using the original Drive
constraints, selected interior changes within a 30% schematic allowance, and
publication without another approval pause. This is the completed architectural
visualization for that scope, not structural design or construction issue.

## What was wrong

The earlier pipeline proved transfer, source hashes, routes and a nonempty
WebGL scene. It did not prove architectural completeness. The sparse SVG trace
contained duplicate hall walls; the wall renderer drew solid boxes over the
door positions. Window datum gaps led to omission rather than a documented
schematic sill. There were no furnishings, dimension strings or callable grid
in the primary studio, and external walls were centred on the outer boundary,
adding 230 mm to both overall dimensions.

## Sources and decisions

Live Drive re-read: REV04 semantic model, REV03 ground-floor intent, REV02
first-floor intent, the original front-left-stair user sketch and native REV02
DXF. The DXF has ten LINE entities and no column or furniture records. The
M08 current CAD folder still contains no native bytes. Exact hashes and roles
are in `coordination-ledger-qa02.json`; private provider references stay outside
the public tree. The accepted c016/c012 raster bytes and original input JSON/SVG
remain unchanged as comparison evidence.

Plot 9144×18288 mm, outer envelope 7200×14400 mm, site origin [1944,2000] mm,
230/100 mm walls, 610 mm main plinth and 3048 mm storeys remain controlled.
The inset 115 mm perimeter centre-lines now describe exact outer faces.

The 4290×2200 mm stair bay uses +30% width and +29.412% FF depth. It fits two
900 mm flights, eight 250 mm treads per flight, 18 risers per rise, 900 mm
mid/start/arrival landings and a real upper-floor void. Porch/balcony access
avoids the removed stair-to-bedroom route. The source 1067 mm entry width is retained; the front window is reduced
by 20.013% to keep actual wall piers. The hallway
has 1088 mm clear width. The rotated GF tub leaves a 1037 mm shower approach.
The transverse source vehicle retains its dimensions and shifts left by
29.998% of plot width, releasing a 2943 mm right approach. Static fit is not a
turning/gate certification. Every changed opening anchor/size is recorded.

There is no metric establishing a single “30% overall error” for an unbuilt
house. The allowance applies to the explicit proposal changes; known bounds
are exact. It is not used as a structural safety margin or to override code.

## Shared template changes

The canonical `/cad/aad/multistorey/` workspace still loads project-owned JSON.
No project-specific viewer fork was introduced. Reusable modules now provide
real wall voids, dimension/grid/room/furniture overlays and an opt-in
presentation-assembly contract. Furniture, fixtures, floors, stairs, guards,
context and proposed column markers share component IDs with the 3D/table/IFC
state. Column positions use amber 300 mm display glyphs, explicitly **not**
designed structural sections, and export as IfcBuildingElementProxy.

The IFC writer also uses explicit 2D rectangle profile placements, eliminating
the independent parser's null-placement errors. Tilted handrail proxy parts
carry the same placement in the Three.js and IFC geometry.

## Reproduce and verify

```bash
python tools/site/ashok-build-coordinated.py
node tools/site/ashok-qa02-smoke.mjs
node tools/site/ashok-qa02-ifc.mjs
npm run build -- --base=/JP_Computer-Aided-Drawings/
python tools/site/check_public_routes.py dist
ASHOK_URL=http://127.0.0.1:5191/JP_Computer-Aided-Drawings/projects/ashok-adhikari/ \
  node tools/site/ashok-rev04-browser.mjs
```

Gates now assert exact exterior faces, no positive-length collinear wall
overlap, all active source openings admitted, hosted aperture subtraction,
zero-setback-wall opening prohibition, furnishing containment, access bands,
source/assumption labels and independently parsed IFC geometry. Browser checks
raycast through every aperture against its real host mesh, check dimension/grid
layers, verify both floors/exterior and exercise SVG export at 390/820/1440 px.
Visual readback also caught non-boolean visibility leaking hidden storeys into
cutaways and generic SVG font rules crowding dimension labels. Visibility now
uses strict booleans; the browser gate checks actual rendered wall counts
(25 GF / 24 FF / 49 exterior), synchronizes the WebGL frame before screenshots,
and validates self-contained SVG styles. Frozen Narayani stage bytes and its
existing shared-engine tests are retained.

## Remaining boundaries and rollback

Structural analysis, accepted column/beam/footing/rebar sections, MEP and drainage,
municipal acceptance, finished headroom/guard/waist-slab design and vehicle
operation remain unresolved. A historic top floor is not silently introduced;
the model admits GF+FF and a labelled two-storey roof-terrace proposal. The
external WC clear size is preserved; its +150 mm FFL is an explicit assumption.

Base `57ec7972702529cd477290dd8d782ad133060941` (including the current M29 source-projection update); branch
`fix/ashok-coordinated-model-qa02`. Ordinary PR/CI/Pages publication and a normal
revert PR provide rollback. No Drive originals, A7 or frozen stage records are
mutated. No A9 Main/Local sync or engineering freeze is claimed.
