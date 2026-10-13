# M10.2 — Arbitrary-angle connected walls, interior T-junction, exact native section

## Scope

After M10.1 / A9 SEQ32, this bounded increment accepts a **synthetic** four-wall network containing an arbitrary 60-degree joint, angled return, and branch at an interior point of another wall (T-junction). New v0.2 source origins are **wall centerlines**, not M10.1 outer-face origins. A well-defined normalization shifts each wall to the M10.1 native frame by half the thickness and preserves M10.1 fixtures unchanged.

The machine validates every wall, finite angular heading in -180..180 degrees, wall/level/project/source foreign keys, source-owned positions, exact joint endpoint and interior positions, global coordinate coincidence within 0.001 mm, 3D base/height compatibility, host-contained nonoverlapping openings, connectedness and a section that truly crosses the opening. All public source paths remain under the allowlisted synthetic directory; symlinks to private source directories and non-synthetic authority requests are refused.

## Native geometry

- IFC4 / IfcOpenShell: four independently identified wall objects with exact angular placements and a hosted IfcOpeningElement + IfcRelVoidsElement.
- STEP / OpenCascade: opening subtraction in the angled wall, Boolean fusion of connected walls including interior T branch. Acceptance confirms one real BRep solid with corner-intersection material not double counted.
- DXF / ezdxf: real rotated wall footprints, opening annotation and explicit point records for each join. DXF marker is not claimed to be a native plan Boolean.
- Exact vertical section / OpenCascade: BRepAlgoAPI_Section on the fused native solid against the vertical plane perpendicular to the selected 60-degree wall at its source-owned longitudinal offset. Output section.json contains exact **linear BRep edge intersections** in local wall-centered horizontal-offset and world Z coordinates; section.svg plots these same coordinates. No mesh approximation, raster slice or artificial thickness is used.
- plan.svg, HTML review and digest manifest for each of seven generated evidence files.

The example is static, intentionally bounded and separate from the live site routes. It is not an IFC authoring/editor UI.

## Run

GitHub Actions: CAD M10.2 Arbitrary Yaw, T-Junction, Exact BRep Section.

Machine-only reproducibility from the repository root:

    python -m pip install -r backend/requirements.txt
    python -m unittest backend.tests.test_angled_network -v
    python -m backend.cad_bridge.angled_cli --preset synthetic-angled-t-network --repo-root . --out /tmp/cad-m10-2-evidence

The workflow also runs M10.1, M09.1 and M09.2 regressions, independently recomputes source/output SHA-256, inspects native solids and records the nonproduction evidence.

## Explicit limits

- Straight, vertical, constant-thickness walls only; arbitrary yaw within [-180,180] degrees, not curves, arches, skewed section planes, slanted walls, special multi-layer materials or trim/mitre production join rules.
- One endpoint must participate in each joint; arbitrary interior-to-interior crossing remains unsupported.
- Exact section outlines from straight-edge prismatic BRep intersections are implemented, **not** professional fabrication/shop drawings, dimension strings, engineering reinforcement or hidden-line architectural elevations.
- No private-client Drive resolver, authenticated construction authority, CAD database migration, project-sensitive inputs, or construction/QTO approval. Engineering approval remains HOLD, QTO BLOCKED, release_authorized false.
- No changes to existing CAD website paths, M08/M09/M10.1 fixtures or older A9 records.

## Governance

GitHub main with passing CI is the versioned public software truth; live Google Drive Local/Main libraries remain A9 record authority. After merge and provider readback, use **next** Local sequence after SEQ32; PRE copies, stable artifact and relationship IDs, POST copies, reciprocal provider acknowledgment, and idempotent nonrecursive terminal registration. Never overwrite SEQ32 history or create an unverified closeout.
