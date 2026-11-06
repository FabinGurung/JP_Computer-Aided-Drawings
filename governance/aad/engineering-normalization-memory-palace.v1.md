# CAD / AAD Engineering Package Normalization and Memory Palace v1.0

## Table of contents
- [1. Project authority](#1-project-authority)
  - [1.1 The four existing real projects](#11-the-four-existing-real-projects)
    - [1.1.1 Evidence admission and engineering HOLDs](#111-evidence-admission-and-engineering-holds)
- [2. The 16 identical package slots](#2-the-16-identical-package-slots)
  - [2.1 Source-backed workbenches](#21-source-backed-workbenches)
    - [2.1.1 Original source stage identity and versions](#211-original-source-stage-identity-and-versions)
  - [2.2 Missing source gates](#22-missing-source-gates)
    - [2.2.1 Empty is not approved, and not zero](#221-empty-is-not-approved-and-not-zero)
- [3. Calculation and rod guardrails](#3-calculation-and-rod-guardrails)
  - [3.1 Steel / BBS](#31-steel--bbs)
    - [3.1.1 Theoretical rod unit weight versus cut length](#311-theoretical-rod-unit-weight-versus-cut-length)
  - [3.2 Concrete and rate ledgers](#32-concrete-and-rate-ledgers)
    - [3.2.1 Source-controlled net quantities](#321-source-controlled-net-quantities)
- [4. Memory architecture](#4-memory-architecture)
  - [4.1 Project memory palaces](#41-project-memory-palaces)
    - [4.1.1 Posters are not instructions for site execution](#411-posters-are-not-instructions-for-site-execution)
  - [4.2 Publication memory palace](#42-publication-memory-palace)
    - [4.2.1 Actions, Pages and provenance](#421-actions-pages-and-provenance)
- [5. The fake empty project](#5-the-fake-empty-project)
  - [5.1 Same actual workspace engine](#51-same-actual-workspace-engine)
    - [5.1.1 Excluded from live project registry](#511-excluded-from-live-project-registry)
- [6. QA and release](#6-qa-and-release)
  - [6.1 Static and browser tests](#61-static-and-browser-tests)
    - [6.1.1 A green schema does not equal design approval](#611-a-green-schema-does-not-equal-design-approval)

## 1. Project authority
### 1.1 The four existing real projects
#### 1.1.1 Evidence admission and engineering HOLDs
| Project | Original linked cards | Distinct source-backed engineering stage categories | Status |
| --- | ---: | ---: | --- |
| Narayani Parajuli | 7 | 7 | Source-linked frozen workbenches; M80 engineering HOLD, independent source gates remain |
| Harisharan Adhikari | 6 | 5 | The six cards reuse one study for several categories; values remain provisional |
| Ashok Adhikari | 1 | 1 | Architectural/MEP coordination only, not accepted structural detailing |
| Ramachandra Devkota | 0 | 0 | Public source admission absent; private project originals remain authoritative |

These are **not** numbers of approved site/fabrication packages. The site audit needs source-specific signed member details, tests and approvals.

## 2. The 16 identical package slots
### 2.1 Source-backed workbenches
#### 2.1.1 Original source stage identity and versions
The 16 slots are: survey, excavation, soling, PCC, footing reinforcement, footing RCC, starters/dowels, columns/lifts, plinth beams, upper floors, stairs, masonry, roof/waterproofing, tanks/septic/soak, MEP services, testing/handover. All four projects and the fictional dummy use this order.

The canonical normalized public-safe machine register is `public/data/engineering/engineering-package-readiness.v1.json`. The renderer has a CI-asserted exact matching manifest in `public/assets/js/project-engineering-normalization.mjs`. Each slot requires the same source inputs, calculation checks and field QA, but records distinct source-status and HOLDs.

### 2.2 Missing source gates
#### 2.2.1 Empty is not approved, and not zero
Unknown dimensions, bar counts, doses, dates, soil capacity and approval signatures must stay `null`; no zero-for-unknown. A source-linked original workbench does not certify engineering, and a shared Harisharan study is not five independent approved BBSs. Narayani original V02–M80 files remain byte-for-byte unchanged. No separate soling workbench was verified.

## 3. Calculation and rod guardrails
### 3.1 Steel / BBS
#### 3.1.1 Theoretical rod unit weight versus cut length
The `engineering-quantity-guardrails.mjs` math reference uses cylinder geometry:

`kg/m = (π/4) × (bar_diameter_mm/1000)^2 × steel_density_kg/m³`.
`total_kg = kg/m × engineer-accepted_cut_length_m × count`.

No universal rectangular/circular stirrup cut length exists without actual accepted cage shape, clear cover, hooks, bend allowances, development and lap rules. A circular concrete finish does not establish a circular bar cage. **No historic user rod diameters have been recovered and published as authoritative.**

### 3.2 Concrete and rate ledgers
#### 3.2.1 Source-controlled net quantities
`gross rectangular m³ = length_m × width_m × height_m`; net needs actual geometry/deductions. Bag count needs explicitly approved mix dosage and bag mass; never inherit a fixed cement dosage. The Harisharan provisional ~11.49 t steel and ~713 bags are source-specific scenarios, not template defaults. Cost and Scheduling are peer authorities; CAD references, not owns, their accepted records.

## 4. Memory architecture
### 4.1 Project memory palaces
#### 4.1.1 Posters are not instructions for site execution
Each project includes `/projects/<slug>/memory-wall/` with 7 chapters and 3-level TOC; the poster IDs track source authority, rod rules, actual availability and admission gates, quantity math, QA and version control. A template poster records the *method* and *required evidence*, not fabricated design facts.

### 4.2 Publication memory palace
#### 4.2.1 Actions, Pages and provenance
`/memory-wall/pages/` has an independent six-chapter, 3-level book of public UI, Actions, validation, deployment, readback and rollback. The main memory wall links both, while private source identities remain in controlled Drive. A7 stays read-only.

## 5. The fake empty project
### 5.1 Same actual workspace engine
#### 5.1.1 Excluded from live project registry
`/projects/example-empty/` runs the same five-chapter shared UI (with western chapter tree, east inspector and southern dock) and has exactly **no admitted geometry, packages, source files, rates, calendars, values or engineering approval**. It is not in `PROJECTS` (exactly four real records) or `data/projects.json`. Its JSON starter at `/templates/project-workspace/project-template.v1.json` has `packages: []`.

## 6. QA and release
### 6.1 Static and browser tests
#### 6.1.1 A green schema does not equal design approval
`tools/site/engineering-normalization-smoke.mjs` checks five workspaces with 16 slots each, source links, zero fake project values, null approvals, exact original frozen-stage SHA trees, steel formula guards, 3-level TOCs. `tools/site/engineering-normalization-browser.mjs` checks mobile and desktop, dummy, memory walls and Pages guides. Both join PR staging and production Pages CI. Engineering-specific verification remains a separate professional action and is NOT passed just because these software checks are green.

## Decision
Same **engineering documentation schema and site QA structure** across projects is achievable now. Equal **approved calculation completeness** cannot be certified until missing original source detail, code applicability, independent analysis and site inspections are actually supplied, checked and accepted. **No automated external Drive sync is claimed by this repo.**
