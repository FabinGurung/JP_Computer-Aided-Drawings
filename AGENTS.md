# CAD / AAD — repository-scoped agent instructions (READ FIRST)

## Non-negotiable ownership boundary

**A7 is a READ-ONLY federated catalogue / library index for CAD tasks.** It may identify modules, website links, owners, version pointers, statuses, dependencies and history. It is **not** the owner or writable destination for AI-Aided Design templates, CAD source, engineering rules, normalized CAD models, application pages or release outputs.

**DO NOT change A7** from this CAD/AAD workstream: no commits, branches, pull requests, JSON/JSONL policy edits, README/website changes, automated registry sync, provider history updates or control-tower rewrites. This prohibition also applies to “repairing” an A7 index that appears stale. If its catalogue entry seems outdated, record the desired change as a CAD-side pending cross-reference and ask for a **separate, explicitly user-authorized A7 task**. A general request to fix CAD, update templates, publish CAD or reconcile a release **is not** authorization to mutate A7.

**Canonical AAD/CAD template:** `governance/aad/aad-domain-template.v0.1.json`. Human/operator contract: `governance/aad/README.md`. This CAD repository owns all CAD domain rules, drawing templates and engine validation. Earlier A7 `policies/global/ai-aided-product-guide.v0.1.json` is historical/misplaced, not the authoritative writer; leave it untouched unless the user separately authorizes a migration in A7.

## Shared design-edition rule — mandatory for all CAD/AAD projects (13 November 2026)

Before editing a project design edition or source revision, READ
`public/data/cad/design-edition-contract.v1.json` (machine authority)
and `governance/aad/design-edition-lifecycle.v1.md` (operator guide).

- Every preserved owner-directed change to **real architectural design geometry** creates a new, separately named source-backed design edition in the west-rail **Design edition / source version** selector. Preserve immutable earlier admitted manifests and their URLs; show predecessor, source and lifecycle.
- Source-family pointers, document R-revisions, M checkpoints, shared-engine/theme/window-color releases and Git tags are **not** by themselves new building design editions.
- All four current project entrypoints and the fictional empty starter import the same versioned `public/assets/js/project-workspace.mjs`; change shared engine/template in CAD once and test each project. Never reuse Ashok's house model as Narayani, Harisharan or Ramachandra data.
- The local **Request next design edition** control records instructions only. A reviewed source/geometry PR, Actions, Pages deployment and independent live readback create the selectable published edition.
- A7 remains READ ONLY. CAD policy and human memory posters belong here; a separate explicit A7 scope is required to update the A7 index.
- Require `node tools/site/project-design-edition-contract-smoke.mjs` and cross-project browser tests. No fake model for pending public sources.

## Authorized CAD work

### Code and document controls (adopted 2026-10-28)

Read `governance/aad/document-control.json` before editing any maintained project
Google Doc. Resolve its stable logical ID in Drive. Archive and verify the
complete existing native Doc under its existing revision, then update the SAME
current provider ID with a revision-guarded write and increment by one. Create a
current Doc only for first registration. Record verified before/after hashes and
the archive receipt. Private calculation/audit alternatives stay in that Doc;
do not create parallel public draft/audit editions or leak private provider IDs.
The user has authorized this archive-before-update convention; routine compliant
snapshots do not require repeated approval.

For every new project, resolve jurisdiction, occupancy, parcel/ROW conditions and
current code editions. Use `public/data/codes/nepal-pokhara.json` only within its
scope, read the linked original clauses, and record missing/superseded evidence.
Run `node tools/site/aad-code-document-smoke.mjs`. A code-table eligibility failure
routes to project-specific engineering; source snippets or neighbouring projects
cannot establish member/footing sizes. No assumed soil class, permit or percolation
rate may become a compliance pass. The CAD Memory Wall is `/memory-wall/`.

1. Read `README.md`, `governance/aad/README.md`, this file, and only relevant native CAD controls.
2. Fetch live CAD branch/commit/source-revision; respect provider authority for private original DWG/DXF and engineering decisions.
3. Use a bounded **CAD repository** branch, PR, source tests, CI, and native Git readback. Preserve existing project URLs, synthetic/real-data boundaries and A9 obligations when truly applicable.
4. AI translates everyday language into evidence-grounded candidate facts; native versioned validators and geometry kernels execute; don't invent dimensions or claim hidden LLM code was copied into GitHub.
5. Product UI starts in 3D, progressively links plans/sections/details, and marks 4D and 5D integrations as pending until verified in their owning peer repositories.
6. Worker-issued drawings require authenticated current project revision, accepted engineering details and actual approval; synthetic proof ≠ site instruction.

## Peer services, not nested directories

- `JP_Structural_Analysis`: structural model/analysis ownership.
- `JP_Scheduling_Work_and_Resources_Management`: activities/calendars/4D ownership.
- `JP_Cost_Estimation`: BOQ/rates/5D ownership.
- `JP_Communication-Command-Centre-and-Resource-Hub`: operational/project evidence ownership.
- `JP_Research-and-Development`: research/document engineering ownership.
- `JP_Study_Hub`: learning-source ownership.
- `JP_A7_System_Registry_and_Knowledge_Graph`: read-only catalogue/routing index for CAD.

Never attempt to enforce these agent instructions as account-wide permissions: GitHub provider access is controlled independently. This file is a workflow rule for agents entering this repository.

## CAD drawing control tower — mandatory source/axis lineage (adopted 2026-11-08)

For every newly submitted plan, drawing, sheet or AI-derived architectural
revision in this **CAD repository**, read:
- `public/data/cad/view-control-tower.v1.json` (machine-readable governing
  chapter and axis display contract);
- `governance/aad/project-workspace-standard.md` (human-facing standard 1.3);
- `public/assets/js/cad-view-control-tower.mjs` (read-only evaluator);
- `public/templates/project-workspace/project-template.v1.json` (null-safe
  empty source-intake template).

Before editing a new plan, enumerate source file/revision and its vertical
GF/FF relationships. Extract **real source-supported** column letter axes and
number axes (e.g. A–C and 1–5) with unique intersection/member IDs, distances,
orientations, and source/engineer status. Keep the independent 100 mm cursor
grid separate. Missing, conflicting or only illustrative axes MUST be
`AXES_NOT_ADMITTED` / `REVIEW_ONLY`; never create fictitious column positions,
support paths or footing sizes to complete an otherwise nice grid.

Maintain identical source and model IDs across the five owner-visible
chapters: 2D/3D Views, Measurements/BOQ, Programme/Gantt, Packages/Site Modules,
and Sources & records. Missing engineering quantities, accepted unit rates,
durations, approvals, bar sizes and bearing capacities are explicit null/HOLD,
not assumed zero. All derived data must carry project, edition, floor, revision,
axis/source and units. If a peer Cost/Scheduling repo is the owning writer,
record a pending handoff and do not claim remote changes without provider writes
and readback.

The north region owns chapter changes, west owns edition and active subsection,
east owns contextual evidence, and south owns **unique review checkpoints**;
never create duplicate navigation for the same purpose in cardinal directions.
Run `node tools/site/cad-control-tower-smoke.mjs`, the control-tower browser QA,
and repository CI; original editions, source-owned workbenches and engineering
HOLDs remain intact.

These instructions do not authorize A7 modifications or a construction
approval. Actual source ingestion and client/provider publication require
authenticated readback.
