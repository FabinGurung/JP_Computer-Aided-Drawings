# CAD Actions consolidation — 2026-10-17

The historical CAD repo accumulated 34 individual workflow definitions. Twenty-six have been copied **byte-for-byte using their original Git blob SHA** from `.github/workflows/` to `governance/ci_archive/20261017/`, and removed from the active Actions location. Git's original history remains intact. No structural models, pages, native bridge code, project assets or snapshot outputs were deleted.

## Active workflows (8)

- `cad-main-pages.yml`: main Pages build, bundled-site checks, real AAD 2D/3D visual test, pinned synthetic native artefacts, deploy
- `cad-m01-live-audit.yml`: post-deploy public-site readback
- `cad-aad-linked-room.yml`: PR AAD product regression, mobile/tablet/desktop pixel checks, selected-element and saved-model tests
- `cad-unified-theme.yml`: PR cross-route UX, responsive navigation, immutable stage/route assertions
- `cad-unified-website-qa.yml`: website staging, type checks, research-generator reproducibility and preserved stages
- `cad-native-contracts.yml`: PR/on-demand all backend native unit tests, IFC/STEP/DXF and machine outputs, earlier browser editor regressions
- `cad-m08-machine.yml`: explicit synthetic deterministic-machine dispatch and scoped contract QA
- `cad-m12-2a-private-source.yml`: explicit authenticated-source attestation boundary checks (does not connect actual private Drive)

## Coverage and limits

This keeps the main operational gates while eliminating the swarm of separate M01–M12 Actions cards. The preserved workflows can be reinstated individually if a specialized M07–M11 acceptance gate is needed during later native-engine development. Unit-test discovery covers current backend tests, but full historical workflow-by-workflow parity has **not** been demonstrated; specific historical contract scripts and private admissions should be restored or integrated before a production feature requires them.

All original retired workflows are preserved in `governance/ci_archive/20261017/`. To restore one, copy its exact archived content back to `.github/workflows/<filename>.yml` on a branch and run relevant CI; do not bypass gates on unsafe/private source changes.

The single active CAD product stays `/cad/aad/`. Earlier `/cad/` and `/cad/brief/` are compatible preserved tools, not alternate canonical engines.
