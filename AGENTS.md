# CAD / AAD — repository-scoped agent instructions (READ FIRST)

## Non-negotiable ownership boundary

**A7 is a READ-ONLY federated catalogue / library index for CAD tasks.** It may identify modules, website links, owners, version pointers, statuses, dependencies and history. It is **not** the owner or writable destination for AI-Aided Design templates, CAD source, engineering rules, normalized CAD models, application pages or release outputs.

**DO NOT change A7** from this CAD/AAD workstream: no commits, branches, pull requests, JSON/JSONL policy edits, README/website changes, automated registry sync, provider history updates or control-tower rewrites. This prohibition also applies to “repairing” an A7 index that appears stale. If its catalogue entry seems outdated, record the desired change as a CAD-side pending cross-reference and ask for a **separate, explicitly user-authorized A7 task**. A general request to fix CAD, update templates, publish CAD or reconcile a release **is not** authorization to mutate A7.

**Canonical AAD/CAD template:** `governance/aad/aad-domain-template.v0.1.json`. Human/operator contract: `governance/aad/README.md`. This CAD repository owns all CAD domain rules, drawing templates and engine validation. Earlier A7 `policies/global/ai-aided-product-guide.v0.1.json` is historical/misplaced, not the authoritative writer; leave it untouched unless the user separately authorizes a migration in A7.

## Authorized CAD work

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
