# Ashok Adhikari — v3.1.0 review milestone

**Milestone type:** architectural coordination **PRERELEASE / NOT FOR CONSTRUCTION**  
**Organization:** Rohini Engineering and Builders · Pokhara Ward 14  
**Project:** 14_Ashok_Adhikari · M10 REV04  
**Dated:** 7 November 2026 (Asia/Kathmandu)  
**Canonical owner-change code merge:** `6e082200f278c898b07d5822fd534a4facba1f10` (PR #95)  
**A9 Local/Main governance:** seq30 `ACKNOWLEDGED_READBACK_PASS`, POST snapshots preserved.

## What this milestone establishes

- A mathematically defined **building-local 100 mm × 100 mm address grid**, with 500 mm and 1000 mm lines and exact-millimetre coordinate readback/copy control. Example: `BX036-BY056` addresses the 100 mm cell beginning at building X=3600 mm / Y=5600 mm. Drawing space and 3D world space share one model.
- Plot-to-building XY transform: plot origin is the front-left plot corner, model origin the front-left building corner; Xplot = Xbuilding + 1944 mm and Yplot = Ybuilding + 2000 mm. A3 dimensions and uniform 1:100 scale are documented without pretending this is surveyed GIS latitude/longitude.
- New **v3-grid / v3.1** reviewer-selectable design edition. GF Bedroom 1/Kitchen, Bath/Lounge, and Bedroom 2/Lounge wall centrelines all align at X=3600 mm. No source images, previous v1/v2/v3 geometry, or stable historical HTML objects were overwritten.
- 2D vector plans, 3D model and component register come from the same versioned AAD JSON. SVG displays named BX/BY axes and X3600 target datum. An amber line marks the unresolved stair mismatch.
- Dated owner-change ledger exposes nominal bath, bed and lounge area deltas; whole-building footprint unchanged. Existing FF owner revisions are retained.

## In-scope QA / evidence

- Pull request [#95](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/pull/95), merged after both pull-request CI checks passed.
- Staging/production shape and cross-device checks: `tools/site/ashok-grid-smoke.mjs`, `tools/site/ashok-grid-browser.mjs`, plus CAD-wide regression suite.
- GitHub Pages: [Ashok v3.1 linked 2D/3D GF review](https://fabingurung.github.io/JP_Computer-Aided-Drawings/projects/ashok-adhikari/?edition=v3-grid&panel=views&phase=gf&layout=split#views).
- A9 Project Local Library: [stable native sheet](https://docs.google.com/spreadsheets/d/1GRVoWk4O1q3HZ240k4MIXAQEVteUvGkvY1kdOcAsBfs/edit).
- A9 Main Library: [stable Drive Index](https://docs.google.com/spreadsheets/d/18NE0GIbw0lDDlrIcflGS3_VccDZ2LZn1FoPbebSc71o/edit).
- Original project-archive [coordinate grid and owner-instruction note](https://docs.google.com/document/d/1AUUsPk2zO8xcJqlO_04HxioNxG-uR6CMuY7RTmT_SfU/edit), plus PRE and terminal POST Local/Main copies in the project Audit Trail & Reproduction folder.

## Open engineering HOLDs — NOT cleared by this release

1. **Stair alignment:** original stair/porch centreline X=4175 mm remains **575 mm offset** from target X=3600 mm (stair outer face X=4290 mm). Moving the wall would affect flights, landings, car-porch clearance, vertical alignment, and structural/MEP coordination; no unapproved automated shift.
2. **Accessible common bathroom:** 3600 × 3800 mm is a *nominal model envelope*, not an approved clear finished dimension. Wheelchair turning, door/fixture placement, drainage and elder-friendly detail require verification.
3. **First-floor internal glazed opening:** reviewed as architectural coordination only. Fire safety, privacy, stair separation and glazed-member design are unapproved.
4. **Structural and construction stages:** structural source registration, load combinations, foundations, rebar, slab, MEP clashes and any municipality permit are NOT approved or issued.
5. **Quantities and programme:** room footprints are computable, but priced BOQ, procurement, accepted work package material amounts, and dated construction programme/Gantt remain held or unadmitted.

### Release semantics

This GitHub release is **prerelease**, not a "latest" stable construction issue. A successful workflow must verify the exact latest live Pages/readback chain, the owner-change frozen source ancestry, unchanged Ashok v3.1 source after the frozen merge, the 100 mm grid test, and that the target tag was not previously created. Existing tags/releases cannot be moved. A7/A9 live source and history are preserved. 
