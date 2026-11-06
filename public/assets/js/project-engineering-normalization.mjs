// Generated public-safe viewer contract from the canonical CAD readiness register.
// This is a schema/QA guide, NOT construction permission.
export const NORMALIZED_PACKAGE_CATALOG=Object.freeze([
  {
    "id": "survey",
    "number": "4.2.1",
    "title": "Survey / setting-out / datums",
    "requiredInputs": [
      "Current approved plan, grid and control points",
      "Site benchmark and level reference",
      "Parcel/ROW/setbacks and professional verification"
    ],
    "calculationChecks": [
      "Coordinate registration; independent dimension closure; elevation-difference check"
    ],
    "fieldQA": [
      "Trace drawing revision to measured control points",
      "Confirm benchmark, scale, north and level datum",
      "Record discrepancy and hold setting-out pending sign-off"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "excavation",
    "number": "4.2.2",
    "title": "Excavation / earthwork / temporary works",
    "requiredInputs": [
      "Source footprint and authorized depths",
      "Ground conditions, adjacent property and services",
      "Excavation support and dewatering design where required"
    ],
    "calculationChecks": [
      "Excavation net and gross volume by named boundary",
      "Spoil and backfill volumes with source-based allowances"
    ],
    "fieldQA": [
      "Verify limits and adjacent services",
      "Check safe excavation/support method with responsible professional",
      "Record actual ground/groundwater condition"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "soling",
    "number": "4.2.3",
    "title": "Stone soling / compaction",
    "requiredInputs": [
      "Verified area and boundaries",
      "Drawing-approved thickness and material specification",
      "Subgrade and compaction test criteria"
    ],
    "calculationChecks": [
      "Area × approved layer thickness; separately track layers",
      "Verified material volume and order adjustment"
    ],
    "fieldQA": [
      "Record subgrade readiness and levels",
      "Document material size/gradation and compaction tests",
      "Do not infer soling from PCC-only V02 workbench"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "pcc",
    "number": "4.2.4",
    "title": "PCC / blinding",
    "requiredInputs": [
      "Verified plan and thickness",
      "Approved concrete mix or purchase specification",
      "Source revisions and scope"
    ],
    "calculationChecks": [
      "Net blinding volume with documented deductions",
      "Cement consumption only from approved dosage and source-backed factors"
    ],
    "fieldQA": [
      "Confirm substrate and form extents",
      "Document mix and test records",
      "Track pour and curing evidence without implying approval"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "footing-rebar",
    "number": "4.2.5",
    "title": "Footing reinforcement / bar bending",
    "requiredInputs": [
      "Approved footing mark, dimensions, cover and grade",
      "Engineer-accepted bar schedule, laps, hooks and anchorage",
      "Stock lengths and revision"
    ],
    "calculationChecks": [
      "Individual bar cut lengths from approved BBS",
      "Count × length × theoretical kg/m; separately track stock waste"
    ],
    "fieldQA": [
      "Check bars, diameters and spacing against signed schedule",
      "Audit bend shapes and clear cover",
      "Verify substitutions and shop drawings before fabrication"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "footing-rcc",
    "number": "4.2.6",
    "title": "Footing RCC and concrete",
    "requiredInputs": [
      "Footing geometry, pedestal/neck and verified depth",
      "Approved mix and cover",
      "Source footing and column alignment"
    ],
    "calculationChecks": [
      "Shape-specific net concrete volume and rebates",
      "Approved cement/mix quantities without default dosage"
    ],
    "fieldQA": [
      "Confirm excavated founding level, concrete tests and records",
      "Cross-check reinforcement release and levels",
      "Inspect formwork dimensions and HOLDs"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "dowels",
    "number": "4.2.7",
    "title": "Starters / dowels / embedded work",
    "requiredInputs": [
      "Footing-column connectivity and current bar marks",
      "Engineer-approved lap/anchorage and development schedule",
      "Embedments and couplers by source"
    ],
    "calculationChecks": [
      "Count and cut-length schedule only when source approved",
      "Theoretical rod mass; stock reconciliation"
    ],
    "fieldQA": [
      "Check continuity and embedment on signed drawings",
      "Keep footing/column bar IDs traceable",
      "No generic stirrup/dowel cut length substituted for missing detail"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "columns",
    "number": "4.2.8",
    "title": "Column lifts, vertical bars and ties",
    "requiredInputs": [
      "Each column's current member ID and section",
      "Tie/hoop size, pitch, cover and engineer-approved bending detail",
      "Lift heights, lap locations and pours"
    ],
    "calculationChecks": [
      "Column concrete net volume by actual section",
      "Main-bar and tie mass from source-approved BBS"
    ],
    "fieldQA": [
      "Check section vs formwork (round finish ≠ circular steel cage)",
      "Record rebar spacing, cover, splice/anchorage and placement",
      "Trace pour/lift curing and test evidence"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "plinth",
    "number": "4.2.9",
    "title": "Plinth beams / straps / grade beams",
    "requiredInputs": [
      "Beam grid runs with accepted section and levels",
      "Bar marks, stirrups, cover, hooks and splice rules",
      "Intersections and shared member IDs"
    ],
    "calculationChecks": [
      "Beam concrete net volume with joint deductions",
      "Longitudinal and stirrup theoretical mass from accepted BBS"
    ],
    "fieldQA": [
      "QA beam registration and junction continuity",
      "Verify detail, cover and formwork",
      "Confirm works release and test evidence"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "upper-floors",
    "number": "4.2.10",
    "title": "Floor beams / slabs / upper structural levels",
    "requiredInputs": [
      "Level-specific architect/structure registration",
      "Span, thickness, openings and supported loads",
      "Accepted bar schedules and concrete sections"
    ],
    "calculationChecks": [
      "Per-floor beam/slab concrete volumes with void deductions",
      "Per-level steel by bars and stock reconciled BBS"
    ],
    "fieldQA": [
      "No copy of GF steel to unverified upper floors",
      "Cross-check stair/shaft/openings",
      "Keep material totals separated by level and status"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "stairs",
    "number": "4.2.11",
    "title": "Stair flights / landings / headroom",
    "requiredInputs": [
      "Source rise/run, stair width and landings",
      "Verified floor-to-floor levels",
      "Structural slab/flight and reinforcement details"
    ],
    "calculationChecks": [
      "Step/landing geometry and signed structural volume",
      "Bar schedule mass only from accepted detail"
    ],
    "fieldQA": [
      "Check actual finished riser/tread/headroom",
      "Confirm handrail/opening coordination",
      "No stair design inferred from a schematic symbol"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "masonry",
    "number": "4.2.12",
    "title": "Walls / openings / finishes",
    "requiredInputs": [
      "Architectural material and wall schedule",
      "Door/window/opening dimensions and wall thickness",
      "Trade coordination and opening deductions"
    ],
    "calculationChecks": [
      "Net wall area/volume by material",
      "Surface finishes and material units kept distinct"
    ],
    "fieldQA": [
      "Verify wall material and edge conditions",
      "Deductions and jointing basis documented",
      "Coordinate MEP and structural openings"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "roof-waterproofing",
    "number": "4.2.13",
    "title": "Roof / drainage / waterproofing",
    "requiredInputs": [
      "Roof levels, slopes, parapets and drains",
      "Approved system and detail specifications",
      "Penetrations and falls"
    ],
    "calculationChecks": [
      "Surface areas and slopes from accepted planes",
      "Drain and waterproofing quantities by system"
    ],
    "fieldQA": [
      "Inspect water paths and interfaces",
      "Document tests and product approvals",
      "Do not infer drainage from roof appearance"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "tank",
    "number": "4.2.14",
    "title": "Tank / septic / soak-pit / utility structures",
    "requiredInputs": [
      "Verified coordinates and approved location",
      "Structural and hydraulic/percolation design",
      "Actual soil, groundwater and separation conditions"
    ],
    "calculationChecks": [
      "Net tank volume and reinforcement by accepted geometry/BBS",
      "Capacity, excavation and concrete by supported inputs"
    ],
    "fieldQA": [
      "Keep M80 CODAL_NOT_VERIFIED as an engineering HOLD",
      "Require accepted location and code/soil checks",
      "Do not invent septic/soak sizing from nearby cases"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "mep-services",
    "number": "4.2.15",
    "title": "Plumbing / electrical / drainage / MEP",
    "requiredInputs": [
      "Verified service routes and elevations",
      "Approved system schedule and counts",
      "Coordination clashes and approvals"
    ],
    "calculationChecks": [
      "Lengths and point counts per approved plan",
      "BoQ units by system; never merge incompatible units"
    ],
    "fieldQA": [
      "Keep potable, wastewater and storm systems separate",
      "Check cross-trade clashes and access",
      "Coordinate with peer owners, not CAD-only certification"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  },
  {
    "id": "qa-closeout",
    "number": "4.2.16",
    "title": "Testing / inspection / release / handover",
    "requiredInputs": [
      "Accepted material tests and field checklists",
      "Signed issue-for-construction documents, as applicable",
      "As-built evidence and punch items"
    ],
    "calculationChecks": [
      "Trace quantities to accepted revisions only",
      "Difference and reconciliation ledger; no zero for pending"
    ],
    "fieldQA": [
      "Capture immutable source hashes and issue IDs",
      "Separate draft, reviewed, HOLD and accepted statuses",
      "No project declared approved based on public Pages publication"
    ],
    "engineeringGate": "SPECIFIC_SOURCE_AND_AUTHORIZED_REVIEW_REQUIRED"
  }
]);
export const NORMALIZED_PROJECT_METADATA=Object.freeze({
  "narayani-parajuli": {
    "title": "Narayani Parajuli",
    "synthetic": false,
    "overallApproval": "ENGINEERING HOLD",
    "notice": "The published V02–M80 modules are frozen reference viewers, NOT accepted fabrication design. Groundworks V02 is PCC, not a verified soling package.",
    "sourceBasis": "Public AAD source-review model and seven immutable stage workbench archives.",
    "rawGeometryAdmitted": true
  },
  "harisharan-adhikari": {
    "title": "Harisharan Adhikari",
    "synthetic": false,
    "overallApproval": "PROVISIONAL / REVIEW OPEN",
    "notice": "Seven source-specific Harisharan V02–M80 viewer routes implemented using original 18-column takeoff; no approved fabrication BBS. M50 dowels are non-additive references; M80 is a source-hold checklist, not fabricated tank geometry. Two footing mesh layers and column ties remain unresolved.",
    "sourceBasis": "HAR-SRC-STR-001 + HAR-SRC-RPT-001 user-selected precedence, original R000001 takeoff and preserved architectural sources. M25/Fe500 grade, source-based planning allowances only.",
    "rawGeometryAdmitted": true
  },
  "ashok-adhikari": {
    "title": "Ashok Adhikari",
    "synthetic": false,
    "overallApproval": "COORDINATION / REVIEW OPEN",
    "notice": "The architecture and MEP model is not accepted structural reinforcement or fabrication engineering.",
    "sourceBasis": "Preserved v1 architecture, v2 coordination and current source manifest.",
    "rawGeometryAdmitted": true
  },
  "ramachandra-devkota": {
    "title": "Ramachandra Devkota",
    "synthetic": false,
    "overallApproval": "NO PUBLIC ENGINEERING ADMISSION",
    "notice": "REV02 source family exists, but there is no admitted public source-specific geometry, steel BBS or programme.",
    "sourceBasis": "Governed private current CAD source; public admissions pending.",
    "rawGeometryAdmitted": false
  },
  "example-empty": {
    "title": "Fictional empty starter — NOT A PROJECT",
    "synthetic": true,
    "overallApproval": "TEMPLATE ONLY / NOT A SITE",
    "notice": "No project, client, site, survey, dimensions, quantities, engineering results, approval or original source exists in this dummy.",
    "sourceBasis": null,
    "rawGeometryAdmitted": false
  }
});
export const NORMALIZED_EVIDENCE=Object.freeze({
  "narayani-parajuli": {
    "pcc": [
      "V02 · v0.8",
      "FROZEN",
      "stages/v02/"
    ],
    "footing-rebar": [
      "V03 · v0.4",
      "FROZEN",
      "stages/v03/"
    ],
    "footing-rcc": [
      "M40 · v0.3",
      "FROZEN",
      "stages/m40/"
    ],
    "dowels": [
      "M50 · v0.5",
      "FROZEN",
      "stages/m50/"
    ],
    "columns": [
      "M60 · v0.1",
      "FROZEN",
      "stages/m60/"
    ],
    "plinth": [
      "M70 · v0.5",
      "FROZEN",
      "stages/m70/"
    ],
    "tank": [
      "M80 · v0.4",
      "ENGINEERING HOLD",
      "stages/m80/"
    ]
  },
  "harisharan-adhikari": {
    "pcc": [
      "V02 · Harisharan PCC / blinding",
      "PROVISIONAL STUDY",
      "projects/harisharan-adhikari/stages/v02/"
    ],
    "footing-rebar": [
      "V03 · Harisharan footing rebar",
      "ENGINEERING HOLD",
      "projects/harisharan-adhikari/stages/v03/"
    ],
    "footing-rcc": [
      "M40 · Harisharan footing RCC",
      "PROVISIONAL STUDY",
      "projects/harisharan-adhikari/stages/m40/"
    ],
    "dowels": [
      "M50 · Harisharan dowel source QA (non-additive)",
      "ENGINEERING HOLD",
      "projects/harisharan-adhikari/stages/m50/"
    ],
    "columns": [
      "M60 · Harisharan columns and six-leg tie scenario",
      "PROVISIONAL STUDY",
      "projects/harisharan-adhikari/stages/m60/"
    ],
    "plinth": [
      "M70 · Harisharan 27 plinth + 12 strap beams",
      "PROVISIONAL STUDY",
      "projects/harisharan-adhikari/stages/m70/"
    ],
    "upper-floors": [
      "Per-floor ledger",
      "PHASE SUMMARY",
      "projects/harisharan-adhikari/?panel=boq&phase=first"
    ],
    "tank": [
      "M80 · Harisharan tank source-intake HOLD, no geometry",
      "ENGINEERING HOLD",
      "projects/harisharan-adhikari/stages/m80/"
    ]
  },
  "ashok-adhikari": {
    "upper-floors": [
      "Architectural / MEP coordination",
      "COORDINATION ONLY",
      "projects/ashok-adhikari/?panel=views&phase=ff"
    ]
  },
  "ramachandra-devkota": {},
  "example-empty": {}
});
export const NORMALIZED_PROJECTS=Object.freeze({
  "narayani-parajuli": {
    "title": "Narayani Parajuli",
    "synthetic": false,
    "overallApproval": "ENGINEERING HOLD",
    "notice": "The published V02–M80 modules are frozen reference viewers, NOT accepted fabrication design. Groundworks V02 is PCC, not a verified soling package.",
    "sourceBasis": "Public AAD source-review model and seven immutable stage workbench archives.",
    "rawGeometryAdmitted": true,
    "normalizationStatus": "SCHEMA_NORMALIZED_NOT_ENGINEERING_APPROVED",
    "slots": [
      {
        "slotId": "survey",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "excavation",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "soling",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "pcc",
        "sourceStatus": "FROZEN",
        "originalSourceModule": "V02 · v0.8",
        "publicSourceHref": "stages/v02/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "footing-rebar",
        "sourceStatus": "FROZEN",
        "originalSourceModule": "V03 · v0.4",
        "publicSourceHref": "stages/v03/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "footing-rcc",
        "sourceStatus": "FROZEN",
        "originalSourceModule": "M40 · v0.3",
        "publicSourceHref": "stages/m40/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "dowels",
        "sourceStatus": "FROZEN",
        "originalSourceModule": "M50 · v0.5",
        "publicSourceHref": "stages/m50/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "columns",
        "sourceStatus": "FROZEN",
        "originalSourceModule": "M60 · v0.1",
        "publicSourceHref": "stages/m60/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "plinth",
        "sourceStatus": "FROZEN",
        "originalSourceModule": "M70 · v0.5",
        "publicSourceHref": "stages/m70/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "upper-floors",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "stairs",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "masonry",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "roof-waterproofing",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "tank",
        "sourceStatus": "ENGINEERING HOLD",
        "originalSourceModule": "M80 · v0.4",
        "publicSourceHref": "stages/m80/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "ENGINEERING HOLD"
      },
      {
        "slotId": "mep-services",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "qa-closeout",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      }
    ]
  },
  "harisharan-adhikari": {
    "title": "Harisharan Adhikari",
    "synthetic": false,
    "overallApproval": "PROVISIONAL / REVIEW OPEN",
    "notice": "Seven source-specific Harisharan V02–M80 viewer routes implemented using original 18-column takeoff; no approved fabrication BBS. M50 dowels are non-additive references; M80 is a source-hold checklist, not fabricated tank geometry. Two footing mesh layers and column ties remain unresolved.",
    "sourceBasis": "HAR-SRC-STR-001 + HAR-SRC-RPT-001 user-selected precedence, original R000001 takeoff and preserved architectural sources. M25/Fe500 grade, source-based planning allowances only.",
    "rawGeometryAdmitted": true,
    "normalizationStatus": "SCHEMA_NORMALIZED_NOT_ENGINEERING_APPROVED",
    "slots": [
      {
        "slotId": "survey",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "excavation",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "soling",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "pcc",
        "sourceStatus": "PROVISIONAL STUDY",
        "originalSourceModule": "V02 · Harisharan PCC / blinding",
        "publicSourceHref": "projects/harisharan-adhikari/stages/v02/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "footing-rebar",
        "sourceStatus": "ENGINEERING HOLD",
        "originalSourceModule": "V03 · Harisharan footing rebar",
        "publicSourceHref": "projects/harisharan-adhikari/stages/v03/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "footing-rcc",
        "sourceStatus": "PROVISIONAL STUDY",
        "originalSourceModule": "M40 · Harisharan footing RCC",
        "publicSourceHref": "projects/harisharan-adhikari/stages/m40/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "dowels",
        "sourceStatus": "ENGINEERING HOLD",
        "originalSourceModule": "M50 · Harisharan dowel source QA (non-additive)",
        "publicSourceHref": "projects/harisharan-adhikari/stages/m50/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "columns",
        "sourceStatus": "PROVISIONAL STUDY",
        "originalSourceModule": "M60 · Harisharan columns and six-leg tie scenario",
        "publicSourceHref": "projects/harisharan-adhikari/stages/m60/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "plinth",
        "sourceStatus": "PROVISIONAL STUDY",
        "originalSourceModule": "M70 · Harisharan 27 plinth + 12 strap beams",
        "publicSourceHref": "projects/harisharan-adhikari/stages/m70/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "upper-floors",
        "sourceStatus": "PHASE SUMMARY",
        "originalSourceModule": "Per-floor ledger",
        "publicSourceHref": "projects/harisharan-adhikari/?panel=boq&phase=first",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "stairs",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "masonry",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "roof-waterproofing",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "tank",
        "sourceStatus": "ENGINEERING HOLD",
        "originalSourceModule": "M80 · Harisharan tank source-intake HOLD, no geometry",
        "publicSourceHref": "projects/harisharan-adhikari/stages/m80/",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "mep-services",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "qa-closeout",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      }
    ]
  },
  "ashok-adhikari": {
    "title": "Ashok Adhikari",
    "synthetic": false,
    "overallApproval": "COORDINATION / REVIEW OPEN",
    "notice": "The architecture and MEP model is not accepted structural reinforcement or fabrication engineering.",
    "sourceBasis": "Preserved v1 architecture, v2 coordination and current source manifest.",
    "rawGeometryAdmitted": true,
    "normalizationStatus": "SCHEMA_NORMALIZED_NOT_ENGINEERING_APPROVED",
    "slots": [
      {
        "slotId": "survey",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "excavation",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "soling",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "pcc",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "footing-rebar",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "footing-rcc",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "dowels",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "columns",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "plinth",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "upper-floors",
        "sourceStatus": "COORDINATION ONLY",
        "originalSourceModule": "Architectural / MEP coordination",
        "publicSourceHref": "projects/ashok-adhikari/?panel=views&phase=ff",
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "stairs",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "masonry",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "roof-waterproofing",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "tank",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "mep-services",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "qa-closeout",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      }
    ]
  },
  "ramachandra-devkota": {
    "title": "Ramachandra Devkota",
    "synthetic": false,
    "overallApproval": "NO PUBLIC ENGINEERING ADMISSION",
    "notice": "REV02 source family exists, but there is no admitted public source-specific geometry, steel BBS or programme.",
    "sourceBasis": "Governed private current CAD source; public admissions pending.",
    "rawGeometryAdmitted": false,
    "normalizationStatus": "SCHEMA_NORMALIZED_NOT_ENGINEERING_APPROVED",
    "slots": [
      {
        "slotId": "survey",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "excavation",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "soling",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "pcc",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "footing-rebar",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "footing-rcc",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "dowels",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "columns",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "plinth",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "upper-floors",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "stairs",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "masonry",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "roof-waterproofing",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "tank",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "mep-services",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      },
      {
        "slotId": "qa-closeout",
        "sourceStatus": "NOT ADMITTED",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "REVIEW REQUIRED"
      }
    ]
  },
  "example-empty": {
    "title": "Fictional empty starter — NOT A PROJECT",
    "synthetic": true,
    "overallApproval": "TEMPLATE ONLY / NOT A SITE",
    "notice": "No project, client, site, survey, dimensions, quantities, engineering results, approval or original source exists in this dummy.",
    "sourceBasis": null,
    "rawGeometryAdmitted": false,
    "normalizationStatus": "SCHEMA_NORMALIZED_NOT_ENGINEERING_APPROVED",
    "slots": [
      {
        "slotId": "survey",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "excavation",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "soling",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "pcc",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "footing-rebar",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "footing-rcc",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "dowels",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "columns",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "plinth",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "upper-floors",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "stairs",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "masonry",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "roof-waterproofing",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "tank",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "mep-services",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      },
      {
        "slotId": "qa-closeout",
        "sourceStatus": "TEMPLATE ONLY",
        "originalSourceModule": null,
        "publicSourceHref": null,
        "sourceRevisionAccepted": null,
        "engineeringApprovalEvidence": null,
        "quantityBasisVerified": false,
        "approvedBBS": false,
        "calculatedValues": null,
        "fieldInspection": null,
        "reviewState": "TEMPLATE ONLY"
      }
    ]
  }
});
export const normalizedSlots=slug=>NORMALIZED_PROJECTS[slug]?.slots||[];
export const normalizedSlot=(slug,id)=>normalizedSlots(slug).find(x=>x.slotId===id)||null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderNormalizedReadiness({slug,root,escape=esc}){
 const info=NORMALIZED_PROJECTS[slug];if(!info)throw Error('Unregistered project in package readiness register');
 const rows=info.slots;
 return '<section class="pw-card pw-normalized" id="pw-normalized"><h2>4.2 · Engineering package normalization</h2>'+
 '<p>Identical 16-slot engineering checklist for every registered project. Technical completeness varies; <strong>schema QA passed does not mean engineering acceptance</strong>.</p>'+
 '<p class="pw-normalized-note">'+escape(info.notice)+'</p>'+
 '<p><a href="'+escape(new URL('projects/'+slug+'/memory-wall/#chapter-3',root).href)+'">Open project engineering memory wall · 3-level contents ↗</a></p>'+
 '<div class="pw-normalized-summary"><strong>'+rows.filter(r=>r.publicSourceHref).length+' / '+rows.length+'</strong> original workbench references · <strong>'+rows.filter(r=>r.engineeringApprovalEvidence).length+'</strong> verified engineering approvals</div>'+
 rows.map((r,i)=>{const p=NORMALIZED_PACKAGE_CATALOG[i],linked=Boolean(r.publicSourceHref),link=linked?new URL(r.publicSourceHref,root).href:null;
 return '<details class="pw-normalized-item" id="package-slot-'+escape(p.id)+'"><summary><span>'+escape(p.number)+' · '+escape(p.title)+'</span><span class="pw-normalized-state">'+escape(r.sourceStatus)+'</span></summary><div class="pw-normalized-inside">'+
 '<p>Original source: '+(linked?'<a href="'+escape(link)+'" target="_blank" rel="noopener">'+escape(r.originalSourceModule)+' ↗</a>':'<strong>Not admitted / no original workbench</strong>')+'</p>'+
 '<p><strong>Engineering approval:</strong> '+escape(r.reviewState)+' · no approved BBS or construction release asserted.</p>'+
 '<h4>Required source inputs</h4><ul>'+p.requiredInputs.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul>'+
 '<h4>Calculation register</h4><ul>'+p.calculationChecks.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul>'+
 '<h4>Field QA / acceptance evidence</h4><ul>'+p.fieldQA.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul>'+
 '<p class="pw-normalized-no-data">Source revision acceptance: unknown · approved member dimensions: unknown · approved measured values: unknown</p></div></details>';}).join('')+'</section>';
}
