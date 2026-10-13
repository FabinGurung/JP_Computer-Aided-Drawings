"""M10.1 actual native IFC4/STEP/DXF oriented-wall acceptance and rejects."""
from __future__ import annotations
import copy
import hashlib
import json
import math
import unittest
from pathlib import Path
from shutil import copy2
from tempfile import TemporaryDirectory

from backend.cad_bridge.oriented_job import load_oriented, footprint, world
from backend.cad_bridge.oriented_executor import build, fuse_wall_network, make_solids

ROOT = Path(__file__).resolve().parents[2]
FOLDER = Path("design_jobs/synthetic")
SOURCE = ROOT / FOLDER / "m10_demo.source.json"


class OrientedGeometryTests(unittest.TestCase):
    def fixture(self, tmp):
        root = Path(tmp)
        (root / FOLDER).mkdir(parents=True)
        dest = root / FOLDER / SOURCE.name
        copy2(SOURCE, dest)
        return root, dest

    def mutate(self, file, change):
        doc = json.loads(file.read_text())
        change(doc)
        file.write_text(json.dumps(doc) + "\n")

    def rejects(self, change, code):
        with TemporaryDirectory() as tmp:
            root, file = self.fixture(tmp)
            self.mutate(file, change)
            with self.assertRaisesRegex(ValueError, "M10_REJECTED:" + code):
                load_oriented(file, root)

    def test_native_fused_opening_ifc_placement_dxf_geometry(self):
        import ezdxf
        import ifcopenshell
        import ifcopenshell.util.placement
        from OCP.BRepGProp import BRepGProp
        from OCP.GProp import GProp_GProps
        from OCP.STEPControl import STEPControl_Reader
        from OCP.TopAbs import TopAbs_SOLID
        from OCP.TopExp import TopExp_Explorer
        state = load_oriented(SOURCE, ROOT)
        self.assertEqual(len(state["walls"]), 3)
        self.assertEqual(len(state["joints"]), 2)
        self.assertEqual(state["source"]["status"], "SYNTHETIC_QA_ONLY")
        wall = state["by_id"]["WallNorth01"]
        self.assertEqual(world(wall, 0, 0), (4000, 0))
        self.assertAlmostEqual(world(wall, 3000, 0)[1], 3000)
        self.assertAlmostEqual(world(wall, 3000, 200)[0], 3800)
        with TemporaryDirectory() as tmp:
            out = Path(tmp) / "run"
            manifest = build(SOURCE, ROOT, out)
            self.assertEqual(manifest["walls"], 3)
            self.assertEqual(manifest["openings"], 1)
            self.assertEqual(manifest["joints"], 2)
            self.assertEqual(manifest["engineering_approval"], "HOLD")
            self.assertEqual(manifest["quantity_takeoff"], "BLOCKED")
            self.assertEqual(manifest["exact_section_export"], "NOT_IMPLEMENTED")
            self.assertFalse(manifest["private_execution_enabled"])
            self.assertEqual(len(manifest["outputs"]), 6)
            for result in manifest["outputs"]:
                self.assertEqual(result["sha256"],
                                 hashlib.sha256((out / result["name"]).read_bytes()).hexdigest())
            cad = ezdxf.readfile(out / "design.dxf")
            self.assertEqual(len(cad.modelspace().query("LWPOLYLINE")), 3)
            self.assertEqual(len(cad.modelspace().query("LINE")), 1)
            self.assertEqual(len(cad.modelspace().query("POINT")), 2)
            walls = cad.modelspace().query("LWPOLYLINE")
            north = next(p for p in walls if p.get_xdata("FABIN_CAD")[0].value == "WallNorth01")
            corners = [(p[0], p[1]) for p in north.get_points("xy")]
            self.assertEqual(len(corners), 4)
            self.assertAlmostEqual(corners[1][0], 4000)
            self.assertAlmostEqual(corners[1][1], 3000)
            self.assertAlmostEqual(corners[2][0], 3800)
            self.assertAlmostEqual(corners[2][1], 3000)
            bim = ifcopenshell.open(str(out / "design.ifc"))
            self.assertEqual(len(bim.by_type("IfcWall")), 3)
            self.assertEqual(len(bim.by_type("IfcOpeningElement")), 1)
            relation = bim.by_type("IfcRelVoidsElement")
            self.assertEqual(len(relation), 1)
            self.assertEqual(relation[0].RelatingBuildingElement.Tag, "WallNorth01")
            wall_ifc = next(w for w in bim.by_type("IfcWall") if w.Tag == "WallNorth01")
            mat = ifcopenshell.util.placement.get_local_placement(wall_ifc.ObjectPlacement)
            self.assertAlmostEqual(mat[0][0], 0, delta=1e-9)
            self.assertAlmostEqual(mat[1][0], 1, delta=1e-9)
            self.assertAlmostEqual(mat[0][3], 3.9, delta=1e-9)
            self.assertAlmostEqual(mat[1][3], 1.5, delta=1e-9)
            step = STEPControl_Reader()
            self.assertEqual(step.ReadFile(str(out / "design.step")), 1)
            self.assertGreater(step.TransferRoots(), 0)
            explorer = TopExp_Explorer(step.OneShape(), TopAbs_SOLID)
            solid_count = 0
            while explorer.More():
                solid_count += 1
                explorer.Next()
            self.assertEqual(solid_count, 1)  # fused U-shaped walls
            value = GProp_GProps()
            BRepGProp.VolumeProperties_s(fuse_wall_network(state), value)
            # Three wall prisms, two 200x200 joints (true union),
            # and one 800x200x1800 hosted cutout.
            expected = (4000 + 3000 + 4000) * 200 * 3000 - 2*200*200*3000 - 800*200*1800
            self.assertAlmostEqual(value.Mass(), expected, delta=expected*0.00001)
            self.assertIn("WallNorth01", (out / "plan.svg").read_text())
            self.assertIn("NOT_IMPLEMENTED", json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, "OUTPUT_MUST_BE_EMPTY"):
                build(SOURCE, ROOT, out)

    def test_volume_of_cut_and_uncut_rotated_solid(self):
        from OCP.BRepGProp import BRepGProp
        from OCP.GProp import GProp_GProps
        state = load_oriented(SOURCE, ROOT)
        solids = make_solids(state)
        self.assertEqual(len(solids), 3)
        for index, solid in enumerate(solids):
            props = GProp_GProps()
            BRepGProp.VolumeProperties_s(solid, props)
            wall = state["walls"][index]
            nominal = wall["length_mm"] * wall["width_mm"] * wall["height_mm"]
            if wall["id"] == "WallNorth01":
                nominal -= 800 * 200 * 1800
            self.assertAlmostEqual(props.Mass(), nominal, delta=nominal*1e-6)

    def test_explicit_connections_and_geometry_negative_gates(self):
        self.rejects(lambda x: x["joints"].pop(), "DISCONNECTED_WALL_GRAPH")
        self.rejects(lambda x: x["joints"][0].__setitem__("endpoint_b", "END"),
                     "JOINT_GEOMETRY_MISMATCH")
        self.rejects(lambda x: x["walls"][1].__setitem__("x_mm", 4500),
                     "JOINT_GEOMETRY_MISMATCH")
        self.rejects(lambda x: x["walls"][1].__setitem__("yaw_deg", 42),
                     "YAW_NOT_SUPPORTED")
        self.rejects(lambda x: x["walls"][1].__setitem__("yaw_deg", float("nan")),
                     "WALL_NUMBER_INVALID")
        self.rejects(lambda x: x["walls"][0].__setitem__("length_mm", -4000),
                     "WALL_DIMENSIONS_INVALID")
        self.rejects(lambda x: x["walls"][0].__setitem__("source_id", "PRIVATE_CLIENT"),
                     "WALL_IDENTITY_INVALID")
        self.rejects(lambda x: x["openings"][0].__setitem__("offset_mm", 2800),
                     "OPENING_NOT_CONTAINED")
        self.rejects(lambda x: x.__setitem__("status", "ISSUED_FOR_CONSTRUCTION"),
                     "AUTHORITY_BLOCKED")
        self.rejects(lambda x: x.__setitem__("private_sources", []),
                     "SCHEMA_INVALID")

    def test_rejects_overlap_duplicate_foreign_and_external_source(self):
        self.rejects(lambda x: x["openings"].append({
            **x["openings"][0], "id": "OpeningTwo"}), "OVERLAPPING_OPENINGS")
        self.rejects(lambda x: x["joints"].append({
            **x["joints"][0], "id": "JointRepeat01"}), "JOINT_ENDPOINT_REUSED")
        self.rejects(lambda x: x["openings"][0].__setitem__("host_id", "MissingWall"),
                     "OPENING_HOST_INVALID")
        with TemporaryDirectory() as tmp:
            external = Path(tmp) / "external.json"
            external.write_text(SOURCE.read_text())
            with self.assertRaisesRegex(ValueError, "PATH_NOT_ALLOWED"):
                load_oriented(external, ROOT)
        with TemporaryDirectory() as tmp:
            root, file = self.fixture(tmp)
            bad = root / "private.json"
            bad.write_text(SOURCE.read_text())
            file.unlink()
            file.symlink_to(bad)
            with self.assertRaisesRegex(ValueError, "PATH_NOT_ALLOWED"):
                load_oriented(file, root)


if __name__ == "__main__":
    unittest.main()
