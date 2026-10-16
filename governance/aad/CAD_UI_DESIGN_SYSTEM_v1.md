# CAD website design system — Midnight Blueprint v1

**Owned by:** `JP_Computer-Aided-Drawings` / AAD-CAD domain. **A7:** read-only service catalogue, never a template writer.

## One principal user journey

**Home → choose a task → product screen → select an element → see details.**

The default user should only encounter:
1. **AI Design Studio** (`/cad/aad/`): one synthetic connected 2D/3D room model; measured-parameter edits, stable element IDs and local JSON.
2. **Describe a building** (`/cad/brief/`): restricted phrase parser giving a geometric mass, with dimension/missing-fact limits.
3. **Full CAD Studio** (`/cad/`): CAD model editing, cameras, section/IFC/DXF/semantic overlays and local project drafts.

All other pages remain reachable under **expandable disclosure**:
- Capabilities & engines: native tests, M01–M12, production/private execution boundaries.
- Research: v0.1/v0.2 canonical geometry proofs and archived datasets.
- Projects: governed Narayani and Ramachandra portals; M80 remains HOLD.
- Releases & Sources: immutable history and public-safe provenance.

The homepage is a **capability launcher**, not another geometry engine, project authority, or duplicate A7 catalogue.

## Visual source of truth

- `public/assets/css/cad-unified-theme.css` — sole active cross-page style layer; import **after existing styles**.
- `public/assets/js/cad-site-shell.js` — sole active cross-page primary navigation; use page-relative `data-cad-root`.
- Component-specific CSS (CAD Studio, AAD, conversational preview) retains local interaction/layout ownership while inheriting theme colors.
- Canonical palette: midnight `#091522`, surface `#101f30`, raised `#152b3c`, dividing line `#2c465b`, text `#e9f4fb`, muted `#aac2d3`, primary teal `#65dcca`, amber `#f7bd7a`.
- Dark engineering desk by default. **White technical sheets, plans, canvases and drawings are intentional**, not a second app theme.
- 3D, 2D and the element inspector remain model-derived where supported, never redrawn separately from independent copies.

## Preserve historical projects and releases

- Existing source engines, tests, native output artifacts, project files, URLs, stage viewers and public research files MUST NOT be removed or silently rewritten.
- Frozen `public/stages/v02,v03,m40,m50,m60,m70,m80` and generated earlier research snapshots retain their internal layout and original evidence. Users reach them via the dark project/research portal, which provides the shared surrounding shell. A historic screenshot is not the current product.
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
