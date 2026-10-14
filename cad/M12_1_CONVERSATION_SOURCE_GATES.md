# M12.1 — AI-aided drawing: user language + deterministic GitHub engine

**User model:** An engineer, designer or worker writes a normal sentence such as “A building 9 m long, 7 m wide, 2 floors with floor height 3 m.” There is no requirement to manually construct JSON, a schema, or geometry parameters. The browser route `/cad/brief/` interprets a **small documented subset** of these phrases locally and renders a source-labelled interactive 3D *envelope*, with storey filtering and a basic level section. It does not claim general language understanding. Wider requests are interpreted by ChatGPT (or another AI), which must provide exact source spans to the deterministic engine contract.

## Architecture: where ChatGPT ends and GitHub begins

1. **Conversational interpretation (LLM at runtime):** translate normal user language, drawing references, corrections and questions into evidence quotes and candidate facts. Ask only for dimensions that are not present. Do not invent sizes, materials or structural design.
2. **Deterministic parameter validation (versioned Python):** `backend/cad_bridge/conversation_contract.py` re-parses numeric quantities and units from the literal quoted parts of the original utterance, checks quotation inclusion, converts feet/metres to millimetres, enforces plausible geometric bounds, blocks duplicate or fabricated facts and returns exact missing-field questions.
3. **Versioned geometry kernels (GitHub source + CI):** continue using ezdxf, OpenCascade/OCP, IfcOpenShell, Three.js, web-ifc. GitHub does not inherently supply a language model; the checked-in geometry source runs in CI, private compute, or an authorized backend. AI output cannot bypass the validation gates.
4. **Viewer (browser):** 3D-first inspection, pick a floor, orbit, switch to plan/elevation, inspect all supplied dimensions and unresolved work. The existing CAD Studio `/cad/` remains available and links to the conversational mode. This increment previews a building *mass*, not walls/doors/stairs/rebar. A later source-verified semantic compiler must drive those.
5. **Level-of-detail expansion:** select building -> floor -> discipline -> element -> work item -> approved drawing/details/instruction. Visibility, label/color, source revision, measured dimensions, acceptance status and role filter must be governed by typed identities. Workers receive approved execution views only.
6. **4D/5D later:** 4D is model elements linked to verified schedule tasks and dependencies (not extra geometry dimensions). 5D is approved QTO to rate-library/financial linkage in the separate cost repository. The CAD repo owns FIDs and geometry, not actual rates, finance authority or an independent BOQ.

## Real Narayani source audit (read-only)

The verified live intake manifest in Drive identifies Narayani project `PRJ-000007` and records current architectural/structural **DWG** revisions, separate older alternatives, ETABS models, PDFs and SketchUp. As of the 2026-10-14 intake scan, no verified Narayani DXF is available to this engine. These drawings remain **Drive-restricted originals**; do not commit original DWG/DXF/PDF bytes, metadata pointing to private paths, source text, thumbnails, clients' geometry or credentials in GitHub. No live model fidelity, engineer approval or current-version parity can be claimed from metadata alone.

To execute real DXF intake, an authenticated private runner must fetch the approved DWG, record current provider version and SHA256, convert using appropriately licensed conversion software **without changing original**, confirm converted DXF parity and declared units, and place the DXF into a private location. The current public CAD Github runner cannot access Drive credentials or perform this conversion. `backend/cad_bridge/dxf_inventory.py` can then inspect it **locally**: original SHA256, entity handles, layers, blocks, unit declaration, unresolved splines/inserts/bulges, and counts. It does **not** infer that lines are walls or compute production quantities. Prior `dxf_intake.py` can produce bounded review overlay after an explicit region is chosen.

## Example AI-to-machine payload (synthetic)

```json
{
  "schema": "fabin-cad://spoken-cad-intent/0.1",
  "project_id": "DEMO-M12",
  "authority": "UNVERIFIED_BRIEF",
  "utterance": "A building 9 m long, 7 m wide, 2 floors with floor height 3 m.",
  "facts": [
    {"field":"length_mm","evidence":"9 m long"},
    {"field":"width_mm","evidence":"7 m wide"},
    {"field":"storeys","evidence":"2 floors"},
    {"field":"storey_height_mm","evidence":"floor height 3 m"}
  ]
}
```

Run: `python -m backend.cad_bridge.conversation_contract --infile synthetic_intent.json --out validated_intent.json`.
No future AI may give geometry without traceable literal evidence or verified drawing input. Required confidence and ambiguity remain explicit. AI interpretation may use more advanced model capabilities, but the versioned validator and geometry runtime are reproducible without relying on a hidden model's internal reasoning.

## Current release constraints

`/cad/brief/` supports only explicit English dimensional wording (length/depth, width/breadth, number of storeys, per-storey height, basic mm/m/cm/ft input); unsupported phrasing triggers a concise follow-up. Geometry is translucent volumes, not a structural model. No static GitHub Pages UI can execute the full Python backend without an authenticated service. Private project execution is **NOT CONFIGURED**.

`engineering_approval=HOLD`, `quantity_takeoff=BLOCKED`, `construction_release=BLOCKED` remain hard controls. A production worker instruction must cite accepted design revisions and engineering approvals, and cannot be inferred from this demo.

## Next step: M12.2

Build an authenticated private project conversion/adaptor service that can resolve Drive records read-only; vet DWG-to-DXF provenance, current revision, coordinate transform and units; run the existing native models privately; and return explicit draft previews with review items. Then deepen the viewer to architectural walls/openings/structural/MEP component selection using stable FIDs and approved details. Do not reimplement the prior M1–M11 milestones per project.

## Governance

After successful PR CI, main merge and Pages readback, register SEQ36 only if live A9 Local/Main 35/35 remains unchanged. Make provider-verified PRE and POST rollback copies and validate complete current Local IDs and semantic relationships before claiming full ACK.
