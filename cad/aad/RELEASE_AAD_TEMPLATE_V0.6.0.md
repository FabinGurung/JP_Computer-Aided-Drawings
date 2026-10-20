# AAD Template v0.6.0 — Unified Multistorey Studio

**Milestone type:** governed CAD/AAD software and IFC interoperability release.

**Repository:** `FabinGurung/JP_Computer-Aided-Drawings`  
**Tag:** `aad-template-v0.6.0`  
**Release state:** source-tagged, browser- and IFC-validated software. **Not construction approval.**

## Shipped

- Canonical AAD template at [Design Studio](https://fabingurung.github.io/JP_Computer-Aided-Drawings/cad/aad/) now routes into the shared multistorey 2D/3D BIM workspace; prior one-storey text-command demonstration remains under `/cad/aad/legacy/`.
- One building-level authoritative working state drives editable connected floor graphs, global coordinates, three-storey 3D geometry, component schedule, IFC4 writer, QA and exports. Narayani is a project-data adapter—not a project-specific geometry engine.
- Reciprocal element selection: click 2D, 3D or schedule to highlight the same ID in all available views. Amber highlighting, 3D outline, selected schedule row, accessible keyboard selection and honest 2D locators for 3D-only structural objects.
- Validated structured `window.AADStudio` actions, versioned editable BIM drafts, safe undo/reset/reload persistence, and machine-readable `aad-building-v1.json` project manifests.
- IFC4 interoperable building/storey hierarchy with typed architectural/structural geometry, wall void and filling relationships. Published Narayani Block B covers the ground/first/second floor envelopes.
- **Release debt closure:** defensive read-only snapshots prevent bypassing the validated edit API; a generic per-project manifest/IFC validator; independent IfcOpenShell parsing; expanded live Pages AAD/IFC readback; a release gate that prevents tagging before production validation.

## Traceable QA

- [AAD reciprocal-selection integration PR #50](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/pull/50)
- [Pre-release canonical template/browser/IFC check](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/actions/runs/39360744025)
- [Validated production Pages](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/actions/runs/39361222290)
- [Production live readback](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/actions/runs/39361430012)
- Updated release QA and exact tag SHA are recorded by GitHub Actions for the milestone commit.

## Source and safety boundary

The architectural DXF authority and existing frozen V02–M80 structural/engineering packages remain untouched. The Norayani concept model's 205.16/200.67/175.62 m² source floor-area schedule is retained; local model geometry, alignment offsets, structural grid, member sections, stairwell and slabs may include documented assumptions. IFC4 round-trip validity **does not establish** IFC completeness, design-code compliance, reinforcement design, strength adequacy or authority approval.

**Status: ENGINEERING HOLD. Never issue for construction based on this release.**

## Explicitly deferred — not claimed complete

- Direct survey/DXF-based georeferencing and cross-storey registration, architectural completeness and certification.
- Verified structure/foundation/member-load/reinforcement/stair structural design and resolution of M80 engineering HOLD.
- Rich BIM authoring (arbitrary connected wall topology, hosted BIM object families, semantic `IfcSpace` geometry and complete property sets).
- Unattended natural-language design generation in a hosted LLM; current GitHub Pages is a static engine. AI assistants must author project files or call validated structured actions.
- Two-way authenticated Drive/GitHub source reconciliation and governed cloud draft persistence beyond browser-local work.

These are **future product/engineering milestones** rather than defects in the v0.6.0 sealed software scope.

## Reuse and rollback

- Shared template and AI contract: `cad/aad/TEMPLATE_AI_CONTRACT.md`.
- Reproduce from release tag with `npm ci`, `npm run build -- --base=/JP_Computer-Aided-Drawings/`, `node tools/site/aad-validate-project.mjs public/data/projects/narayani-parajuli/aad-building-v1.json`, GitHub browser tests and independently pinned IfcOpenShell validation.
- Previous tag/release and GitHub commit history remain available as rollback; historical source work is archived, not deleted.
