# Harisharan Adhikari — V02 to M80 seven source-specific stage workbenches v0.1

## Three-level table of contents
- 1. Governing source and geometry
  - 1.1 Immutable member identity
    - 1.1.1 Unique project stages and axes
- 2. Per-member material takeoff
  - 2.1 V02 / V03 / M40 foundations
    - 2.1.1 Pad PCC, mesh, and RCC
  - 2.2 M50 / M60 verticals
    - 2.2.1 Dowel reference vs column BBS
  - 2.3 M70 network
    - 2.3.1 Tie/plinth and strap beams
  - 2.4 M80 utility/tank
    - 2.4.1 Missing-source HOLD
- 3. Interaction and calculations
  - 3.1 Member selector
    - 3.1.1 Rebar and concrete per picked element
  - 3.2 Level-bounded column slice
    - 3.2.1 Elevations, feet and exclusions
- 4. Sources, approvals and conservation
  - 4.1 Report precedence
    - 4.1.1 M25, Fe500, bars, link pitches
  - 4.2 Disjoint quantity ownership
    - 4.2.1 Do not count linked bars twice
- 5. Google Drive and GitHub architecture
  - 5.1 Canonical source
    - 5.1.1 Read-only original drawing and report
  - 5.2 Versioning and QA
    - 5.2.1 Source and browser check gates

## 1. Governing source and geometry
### 1.1 Immutable member identity
#### 1.1.1 Unique project stages and axes
The Harisharan 18-node original through-plinth takeoff is kept unchanged:
- 18 columns: A/B/right-side nodes in rows 1–6; right-side varies F1/F2/F3/E4/D5/C6 with original positions.
- 18 footings: F1 at central B nodes and F2 at outer nodes.
- 12 transverse strap beams `ST-{left}-{middle}` and `ST-{middle}-{right}` for six rows.
- 27 plinth/tie-beam runs: 12 across rows and 15 longitudinal connections.
- Vertical structural levels: footing underside -1.50 m, footing top -0.90 m, ground 0.00 m, plinth top +0.55 m; provisional source levels.
- Plan `z` (along building) and elevation `y` (vertical) must not be conflated. A north/geodetic registration is unverified.

## 2. Per-member material takeoff
### 2.1 V02 / V03 / M40 foundations
#### 2.1.1 Pad PCC, mesh, and RCC
**V02:** all 18 footing PCC pad areas at 75 mm thickness. PCC dry-factor/cement estimate is an unapproved scenario. The original source does not specify independently verified soling quantities.
**V03:** click any footing (e.g., `F-A1`), inspect 16 mm mesh in X/Z, assumed top+bottom mats vs source section's single mesh, bar counts, theoretical cut and mass. No accepted fabrication BBS.
**M40:** same footing's M25-source-grade RCC volume as a 600 mm full rectangular prism *envelope* (sloped-pad section unverified); linked V03 mesh is a non-additive reference. Cement bags use a preliminary kg/m³ input, not an approved M25 mix.

### 2.2 M50 / M60 verticals
#### 2.2.1 Dowel reference vs column BBS
**M50:** all 18 support locations show column main-bar continuity, but independent starter/dowel anchorage, embedment, laps and cutting lengths are missing; main bar references belong to M60, no extra dowel steel or cement is accepted.
**M60:** click `COL-A1` or another column, view source bars (C1 6Ø20+6Ø25 at B4; others per source type), six-legged tie set scenario, concrete section and cement allowance. Conflicting Ø8@125 vs Ø10@100 column ties remain HOLD. Model from footing top to plinth top; no automatic continuation of source rebar to upper floors.

### 2.3 M70 network
#### 2.3.1 Tie/plinth and strap beams
**M70:** choose individual `PB-A1-B1` (and 26 other PB) or `ST-A1-B1` (and 11 other straps). For each beam, the source model shows endpoints, centreline/clear span, section, component RCC volume, main bars, stirrups/links, cut-equivalent theoretical kg and planning cement allowance.
Governing report: 300×350 tie beam, top/bottom 2Ø20+1Ø16, Ø8 @125 throughout; 450×800 strap with top 8Ø20, bottom 4Ø20, four-legged Ø8 @100. STR-05 prior counts remain available as source comparison fields. Hooks, bending deductions and stock cutting still unapproved.

### 2.4 M80 utility/tank
#### 2.4.1 Missing-source HOLD
Harisharan has **no** publicly admitted tank geometry/position, wall/base/cover bar schedule, concrete or hydraulic details. M80 provides an honest source-intake checklist and cannot be counted as completed tank design. The Narayani tank source/model is NOT copied.

## 3. Interaction and calculations
### 3.1 Member selector
#### 3.1.1 Rebar and concrete per picked element
All seven pages use the same source-checked model; selected member updates the 2D grid, 3D/section **schematic** (not a fabrication detail), geometric dimensions, separate steel family rows and theoretical mass, RCC/PCC and planning cement. Selection persists in the route query. Footing mat and column tie source alternatives are explicit scenario inputs, not approvals. JSON download is marked unapproved.

### 3.2 Level-bounded column slice
#### 3.2.1 Elevations, feet and exclusions
At M60 a lower/upper elevation within -0.90 to +0.55 m can be entered to inspect a column segment. It displays the *straight longitudinal portion* and geometric concrete volume only; ties, laps and anchorage are NOT independently apportioned. Positive elevation beyond +0.55 m is unsupported in this through-plinth reinforcement source.

## 4. Sources, approvals and conservation
### 4.1 Report precedence
#### 4.1.1 M25, Fe500, bars, link pitches
Source file `takeoff.json` is unchanged at R000001 with original SHA256 identity. Source `HAR-SRC-RPT-001` SHA256 `8aa9e0a67817c3d00382f910d3b293cdf172dbda7bda3ea4144308fee4942b35` governs these candidate design assumptions; the original drawings remain comparison evidence. No signed IFC, accepted M25 mix, rebar cutting stock or professional authorization is implied.

### 4.2 Disjoint quantity ownership
#### 4.2.1 Do not count linked bars twice
V02: PCC concrete only. V03: footing mesh (M40 links to it non-additively). M40: RCC footing volume. M50: column starter/continuity as a source reference (do not add to M60 totals). M60: columns, main bars and ties plus RCC. M70: PB and ST beams and their steel/concrete. M80: no adopted material quantities. These rules are enforced by static tests and displayed for visitors.

## 5. Google Drive and GitHub architecture
### 5.1 Canonical source
#### 5.1.1 Read-only original drawing and report
Original structural/architectural drawing and report files stay in the authenticated Harisharan source folders. Engineering working calculations and authoritative decisions remain in the same native governed Google Doc with archive-before-update. Public repository includes only safe source IDs/fingerprints, executable CAD calculation rules and derivations, not private Google provider IDs.

### 5.2 Versioning and QA
#### 5.2.1 Source and browser check gates
Original Narayani V02–M80 are byte-for-byte preserved; Harisharan uses separate project paths. Keep existing Harisharan plinth, rear-nine, older 2D/3D workspaces, all source files and valid share routes unchanged.
Test: 18 PCC, 18 footing mesh, 18 footing RCC, 18 M50 source references, 18 columns, 39 beams, 0 unverified tanks; source member A1 and PB/ST-A1-B1 selections; mass conservation; 1-vs-2 mat and tie alternative; mobile 390 px/desktop 1440 px; native Google Drive readbacks, staging QA, PR checks, main Pages and live readback.
