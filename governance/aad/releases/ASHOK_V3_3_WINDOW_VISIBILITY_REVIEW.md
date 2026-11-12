# Ashok Adhikari v3.3 — Window Visibility Review Milestone

**Tag:** `ashok-v3.3.0-window-visibility-review.1`  
**Classification:** Architectural drawing presentation review · **NOT FOR CONSTRUCTION**  
**Release condition:** The exact tagged source commit must pass staging QA, production GitHub Pages publication and independent LIVE readback before this prerelease is created.

## Delivered

- Windows use a **sapphire-blue (#0B4F9E) 2D outline** with a separate cyan (#66D4F5) glazing track. Each hosted opening remains selectable; the extra pane does not intercept pointer input.
- The **3D frame** uses the same sapphire-blue view colour, and the glass uses visible cyan (#4EC3EB) with display opacity 0.72 instead of the former pale glass at 0.22.
- The 2D/3D legend uses one shared category view palette, larger bordered swatches, and explicit labels. Selection highlighting remains orange; graphical meaning does not depend only on hue.
- Window outlines are high-contrast against the cream drawing field (contrast about **7.52:1**, versus the former approximate **2.71:1**) and are distinguished from doors through color and a two-track symbol.
- Desktop and mobile GF/FF regression tests verify SVG computed strokes and pane tracks, Three.js frame/glass material values, legend synchronization and no lost editable openings.

## Full category QA decision

| Category | Action | Rationale |
| --- | --- | --- |
| Windows | **Recolour 2D/3D** | Former teal blended with walls; 3D glazing was hard to see |
| Doors | Retain warm brown | Door leaf and swing arc are semantically different |
| Walls | Retain teal | Continuous, thick boundary geometry already distinct |
| Columns | Retain green | Marker/axis ID and solids distinguish from hosted openings |
| Beams | Retain ochre | Distinct geometry/discipline; no reason to confuse with blue glazing |
| Slabs | Retain sage | Large plan surfaces and transparency; distinct geometry and labelled layer |
| Stairs | Retain violet | Runs, railings and stair treads supply recognizable geometry |
| Roof | Retain sage-grey | Cutaway visibility and layer control are more meaningful than a wholesale hue change |

Colour, line/geometry pattern, names and BIM IDs are used together. Project-owned IFC materials are not modified by the presentation palette.

## Source preservation and approvals

The existing **Ashok v3.3 architectural layout remains unchanged**, including its 2100 mm first-floor exterior window, relocated main-bedroom doorway, X=3600 mm proposed B-axis markers, staircase, room arrangement, elevations and every hosted opening ID. No design approval or structural load path is implied by this visual milestone. Existing staircase/structural and municipal review status is preserved for the appropriate workstreams.

Implementation: `public/assets/js/aad-view-colours.mjs`, linked 2D/3D AAD studio and drawing legend.  
Audit: `public/data/projects/ashok-adhikari/window-visibility-review-20261112.json`.  
Regression: `tools/site/ashok-window-colours-smoke.mjs`, `tools/site/ashok-window-colours-browser.mjs`.

## Evidence and design references

- [W3C WCAG 2.2 — Non-text Contrast (SC 1.4.11)](https://www.w3.org/TR/WCAG22/#non-text-contrast): meaningful graphical objects should have a minimum 3:1 contrast against adjacent colors; avoid depending solely on pale strokes.
- [W3C Understanding Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): use robust contrast, particularly for thin graphics.
- [Autodesk Revit View Filters](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-DocumentPresent/files/GUID-87A63C25-99A6-428D-A0FF-112E4FC9C3D7.htm): category/rule view overrides are a standard architectural coordination presentation mechanism.
- [buildingSMART IFC4 — IfcSurfaceStyleShading](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/schema/ifcpresentationappearanceresource/lexical/ifcsurfacestyleshading.htm): rendering surface colour/transparency is distinct from physical construction geometry.

**No cited standard mandates blue windows.** Sapphire is a documented, project-specific display convention selected for contrast and category separation.
