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
