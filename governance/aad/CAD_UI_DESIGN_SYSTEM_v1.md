# CAD website design system — Lucid Blueprint & Daylight v2

**Owned by:** `JP_Computer-Aided-Drawings` / AAD-CAD domain. **A7:** read-only service catalogue, never a template writer.

## One principal user journey

**Home → Design Studio → select a building component → edit and inspect its connected 2D/3D model.**

Only **AI Design Studio** (`/cad/aad/`) is a current, promoted user-facing drawing product. Its one synthetic semantic model controls 2D and 3D views, validated parameters, hosted openings, connected column/grid/beam geometry, stable element IDs and local JSON drafts.

The two earlier **standalone experiments** are retained but de-emphasized:
- **Previous CAD Studio** (`/cad/`): cameras, snapping, section/IFC/DXF overlays, native investigations and local projects; kept as a compatibility/research route, not another primary editor.
- **Previous words-to-mass preview** (`/cad/brief/`): limited dimensions-to-envelope parser; not a general AI compiler or the current common model.

The homepage shows exactly one prominent editor launch. Earlier experiments are reachable only from an expandable capabilities section. Keep the old public URLs alive while their useful functions are folded into the single model editor.

All other pages remain reachable under **expandable disclosure**:
- Capabilities & engines: native tests, M01–M12, production/private execution boundaries.
- Research: v0.1/v0.2 canonical geometry proofs and archived datasets.
- Projects: governed Narayani and Ramachandra portals; M80 remains HOLD.
- Releases & Sources: immutable history and public-safe provenance.

The homepage is a **single-product entrypoint**, not another geometry engine, project authority, or duplicate A7 catalogue.

## GitHub Actions scope

The primary browser-model test (`cad-aad-linked-room.yml`) must cover `cad/aad/**` and the produced Pages bundle, including non-blank 2D/3D visuals and draft edits. Website navigation/theme QA remains separately scoped. Native CAD Studio regression workflows trigger on `cad/*.ts`, `cad/*.html` and `cad/*.css`, plus their own relevant native/backend files, **not every change below `cad/aad/`**. The published Pages build and live readback remain mandatory; native demonstration assets and frozen evidence remain preserved. Do not disable security/boundary or actual native-engine checks solely to reduce workflow count.

## Visual source of truth

- `public/assets/css/cad-unified-theme.css` — sole active cross-page style layer; import **after existing styles**.
- `public/assets/js/cad-site-shell.js` — sole active cross-page primary navigation; use page-relative `data-cad-root`.
- Component-specific CSS (CAD Studio, AAD, conversational preview) retains local interaction/layout ownership while inheriting theme colors.
- Canonical palette: daylight `#f8f9fa`, surface `#ffffff`, raised `#f1f5fb`, dividing line `#d9e2ec`, text `#1f2937`, muted `#5b6b7a`, blueprint blue `#2563eb`, coral accent `#e45253`, amber caution `#a75c07`.
- Light drafting desk by default. **High-contrast technical sheets, SVG plans and 3D canvases are the primary product**, not an ornamental background.
- 3D, 2D and the element inspector remain model-derived where supported, never redrawn separately from independent copies.

## Preserve historical projects and releases

- Existing source engines, tests, native output artifacts, project files, URLs, stage viewers and public research files MUST NOT be removed or silently rewritten.
- Frozen `public/stages/v02,v03,m40,m50,m60,m70,m80` and generated earlier research snapshots retain their internal layout and original evidence. Users reach them via the shared daylight project/research portal, which provides the shared surrounding shell. A historic screenshot is not the current product.
- New UI must never assert verified private project source, IFC engineering release, actual BOQ, DWG/DXF parity, signed IFC, construction readiness or real design approval that is absent in source authority.
- Keep old routes functional; only change the discovery and surrounding app shell on mutable active pages.

## Site contribution contract

Every new **current** CAD user page must:
- import the shared stylesheet last and load the shared navigation script;
- link back to AI Design Studio and to the capability home;
- label capabilities `WORKING`, `DRAFT / SYNTHETIC`, `HELD`, or `FUTURE` based on actual implementation;
- use brief summaries with `<details>` for secondary material rather than creating unnecessary pages;
- keep JS source logic and geometry contracts owned by specialist modules, not the navigation;
- be readable on 360 px mobile screens, keyboard-focusable, and independently buildable;
- preserve all old pages until a separately verified deprecation/migration is approved;
- verify GitHub Pages build, navigation links, input flow and static-source privacy.

This is **presentation/navigation consolidation**, not an A9 engineering admission or a new private-source conversion. A9 provider records and all design review gates remain unchanged.
