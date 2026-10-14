# M11.2 — Native rotated multilevel assembly and exact full section

Increment to M11.1 / A9 SEQ34. Adds public synthetic fixture `design_jobs/synthetic/m11_2_multistorey.assembly.json` and strictly additive modules.

The job refers by verified Git blob SHA to the unchanged M11.1 assembly; that assembly itself pins the M10.2 angular-wall source. It has a new storey (First at 3360 mm), three additional component templates, four placed component instances and one 30-degree rotated beam. In total the resulting model contains 10 components on 2 levels, alongside four preexisting connected source walls and their hosted opening. Exact position/yaw are source-owned and audited. Template/group/level foreign keys are required. The new JSON is synthetic-only; arbitrary private sources and authority escalation are rejected.

## Native contract

- IFC4 (IfcOpenShell): preserves M10.2 walls/openings and M11.1 components, creates an explicit second IfcBuildingStorey and true 30-degree transform with typed beam/column/slab products.
- STEP (OpenCascade): one true fused existing-wall BRep plus 10 independent, geometrically constructed component solids. Independent solids intentionally preserve individual IDs and do **not** imply actual load-transfer connections.
- DXF (ezdxf): source-owned rotated component footprints on typed layers with provenance XDATA.
- Exact assembly section: a **single plane X = 1250 mm** intersects the native fused wall BRep *and each of the 10 component solids*, generating edge traces on both ground and upper levels from BRepAlgoAPI_Section, not a schematic projection. Source component intersections are counted separately.
- Geometric-contact evidence: 4 declared slab/column face touches are independently checked with native BRep distance, Boolean overlap-volume test and positive planar contact patch area. Semantic relation `GEOMETRIC_SURFACE_CONTACT` never implies verified structural connectivity.
- Outputs: `assembly.ifc`, `assembly.step`, `assembly.dxf`, `plan.svg`, `section.json`, `section.svg`, `contacts.json`, `assembly-graph.json`, `index.html`, and SHA256 `manifest.json`. Each output digest is externally read back in CI.

## Reproduce

Run from repository root after `python -m pip install -r backend/requirements.txt`:

    python -m unittest backend.tests.test_assembly_multilevel -v
    python -m backend.cad_bridge.assembly_multilevel_cli --preset synthetic-multilevel --repo-root . --out /tmp/cad-m11-2-evidence

GitHub workflow `CAD M11.2 Two-Level Rotated Assembly and Exact Full Section` also runs M11.1/M10.2/M10.1/source-governance regressions and checks native IFC placement, STEP solid count, 4 validated contacts, exact two-level section intersection, schema/foreign-key rejections, and artifact digests.

## Deliberate limitations

This phase is bounded to two storeys, straight prism component types, exact rigid yaw, horizontal-planar contacts and one X-normal section plane. No general beam-column connection force computation, rebar schedules, concrete design, construction quantities, BOQ, architectural dimensions, arbitrary-floor UI or private CAD source resolver has been implemented. Source contact proof is geometric proximity, not structural load path or code compliance.

All source and native outputs are `SYNTHETIC_QA_ONLY`. Approval is `HOLD`; QTO is `BLOCKED`; `private_execution_enabled=false`, `structural_design_verified=false` and `release_authorized=false`. Never use these synthetic outputs for construction.

## Governance

GitHub versioned merge plus passing CI and postmerge Pages is a prerequisite to A9 SEQ35 Local/Main registration. Verify live Local and Main before writing, copy PRE snapshots to established rollback locations, register each unique code/evidence artifact and directed FK, independently read back all Local identities and semantic relationships in Main, acknowledge the exact sequence in both libraries, then freeze and register POST copies nonrecursively *within the same sequence*. Preserve earlier SEQ34 and legacy raw edge ID exceptions.
