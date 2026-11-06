# Project workspace standard 1.0

The project front doors for Narayani Parajuli, Ramachandra Devkota, Ashok
Adhikari and Harisharan Adhikari use one CAD-owned navigation shell. This is
an interface standard, not a new project design issue or engineering approval.

## Hierarchy and placement

Design edition / current source version → numbered chapters → named sections
→ construction phase / floor. Versions describe design alternatives or baselines;
document revisions, software versions and M-series checkpoints remain records.

| Region | Contents |
| --- | --- |
| Left | Edition selector, chapter tree, floor and source subsections |
| Top | Project identity, chapter tabs, phase, plan/model layout |
| Centre | Linked 2D plan on the left and 3D model on the right |
| Right | Shared selection, layers, optional MEP/pins and review tools |
| Bottom | Component/room register, measurements, drafts and exports |

On narrow screens the views stack with 2D first, and the chapter tree opens
from a labeled menu. Phase, chapter and layout survive share links and reloads.

## Chapters

1. Views: both viewports use the same phase, model and selected component ID.
2. Quantities / BOQ: measurement basis and component register; no mixed-unit
   totals, invented prices or zeroes substituted for unknown quantities.
3. Programme / Gantt: admitted programme or explicit availability state. The
   Harisharan calculated planning scenario remains local to CAD, not a verified
   live Scheduling integration.
4. Sources & records: original plans, visual references, qualifications, work
   packages, earlier interfaces, source fingerprints and document controls.

## Project adapters and preservation

- Ashok: current v2 and actual frozen pre-MEP v1 use the same multistorey engine.
  The v1 source bundle is preserved from commit
  `49a26473c7e4d58331784fde510e7d6bd60870ee`; its provenance is beside the bundle.
  UI changes do not create a v3 design. Existing v2 site conflicts stay open.
- Narayani: the current source-review manifest and shared AAD engine stay primary.
  V02–M80 packages remain immutable records. Upper-storey structure is not invented.
- Harisharan: one existing source model powers both viewports and per-floor
  summaries. Each floor phase includes its vertical work and overhead slab;
  incomplete BBS/void deductions remain visible. The detailed plinth module stays
  at its existing URL.
- Ramachandra: REV02 remains the current CAD source family. Public geometry and
  schedule admission are pending, with the same navigation and honest empty states.

Earlier project interfaces are retained as `record.html` in the same directory;
their relative assets and existing links remain intact. They are reference
records rather than competing design editions. Harisharan's earlier full study
remains at `workspace/`; its root now uses the common project shell. Private
engineering documents and original files remain with their existing providers.

## Reference decision

The user supplied the Basanti V9 workbench at
<https://pailapilates09-sys.github.io/CAD_Test-Facility/construction/models/basanti-workbench/v9/>
and its repository <https://github.com/pailapilates09-sys/CAD_Test-Facility>.
Its task grouping (Views / BOQ / Gantt / Sources) informs chapter organization.
Ashok's existing shared-engine selection and geometry remain the drawing engine.
The version-first book hierarchy and distributed tools follow the user's images.
Implementation is original CAD-side code; no Basanti geometry, quantities,
programmes or source code are transplanted into these projects.

A7 remains read-only. Peer Cost and Scheduling ownership and integration gates
remain unchanged. This release has no new source-design or compliance acceptance.


## Construction-stage workbenches — 2026-11-06 navigation supplement

The existing four-chapter contract remains unchanged. Chapter 01 / Views now
has two sibling subsection families: **linked floor views** and
**construction-stage workbenches**. Chapter 02 / Quantities has a prominent
shortcut to those same source-governed workbenches. Share state uses
the panel=views, section=stages and stage=<stage-key> URL parameters;
phase and design edition continue to identify the same source interpretation.

One common stage taxonomy is rendered across all four projects: ground
preparation/PCC, footing reinforcement, footing RCC, starters/dowels,
columns, plinth beams, slabs/upper floors, and tanks/services. A taxonomy
entry is not evidence that a stage workbench exists; missing stages show a
specific unknown-aware unadmitted state.

