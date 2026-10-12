# M09.2 — Multi-source CAD evidence, revision lineage and private boundary

Status: GitHub-reviewed, public-synthetic contract increment. This extends M09.1 without changing M08 native IFC/STEP/DXF geometry or redesigning the CAD website. Synthetic checks do not validate construction design.

## What changes now

The normalized source-bundle v0.2 records independent source objects with stable artifact and source IDs, typed roles (GEOMETRY, BRIEF, CONSTRAINT), revision identities, a current/superseded lifecycle, exact file SHA-256 and source-authority classification.

A complete synthetic example has four independent source documents:

1. Source geometry, M08_R1, CURRENT; native M08 and M09.1 parser still governs dimensions and actual wall openings.
2. A synthetic space brief, BRIEF_R1, CURRENT.
3. A superseded constraint reference, CONSTRAINT_R1.
4. A current constraint reference, CONSTRAINT_R2, with an explicit SUPERSEDES edge to R1.

The machine checks every input's bytes and controlled path; one current revision per source; exactly one CURRENT GEOMETRY matching the signed-off-on-source-hash M09.1 job (not signed by a human); a single uninterrupted revision lineage per source; unique IDs, paths and source/revision pairs; no cross-source revisions, cycles or missing parents. It emits stable REFERENCES and SUPERSEDES provenance and an idempotent run key independent of document list order.

Public evidence transitions are deliberately limited:

    HOLD
      -- [machine verifies every immutable input hash] --> SOURCE_VERIFIED
      -- [creates a human review request] -------------> ENGINEER_REVIEW_REQUIRED

Those are evidence-workflow states. They do NOT imply engineering approval. Every emitted receipt still has engineering_approval=HOLD, release_authorized=false, quantity_takeoff=BLOCKED, private_execution_enabled=false. Attempts to assert APPROVED, CLIENT_SIGNED, FIELD_APPROVED, or release approval are rejected.

## Machine execution without ChatGPT

Use GitHub Actions workflow "CAD M09.2 Multi-Source Evidence and Private Boundary".

For command-line reproduction from the repository root:

    python -m unittest backend.tests.test_governed_job backend.tests.test_source_bundle -v
    python -m backend.cad_bridge.bundle_cli --bundle design_jobs/synthetic/m09_multisource.bundle.json --repo-root . --out /tmp/m09-2-receipt.json

The workflow independently verifies hashes, 4 document identities, a 4+1 edge lineage proof, exact code-owned review status and HOLD/QTO/private restrictions. No arbitrary URLs, Drive secrets, client source files or external input actions are accepted. A short-lived nonproduction synthetic receipt is retained.

## Architecture for eventual real-client execution — NOT DEPLOYED

Public GitHub Pages and public GitHub Actions are the wrong boundary for confidential construction drawings or financial/client records. The private boundary module declares protocols, and its public dispatcher is hard-disabled.

A future separately hosted and secured private service must supply, in order:

1. An authenticated request with a provider-verified identity, issuer, audience and expiry. Never trust a user-provided "approved":true, email string or source path as proof.
2. A project-level access-control decision that binds principal, owning company, project ID, allowed operations and source versions.
3. A short-lived credential broker for authorized Google Drive/provider access. It must not expose credentials, signed URLs or raw client documents in logs, public CI artifacts, Git commits, or Pages.
4. An authenticated source resolver that reads exact provider file ID + version/revision, checks byte lengths and SHA-256 against the owning project authority, and records a private audit receipt.
5. A private machine runner that executes the pinned geometry implementation with private isolated temporary storage and a separate encrypted output store. No copying derived assets back to public Actions or Pages.
6. An engineering approval workflow with independently verifiable authorized reviewer identity, revision-lock and release signature, separate from mere checksum QA.
7. Minimal public-safe projections: stable opaque project/artifact identity and approved metadata only.

The code exposes AuthenticatedCredentialBroker, AuthenticatedSourceResolver and ImmutableArtifactStore Protocols and PrivateSourcePointer types, but supplies NO implementation, credentials, authentication, actual Drive access, or private execution authority. private_execution_plan returns only redacted source IDs and BLOCKED_PRIVATE_RUNNER_NOT_CONFIGURED. dispatch_private_design ALWAYS refuses. This is a deliberate safety boundary, not an incomplete claimed deployment.

## Durable metadata / ownership

- project-owned Drive holds original real-client source files and the active source authority.
- project Local Library records stable IDs, revisions and typed lineage for project artifacts; Main Library receives acknowledged deltas only.
- GitHub version-controls software, source schemas, tests, and public synthetic samples.
- human engineering signoff, BOQ quantities and construction release remain outside this synthetic proof.
- A9 SEQ30 was the prior governed M09.1 closeout; do not mutate or overwrite that history. Register this completed code milestone as the next actual change only after provider merged-commit and CI readback, and preserve PRE/POST snapshots.

## Remaining outside M09.2

A real authenticated private runner, multi-provider source adapters with strict revision-lock, approved design-operation DSL, IFC roundtrip fidelity for nontrivial geometry, native source extraction for Narayani, human engineering signoff and cost/BOQ use are NOT delivered here. Do not promote them implicitly.
