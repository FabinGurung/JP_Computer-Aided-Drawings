# CAD Studio M01 — five-engine research milestone

## What runs now
- **Three.js** (browser): real selectable meshes, orbital and orthographic Plan / Front / Side cameras, clipping plane, 100mm-snapped translate gizmo, element inspector, draft dimension edits, undo/redo, JSON draft export.
- **web-ifc** (browser): read-only IFC4/IFC2x3 geometry streamed into Three.js, WASM bundled via `scripts/copy-ifc-wasm.mjs` and returned meshes isolated from canonical draft.
- **IfcOpenShell** (Python): creates IFC4 spatial tree with real named building elements, unique deterministic IFC GUIDs, geometry representations and storey containment.
- **OpenCascade Technology / OCP** (Python): exact box solids, compound STEP export and real solid/plane section interrogation.
- **ezdxf** (Python): multi-layer plan DXF export from the same canonical box model (millimetres).

**Boundary:** Python IFC/STEP/DXF exporters are separate CLI adapters. A GitHub Pages website cannot execute Python server code, so this first milestone does NOT claim one-click browser IFC/DXF/STEP export or backend hosting. The user can run the bridge locally or connect a properly authorized backend in a later milestone.

```bash
npm ci
npm run dev
npm run build
python -m pip install -r backend/requirements.txt
python -m unittest discover -s backend/tests -v
python -m backend.cad_bridge.cli --format dxf --out /tmp/demo.dxf
python -m backend.cad_bridge.cli --format ifc --out /tmp/demo.ifc
python -m backend.cad_bridge.cli --format step --out /tmp/demo.step
python -m backend.cad_bridge.cli --format section --section-z-mm 1000
```

## Canonical contract
`public/cad/demo.json` is **synthetic geometry** only, coordinates and units in millimetres, Z up, no client name, no project CAD/DWG/PDF copies.
`cad/model.ts` and `backend/cad_bridge/model.py` validate the same schema `fabin-cad://canonical-boxes/0.1`; all stable element IDs flow to Three.js, DXF layers, IFC Tags/GlobalIds and OCCT solids.

An IFC uploaded in the browser is displayed separately in **read-only overlay mode**, not converted into an editable parametric native model. Geometry does not silently overwrite authoritative source objects.

## Explicit limitations
- Demonstration primitives only: box-based slabs, walls, beams, columns, footings. No hosted openings, roofs, stairs or constraints in M01 editor; the v0.2 research generator remains untouched.
- No Narayani geometry copied into shared engine. Project adapters may map project-authorized objects only after authority validation.
- No signed engineering/codal/client/construction authority; no BBS or QTO claims.
- M01 tests validate native engines separately, not round-trip equivalence across STEP/IFC/DXF and no exact BIM model fidelity.
- Fixed metric coordinate transform: canonical (x,y,z) maps to Three.js (x,z,-y) after mm→m; native Python exporters preserve Z-up coordinates.
- Import IFC requires WebAssembly and a browser WebGL context. Large IFC uploads should use the backend in a later iteration.
- The five upstream packages require pinned-version license/security review before commercial distribution.

## Production navigation
`/cad/` is an additional route. Existing Narayani V02–M80 page and historic releases remain untouched. Main/root deployment should not change until the staged PR passes CI.

## Next milestones
M02: normalized geometry graph, element dependency constraints, openings and real section views with dimensions. M03: IFC two-way mapping and browser/backend export coordination. M04: project-specific adapter intake with restricted source pointer contracts and explicit approvals.