- **Narayani:** the seven original immutable work-package viewers, V02/V03
  and M40–M80, are first-class selectable workbenches, embedded from their
  existing original routes with a separate full-page link. Their source
  files, frozen status, hashes and HOLD state are not altered. The original
  module hub remains in record.html; old fragment links remain valid.
  The V02 module covers PCC/blinding, not an independently verified soling
  module. Upper-floor reinforcement packages remain unadmitted.
- **Harisharan:** through-plinth estimates link to the original plinth study;
  floor summaries link to the existing phase BOQ. These are provisional,
  not complete BBS/fabrication instructions.
- **Ashok:** existing architecture/MEP floor coordination is linked with
  COORDINATION ONLY qualification; no structural material stage is asserted.
  v1/v2 data and provenance remain separate.
- **Ramachandra:** all stage-workbench details are unadmitted pending source
  verification; unknowns are never replaced with fabricated geometry or zero.

This navigation change introduces no design edition, source revision,
engineering acceptance, new quantities, new schedule, cross-repository
sync, or native Drive document revision. Engineering and privacy gates in
AGENTS.md and the AAD domain template still apply.


## Standard 1.1 — site package chapter and four-sided layout (2026-11-06)

The navigation standard now uses **five independent chapters**, while keeping all prior
project/design editions and source data intact:

1. Views — synchronized 2D + 3D by floor and phase;
2. Quantities / BOQ — quantities, source basis and component register;
3. Programme / Gantt — qualified planning scenario / admitted programme;
4. Packages / Site Modules — site-useful, source-linked material workbenches;
5. Sources & records — drawing sources, document controls, assumptions and history.

The previous construction-stage subsection under Views is superseded by chapter 04.
Old links using panel=views, section=stages and stage=<id> are redirected in the
client to the corresponding new Packages chapter link. The frozen original
Narayani stage URLs remain unchanged.

**Four-cardinal UI:** north provides project identity and chapter tabs; west
provides version, chapters and floor selection; east provides a contextual
package inspector, source gate and working original-workbench/copy-link actions;
south provides a horizontally scrollable package dock. The connected 2D/3D
views and registers remain inside the centre. On narrow screens the west rail
uses its labelled open/close menu; the east inspector stacks beneath the main
content and the south dock is scrollable and sticky.

**Harisharan's detailed material module has moved to Packages**, represented
using exactly the same source-backed card format as the seven Narayani modules.
Only the original through-plinth calculation study is claimed: its related
stage cards may reference that same source, but no complete additional BBS is
invented. Narayani V02/V03/M40–M80 remain frozen and source-backed; M80 remains
HOLD. Ashok's available link is architecture/MEP coordination, not a verified
structural work package. Ramachandra's missing public packages remain unknown.

The reusable template files for future projects are
`governance/aad/site-package-workspace-template.v1.json`,
`governance/aad/site-package-workspace-guide.md` and
`public/templates/project-workspace/project-template.v1.json`.
The public guide is at `/templates/project-workspace/`.

No automatic Google Sheets/Docs refresh or authenticated provider action is
introduced by this website release. Site packages link to existing original
viewer evidence; editing and approvals remain separate and authenticated.


## Project workspace standard 1.2 — normalized site package book (2026-11-06)

Every real project keeps the five-chapter and four-cardinal-directions UI from
v1.1. Chapter 04 now has **4.1 Original site workbenches** and **4.2 Engineering
normalization (4.2.1–4.2.16)**. All sixteen categories have identical source
requirements, quantity checks and field QA. Unadmitted categories remain null
and REVIEW REQUIRED; this does not backfill missing site engineering.

One separate **fake and completely empty** project at
`/projects/example-empty/` exercises the same UI contract. It is not a fifth
real project. All five workspaces have per-project engineering memory palaces
with chapter n / section n.m / subsection n.m.k navigation. Website-specific
memory is under `/memory-wall/pages/`; the main Memory Wall links them.

Read `governance/aad/engineering-normalization-memory-palace.v1.md` for the
source authority, 16-package catalog, calculation guardrails, zero-data dummy,
peer ownership and source-preserving QA. This UI release does not copy Narayani
modules, alter Ashok v1 geometry, accept Harisharan's provisional BBS as a shop
schedule or create Ramachandra engineering details. No user-specific rod sizes
were imported without a recovered authoritative schedule.
