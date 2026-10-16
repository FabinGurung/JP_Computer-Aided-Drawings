# M12.2A — Private source-byte attestation (bounded gate)

**Status:** implementation proposed for CI / PR, *not* a deployed private runner.

This increment implements `backend/cad_bridge/private_source_attestation.py` as a
read-only gate for a future authenticated **private** CAD service. It builds
on M09.2's deliberately disconnected `private_boundary.py` and does not
change the public `/cad/` or `/cad/brief/` viewer.

## What the new gate actually does

1. Validate an immutable private-source pointer: stable source ID, provider,
   opaque provider locator, pinned version and lower-case SHA-256.
2. Require a trusted dependency-injected credential broker to authenticate an
   unexpired principal and authorize that principal for the target project.
3. Require a trusted provider version adapter to verify the pinned revision
   is still current **before** reading source bytes.
4. Fetch read-only through a trusted private source adapter; accept only
   nonempty `bytes` up to 64 MB; SHA-256 compare against the pinned digest.
5. Re-check the pinned provider revision after the read to reject revision
   churn during retrieval.
6. Return a minimal redacted private-stage receipt. Never echo provider
   locators, version identifiers, project IDs, tokens, hashes or source bytes.

All broker/resolver/version failures return constant, safe error codes, not
provider exception contents. Caller-supplied JSON is never accepted as proof
of identity; the deployment must own its broker, ACL and version adapters.
A real adapter must enforce scoped provider authority at *each* operation.

## Explicitly NOT accomplished

- No production Google Drive credential flow or credential broker is configured.
- No actual Narayani project bytes were downloaded, converted or published.
- No DWG-to-DXF translator, format parity proof or coordinate-system validation.
- No IFC/STEP/DXF model executed by this private admission gate.
- No engineering approval, construction release, actual QTO, or public source
  publication. Existing `dispatch_private_design` **still fails closed**.

## Synthetic QA and next steps

`python -m unittest backend.tests.test_m12_private_source_attestation -v`

CI: `.github/workflows/cad-m12-2a-private-source.yml` also runs previous
private-boundary and AAD ownership tests. All test fixture bytes are synthetic.

**Next M12.2B:** connect an actual private provider adapter with short-lived
credentials, server-side project ACL, immutable provider revision metadata,
private encrypted artifacts and audit receipts. **M12.2C:** licensed DWG
conversion, exact source/converted DXF version lineage, unit and coordinate
confirmation, and independently checked format/geometry parity. Ingest only
verified current input, keep source bytes read-only, and retain the
construction and publication HOLD gates until separate approvals.

**Repository ownership:** CAD/AAD owns this engine and these contracts.
A7 remains a read-only directory and is not edited or auto-synced by CAD.
