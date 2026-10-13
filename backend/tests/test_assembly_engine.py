"""M11.1 native IFC/STEP/DXF assembly, reuse, lineage and security gates."""
from __future__ import annotations
import copy
import hashlib
import json
import unittest
from pathlib import Path
from shutil import copy2
from tempfile import TemporaryDirectory

from backend.cad_bridge.assembly_job import read_assembly
from backend.cad_bridge.assembly_executor import build_assembly

ROOT=Path(__file__).resolve().parents[2]
PART=Path("design_jobs/synthetic")
JOB=ROOT/PART/"m11_demo.assembly.json"
SOURCE=ROOT/PART/"m10_2_demo.source.json"


class AssemblyTests(unittest.TestCase):
    def fixture(self, temp):
        root=Path(temp)
        path=root/PART
        path.mkdir(parents=True)
        copy2(JOB,path/JOB.name)
        copy2(SOURCE,path/SOURCE.name)
        return root,path/JOB.name

    def mutate(self, root, job, fn):
        doc=json.loads(job.read_text())
        fn(doc)
        job.write_text(json.dumps(doc)+"\n")

    def rejected(self, fn, code):
        with TemporaryDirectory() as temp:
            root,job=self.fixture(temp)
            self.mutate(root,job,fn)
            with self.assertRaisesRegex(ValueError,"M10_REJECTED:"+code):
                read_assembly(job,root)

    def test_reuse_identities_and_source_pin(self):
        model=read_assembly(JOB,ROOT)
        self.assertEqual(model["job"]["status"],"SYNTHETIC_QA_ONLY")
        self.assertEqual(len(model["templates"]),4)
        self.assertEqual(len(model["instances"]),6)
        self.assertEqual(len(model["groups"]),3)
        self.assertEqual(len(model["edges"]),25)
        self.assertEqual(sum(x["template_id"]=="ColumnTypeA"
                             for x in model["instances"]),2)
        self.assertEqual(sum(x["template_id"]=="FootingTypeA"
                             for x in model["instances"]),2)
        raw=SOURCE.read_bytes()
        expected_git=hashlib.sha1(
            ("blob "+str(len(raw))+"\0").encode()+raw).hexdigest()
        self.assertEqual(model["job"]["source"]["git_blob_sha1"],expected_git)
        self.assertEqual(model["source_sha256"],hashlib.sha256(raw).hexdigest())
        self.assertEqual(model["baseline"]["source"]["project_id"],
                         model["job"]["project_id"])

    def test_integrated_native_ifc_step_dxf_and_provenance(self):
        import ezdxf
        import ifcopenshell
        from OCP.STEPControl import STEPControl_Reader
        from OCP.TopAbs import TopAbs_SOLID
        from OCP.TopExp import TopExp_Explorer

        with TemporaryDirectory() as temp:
            target=Path(temp)/"assembly"
            report=build_assembly(JOB,ROOT,target)
            self.assertEqual(report["component_templates"],4)
            self.assertEqual(report["component_instances"],6)
            self.assertEqual(report["groups"],3)
            self.assertEqual(report["baseline_walls"],4)
            self.assertEqual(report["baseline_openings"],1)
            self.assertEqual(report["lineage_edges"],25)
            self.assertEqual(report["component_counts"],
                             {"beam":1,"column":2,"footing":2,"slab":1})
            self.assertEqual(len(report["outputs"]),8)
            self.assertEqual(report["engineering_approval"],"HOLD")
            self.assertEqual(report["quantity_takeoff"],"BLOCKED")
            self.assertFalse(report["private_execution_enabled"])
            self.assertFalse(report["release_authorized"])
            self.assertFalse(report["structural_design_verified"])
            self.assertEqual(report["job_sha256"],
                             hashlib.sha256(JOB.read_bytes()).hexdigest())
            for item in report["outputs"]:
                file=target/item["name"]
                self.assertEqual(len(file.read_bytes()),item["bytes"])
                self.assertEqual(hashlib.sha256(file.read_bytes()).hexdigest(),
                                 item["sha256"])
            self.assertEqual(json.loads((target/"manifest.json").read_text()),report)
            bim=ifcopenshell.open(str(target/"assembly.ifc"))
            for kind, count in (
                ("IfcWall",4),("IfcOpeningElement",1),
                ("IfcRelVoidsElement",1),("IfcFooting",2),
                ("IfcColumn",2),("IfcBeam",1),("IfcSlab",1),
            ):
                self.assertEqual(len(bim.by_type(kind)),count,kind)
            ids=[x.Tag for kind in ("IfcFooting","IfcColumn","IfcBeam","IfcSlab")
                 for x in bim.by_type(kind)]
            self.assertEqual(len(set(ids)),6)
            west=next(x for x in bim.by_type("IfcColumn")
                      if x.Tag=="ColumnWest01")
            east=next(x for x in bim.by_type("IfcColumn")
                      if x.Tag=="ColumnEast01")
            self.assertEqual(west.Representation.Representations[0].RepresentationType,
                             "SweptSolid")
            self.assertNotEqual(west.GlobalId,east.GlobalId)
            self.assertIn("TEMPLATE=ColumnTypeA",west.Description)
            cad=ezdxf.readfile(target/"assembly.dxf")
            self.assertEqual(len(cad.modelspace().query("LWPOLYLINE")),10)
            self.assertEqual(len(cad.modelspace().query("POINT")),3)
            self.assertEqual(len(cad.modelspace().query("LINE")),1)
            self.assertEqual(
                len(cad.modelspace().query('LWPOLYLINE[layer=="M11_COLUMN"]')),2)
            step=STEPControl_Reader()
            self.assertEqual(step.ReadFile(str(target/"assembly.step")),1)
            self.assertGreater(step.TransferRoots(),0)
            explore=TopExp_Explorer(step.OneShape(),TopAbs_SOLID)
            solids=0
            while explore.More():
                solids+=1
                explore.Next()
            self.assertEqual(solids,7)
            links=json.loads((target/"assembly-graph.json").read_text())
            self.assertEqual(len(links["edges"]),25)
            self.assertFalse(links["structural_connections_asserted"])
            known={links["assembly_id"],
                   *(x["id"] for x in links["groups"]),
                   *(x["id"] for x in links["templates"]),
                   *(x["id"] for x in links["instances"])}
            known.update(x["id"] for x in json.loads(SOURCE.read_text())["levels"])
            self.assertTrue(all(x["from_id"] in known and x["to_id"] in known
                                for x in links["edges"]))
            self.assertIn("<svg", (target/"plan.svg").read_text())
            self.assertIn("ColumnWest01",(target/"plan.svg").read_text())
            self.assertEqual(json.loads((target/"section.json").read_text())[
                "algorithm"],"OPENCASCADE_BREP_SECTION_EXACT_LINEAR_EDGES")
            with self.assertRaisesRegex(ValueError,"OUTPUT_MUST_BE_EMPTY"):
                build_assembly(JOB,ROOT,target)

    def test_strict_template_instance_project_and_authority_gates(self):
        cases=[
            (lambda x:x.__setitem__("status","APPROVED"),"ASSEMBLY_AUTHORITY_BLOCKED"),
            (lambda x:x.__setitem__("quantity_takeoff","APPROVED"),"ASSEMBLY_SCHEMA_INVALID"),
            (lambda x:x.__setitem__("project_id","WRONG_PROJECT"),"PROJECT_FOREIGN_KEY_INVALID"),
            (lambda x:x["source"].__setitem__("git_blob_sha1","0"*40),"SOURCE_PIN_MISMATCH"),
            (lambda x:x["source"].__setitem__("path","../../secret.ifc"),"SOURCE_PATH_REJECTED"),
            (lambda x:x["templates"][0].__setitem__("length_mm",0),"TEMPLATE_DIMENSIONS_INVALID"),
            (lambda x:x["templates"][0].__setitem__("height_mm",float("nan")),"TEMPLATE_NUMERIC_INVALID"),
            (lambda x:x["templates"][0].__setitem__("kind","rebar"),"TEMPLATE_IDENTITY_INVALID"),
            (lambda x:x["templates"][1].__setitem__("id","FootingTypeA"),"TEMPLATE_IDENTITY_INVALID"),
            (lambda x:x["instances"][0].__setitem__("template_id","Unknown"),"INSTANCE_FOREIGN_KEY_INVALID"),
            (lambda x:x["instances"][0].__setitem__("group_id","Unknown"),"INSTANCE_FOREIGN_KEY_INVALID"),
            (lambda x:x["instances"][0].__setitem__("level_id","Unknown"),"INSTANCE_FOREIGN_KEY_INVALID"),
            (lambda x:x["instances"][0].__setitem__("source_id","PRIVATE_CLIENT"),"INSTANCE_FOREIGN_KEY_INVALID"),
            (lambda x:x["instances"][0].__setitem__("yaw_deg",90),"INSTANCE_ROTATION_UNSUPPORTED"),
            (lambda x:x["instances"][0].__setitem__("x_mm",float("inf")),"INSTANCE_NUMERIC_INVALID"),
            (lambda x:x["instances"][1].__setitem__("id","FootingWest01"),"INSTANCE_FOREIGN_KEY_INVALID"),
            (lambda x:x["groups"][1].__setitem__("id","FoundationGroup"),"GROUP_IDENTITY_INVALID"),
            (lambda x:x["templates"].append({
                "id":"UnusedThing","kind":"column",
                "length_mm":200,"width_mm":200,"height_mm":200}),
             "UNUSED_TEMPLATE_OR_GROUP"),
        ]
        for fn,code in cases:
            with self.subTest(code=code):
                self.rejected(fn,code)

    def test_source_changes_and_symlinks_fail_closed(self):
        with TemporaryDirectory() as temp:
            root,job=self.fixture(temp)
            src=root/PART/SOURCE.name
            src.write_text(src.read_text()+" ")
            with self.assertRaisesRegex(ValueError,"SOURCE_PIN_MISMATCH"):
                read_assembly(job,root)
        with TemporaryDirectory() as temp:
            root,job=self.fixture(temp)
            source=root/PART/SOURCE.name
            outsider=root/"outside.json"
            outsider.write_text(SOURCE.read_text())
            source.unlink()
            source.symlink_to(outsider)
            with self.assertRaisesRegex(ValueError,"SOURCE_PATH_REJECTED"):
                read_assembly(job,root)
        with TemporaryDirectory() as temp:
            outsider=Path(temp)/"external.assembly.json"
            outsider.write_text(JOB.read_text())
            with self.assertRaisesRegex(ValueError,"JOB_PATH_REJECTED"):
                read_assembly(outsider,ROOT)


if __name__=="__main__":
    unittest.main()
