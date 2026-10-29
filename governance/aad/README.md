# AAD domain guide template — CAD-owned

Current implementation version: **0.3.1**, at the same canonical template path
and template ID. The added code register and archive-before-update document
control are reusable capabilities within the existing CAD boundary. Human pages:
`/memory-wall/` and `/codes/pokhara/`. Private engineering working records stay in
their one canonical Google Doc; this repo does not mirror their private IDs.

**Canonical writer and version history:** this repository, `FabinGurung/JP_Computer-Aided-Drawings`. The machine contract is [aad-domain-template.v0.1.json](aad-domain-template.v0.1.json). The public-facing guide is [../../public/guide/index.html](../../public/guide/index.html).

## Architectural decision

- **A7 is an index/atlas**: service catalogue, metadata registry, global discovery, cross-repository route and lineage references. It may index the URI, version, ownership ID, capabilities and last accepted commit of this template; it must not independently edit or own the template.
- **AAD/CAD is a bounded domain**: natural-language-to-drawing rules, parametric CAD/BIM templates, geometry and IFC/STEP/DXF export contracts, 2D/3D browser details, tests, user documentation and release manifests live here.
- **Other specialist domains are peers**: Structural owns structural analysis and approvals; Scheduling owns task/calendar/4D activities; Cost owns quantities/rates/5D; Operations owns accepted field evidence; R&D owns research formats; Study owns learning content. They link to AAD through typed references, not by importing a writable copy into A7.
- **Original project source** belongs to its authenticated source provider, not to a public catalogue.

## User-to-engine flow

User speaks in natural language → AI interpreter resolves authoritative sources and captures facts → CAD validator checks units/identities/revisions and missing information → pinned CAD geometry kernel executes → tests and professional approval gates apply → public-safe UI displays 3D-first model, 2D sections and progressive detail → exact software version/source fingerprints/output digest recorded.

This does **not** transfer the AI model's hidden capabilities into GitHub. Determinism means reproducible validated inputs, pinned source and runtime; separate AI systems using only the same unstructured prompt may interpret it differently.

## Public guide organization

The existing `/guide/` is the ordinary human entrypoint named **How It Works**, linked from the CAD homepage and `/cad/brief/`. A developer/AI agent subsection links the local machine contract. It must not claim A7 has power to edit CAD; A7 merely points to this repository and its owner.

`3D` is the preferred exploration interface; `2D` drawings and sections are selected views. `4D` and `5D` are proposed typed integration links to Scheduling and Cost respectively, not a claim these layers are implemented now. Worker detail sheets must carry source revision and actual engineering acceptance, not derive purported instructions from draft geometry.

## Fail-closed mutation rule

When a CAD/AAD task creates or changes schemas, templates, drawings, site guides, source interpretations, architecture decisions or pipeline code:

1. Resolve this CAD repository as the writable owner; confirm `main` and exact head SHA.
2. Edit **only this repository** using its ordinary branch/PR/CI/version history.
3. Keep pointers to A7 **read-only**. Do not open PRs, commit, edit site files or update an A7 registry as a side effect.
4. If A7 catalogue metadata is out of date, register a **local pending catalogue-update recommendation** and request explicit user permission for an isolated A7-scoped task.
5. Never treat the historical A7 `policies/global/ai-aided-product-guide.v0.1.json` as the canonical owner of this drawing template. It remains historical until the user separately authorizes A7 clean-up.

The present Narayani pilot remains held at a private DWG-to-reviewed-DXF step; do not infer source-version parity, structural dimensions or actual construction-ready results.

V2 adds reusable MEP classification, source-linked route data, plot/building coordinate conversion, location-feedback pins and roof-cover visibility controls. Spreadsheet schedules are data views, not geometry engines.

0.3.1 repairs feedback-pin restoration, validation and redraws, touch feedback and the MEP plan visibility toggle. Excel remains a coordination worksheet; it does not publish or synchronize geometry.
