# M09.1 — Governed CAD machine-job contracts (synthetic-only)

This is a small, independently testable M09 increment following merged M08. It does not redesign the website, change native geometry, or enable private client execution.

## Authority and behavior

1. The governed execution envelope has version fabin-cad://governed-job/0.1. It binds project identity, an explicit source ID and revision, the source SHA-256, and a pinned M08 design-job SHA-256.
2. The validator accepts only checked-in synthetic fixture paths under design_jobs/synthetic/, resolved with path/symlink confinement. It rejects private classification and approval promotion.
3. The existing M08 validator checks source/project hashes, non-invented dimensions, object kinds, levels, and hosted openings.
4. M09 cross-checks document identity and every object-to-source reference. It produces deterministic REFERENCES provenance edges for SOURCE, LEVEL, LEVEL_SOURCE and HOST roles.
5. The run key derives only from the versioned execution ID, project ID, source revision and pinned job/source digests. Identical inputs yield identical results. The result output cannot be silently overwritten.
6. Rejected jobs emit machine-readable diagnostic codes, without exposing arbitrary filesystem paths in public logs.

Validation does not constitute engineering approval or issuance. Its output has engineering_approval=HOLD, release_authorized=false and private_execution_enabled=false.

## File layout

- backend/cad_bridge/governed_job.py — validator and lineage projection
- backend/cad_bridge/governed_cli.py — validated CLI, stable diagnostic codes
- backend/tests/test_governed_job.py — positive/negative tests
- design_jobs/schemas/governed-job-0.1.schema.json — JSON Schema shape
- design_jobs/synthetic/m09_demo.governed.json — pinned, synthetic fixture
- .github/workflows/cad-m09-contract.yml — GitHub Actions tests and independent readback

## Execute on GitHub Actions

Use the CAD M09 Governed Synthetic Design Job Contracts workflow in the Actions tab. It has no arbitrary URL input, no raw private input and no approval override. It performs Python tests and independently verifies the output result's source/contract/job SHA-256, object count, provenance edges, release HOLD and private-execution prohibition. A 14-day nonproduction evidence artifact is retained.

Local equivalent:

    python -m unittest backend.tests.test_governed_job -v
    python -m backend.cad_bridge.governed_cli --contract design_jobs/synthetic/m09_demo.governed.json --repo-root . --out /tmp/m09-validation.json

This first M09 increment only validates and proves source/job contracts. The separate M08 native IFC/STEP/DXF engine continues as-is. Passing contract validation is not proof of a completed geometry execution, and this new workflow does not publish a client design.

## Next constraints

M09.2 will need multi-document source manifests, source authority transitions, an authenticated private resolver, protected compute/artifacts, stronger typed design operations and independent engineering approval. Do not enable real Narayani/client sources on public GitHub Actions/Pages. Preserve the A9 Local sequence and prior PRE/POST snapshots; reconcile Main's current record against the most recent local record before new registry writes.
