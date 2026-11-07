# Harisharan R1–R4 source-reconciliation and draft-measurement workbench v0.1

**Record class:** research/estimating and navigation; **NOT FOR CONSTRUCTION**.  
**Project:** INTAKE-20260826-HARISHARAN.  
**Software baseline:** immutable prerelease \`harisharan-stages-v0.1.0\`, target \`dfd60740b7c003bc1eac581e1ac0e5c217f2fe63\`.  
**Live Google Sheets logical ID:** \`HAR-STAGES-001-R000002\`, version advanced in place after creating and verifying a complete PRE R000001 native copy in the pre-existing Engineering Record Archive.  
**Public route:** \`/projects/harisharan-adhikari/review/\`.  
**Source provenance:** structural PDF \`HAR-SRC-STR-001\` SHA256 \`6ae8eaa70273b79a50ad28a2345da7966201efd5f4a32ea260cbece34f75b9c5\`; architectural PDF \`HAR-SRC-ARC-001\` SHA256 \`8429a256588c87c7f1cef5ae6a25006ee5f1e5b3ac7d6c5c27423efa4cc908e9\`; structural report \`HAR-SRC-RPT-001\` SHA256 \`8aa9e0a67817c3d00382f910d3b293cdf172dbda7bda3ea4144308fee4942b35\`. Original source binary and private provider identifiers stay in controlled Drive.

## R1 — independently inspected source conflict matrix

1. **Footing reinforcement:** STR-01 source footing schedule records 16 mm @150 both ways, top and bottom, for F1/F2. STR-02 shows a lower mesh section. Revised report's footing summary lists 16 mm @150 both ways but does not independently resolve the top/bottom layer-count discrepancy. Retain one-vs-two-mat scenario, issue #96.
2. **Footing concrete:** F1 2550×2550×600 mm, F2 2700×2100×600 mm; 600 mm *rectangular envelope* represents the registered analysis geometry, not signed sloped casting profile. STR-02 slope edge/break details unresolved, issue #97.
3. **Column confinement:** source conflict Ø8@125 (STR-02) vs Ø10@100 (STR-06), six-legged set and source continuing/upper-level details require signed decision, issue #98.
4. **Dowel/beam BBS:** M50 references M60 and carries no extra adopted bars. M70 bars are straight/equivalent theoretical lengths; hooks, laps, development, cutting stock and junction deductions require checked details, issues #99–100.
5. **M20/M25 and soil/seismic:** drawings carry M20 marks; report recommends M25 in design-material tables. The report also includes inconsistent soil class, assumed capacity and response parameters. Do not certify 350 kg/m³ dosage as mix design; original geotechnical report, accepted seismic inputs, survey and engineer sign-off needed, issue #101.
6. **M80 correction:** architectural ARC-02 **site plan explicitly depicts an underground water tank, septic tank and soak pit**, with nearby dimension strings; however these are **architectural siting candidates, not an admitted structural tank location/section/rebar/capacity**. Do not infer tank section, volume or steel from label proximity, nor copy Narayani M80. Issue #102 remains a structural HOLD.
7. **Site/IFC:** local plan coordinates and model heights are a preliminary registration. No approved municipal/IFC, field consumption, geotechnical verification or cutting BBS was provided. All release approvals remain false.

### Professional-review evidence checklist

For every accepted HOLD, attach a sheet/detail number, revised drawing issue, approval date, licensed designer, affected member IDs, old and new numeric inputs, material delta, and a read-back of the derived Google Sheet and public view. Until provided, preserve both scenarios and mark adopted construction quantities as UNKNOWN.

## R2 — owned physical quantities, *not* a procurement BOQ

| Owner | Members | Registered source scenario | Concrete/PCC (m³) | Theoretical steel (kg) |
| --- | ---: | --- | ---: | ---: |
| V02 | 18 | PCC under pads, 75 mm | 8.029125 | N/A |
| V03 | 18 | Footing Ø16 mesh, two-mat scenario | N/A | 4592.82963 |
| M40 | 18 | 600 mm full-prism RCC | 64.233 | REFERENCE V03; not additive |
| M50 | 18 | Column continuity | REFERENCE M60 | REFERENCE M60 |
| M60 | 18 | Footing top – plinth top, tie scenario | 5.28525 | 1425.008 |
| M70 PB | 27 | Plinth beams | 13.67658024 | 2383.372559 |
| M70 ST | 12 | Straps | 13.5688212 | 3119.907457 |
| M80 | 0 admitted | Architectural siting only | UNKNOWN | UNKNOWN |

Total source-stage RCC (excluding separate PCC) \`96.76365144 m³\`, total owned theoretical steel \`11,521.11765 kg\`, and PCC \`8.029125 m³\`. Planning cement is approximately \`712.9563353 bags\` across PCC and RCC at **unapproved planning dosages**. Original Google Sheet BBS contains 178 stage-owned bar-family lines, **not cutting-ready/approved bar marks**. Native R2 BOQ sheet now uses \`SUM\`/\`SUMIF\` formulas over unchanged live stage tabs, with blank rates and amounts.

**Conservation rule:** never sum steel from V03+M40 or M50+M60; M80 unknown cannot be silently treated as zero. The public review ledger is read-only, reconstructs these totals directly from the frozen source takeoff, validates 178 bar-family lines, and exports member measurements, theoretical bar-family CSV, non-duplicated BOQ and source HOLDs. CSV includes explicit status and protects against spreadsheet formula injection.

## R3 / R4 — source-linked views, limits and next targets

A separate read-only review viewer uses the **same 18 source-coordinate nodes**, **12 strap edges**, **27 plinth edges** and per-member IDs across SVG plan, projected axonometric and selected-material table. Clicking either view or the list updates the same selected member. Scenario selectors rebuild all calculations from the original public source JSON. This is honest **source-coordinate axonometric**—not solved structural BIM or a construction-ready 3D rebar model.

The current quantified source is **through-plinth only**. An architectural drawing and report do not authorize extending column bars automatically to arbitrary upper-floor heights. Next R3 engineering intake: signed member-by-level structural schedule, slab and stair rebar, shear/lift-wall geometry, tank/MEP/soil registrations. Next R4 engine: map verified upper-floor member IDs, true volumetric geometry and BBS shapes into the canonical 2D/3D AAD model with exact unambiguous parent-child quantity lineage. Keep unverified members visually distinguished.

## Versioning and gates

- Preserve original structural/architectural PDFs, report, \`R000001\` machine takeoff, Narayani files, existing Harisharan plinth/rear-nine studio, baseline release and old Sheet IDs.
- PRE R000001 native Google Sheet archive was copied to the existing \`99 Engineering Record Archive\` and tab rows read back before modifying the stable live Sheet. R000002 adds only \`R1 Source Decisions\` and \`R2 BOQ Review\` plus a top-level readme M80 siting clarification.
- The public source/review is a **versioned, deterministic snapshot**, not an authenticated live edit/sync of the Google Sheet. Future automated sync must be approved, source-scoped and hash-verified; no secrets or private provider IDs in Pages.
- New static browser tests validate mass/quantity ownership, the 178 draft bar-family lines, 390px mobile/1440px desktop, shared selected IDs, CSV, unknown M80, and source comparison controls.
- Existing structural consent and IFC/engineering approval flags remain false. Merge and publish only if all GitHub PR/main QA, Pages and live readback pass.

**Tracked decision issues:** #96–#104, release-provenance pipeline issue #106. An engineer must resolve the high-consequence P0 questions before a fabrication or construction release.
