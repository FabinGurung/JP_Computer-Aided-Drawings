# Open Architecture — CAD Studio

The repository's **main objective is reusable, browser-first CAD/BIM engineering software**. The homepage opens the working `/cad/` studio; project-specific viewers are secondary adapter/evidence layers.

## Five-engine M01

- **Three.js** — live browser viewport: orbital navigation, plan and elevation cameras, object picking, parameter edits, snap-move, clipping and draft undo/redo.
- **web-ifc** — client-side IFC geometry ingestion, WASM asset packaged with Vite; IFC import is a separate read-only overlay.
- **IfcOpenShell** — Python IFC4 spatial structure, genuine geometry representation and stable per-element IFC GUID generation.
- **OpenCascade Technology (cadquery-ocp)** — Python geometry-kernel boxes, STEP and solid/plane section.
- **ezdxf** — Python DXF plan extraction with semantic layers.

See [the full M01 build/use guide](cad/README.md) and the in-browser [CAD Studio](/cad/).

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
cad/                      Three.js + web-ifc browser editor
backend/cad_bridge/       IfcOpenShell + OCCT + ezdxf Python bridge
public/cad/demo.json      canonical shared synthetic test model
public/stages/             older governed project viewers (separate)
research/                  frozen earlier geometry research
governance/                GitHub lifecycle and A9 evidence
```

GitHub Pages is static hosting; it does not run the Python bridge. A later authenticated worker/API will be needed for browser-triggered IFC/STEP/DXF export. No automatic engineering approval, QTO authority or solved constraint system is implied.

Project viewers and history are deliberately retained as useful reference modules. Narayani M80 remains `CODAL_NOT_VERIFIED / HOLD`. Public-source restrictions on private Drive IDs and client records continue to apply.
