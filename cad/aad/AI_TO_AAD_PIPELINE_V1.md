# AI-to-AAD project generation pipeline (v1)

## Architecture

**No LLM is hosted in GitHub Pages.** ChatGPT or any AI assistant reads a user request and any user-provided drawings, resolves geometric constraints, then authors a machine-readable design specification conforming to **jp-cad://aad-ai-design/1**.

The repository provides a deterministic compiler (no LLM calls), CAD/AAD model validator, IFC writer, independent IFC4 parsing, GitHub Actions/browser tests and shared Pages renderer. All project-specific output is **data and a very thin launch page**, never a copied CAD engine.

    Natural-language request + user-approved source files
      -> AI (ChatGPT or another client)
      -> design_jobs/<source>/project-design.json (version-controlled)
      -> tools/site/aad-ai-generate.mjs --check
      -> explicit publication approval
      -> tools/site/aad-ai-generate.mjs --publish
      -> tools/site/aad-validate-project.mjs <manifest>
      -> independent IFC4 parse + live 2D/3D browser QA
      -> GitHub PR, approved merge, Pages deployment
      -> /projects/<slug>/aad/ (the existing shared editor)

## How to use ChatGPT as the design author

Say, for example:

> Create an AAD building project named Example Residence from my requirements and attached drawings. Work in metres, derive a complete connected 2D wall graph and a consistent multi-storey coordinate system, identify all assumptions, and publish it using our versioned AI-to-AAD design schema and existing shared engine. Do not invent engineering approval. Use a branch, run CI, and give me the project Pages URL.

ChatGPT creates the JSON specification with **exact metre coordinates and named partitions/openings**. It does **not** need to ask the user to type CAD commands. It calls connected GitHub actions to add the spec to a working branch, letting Actions execute the pipeline. If source measurements are insufficient, ChatGPT may make explicit **conceptual** choices but must distinguish them from actual surveyed or engineering-authorized facts.

**AI output is a data contract, not a prompt interpreted by GitHub.** The repository never has to parse free-form language or store user API credentials.

## Required design schema

Reference synthetic example: \`design_jobs/synthetic/aad-ai-two-storey.json\` (NOT a client building).

\`\`\`json
{
  "schema": "jp-cad://aad-ai-design/1",
  "project": {
    "id": "AAD-EXAMPLE-01",
    "slug": "aad-example",
    "name": "Example Two-Storey Concept"
  },
  "units": "m",
  "publication": {
    "mode": "synthetic-demo",
    "publicApproved": true
  },
  "evidence": {"kind": "synthetic", "status": "NOT_SURVEYED"},
  "levels": [
    {
      "id": "gf", "name": "Ground", "elevation": 0, "height": 3,
      "outline": [[0,0],[10,0],[10,8],[0,8]],
      "exteriorWallThickness": 0.23,
      "partitions": [
        {"id":"middle","start":[5,0],"end":[5,8],"thickness":0.15}
      ],
      "openings": [
        {"host":"middle","kind":"door","offset":1,"width":0.9,"sill":0,"height":2.1}
      ],
      "roomLabels": ["Living", "Bedroom"]
    },
    {
      "id": "ff", "name": "First", "elevation": 3, "height": 3,
      "outline": [[0,0],[10,0],[10,8],[0,8]],
      "partitions": [], "openings": []
    }
  ],
  "structural": {
    "columns": {"gridX":[2,8],"gridZ":[2,6],"sizeX":0.3,"sizeZ":0.3},
    "beams": {"widthX":0.25,"widthZ":0.25,"depth":0.45},
    "slabs": {"thickness":0.18,"roofThickness":0.18}
  },
  "stairs": {"opening":{"x":3.7,"z":2,"width":2.1,"depth":3},"risers":18}
}
\`\`\`

A real project uses \`publication.mode = "owner-approved-public"\` **plus** \`publicApproved:true\` and a grounded \`approvalReference\` to avoid accidentally publishing private client geometry. Approval must come from the user and may not be invented by the AI. For privacy-sensitive data, do **not** invoke public publishing; use a separate private repository/workflow.

**Precision:** X and plan-depth Z are in metres; storey elevation is Y. Footprints must be counterclockwise and non-self-intersecting. The compiler computes outline area with shoelace geometry; that **is not a source-measured floor area**. A partition creates connected wall segments, auto-splitting along existing walls. The same-host opening offset is measured from the chosen wall start. A partition may split into multiple segments; the AI must specify \`segment\` when hosting against such a partition alias.

**Engineering:** The supplied column grid, slab thickness, beams and stairs are **illustrative engineering assumptions**, not code-checked structural solutions. The generator hardcodes engineering HOLD and issueForConstruction=false. Existing Narayani structural authority and frozen CAD stages are unaffected.

## CLI

From repository root:

\`\`\`sh
node tools/site/aad-ai-pipeline-smoke.mjs
node tools/site/aad-ai-generate.mjs design_jobs/synthetic/aad-ai-two-storey.json --check
node tools/site/aad-ai-generate.mjs design_jobs/synthetic/aad-ai-two-storey.json --publish
node tools/site/aad-validate-project.mjs public/data/projects/aad-ai-demo/aad-building-v1.json
\`\`\`

\`--check\` never writes files. \`--publish\` verifies explicit permission and refuses to overwrite existing different files. It writes a generated project manifest, each floor JSON, QA ledger, IFC4, a project overview and its editor launcher. The output is deterministic given the same compiler and exact specification SHA-256. GitHub Actions generate the synthetic test before Vite builds the public site, then run built-page browser tests and an independent IfcOpenShell parser.

**Public route for demonstration:**
\`https://fabingurung.github.io/JP_Computer-Aided-Drawings/projects/aad-ai-demo/aad/\`

**Reusable route for actual project data:**
\`https://fabingurung.github.io/JP_Computer-Aided-Drawings/projects/<your-slug>/aad/\`

## Future work (not falsely claimed here)

This v1 pipeline does not itself run an LLM, infer guaranteed code-compliant structure, automatically interpret arbitrary scanned drawings or manage authenticated private approvals. Advanced semantic BIM objects, independently verifiable IfcSpace boundaries, real structural loads and fully governed source reconciliation remain distinct future tasks. No AI-generated building should be issued for construction without engineering verification.
