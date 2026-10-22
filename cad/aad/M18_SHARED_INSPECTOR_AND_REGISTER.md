# M18 — Shared AAD selection meaning and hierarchical BIM component register

## Applies to every project using the common engine

This update is implemented in the canonical `cad/aad/multistorey/` template and reusable `public/assets/js/aad-component-register.mjs`. Do not fork or duplicate the interface into Narayani or another project. Each project keeps its own manifest and floor graphs; the engine reads the common assembled BIM state.

## What an orange selected dot means

Selection is **not always a building component**:
- **Wall-graph editing node:** An orange circle in the 2D floor plan is a selected node controlling wall junctions. Its orange sphere in 3D is a visual editing locator approximately 1.2 m above storey elevation, not a concrete column, beam, or modelled material.
- **Selected BIM component without authored 2D shape:** A beam, slab, stair, landing or roof may show an orange world-coordinate **plan locator**. That is not a 2D footprint, nor an extra BIM element. The actual 3D mesh or selected 3D locator is highlighted separately.
- **Wall, hosted door/window or column:** The plan uses its real authored/assembled 2D geometry; the 3D view and table share the same BIM ID.

The inspector now distinguishes these states, provides plain-language meaning, exact element/node IDs, storey, source evidence and world coordinates (where present). For a junction node it additionally lists connected wall IDs and local/world plan coordinates. A node is not an IFC-type component and therefore is intentionally **not added to the BIM component register**.

## Grouped register and interactions

The former flat components table is replaced by a level-first hierarchy:
1. Storey groups ordered by the manifest's building elevations.
2. Architecture, Structure, Other discipline headings.
3. Element-type groups (Walls, Doors, Windows, Stairs, Columns, Beams, Floor slabs, Landings, Roofs, and other types).
4. Expandable tables of element IDs, level, IFC class, kind, world XYZ, dimensions, evidence and name.

Controls: storey filter, discipline filter, element-type filter, text search (ID/name/evidence/IFC), sort (ID, name, world X, world Z, kind) **within each type**, clear. Group headings include counts. The selected component remains linked to 2D and 3D; a selection from either viewport reveals its schedule row and expands its ancestors. If filters hide the selected element, the inspector selection resets hiding filters to locate the authoritative component record.

The Architecture/Structure labels are **navigation buckets only**. A wall under Architecture may still be load-bearing; no structural or municipal-code classification is certified by the grouping.

## QA and regression

Regression tests assert:
- Source assembly count, level order, grouping totals, filtering/search, and coordinate sort.
- A structural element without an authored 2D shape is described as a locator, not an actual physical dot.
- Narayani browser UI: nested levels, disciplines and types; filters, clear, sort, row selection and cross-view reveal.
- Selected wall-graph node identifies itself as an editing control, not a column.

All geometry, world-coordinate proof, IFC writer, provenance, and engineering HOLD semantics remain unchanged.
