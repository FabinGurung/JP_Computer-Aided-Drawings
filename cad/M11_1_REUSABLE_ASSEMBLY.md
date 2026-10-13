# M11.1 — Reusable project-level synthetic CAD assembly

This bounded increment follows M10.2/A9 SEQ33. GitHub versions the software and fixtures; Google Drive A9 Local/Main registry remains the synchronization authority. Previous M08–M10.2 geometry and website routes are unchanged.

## Assembly input

The file at design_jobs/synthetic/m11_demo.assembly.json is an explicitly typed, source-pinned assembly envelope.

- project_id and assembly_id: stable identities and a project FK to the unchanged M10.2 source.
- source.path + source.git_blob_sha1: a SHA-pinned allowlisted synthetic M10.2 baseline. The validator rejects altered source bytes, escaped paths, unexpected project IDs, and symlinks out of the allowlist.
- groups: metadata group identifiers. These describe logical collections only; they are not member forces or structural supports.
- templates: four reusable geometry definitions, with one dimension set each for FOOTING, COLUMN, BEAM and SLAB.
- instances: six independently positioned geometry records with template_id, group_id, level_id, source_id, translation and reviewed yaw. Column and footing templates each occur twice to demonstrate reuse.
- all dimensions are source-owned mm. No automatic engineering inference or cost assumption.

Existing M10.2 walls include a 60-degree corner, a T-junction and a true hosted wall opening. M11.1 component instances are deliberately axis-aligned (yaw=0); angled wall support is preserved. More complex component orientation is a future increment.

## Machine output

Run from repository root after installing backend/requirements.txt:

    python -m unittest backend.tests.test_assembly_engine -v
    python -m backend.cad_bridge.assembly_cli --preset synthetic-assembly --repo-root . --out /tmp/cad-m11-1-assembly

GitHub Actions workflow: CAD M11.1 Reusable Assembly Native Contract.

The repeatable machine emits:
- assembly.ifc: the actual source-owned M10.2 IFC wall model, void relation, plus two IfcFooting, two IfcColumn, one IfcBeam, one IfcSlab, each with stable deterministic GUID, instance ID and template/group provenance.
- assembly.step: OpenCascade fused M10.2 wall network *plus six separate, unfused component BRep solids* in one compound; grouping does not invent a monolithic structural connection.
- assembly.dxf: actual rotated M10.2 wall plan footprint, joint point records, hosted-opening marker, and six typed layered component polylines with source IDs and grouping XDATA.
- plan.svg: readable schematic outlines of typed components layered on the existing verified synthetic plan.
- section.json + section.svg: the inherited exact OpenCascade BRep section through the M10.2 baseline wall opening. It is NOT a section showing all newly added component intersections.
- assembly-graph.json: stable 25 directed project-scoped assembly/template/group/level relationships, using typed INSTANCE_OF, GROUPED_IN, ON_LEVEL, DEFINES_TEMPLATE and HAS_GROUP edges.
- index.html and manifest.json: static review page and independent source/output SHA-256, classifications and hard approval gate.

Every generated output is checked for native geometric shape, identity, hash and consistent classification. The fixture has no real client data and the generated artifacts are time-limited synthetic QA evidence.

## Explicitly excluded

This is **NOT** a structural design, BIM LOD certification, shop drawing, automatically validated load path, reinforcement detail, connection analysis, material quantity takeoff, bill of quantities or construction approval.

The group relationship is only metadata, not a structural support connection. The STEP component solids are intentionally NOT Boolean-fused with the wall solid. The section reflects the existing M10.2 wall network, not all new components. No arbitrary client sources, Drive credentials, personal records, or construction-stage execution enter GitHub.

engineering_approval=HOLD, quantity_takeoff=BLOCKED, release_authorized=false, private_execution_enabled=false and structural_design_verified=false are immutable synthetic machine states. Actual client execution must use a separately authenticated private runner, per-project access controls and independent engineer review.

## Next increment

Extend this parametric assembly from axis-aligned boxes to rotated, level-aware multi-storey and more complete architectural/structural components, with explicit geometric contacts or constrained connection semantics and an assembly-wide exact section. Only after that and real signed input authority should construction-facing workflows be considered.

## A9 governance

Never overwrite prior SEQ33 data. After the merged GitHub commit and complete CI/pass readback, use the next available Local A9 sequence. Make independently verifiable PRE Local/Main copies, register versioned GitHub outputs and source/job FKs with deterministic PK/FK edges, project new Local records to Main without duplicates, receive provider readback and 34/34-style acknowledgment as actually verified, make frozen POST copies, register terminal evidence nonrecursively within the SAME sequence and close out. Never invent email acknowledgments.
