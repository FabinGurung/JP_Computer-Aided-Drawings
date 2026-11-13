# CAD/AAD v1.4.0 — Design Edition Inheritance & Shared Project Engine

**Milestone tag:** `aad-edition-inheritance-v1.4.0-review.1`  
**Type:** immutable shared-template / website interface review prerelease  
**Date:** 13 November 2026  
**Authority:** `FabinGurung/jp-drawing-coordination` · **no A7 changes**  
**Safety:** no altered source building geometry, structural/permit approval or client native Drive files.

## Released principle

The west-rail **Design edition / source version** is an actual source-backed project edition book. A distinct owner-accepted design geometry revision gets a new source model/manifest and a new selectable edition with predecessor. Accepted earlier editions remain immutable and selectable. Source families are separately labeled, and Git releases, M-series engineering checkpoints, document R-revisions, UI/renderer changes and 2D/3D window color updates never manufacture new building designs.

- Machine authority: `public/data/cad/design-edition-contract.v1.json`.
- Agent/operator guidance: `AGENTS.md`, `governance/aad/design-edition-lifecycle.v1.md`, `governance/aad/project-workspace-standard.md`.
- Reusable template: `governance/aad/aad-domain-template.v0.1.json` (implementation **0.3.4**), `public/templates/project-workspace/project-template.v1.json` (empty-source edition contract **1.4.0**).
- Browser: `public/assets/js/project-edition-contract.mjs`, common `project-workspace.mjs` and versioned project adapters. The west selector discloses edition kind, predecessor, source and lifecycle. **Request next design edition** is explicitly browser-local, not an auto-save or approval.
- Human references: global CAD Memory Wall, GitHub Pages/Actions Memory Wall, reusable template guide and every project Memory Palace via one shared poster generator.

## Propagation

| Project | Edition/source selection | Inherited engine | Intent |
|---|---|---|---|
| Ashok Adhikari | v3.3, v3.2, v3.1, v3, v2, v1 | CAD workspace 1.4.0 + existing AAD 2D/3D | v3.3 is released review baseline; no change to window/door/column/stair model bytes |
| Narayani Parajuli | Current source-review family | CAD workspace 1.4.0 + shared AAD 2D/3D | Preserve V02–M80 engineering workbenches and source HOLDs |
| Harisharan Adhikari | Without-basement design option | CAD workspace 1.4.0 + existing Harisharan project model viewer | Preserve all source geometry and site stage modules; no false AAD model conversion |
| Ramachandra Devkota | REV02 source family | CAD workspace 1.4.0 + honest source-only empty state | Public building model not admitted; no invented floors/quantities |
| Fictional empty project | Empty template only | CAD workspace 1.4.0 | No real client/source/structure |

All project roots already import the same `project-workspace.mjs`; there are **not five cloned drawing engines**. Feature improvements are shared. Independent structural analysis and native Drive authority remain outside the scope.

## Required proof

- Edition contract and source file smoke: `node tools/site/project-design-edition-contract-smoke.mjs`
- Five-route desktop/mobile browser regression: `node tools/site/project-design-edition-contract-browser.mjs`
- Existing AAD, site, package and normalized source tests stay enabled.
- Merge only after green required PR checks; require matching-SHA production QA, Pages deploy and independent live-site readback.
- Annotated tag/release created after all those checks, not before. Preserve all historical refs and v3.3 milestone `ashok-v3.3.0-window-visibility-review.1`.

**NOT FOR CONSTRUCTION.** Passing an interface/edition audit is not design or structural engineering approval. Source-pending project states remain pending.
