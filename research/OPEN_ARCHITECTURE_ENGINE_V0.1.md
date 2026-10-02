# Open Architecture Engine v0.1 — isolated research proof

Status: RESEARCH ONLY / NOT ENGINEERING AUTHORITY / NOT PRODUCTION

Base:
- repository: `FabinGurung/Project_Drawings`
- parent branch: `project-hub-v0.2`
- parent commit at branch creation: `6947a943d56238c36849a01ece295d85b5ca4574`

Purpose:
prove that one small canonical, human-readable architectural model can deterministically produce more than one representation without altering the existing Narayani V02/V03/M40–M80 viewers.

Current canonical source:
`models/open-architecture-engine-v0.1/poc-model.json`

Current generator:
`tools/open_architecture/generate_poc.py`

Generated during QA:
- `plan.svg` — derived 2D plan
- `plan.dxf` — derived DXF geometry
- `model.gltf` — derived self-contained glTF geometry
- `manifest.json` — output/scope/limitation declaration

v0.1 supported geometry:
- one storey
- quadrilateral slab
- axis-defined walls
- wall thickness and height

Deliberately NOT implemented yet:
- openings, doors and windows
- stairs
- automatic rooms
- constraints/snapping
- sections/elevations
- IFC output
- Three.js interactive viewer
- Blender/Cycles rendering

IFC is intentionally not faked. It remains a later adapter gate requiring real IfcOpenShell generation and validation.

The generator uses Python standard library only so this first proof does not enlarge the current Vite/TypeScript dependency surface.

QA boundary:
GitHub Actions regenerates SVG/DXF/glTF from the canonical JSON, validates basic file structure, then runs the pre-existing TypeScript/Vite build. Passing CI is software QA only and does not imply architectural, structural, codal, or construction approval.

Non-regression rule:
No existing `public/stages/` file is to be modified by this research branch merely to prove the new model-core concept.
