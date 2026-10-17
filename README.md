# CAD / AI-Aided Design — One Connected Design Workspace

**Current product:** [AI Design Studio — linked 2D and 3D](https://fabingurung.github.io/JP_Computer-Aided-Drawings/cad/aad/) · **Guide:** [How It Works](https://fabingurung.github.io/JP_Computer-Aided-Drawings/guide/). The **CAD/AAD repository owns its AI-Aided Design template** at [governance/aad/aad-domain-template.v0.1.json](governance/aad/aad-domain-template.v0.1.json); **A7 is a read-only catalogue/index**, not the template authority; GitHub is the deterministic engine/code authority, not an AI model. See [versioned CAD guide adoption](governance/AI_AIDED_DRAWING_GUIDE_ADOPTION_v0.1.md).


The repository's **main product** is the versioned semantic-model editor at `/cad/aad/`, where one versioned synthetic draft drives linked 2D and 3D views, reusable one/two/three-room layouts, hosted interior and exterior openings, connected frame/grid geometry and local JSON. The homepage provides a single entry to this editor. Earlier standalone `/cad/` and `/cad/brief/` remain accessible as **historical prototypes**, not competing active products; their engines are retained for future capability migration. Project-specific viewers remain separate evidence layers.

## Five-engine M01

- **Three.js** — live browser viewport: orbital navigation, plan and elevation cameras, object picking, parameter edits, snap-move, clipping and draft undo/redo.
- **web-ifc** — client-side IFC geometry ingestion, WASM asset packaged with Vite; IFC import is a separate read-only overlay.
- **IfcOpenShell** — Python IFC4 spatial structure, genuine geometry representation and stable per-element IFC GUID generation.
- **OpenCascade Technology (cadquery-ocp)** — Python geometry-kernel boxes, STEP and solid/plane section.
- **ezdxf** — Python DXF plan extraction with semantic layers.

See [the historical M01 build/use guide](cad/README.md) and its [preserved standalone CAD prototype](https://fabingurung.github.io/JP_Computer-Aided-Drawings/cad/).

```bash
npm ci
npm run dev
npm run build
python -m pip install -r backend/requirements.txt
python -m unittest discover -s backend/tests -v
```

The sample model is a synthetic demonstration: `public/cad/demo.json`, with explicit `DEMO_ONLY` authority. **No Narayani or other private project files are copied into the engine.** Project and engineering sources remain owned by their respective providers.

### Separation and future
```text
cad/aad/                  Current shared-model 2D + 3D design workspace
cad/                      Preserved earlier Three.js + web-ifc browser editor
backend/cad_bridge/       IfcOpenShell + OCCT + ezdxf Python bridge
public/cad/demo.json      canonical shared synthetic test model
public/stages/             older governed project viewers (separate)
research/                  frozen earlier geometry research
governance/                GitHub lifecycle and A9 evidence
```

GitHub Pages is static hosting; it does not run the Python bridge. A later authenticated worker/API will be needed for browser-triggered IFC/STEP/DXF export. No automatic engineering approval, QTO authority or solved constraint system is implied.

Project viewers and history are deliberately retained as useful reference modules. Narayani M80 remains `CODAL_NOT_VERIFIED / HOLD`. Public-source restrictions on private Drive IDs and client records continue to apply.
