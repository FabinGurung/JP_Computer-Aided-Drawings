# AAD Project Viewer — one engine, many building instances (v1)

**Owner:** CAD/AAD. **Canonical domain contract:** [aad-domain-template.v0.1.json](./aad-domain-template.v0.1.json).

This is the drawing equivalent of the reusable LaTeX research template: changes to generic viewer behavior belong in the CAD-owned engine once; project-specific measurements, floors, provenance, and rendered assets belong in a project adapter. Do not clone/fork the viewer for each client.

## Authoring contract

1. Resolve project identity and authenticated Drive originals, including source revision, units, drawings and hashes.
2. Use a CAD extractor (currently Python `ezdxf`) to select the **correct revision** from a possibly multi-version source. Identify floor positions, dimensions, wall/opening layers and location of annotation objects.
3. Produce an immutable/versioned project data adapter (`AAD_PROJECT_PACKAGE`); put real project data under `public/data/projects/<project-slug>/`. Do not put project dimensions in `cad/aad/` engine code.
4. Render the project via the common `public/assets/js/aad-project-viewer.js` engine and shared `/cad/aad/` Studio. The URL parameter `projectModel` may resolve only same-origin JSON within the published project-data directory. The browser does not require an operator to upload a local draft.
5. If a separate verified semantic 3D model is not available, label any preliminary 3D adapter as draft and retain source-floor exact dimensions independently. Engineering and construction gate status is not inferred by visualization QA.
6. Publish via branch, CI, pull request, GitHub Pages and route/browser readback; preserve source hashes, revision, assumptions, deviation ledger, and controls.
7. AI authoring workflow: the user talks to their connected AI assistant in chat; the AI resolves sources, builds/version-controls a project adapter and invokes shared native validators. Other users can use their own AI to do this; AAD does not claim an in-browser hosted LLM or automatically interpret arbitrary text.

## Narayani v1 instance

- Project ID: `PRJ-000007 / 15_Narayani_Parajuli`.
- Viewer: `/projects/narayani-parajuli/aad/`; original stage viewers at `/projects/narayani-parajuli/` remain unchanged.
- Architectural source Drive file ID: `1owyqD67FUnBh5KbuvqidTZiJzi_BC1mv`.
- Structural source Drive file ID: `1Avndg013odsx5wX-RdaK3VGl4cIbP2Nq`.
- Architectural DXF SHA-256: `077e7b4ffd5ce3c5c9789f9d040ef32ee661175aedd5f2d1059dbbe18176e124`.
- Selected revised drawing areas: GF 205.16; FF 200.67; SF 175.62 m². Original CAD units: millimetres.
- DXF drawing adapter contains extracted line segments, text labels and dimension objects (879 plotted line segments, 159 text annotations and 219 DIMENSION objects across the three source floors). Drawing coordinates are plotted at 10-mm resolution; dimension numbers are taken directly from DXF measurements.
- Preliminary 3D GF adapter: polygon area 233.62 m²; source ground-floor area 205.16 m². Mismatch remains QA open. 3.00 m storey height and wall/opening locations are not approved source details. No implied structural verification or construction release.
- Source formats DWG, PDF, DXF remain in the canonical Narayani Drive project. Older versions in one DXF must not silently supersede the selected revision.
- Existing structural M80 remains `CODAL_NOT_VERIFIED / HOLD`.

## Shared source-view data contract

`window.AAD_PROJECT_PACKAGE` contains `schema: "aad-source-views/1"`, project ID, source hash and a keyed `floors` map. Each `gzip` field is a base64 gzip-compressed JSON object with source-designated `name`, `area`, absolute millimetre `bounds_mm`, and local drawing arrays:

- `lines`: `[x1,y1,x2,y2,layerCode]` (coordinates local to sheet/10 mm; codes W walls, O openings, S stairs, G grid, D dimension, F furniture, A other).
- `annotations`: `[x,y,label]`, with text originating in the DWG/DXF TEXT/MTEXT record.
- `dimensions`: `[x,y,measurementMm]` (explicit override or numeric measurement of source DIMENSION object).

This first extraction is a bounded visual subset, not a lossless replacement of the original DXF, and does not recreate omitted HATCH/INSERT/vector detail or structural reinforcement. Follow-up extraction adapters should add source entity handles, multi-view provenance, IFC mapping and checked room boundaries rather than overwriting existing measurements.

**Source integrity / construction boundary:** Original project files retain their Drive IDs. Public dimension display for Narayani is explicitly authorized by the project owner; other users' file publication follows their own permissions and source controls.
