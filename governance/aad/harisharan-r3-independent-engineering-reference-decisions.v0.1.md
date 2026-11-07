# Harisharan R1–R3 independent reference-engineering decisions — R000001

**Issue class:** Independent document-analysis and estimating decisions. **NOT FOR CONSTRUCTION, NOT A LICENSED DESIGN, NOT AN APPROVED BBS.**  
**Project:** INTAKE-20260826-HARISHARAN · Fishtail Builders · Pokhara Ward 12 (title-block assertion; site verification outstanding).  
**Engineering source identifiers:** HAR-SRC-STR-001 · HAR-SRC-ARC-001 · HAR-SRC-RPT-001. Source file SHA256 checks are recorded in the unchanged `takeoff.json`.  
**Software status:** R0 frozen `harisharan-stages-v0.1.0`; R1–R4 source review published separately once CI approves.  
**Upper-floor evidence:** `upper-floor-source-r000001.json` is a report transcription, with 18 source grid names and four report bar categories linked to five architectural floor labels. Nothing implies these schedules were checked for the actual building.

## 1. Engineering decision protocol

1. Source transcription (e.g., report says 12Ø20) is a fact about a **document**, not proof that reinforcement is suitable or installed.
2. Analysis settings and bounded comparisons may be selected independently, as long as the selected assumption is explicit, both alternatives remain reviewable, and the actual design is not marked accepted.
3. Concrete grades, ductility classes, tie/anchorage details, soil classes and the actual-building seismic model cannot be declared compliant on the strength of inconsistent secondary documents. Capacity, response and detailing checks are interdependent, not decided by simply choosing the larger bar or more closely spaced stirrup.
4. Signed drawings, source revision and relevant professional licensing remain a release condition. A user instruction or AI document review is not a registered engineer's design authorization.
5. Every conclusion and source reference must include document sheet/section, revision, impacted IDs, status, accountable reviewer and next verification required.

## 2. Source-backed analysis choices — not construction approvals

| Subject | Research interpretation chosen | Source used | Construction acceptance |
|---|---|---|---|
| Footing mesh | Keep **two mats as a traceable scenario** because STR-01 explicitly labels Ø16@150 top and bottom. Preserve one-mat counter-scenario from STR-02 depiction. Do not issue cut list until the accepted cage is signed. | STR-01 / STR-02; issue #96 | HOLD |
| Footing volume | Continue rectangular 600mm F1/F2 **envelope** only for estimating comparison. It is **not** the approved sloped casting profile or a structural safety factor. | STR-02 and report SAFE property; issue #97 | HOLD |
| Column confinement | Keep both Ø8@125 and Ø10@100 variants. Do **not** claim Ø10@100 is automatically safe (spacing and tie leg/cross-tie configuration, core anchorage and congestion matter). | STR-02 / STR-06; issue #98 | HOLD |
| Dowels and beam junctions | Retain non-additive M50→M60 continuity and theoretical M70 bar families. Never label equivalent straight lengths as fabrication BBS. | STR-05/06, report; issues #99–100 | HOLD |
| Concrete | For an **independent sensitivity design reference**, examine report-listed M25/Fe500. Record STR-listed M20 as a conflict. Neither grade authorizes site batching absent an accepted mix and drawing revision. | STR-01/03/05 and revised report Materials; issue #101 | HOLD |
| Seismic / soil | Apply current code family NBC 105:2025 as an independent research reference but never declare a real site class or Z/I from inconsistent report tables. Demand actual approved occupancy, geotechnical VS30/SPT, soil bearing and current regulatory design record. | Revised report + NBC 105:2025; issue #101 | HOLD |
| Upper-floor columns | Transcribe 18 report grid-column schedules exactly. Map ground/first/second/third/fourth architecturally with the report's “third and above” for 3rd and 4th as **an unapproved candidate**. Use 3m report height for per-storey sensitivity only. | Report “Grid / Column Name” table; ARC-02–04; issue #101 | HOLD |
| Upper-floor beams/slabs | Register B1 (300×550) and SECB (300×400) source *families*, not individually assigned beams. Rebars/sections cannot be applied to every edge, shear wall or slab without the verified structural layout and signed design. | STR floor beam plans and report beam families | HOLD |
| M80 tank | ARC-02 identifies water tank/septic/soak architectural siting, but not signed structural tank capacity, depth, base/wall/cover bars or coordinates. No M80 material can be admitted. | ARC-02 + issue #102 | HOLD |

## 3. Independent reference-code selection and limitations

- **NBC 105:2025** (Second Revision), official government-hosted PDF: https://ebps.kathmandu.gov.np/UploadFiles/NBC_105_2025_Sesmic_Design.pdf . Its preface identifies updated soil classifications based on near-surface shear-wave velocity, revised spectral factors and additional stability/load-combination checks. Use as a current seismic research framework; verify adopted jurisdictional application to the project permit.
- **NBC 110:1994 Plain and Reinforced Concrete**, government-hosted: https://giwmscdnone.gov.np/media/app/public/54/posts/1679824202_6.pdf . This version is an amendment to IS 456-1978. Do not automatically substitute an arbitrary later IS 456 revision without verifying the adopted Nepal Standard and engineer-approved design basis.
- **DUDBC Building Codes catalogue**, authoritative listing: https://www.dudbc.gov.np/pages/building-code/ .
- **Nepal Engineering Council**, registration, qualification and practice oversight: https://www.nec.gov.np/background .
- A code citation alone is not a member design or signed structural certificate. No full actual-building ETABS validation, site-specific seismic spectrum, member-capacity checking, detailing acceptance or permit authentication has occurred.

## 4. Upper-floor research quantities and exclusions

The R3 register has **18 unique report column grids × 5 floor-label mappings = 90 source comparisons**. The steel formula is `kg/m = count × π/4 × (diameter_m)^2 × 7850`. The concrete comparison is `gross prism m³ = 0.45 × 0.45 × nominal length`. The report suggests **3 m** nominal storey lengths. The scenario produces approximately **7,710.33 kg of longitudinal-only steel** across the five mapped categories and **54.675 m³** gross column prisms. **Neither** number is a material procurement quantity, and neither is added to the through-plinth R2 BOQ. No column stirrups, tie zones, laps, steel cutting/waste, beam/column deductions, level transitions, slab reinforcement, stairs or sheer-wall/tank materials are included.

The report's “G+5 story” descriptor conflicts with the architectural five-level ground-to-fourth plus roof plans and the stated 15m/3m summary. There is no silent extra fifth storey or missing-floor quantity.

## 5. Admission checklist

Source-specific professional signoff must establish member-level spans and elevations; confirmed shear-wall/column/beam topology; chosen concrete grade and mix; approved 1/2 footing mats and sloped-section dimensions; column tie confinement zones; BBS hooks, laps, anchorage; accepted seismic/soil sources; correct occupancy and permits; actual site survey and inspections.

**Release boundary:** The R3 and R4 research software may be published when functional CI and provider readback pass. Construction-approved status remains false until those real-world documents and registered professional decisions are independently obtained, checked and preserved.
