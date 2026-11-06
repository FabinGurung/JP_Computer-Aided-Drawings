# Harisharan Adhikari — Nine-column rear-side candidate, scoped engineering draft v0.1

## 1. Scope and sources

### 1.1 Candidate rear-grid selection
#### 1.1.1 Source member IDs and positional HOLD
Current source \`public/data/projects/harisharan-adhikari/takeoff.json\` (R000001) interprets 18 columns in six rows. The **rows 4–6** nine-member candidate is **A4 B4 E4 / A5 B5 D5 / A6 B6 C6**. This is the model-Z-high block, **not** a verified geographic north/back-of-house orientation. The browser editor lets users select the opposite rows 1–3 or any nine source IDs, never a fabricated ninth member.

### 1.2 Connected geometry
#### 1.2.1 Footings, straps, plinth beams and boundary accounting
This candidate contains nine pads (three F1 at B4/B5/B6, six F2), six transverse strap spans, twelve plinth spans connecting selected columns, and **three boundary plinth spans** connecting to row 3. Boundary spans may be toggled off; any quantity included here must not be counted again in the next work package. F1 is a 2.55×2.55×0.60 m full rectangular *envelope scenario*; F2 is 2.10×2.70×0.60 m. Sloping as-built pad profiles have not been accepted.

### 1.3 Source details
#### 1.3.1 Reinforcement and unresolved drawing conflicts
The September 2026 structural PDF includes a footing 16 mm @150 mm mesh schedule for both directions, top/bottom, but its section depicts a lower mesh (HAR-03). C1 at B4 has 6Ø25+6Ø20 longitudinal source bars; the remaining eight candidate column types are interpreted with 12Ø20 for the substructure stage. The reported column ties disagree between Ø8 @125 and Ø10 @100 (HAR-05); 6-legged tie shapes, hooks, laps and fabrication bends are not source-accepted. Strap longitudinal bars are represented with 8 top +4 bottom Ø20 per source span, with provisional four-legged link allowances. Plinth main bars reflect 4Ø20+2Ø16 per beam; link spacings conflict by report and drawing. These are **source interpretation scenarios, not fabrication/installation instructions**.

## 2. Editable quantity workbench

### 2.1 Source-derived calculations
#### 2.1.1 Restricted subtotal and unit controls
\`public/assets/js/harisharan-rear-nine.mjs\` consumes the same immutable \`assembly\` and \`calculate\` as the original plinth workbench, but restricts by actual connected member IDs. It returns stage-separated bar lines, provisional theoretical steel mass, full-prism concrete envelopes and only pad-footprint PCC. It intentionally returns **cement procurement = null** because M20 vs M25 and approved mix dosage remain unresolved.

### 2.2 Editable state
#### 2.2.1 Browser-local changes are not canonical design
The UI permits nine-ID selection, toggling boundary plinth spans, previewing source tie/mat alternatives, and changing proposed bar line count/diameter/cut length. Edits are stored in this browser's localStorage and may be exported/imported as a **draft JSON** carrying source logical ID, revision, SHA-256 and unapproved state. The static site cannot write to the shared engineering Drive current record and cannot grant a structural approval. Original source data, preserved workbench, source vectors and prior Git history stay unchanged.

### 2.3 Editing gates
#### 2.3.1 Reject invalid or unauthenticated approval
Draft import rejects missing/extra bar IDs, unknown columns, source hash mismatch, selection != nine, unreasonable numeric fields, imported "approved" states and wrong revisions. Exported values do not become official engineer-approved BBS, procurement orders, bills or actual installed rebar.

## 3. QA and publication

### 3.1 Outstanding engineering holds
#### 3.1.1 Never authorize installation from this UI
Required before field execution: confirm rear orientation and grid IDs; reconcile structural vs report grades, pad slopes/mats, tie dimensions/spacing, strap/plinth link bends and anchorage, column continuity, founding levels, seismic and soil inputs, approved drawings, and approved bar bending schedule. All issue details remain source-traceable in the original Harisharan source JSON.

### 3.2 Release tests
#### 3.2.1 No change to the original 18-column model
\`tools/site/harisharan-rear-nine-smoke.mjs\` asserts nine source members, 3F1/6F2, 6 straps, 12 internal/3 boundary plinth spans, numeric envelope checks, source mass filtering, approval rejection and immutability. \`tools/site/harisharan-rear-nine-browser.mjs\` tests phone/desktop rendering, source-stage bar editing, browser persistence, export and the opposite orientation candidate. Both run in staging and Pages CI.

### 3.3 Open-source and provider roles
#### 3.3.1 One source-of-truth with explicit draft
CAD code in GitHub owns the UI and derived source-safe manifest. The original structural PDF and maintained native engineering record \`AAD-HARISHARAN-ENG-001-R000003\` remain governed in Google Drive. This new independent draft is not an unauthorized replacement for that current Doc. Submitting an exported draft for approval is a separate authenticated review workflow.
