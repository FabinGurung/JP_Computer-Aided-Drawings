# CAD/AAD design-edition inheritance rule — v1.4.0

**Owner:** `FabinGurung/jp-drawing-coordination`. **Adopted:** 13 November 2026.  
**Machine contract:** [public/data/cad/design-edition-contract.v1.json](../../public/data/cad/design-edition-contract.v1.json).  
**Browser implementation:** [project-workspace-config.mjs](../../public/assets/js/project-workspace-config.mjs) and [project-workspace.mjs](../../public/assets/js/project-workspace.mjs).

## Rule: left rail is an edition book, not a file revision dropdown

Every changed **actual building design** that the owner elects to preserve creates a new, stable, source-linked design edition in the west rail's **Design edition / source version** selector. The preceding edition remains selectable with its original source/model bytes, ID, floor views and comparison/history. A new edition requires a separately named, public-safe derivative manifest or project design source where an admitted model exists. No in-place overwrite of an earlier accepted drawing; no inferred floor, loading or approval.

A distinct original **source family** may also be selected and is explicitly labelled SOURCE REVIEW/SOURCE PENDING. This does not invent a new building model, and a current-source pointer is not falsely described as an immutable architectural snapshot.

The following never create design editions by themselves: a CSS/theme/window-color update, shared-engine update, GitHub Pages/Actions deployment, release tag, test run, maintenance fix, source document R-revision, M-series engineering checkpoint, construction stage viewer or local browser draft. They are linked to the existing design edition as **separate history**.

## Canonical ownership and poster surfaces

1. **Canonical machine rule:** `public/data/cad/design-edition-contract.v1.json`. **Human/operator narrative:** this document and `governance/aad/project-workspace-standard.md`. Canonical CAD domain template: `governance/aad/aad-domain-template.v0.1.json`. These files are the authoritative rules. 
2. **CAD Memory Wall:** `/memory-wall/#editions` displays the rule. **GitHub Pages/Actions Memory Wall** covers release, verification and rollback, not a competing design registry.
3. **Each project memory poster:** inherits this rule via the common `cad-project-memory-palace.mjs`, then displays its own edition name, source kind/status and separately linked project records. A project poster is an index, not an independent source of design geometry.
4. **A7:** a read-only *federated discovery index*. CAD owns its domain template, code and normalised public drawings. **Do not write A7** in this CAD workstream; a later explicit A7 indexing task may add references to this owner URI.
5. **Drive:** original DWG/DXF/PDF, retained source documents, signed material and private client data stay with the authenticated project owner. No copied private originals between projects. Existing stable Drive IDs are preserved.

## Authoring a new edition from conversation or local edit history

1. Open the selected real project and source family/edition in the west rail. Record the baseline, floor(s), object IDs or building-local coordinates, why the change is needed, and its provenance. Browser **Request new design edition** opens a *local-only* instruction panel. It is not a publish/save button.
2. Use CAD tooling and authorized sources to interpret and reconcile the requested design; keep cross-floor dimensions, opening hosts, plot/building datums, and affected stairs/doors/columns consistent. Record unknowns, HOLDs and unsupported source details explicitly.
3. For admitted models, create a **new** project model and manifest path. Preserve the bytes of the prior published edition and maintain stable component IDs where geometry is unchanged. For source-only projects, retain an honest source-family record rather than fabricating floor geometry.
4. Register the new `edition.id`, `name`, `basis`, `kind`, `lifecycle`, `snapshotPolicy`, `predecessorId`, `sourceRef` and level/floor list in the shared project adapter, without overwriting old entries. A released review may still be **NOT FOR CONSTRUCTION**.
5. Validate source revision identity, geometry continuity, source-safe privacy, duplicate IDs, URL-to-edition-to-model round trips, cross-project shared-engine regressions, and accurate source-only placeholders.
6. Submit a bounded PR, require staging and linked studio QA, merge to main, publish Pages and verify independent live readback. Only then seal an immutable Git tag/release for the correct artifact. **An engine/template release is NOT a new building design edition.**

## Shared engine inheritance across all projects

The real project roots `/projects/ashok-adhikari/`, `/projects/narayani-parajuli/`, `/projects/harisharan-adhikari/` and `/projects/ramachandra-devkota/` all import **the same** `public/assets/js/project-workspace.mjs`. Their adapter/source data is different and remains project-owned.

- Ashok: `v3-3` is a released *architectural review* baseline; `v3-2`, `v3-grid`, `v3`, `v2`, `v1` remain selectable. Window colors and coordinate inspector fixes belong to the shared engine and the existing v3.3 visual milestone, **not v3.4 geometry**.
- Narayani: `source-current` is a current source-review family, not a fictitious v2 design. V02–M80 and M-series project reviews are evidence/workbenches, not editions.
- Harisharan: `without-basement` is a source-interpreted design option; its member/stage pages remain independent historic workbenches.
- Ramachandra: `rev02` is the source family with **no admitted public building model**. Display genuine unavailable states rather than pretend Ashok-style 2D/3D.
- The `example-empty` project is a fictional test fixture and must never become a real project, source admission, cost or issued design.

## Regression and rollback

`tools/site/project-design-edition-contract-smoke.mjs` verifies the edition registry, project source files, provenance and shared engine contract. `tools/site/project-design-edition-contract-browser.mjs` tests all projects, editor readiness, selector state, visible provenance, local-only change request and URL roundtrips on desktop/mobile. Old design JSON must remain untouched. If any project fails, fix or hold the template change before publishing. Git tag/release gates follow the exact-SHA staged → Pages → live-readback sequence.

**Engineering/municipal approvals remain separate; no CAD project browser or release tag substitutes for them.**
