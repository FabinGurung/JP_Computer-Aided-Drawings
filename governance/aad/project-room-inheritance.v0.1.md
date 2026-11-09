# CAD/AAD project-room inheritance — system reference v0.1
Status: **public-safe design reference**, not a folder migration, engineering release, Drive authentication claim or independent A7 policy.

## Purpose
The shared \`FabinGurung/JP_Computer-Aided-Drawings\` engine serves independent source-controlled building projects. A project imports the shared *tooling contract*, not another client's material quantities, design geometry, support relationships, source permissions or approvals.

This reference is intentionally narrower than [A7 system authority](https://github.com/FabinGurung/JP_A7_System_Registry_and_Knowledge_Graph) and the existing [CAD Control Tower](../../public/data/cad/view-control-tower.v1.json). Neither authority is superseded.

## Observed precedent — research project rooms
The current research repository uses \`controls/researcher-folder-contract.json\`, \`docs/RESEARCHER_ENGINE_READ_FIRST.md\`, and \`registry/researchers.json\`: folders have logical roles, original provider IDs remain authoritative, physical migrations are not automatic, individual source edits are isolated, and shared-engine modifications use a separate reviewed PR. This is a *design precedent*, not a direct copy of researcher sequence allocation or manuscript gates.

## Authorities and admission
| Layer | Governing role | Independent check |
|---|---|---|
| A7 | Global stable project identity, repository routing and cross-system relationships | Read current registry and module manifest; respect unresolved A7-N04 CAD manifest HOLD |
| Project Drive room | Original client DWG/DXF/PDF, native Docs/Sheets, signatures and restricted evidence | Resolve **existing** folder/file IDs and permissions; name-only matches are not authoritative |
| CAD GitHub | Shared renderer, model/schema/adapter code, project-specific normalized public-safe records, project review gates | Trace stable project, floor, source, edition and member IDs |
| CAD Actions/Pages | Validation, reproducible releases, derived public-safe visualizations and independent deployment readback | Check exact SHA and runs; never treat visual checks as structural authorization |
| Owning project engineering team | Actual member design assumptions, decisions, source conflicts and approval | Preserve OPEN/HOLD until independently evidenced; no cross-project transfer |

### Admission workflow
1. Resolve global project identity, owning enterprise and the current existing Drive room(s) through approved A7/A9 records.
2. Classify multiple matching Drive folders as **unresolved** until the owner-control record identifies the canonical source. Search results alone are not sufficient.
3. Preserve original file IDs and permitted metadata; never publish private provider IDs, source bytes, permission lists or signed files in this public repository.
4. Register project adapter, floor/edition source-coordinate frame, controlled element identities and lineage through the **existing** CAD project-workspace contract, not a second competing registry.
5. Preserve the five chapters: Views; Quantities/BOQ; Programme/Gantt; Packages/Site Modules; Sources & Records. Keep the independent 100 mm measurement grid distinct from source A1/B2 axes.
6. Mark unknown quantities, support, duration, source registration and approval as HOLD/null. Unit tests and UI publishing cannot close engineering gates.
7. For owner-specific edits use a scoped PR and preserve source identity; for shared-engine edits run affected-project regressions. Never force-push or mass-rename Drive folders.
8. Maintain versioned PRE/POST history under the actual owning subject contract; avoid duplicating Git history when not required by that contract.
9. Independently verify provider readback, GitHub Actions and Pages publication before reporting success.

### Existing project roots (public routing only)
- [Narayani Parajuli](../../public/projects/narayani-parajuli/index.html) — engineering M34 source interpretation and M35 upper-floor source proof are *project* milestones, not shared engine releases.
- [Ashok Adhikari](../../public/projects/ashok-adhikari/index.html) — architectural layout decisions belong to the Ashok team.
- [Harisharan Adhikari](../../public/projects/harisharan-adhikari/index.html) — independent work packages and source-review history.
- [Ramachandra Devkota](../../public/projects/ramachandra-devkota/index.html) — existing project landing.
- \`public/projects/example-empty/\` — fictional validation fixture only.

## Current audit boundaries — 2026-11-09
- At audited CAD \`main\` \`24926c54ee49e479012736ab38819c2dfda18c83\`, twelve workflow YAMLs and the shared Control Tower/project-workspace standard exist. This is a historical baseline; re-read live \`main\` every time.
- Google Drive folder-name searches for Narayani and Ashok returned multiple plausible named folders, historical archives and indexes. **Canonical Drive project-room IDs were not resolved** in this change and no Drive files were moved or edited.
- The exact current project's Drive mapping, its permitted derived projection and any Google authentication route are independent pending tasks. Record \`unverified\`, not empty guessed IDs.
- A7's read-first document identifies a CAD current-default-branch module-manifest HOLD (A7-N04). This document does not close it.
- Nothing in this reference authorizes engineering calculations or construction issue.

## User-facing navigation contract
The [CAD Knowledge Centre](../../public/knowledge-centre/index.html) is a **single entrance**, pointing to four separate authorities: [A7 Memory Wall](https://fabingurung.github.io/JP_A7_System_Registry_and_Knowledge_Graph/memory-wall.html), [CAD Memory Wall](../../public/memory-wall/index.html), [CAD Control Tower](../../public/templates/project-workspace/control-tower/index.html) and [Pages/Actions Memory](../../public/memory-wall/pages/index.html). Existing URLs and source authority remain unchanged. Project-specific memory stays with the project.
