# CAD Project Workspace Standard 1.1 — site package book

The single supported public project template has **five independent chapters**:
1. Views (linked 2D / 3D by floor and phase)
2. Quantities / BOQ (derived geometry with measurement basis)
3. Programme / Gantt (admitted programme or clearly labelled scenario)
4. Packages / Site Modules (site-useful source-backed construction workbenches)
5. Sources & records (plans, provenance, assumptions, history, approvals)

**Four-direction interface**: north = project, edition context and chapter tabs; west = versions, chapter tree, source sections; east = context inspector, current package source revision, status and honest quick actions; south = persistent package shortcut dock. On narrow screens west becomes a labelled drawer, east stacks beneath content and the south dock scrolls horizontally.

## Package format and preservation
Every linked package card shows: title, original module/version label, status, source-backed scope, short description, source location and engineering qualification. It links to the **original** viewer: no copying or overwriting any frozen stage files. Harisharan's foundation-to-plinth materials module now uses the **same card format** as Narayani's original V02–M80 package records.

A project may have **zero** admitted site packages. Absent work remains explicitly pending. A **FROZEN** publication is not an engineering approval. The Narayani M80 tank remains on HOLD. Harisharan estimates remain provisional; Ashok is architectural/MEP coordination only; Ramachandra has no admitted public package.

### Reuse by new projects
- Create a new project source registry and resolve the canonical Drive originals and current approved revision.
- Fill the [machine-readable sample](../../public/templates/project-workspace/project-template.v1.json) and validate it against [canonical JSON Schema](site-package-workspace-template.v1.json). Never copy example values as building measurements.
- Add a project adapter in the CAD-owned `public/assets/js/project-workspace-config.mjs` without overwriting another project's edition.
- Register only actual source-linked packages with evidence and HOLD status in the CAD-owned package catalogue. Keep private Drive URLs/IDs in restricted Drive.
- Run `node tools/site/project-workspace-smoke.mjs`, `node tools/site/site-package-standard-smoke.mjs`, `node tools/site/project-workspace-browser.mjs` and normal CAD staging build/CI.
- Publish via the bounded CAD PR + verified main Pages workflow; no A7 writes, no forced merges, no implied fabrication approval.

Full original content and existing URLs remain available. Version, design edition and document revision must not be conflated.
