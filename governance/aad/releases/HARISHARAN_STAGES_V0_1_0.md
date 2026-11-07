# Harisharan stages v0.1.0 — source-qualified workbenches (PRERELEASE)

**Release class:** A9-governed software/source-interpretation milestone, **NOT FOR CONSTRUCTION**.  
**Project:** Harisharan Adhikari / INTAKE-20260826-HARISHARAN  
**Tag:** `harisharan-stages-v0.1.0` (immutable, annotated)  
**Frozen code candidate:** `dfd60740b7c003bc1eac581e1ac0e5c217f2fe63`  
**Original source takeoff:** `R000001`; original drawing/report hashes preserved.  
**Engineering working Doc:** `AAD-HARISHARAN-ENG-001-R000005`, kept under controlled Drive access.

## 1. Software supplied

Seven **project-specific** selectors with source-traceable provisional member quantities and links to the drawing/report evidence.

| Stage | Member-level contents | Admission |
| --- | --- | --- |
| V02 | 18 PCC pad quantity records, provisional cement | No independently admitted soling |
| V03 | 18 footing meshes and scenario 1 vs 2 mats | Layer conflict; BBS held |
| M40 | 18 footing RCC full-prism geometric envelopes, linked V03 bars | Sloped casting profile held |
| M50 | 18 continuity/dowel source references | Independent dowel bars **not** quantified |
| M60 | 18 below-plinth columns, main bars and tie alternatives | Source tie conflict |
| M70 | 27 tie/plinth beams + 12 strap beams, theoretical bar families and RCC | Bends/laps/cutting and joints held |
| M80 | Source-intake checklist | Zero *admitted objects*; actual tank quantities **UNKNOWN** |

Clicking a stage member presents plan selection, a **schematic** 3D/section cue, measurements, bar families, theoretical kg, planning concrete/cement and explicit engineering HOLD. Selectors and links remain separate from the frozen Narayani stage pages. Initial mobile/desktop browser QA tested widths 390 and 1440 px. This is not a fully-linked structural BIM or shop drawing.

## 2. Quantity control

Distinct physical quantities are owned by their defining stages: V02 PCC, V03 footing mesh, M40 footing concrete, M60 column steel/RCC and M70 beam steel/RCC. M40's bars are V03 references; M50's continuity bars are M60 references. Never add reference steel twice. M80 quantities remain unknown rather than zero. Planning cement is a scenario, not an accepted M25 mix.

## 3. Known engineering HOLDs

- [#96](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/96): footing 1-vs-2 mesh layers.
- [#97](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/97): full-prism vs sloped footing geometry.
- [#98](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/98): column tie Ø8@125 vs Ø10@100.
- [#99](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/99): dowel anchorage/development and starter BBS.
- [#100](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/100): beam hooks/laps/links, intersections and cutting lists.
- [#101](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/101): M20/M25, soil/site/seismic/IFC acceptance.
- [#102](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/102): tank source admission.
- [#103](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/103): consolidated downloads, navigation and schedules (software roadmap).
- [#104](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/issues/104): branch protection and protected merge gates (administrative).

None of these holds is a certification that the built structure is defective. They are conflicting/insufficient source inputs that prohibit approved fabrication or construction use.

## 4. Evidence and release gates

- Staging QA on frozen software candidate: [42354556859](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/actions/runs/42354556859).
- Pages publication on frozen candidate: [42354919774](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/actions/runs/42354919774).
- Live Pages readback on frozen candidate: [42355340466](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/actions/runs/42355340466).
- New release-metadata commit must separately pass the main QA → Pages → live-readback chain before the tag/release automation runs; the tag points to the **previously verified frozen candidate**, not to the metadata commit.
- Release workflow validates exact immutable baseline SHA, code/data equivalence, passing QA, and absence of preexisting conflicting tag before creating annotated tag + GitHub prerelease.
- Existing `aad-template-v0.6.0`, original Narayani pages and original Harisharan source artifacts must remain untouched.

## 5. Usage and exclusions

[Harisharan project page](https://fabingurung.github.io/JP_Computer-Aided-Drawings/projects/harisharan-adhikari/) · [V03 footing rebar](https://fabingurung.github.io/JP_Computer-Aided-Drawings/projects/harisharan-adhikari/stages/v03/) · [M60 columns](https://fabingurung.github.io/JP_Computer-Aided-Drawings/projects/harisharan-adhikari/stages/m60/) · [M70 beams](https://fabingurung.github.io/JP_Computer-Aided-Drawings/projects/harisharan-adhikari/stages/m70/) · [M80 tank HOLD](https://fabingurung.github.io/JP_Computer-Aided-Drawings/projects/harisharan-adhikari/stages/m80/).

No IFC-approved drawing, structural sign-off, approved rebar cutting stock, site cement batching order, geotechnical certificate or municipal permit is asserted. Original drawings and reports remain restricted/controlled in Google Drive. Public repo contains only non-sensitive references and code.

## 6. Release receipt convention

Once CI completes, the canonical public release receipt is the GitHub Release URL, immutable annotated tag target, and the Actions run that generated them. This Markdown is the release-note source; it does not represent a completed tag until GitHub readback proves tag and Release exist.
