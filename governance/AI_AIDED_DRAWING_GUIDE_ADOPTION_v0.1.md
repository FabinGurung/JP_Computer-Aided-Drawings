# AI-Aided Drawing — How It Works site adoption v0.1

**Canonical AAD template owner:** this CAD repository, [governance/aad/aad-domain-template.v0.1.json](aad/aad-domain-template.v0.1.json). A7 is a read-only cross-repository catalogue, not the template owner. Its previously published AAD-like document is a historical misplaced copy, not this module's active authority; do not edit A7 without a separately explicit user request.

## User-facing location

The existing website route [`/guide/`](https://fabingurung.github.io/JP_Computer-Aided-Drawings/guide/) becomes **How It Works**. Its entry must be reachable from the public home page, existing `/cad/` Studio and `/cad/brief/` language-to-3D pilot. Do not create a deeper “how-to” folder or require users to read `AGENTS.md`, Git histories, JSON schema or the A7 control-tower directory to operate the product.

The CAD-owned guide follows **UNDERSTAND → RESOLVE → VALIDATE → EXECUTE → VERIFY → VIEW → TRACE** from its versioned AAD template. It separates AI conversational interpretation from versioned computational kernels, shows what the user does, and explains what remains unverified. Progressively disclose detail rather than exposing many pages or engineer-specific language at entry.

## CAD-specific progressive product

- **Start:** Describe dimensions and requests in natural words or bring an existing authorized drawing. No hand-written engine JSON is required of the user.
- **Overview:** a clickable, navigable 3D model is the intended front page; linked orthographic views and sections come from shared geometry. Current M12.1 English subset is a *synthetic mass preview only*, not a full building detailed drawing.
- **Levels and components:** floor → room/work area → structural/architectural/MEP work → individual stable model component → accepted detail and explanation. Workers see concise color-coded, dimensioned instructions **only after verified project engineering approval**.
- **2D:** plans, elevations, sections, annotations, schedules/details derived from approved source geometry, not invented by AI.
- **4D:** a linked project-to-scheduling domain relation (tasks, work milestones, dependencies, sequencing) owned by the peer Scheduling repository.
- **5D:** verified geometry measurements linked to the separate Cost Estimation/approved rates and BOQ, not a calculation from unverified drawing preview.
- **3D and IFC/STEP/DXF:** own program executes deterministic CAD operators in GitHub CI or authorized runtime. ChatGPT can be replaced by any assistant producing the *same validated canonical request*, but ChatGPT's hidden internal capabilities cannot be copied into GitHub.
- **Missing facts:** ask targeted questions, never invent wall thicknesses, bar sizes, code compliance, construction sequencing, material rates, project completion or paid approval.

## Reproducibility contract

The reproducible unit is **(source bytes and revision + validated canonical intent + engine commit + dependency/runtime pins + deterministic settings)** with checked output artifact hashes. Identical unstructured human prompts do not promise byte-identical canonical inputs from different AI models or releases. The provider readback, independent CI and approvals define whether a result can be reused. No synthetic result may receive engineering `APPROVED`, `QTO_READY` or `ISSUED_FOR_CONSTRUCTION` merely because the CI passed.

## Original source and privacy

Project originals remain provider-native and access-controlled. Narayani current architectural and structural revisions are private **DWG**. A verified converted **DXF** suitable for M12.1 private intake has not been admitted; the GitHub public website and CI do not ingest that private data. Old Narayani stage viewers and stable URLs are preserved. No new construction or professional certification is implied.

## Version and regression

Source: `public/guide/index.html`, `index.html`, `cad/index.html`, `cad/brief/index.html`.
Canonical CAD/AAD: `governance/aad/aad-domain-template.v0.1.json` and `governance/aad/README.md`. A7 holds only index/links for discovery. Do not write A7 as a side effect of CAD changes.
Validation: `tools/site/check_public_routes.py` asserts the deployed `/guide/` route, seven stages, CAD 2D/3D/4D/5D caveats, source/future approval boundary and navigational access from home, CAD Studio and browser brief.

Release procedure: feature branch → PR → all GitHub checks → merge to main → GitHub Pages/staging provider readback; preserve earlier routes and source histories. Git-native lineage uses old/new commit SHAs. Any separately required A9 Local/Main domain registry procedure remains a distinct source-governance process, not an excuse to duplicate copies of the same Git-only documentation change.
