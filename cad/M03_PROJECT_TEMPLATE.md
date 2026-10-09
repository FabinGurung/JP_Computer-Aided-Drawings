# Open Architecture CAD M03 — reusable project packages

**Build the software once; create one independent package per building.**

## Supported inputs today
The reusable browser CAD engine opens `fabin-cad://project-package/0.1` JSON. The package stores a stable project identifier, descriptive name, classification, revision, local coordinate system, datum label, floor levels, semantic annotations, optional source record pointers, the canonical box geometry and dependency graph.

The browser **Project setup** creates a sample single structural frame from a 2D footprint (length, width) and storey height, then displays a linked 3D/plan/section model. Save Project downloads all project metadata, authored dimensions and links to JSON; Open Project reimports the same local file. Raw M02 `fabin-cad://canonical-boxes/0.1` JSON is supported as a geometry-only import with unverified semantics. The Python IFC, ezdxf and OCCT exporters accept project-package JSON through `--model path/to/package.json`, extracting its validated canonical geometry.

## Input semantics
- `project.id`: stable ID; `name`, `revision`, `kind` distinguish user projects
- `levels`: named level IDs and draft elevations in millimetres
- `model.elements`: footprint, position, length, width, height, material and `kind` (footing, column, slab, wall, beam)
- `model.links`: explicit hosted relationships, not duplicated output drawings
- `element_semantics`: discipline, description, source IDs and `UNVERIFIED/CHECKED`
- `source_refs`: type (IFC/DXF/DWG/PDF/survey), opaque external record ID and verification status. **No file bytes, raw private URLs, authentication tokens or credentials** are published.
- `project.coordinate_system`: currently only local Cartesian, Z up, millimetres

## New project sequence
1. Open the shared `/cad/` app; choose a new ID/name/type and starter footprint in millimetres.
2. Press **Create starter project**. This makes draft synthetic geometry and an initial hosted footing-column-beam link.
3. Select geometry, edit dimensions, check synchronized 2D/3D/sections, undo/redo.
4. Download **Save project package JSON**. The browser doesn't upload source files or save to Drive or GitHub automatically.
5. Reopen that package in the same engine or run local Python exports.
6. Later attach source pointers and verified project semantics through controlled data operations. Only verified source-linked inputs may be promoted toward engineering usage.

## Limitations, not claims
**M03 does not recreate a complete building from six numbers.** The starter is a six-object synthetic frame suitable for learning/test, not an engineering construction drawing. IFC files still import read-only; DWG/PDF conversion to editable semantic geometry, arbitrary geometry constraints, web-hosted backend export and A9-controlled project publishing remain future development. No private Narayani/source-of-truth data is reproduced in the public CAD repository.

This M03 milestone is the template/data intake layer on top of M01 rendering and M02 constraints. New projects need **new input packages**, not new M01–M03 implementations.
