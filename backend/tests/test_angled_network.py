"""M10.2 native arbitrary yaw, T-junction and exact section tests."""
import copy
import hashlib
import json
import math
import unittest
from pathlib import Path
from shutil import copy2
from tempfile import TemporaryDirectory

from backend.cad_bridge.angled_network import load_network
from backend.cad_bridge.angled_executor import build, exact_section_edges
from backend.cad_bridge.oriented_executor import fuse_wall_network

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "design_jobs/synthetic/m10_2_demo.source.json"


class M102NativeGeometryTests(unittest.TestCase):
    def fixture(self, directory):
        root = Path(directory)
        (root / "design_jobs/synthetic").mkdir(parents=True)
        file = root / "design_jobs/synthetic/m10_2_demo.source.json"
        copy2(SOURCE, file)
        return root, file

    def reject(self, modify, code):
        with TemporaryDirectory() as tmp:
            root, file = self.fixture(tmp)
            obj = json.loads(file.read_text())
            modify(obj)
            file.write_text(json.dumps(obj) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "M10_REJECTED:" + code):
                load_network(file, root)

    def test_source_semantics_nonorthogonal_and_t_branch(self):
        state = load_network(SOURCE, ROOT)
        self.assertEqual((len(state["walls"]),len(state["joints"]),len(state["openings"])),
                         (4,3,1))
        a = state["source_positions"]["WallAngle01"]
        self.assertEqual(a["yaw_deg"], 60)
        self.assertEqual(state["section"]["offset_mm"], 1650)
        self.assertEqual(state["source"]["status"],"SYNTHETIC_QA_ONLY")
        self.assertEqual(
            [(x["wall_a"], x["position_a_mm"], x["wall_b"], x["position_b_mm"])
             for x in state["joints"] if x["id"]=="JointT01"],
            [("WallMain01",3000,"WallBranch01",0)])
        # Normalize new CENTERLINE source to native M10.1 OUTER FACE units.
        self.assertAlmostEqual(state["by_id"]["WallMain01"]["y_mm"], -100)
        self.assertAlmostEqual(
            state["by_id"]["WallAngle01"]["x_mm"],6000+100*math.sin(math.pi/3))

    def test_true_ifc_step_fusion_exact_brep_section_and_dxf(self):
        import ezdxf
        import ifcopenshell
        import ifcopenshell.util.placement
        from OCP.BRepGProp import BRepGProp
        from OCP.GProp import GProp_GProps
        from OCP.STEPControl import STEPControl_Reader
        from OCP.TopExp import TopExp_Explorer
        from OCP.TopAbs import TopAbs_SOLID
        state=load_network(SOURCE,ROOT)
        with TemporaryDirectory() as tmp:
            target=Path(tmp)/"native"
            manifest=build(SOURCE,ROOT,target)
            self.assertEqual(manifest["schema"],"fabin-cad://oriented-design-result/0.2")
            self.assertEqual(len(manifest["outputs"]),7)
            self.assertEqual(manifest["section_method"],
                             "OPENCASCADE_BREP_SECTION_EXACT_LINEAR_EDGES")
            self.assertGreater(manifest["section_edges"],3)
            self.assertEqual(manifest["engineering_approval"],"HOLD")
            self.assertEqual(manifest["quantity_takeoff"],"BLOCKED")
            self.assertFalse(manifest["private_execution_enabled"])
            self.assertFalse(manifest["release_authorized"])
            self.assertEqual(manifest["source_sha256"],
                             hashlib.sha256(SOURCE.read_bytes()).hexdigest())
            for out in manifest["outputs"]:
                path=target/out["name"]
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),out["sha256"])
                self.assertEqual(len(path.read_bytes()),out["bytes"])

            cad=ezdxf.readfile(target/"design.dxf")
            self.assertEqual(len(cad.modelspace().query("LWPOLYLINE")),4)
            self.assertEqual(len(cad.modelspace().query("POINT")),3)
            self.assertEqual(len(cad.modelspace().query("LINE")),1)
            bim=ifcopenshell.open(str(target/"design.ifc"))
            self.assertEqual(len(bim.by_type("IfcWall")),4)
            self.assertEqual(len(bim.by_type("IfcOpeningElement")),1)
            rel=bim.by_type("IfcRelVoidsElement")
            self.assertEqual(len(rel),1)
            self.assertEqual(rel[0].RelatingBuildingElement.Tag,"WallAngle01")
            angled=next(x for x in bim.by_type("IfcWall") if x.Tag=="WallAngle01")
            rot=ifcopenshell.util.placement.get_local_placement(angled.ObjectPlacement)
            self.assertAlmostEqual(rot[0][0],0.5,delta=1e-8)
            self.assertAlmostEqual(rot[1][0],math.sqrt(3)/2,delta=1e-8)

            reader=STEPControl_Reader()
            self.assertEqual(reader.ReadFile(str(target/"design.step")),1)
            self.assertGreater(reader.TransferRoots(),0)
            ex=TopExp_Explorer(reader.OneShape(),TopAbs_SOLID)
            count=0
            while ex.More():
                count+=1
                ex.Next()
            self.assertEqual(count,1,"Connected joint walls must fuse into one solid")

            prop=GProp_GProps()
            BRepGProp.VolumeProperties_s(fuse_wall_network(state),prop)
            raw=sum(w["length_mm"]*w["width_mm"]*w["height_mm"] for w in state["walls"])
            opening=900*200*1700
            # Each of three junctions intersects; their shared material must not
            # be counted twice in the fused BRep.
            self.assertGreater(prop.Mass(),0)
            self.assertLess(prop.Mass(),raw-opening)
            self.assertGreater(prop.Mass(),raw-opening-3*300*300*3000)

            exact=json.loads((target/"section.json").read_text())
            self.assertEqual(exact["algorithm"],
                             "OPENCASCADE_BREP_SECTION_EXACT_LINEAR_EDGES")
            self.assertEqual(exact["source_id"],"SectionAngle01")
            self.assertGreaterEqual(len(exact["edges"]),8)
            self.assertEqual(exact["engineering_approval"],"HOLD")
            heights=[p[1] for edge in exact["edges"] for p in edge]
            self.assertTrue(any(abs(z-400)<0.01 for z in heights))
            self.assertTrue(any(abs(z-2100)<0.01 for z in heights))
            self.assertTrue(any(abs(z-3000)<0.01 for z in heights))
            self.assertIn("<svg", (target/"section.svg").read_text())
            self.assertIn("T-junction",(target/"index.html").read_text())
            with self.assertRaisesRegex(ValueError,"OUTPUT_MUST_BE_EMPTY"):
                build(SOURCE,ROOT,target)

    def test_fail_closed_authority_geometry_and_t_junctions(self):
        self.reject(lambda d:d.__setitem__("status","ENGINEER_APPROVED"),
                    "AUTHORITY_BLOCKED")
        self.reject(lambda d:d.__setitem__("client_drive_id","PRIVATE"),
                    "SCHEMA_INVALID")
        self.reject(lambda d:d["walls"][1].__setitem__("yaw_deg",float("nan")),
                    "WALL_NUMBER_INVALID")
        self.reject(lambda d:d["walls"][1].__setitem__("yaw_deg",181),
                    "WALL_DIMENSIONS_INVALID")
        self.reject(lambda d:d["walls"][1].__setitem__("yaw_deg",45),
                    "JOINT_GEOMETRY_MISMATCH")
        self.reject(lambda d:d["joints"][2].__setitem__("position_a_mm",4000),
                    "JOINT_GEOMETRY_MISMATCH")
        self.reject(lambda d:d["joints"][2].__setitem__("position_b_mm",600),
                    "JOINT_NEEDS_ENDPOINT")
        self.reject(lambda d:d["joints"][2].__setitem__("wall_b","Absent"),
                    "JOINT_IDENTITY_INVALID")
        self.reject(lambda d:d["joints"].pop(2),"DISCONNECTED_WALL_GRAPH")
        self.reject(lambda d:d["joints"].append(copy.deepcopy(d["joints"][0])),
                    "JOINT_IDENTITY_INVALID")
        self.reject(lambda d:d["openings"][0].__setitem__("host_id","Missing"),
                    "OPENING_HOST_INVALID")
        self.reject(lambda d:d["section"].__setitem__("host_wall_id","Missing"),
                    "SECTION_IDENTITY_INVALID")
        self.reject(lambda d:d["section"].__setitem__("offset_mm",3200),
                    "SECTION_MUST_INTERSECT_VOID")
        self.reject(lambda d:d["section"].__setitem__("offset_mm",3500),
                    "SECTION_OUTSIDE_WALL")

    def test_external_and_symlink_sources_blocked(self):
        with TemporaryDirectory() as tmp:
            outside=Path(tmp)/"private.json"
            outside.write_text(SOURCE.read_text())
            with self.assertRaisesRegex(ValueError,"PATH_NOT_ALLOWED"):
                load_network(outside,ROOT)
        with TemporaryDirectory() as tmp:
            root,file=self.fixture(tmp)
            outside=root/"private.json"
            outside.write_text(SOURCE.read_text())
            file.unlink(); file.symlink_to(outside)
            with self.assertRaisesRegex(ValueError,"PATH_NOT_ALLOWED"):
                load_network(file,root)


if __name__=="__main__":
    unittest.main()
