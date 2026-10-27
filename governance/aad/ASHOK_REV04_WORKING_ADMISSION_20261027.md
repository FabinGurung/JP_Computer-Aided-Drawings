# Ashok Adhikari REV04 working publication · 2026-10-27 NPT

The user authorized selection of the latest files in the registered Ashok
project folder and a working GitHub Pages project using the current template.
This supersedes the previous read-only migration boundary for this work.

Selected: REV04 v0.8 semantic geometry and deterministic SVGs; v0.9 embedded
approved GF c016 / FF c012 bytes. REV03 v0.4 remains the official recorded
client baseline. No REV04 promotion or engineering freeze is implied.

Working route: `projects/ashok-adhikari/`. Data folder:
`public/data/projects/ashok-adhikari/`. The technical project namespace is the
slug, not a newly invented A9 PRJ number. No A7 changes or Drive mutations.

Base: `2a9f1e1ba311f5e6bc2527f30080900ab13bd7a7`.
Branch: `feat/ashok-rev04-working-studio`.
The ordinary PR/commit and Actions records provide commit/tree/deployment
lineage. This document records admission, not a claim that deployment passed.
Provider URLs and private source IDs remain outside the public repository.

## Conversion and reproduction

```bash
python tools/site/ashok-import-rev04.py \
  --package /private/source-zip.zip --html /private/source-html.html \
  --out public/data/projects/ashok-adhikari
node tools/site/ashok-rev04-smoke.mjs
npm ci
npm run build -- --base=/JP_Computer-Aided-Drawings/
python tools/site/check_public_routes.py dist
```

The importer pins package, source model and HTML hashes; verifies 26 package
hashes and sizes; copies exact SVGs; extracts exact approved PNG bytes; strips
private provider IDs from the semantic JSON. Output hashes exclude their own
manifest. Two independent runs must produce identical files.

The current shared multistorey AAD editor is reused. A generic, opt-in
`ARCHITECTURAL_REVIEW_ONLY` representation admits source SVG wall centre-lines
and nine hostable scheduled doors. It generates **no** columns, beams,
foundations, slabs, roof or stair solids. Existing project behavior is unchanged
unless that explicit representation is selected. Wall extrusion uses the M10
3048 mm rise as a display envelope; it is not an as-built height.

All 33 source opening records remain in the semantic source and are either
modeled or explicitly deferred. Absolute window sill levels are absent. The
FF primary-entry anchor does not lie on the deterministic front boundary;
it is deferred for host/jamb QA. Source wall overlaps, external WC, fixtures,
parking and stairs remain visible in exact SVGs and semantic records, without
inventing engineering solids. Canonical SVG presentation is not recast as an
approved finished plan.

## QA and rollback

Source/template checks assert hashes, geometry envelope, IDs/FKs, removed doors,
deferred records, privacy and architectural-only IFC contents. Browser checks
exercise 390/820/1440 widths, the actual iframe model, linked plan/mesh/table,
source SVGs, approved images and downloadable local QA notes. Existing Narayani
source and shared-workspace tests provide non-regression coverage.

Engineering holds remain in `source-manifest.public.json` and the user-facing
QA panel. M08 source custody is a hold on source-complete claims, not a reason
to fabricate or silently block this authorized working migration.

Rollback by normal revert PR to the recorded base/preceding merge. No source
deletion, force push, history rewrite or change to frozen Narayani stages.
Do not close A9 seq30 or claim Main/Local synchronization from this GitHub-only
working publication; that private registration is not performed here.
