"""M09.2 positive/negative source, revision, auth-boundary acceptance."""
import copy
import hashlib
import json
import subprocess
import sys
import unittest
from pathlib import Path
from shutil import copy2
from tempfile import TemporaryDirectory
from backend.cad_bridge.governed_job import ContractError
from backend.cad_bridge.private_boundary import (
    PrivateBoundaryError, PrivateSourcePointer, dispatch_private_design,
    private_execution_plan,
)
from backend.cad_bridge.source_bundle import (
    read_source_bundle, transition_review_state, write_bundle_validation,
)

ROOT = Path(__file__).resolve().parents[2]
PART = Path("design_jobs/synthetic")
BUNDLE = "m09_multisource.bundle.json"
FILES = (
    BUNDLE, "m09_demo.governed.json", "m08_demo.job.json",
    "m08_demo.source.json", "m09_brief.synthetic.json",
    "m09_constraints_r1.synthetic.json", "m09_constraints_r2.synthetic.json"
)


class M092BundleTests(unittest.TestCase):
    def fixture(self, tmp):
        root = Path(tmp)
        folder = root / PART
        folder.mkdir(parents=True)
        for name in FILES:
            copy2(ROOT / PART / name, folder / name)
        return root, folder / BUNDLE

    def mutate(self, path, func):
        item = json.loads(path.read_text())
        func(item)
        path.write_text(json.dumps(item) + "\n")

    def blocked(self, path, root, code):
        with self.assertRaises(ContractError) as caught:
            read_source_bundle(path, root)
        self.assertEqual(caught.exception.code, code)

    def test_all_document_types_and_revision_provenance(self):
        result = read_source_bundle(ROOT / PART / BUNDLE, ROOT)
        self.assertEqual(result["validation"], "PASS")
        self.assertEqual(result["source_evidence_stage"], "ENGINEER_REVIEW_REQUIRED")
        self.assertEqual(result["engineering_approval"], "HOLD")
        self.assertEqual(result["quantity_takeoff"], "BLOCKED")
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["private_execution_enabled"])
        self.assertEqual(len(result["documents"]), 4)
        self.assertEqual(len(result["current_sources"]), 3)
        self.assertEqual(len(result["edges"]), 5)
        self.assertEqual(
            [(e["from_id"], e["to_id"]) for e in result["edges"] if e["relation"] == "SUPERSEDES"],
            [("SRC-M09-CONSTRAINT-002", "SRC-M09-CONSTRAINT-001")])
        self.assertEqual(len({r["artifact_id"] for r in result["documents"]}), 4)
        self.assertEqual(result["run_key"], read_source_bundle(ROOT / PART / BUNDLE, ROOT)["run_key"])
        self.assertEqual(
            result["bundle_sha256"],
            hashlib.sha256((ROOT / PART / BUNDLE).read_bytes()).hexdigest())

    def test_collision_safe_machine_receipt(self):
        with TemporaryDirectory() as t:
            out = Path(t) / "receipt.json"
            first = write_bundle_validation(ROOT / PART / BUNDLE, ROOT, out)
            self.assertEqual(json.loads(out.read_text()), first)
            with self.assertRaises(FileExistsError):
                write_bundle_validation(ROOT / PART / BUNDLE, ROOT, out)
            second = Path(t) / "second.json"
            self.assertEqual(
                out.read_bytes(),
                (write_bundle_validation(ROOT / PART / BUNDLE, ROOT, second)
                 and second.read_bytes()))

    def test_manifest_reordering_keeps_semantic_run_identity(self):
        with TemporaryDirectory() as t:
            root, file = self.fixture(t)
            original = read_source_bundle(file, root)
            self.mutate(file, lambda x: x["documents"].reverse())
            alternate = read_source_bundle(file, root)
            self.assertEqual(original["run_key"], alternate["run_key"])
            self.assertNotEqual(original["bundle_sha256"], alternate["bundle_sha256"])

    def test_rejects_untrusted_source_and_bad_revision_links(self):
        variants = [
            (lambda x: x.__setitem__("engineering_approval", "APPROVED"), "APPROVAL_BLOCKED"),
            (lambda x: x.__setitem__("classification", "PRIVATE_CLIENT"), "APPROVAL_BLOCKED"),
            (lambda x: x["documents"][0].__setitem__("sha256", "0" * 64), "SOURCE_HASH_MISMATCH"),
            (lambda x: x["documents"][1].__setitem__("authority_state", "CLIENT_SIGNED"), "SOURCE_AUTHORITY_BLOCKED"),
            (lambda x: x["documents"][1].__setitem__("source_id", "UNKNOWN_SPEC"), "EVIDENCE_SOURCE_MISMATCH"),
            (lambda x: x["documents"][1].__setitem__("artifact_id", x["documents"][0]["artifact_id"]), "SOURCE_PK_INVALID"),
            (lambda x: x["documents"][3].__setitem__("revision", "CONSTRAINT_R1"), "SOURCE_REVISION_DUPLICATE"),
            (lambda x: x["documents"][3].__setitem__("supersedes", "MISSING_REVISION"), "REVISION_PARENT_MISSING"),
            (lambda x: x["documents"][3].__setitem__("supersedes", None), "REVISION_CHAIN_INCOMPLETE"),
            (lambda x: x["documents"][2].__setitem__("lifecycle", "CURRENT"), "REVISION_CROSS_SOURCE"),
            (lambda x: x["documents"][3].__setitem__("role", "BRIEF"), "REVISION_CROSS_SOURCE"),
            (lambda x: x["documents"][3].__setitem__("path", x["documents"][2]["path"]), "SOURCE_PATH_REUSED"),
            (lambda x: x["documents"][1].__setitem__("path", "../client.dxf"), "PATH_NOT_ALLOWED"),
            (lambda x: x.__setitem__("governed_contract", "/tmp/private.job.json"), "PATH_NOT_ALLOWED"),
            (lambda x: x.__setitem__("uncontrolled", "bypass"), "BUNDLE_SCHEMA_INVALID"),
        ]
        for mutate, expected in variants:
            with self.subTest(expected=expected), TemporaryDirectory() as t:
                root, file = self.fixture(t)
                self.mutate(file, mutate)
                self.blocked(file, root, expected)

    def test_tampering_and_symlink_escape_fail_closed(self):
        with TemporaryDirectory() as t:
            root, file = self.fixture(t)
            source = root / PART / "m09_brief.synthetic.json"
            source.write_text(source.read_text() + " ")
            self.blocked(file, root, "SOURCE_HASH_MISMATCH")
        with TemporaryDirectory() as t:
            root, file = self.fixture(t)
            outsider = root / "private.json"
            outsider.write_text("{}")
            symlink = root / PART / "escape.json"
            symlink.symlink_to(outsider)
            self.mutate(file, lambda x: x["documents"][1].__setitem__(
                "path", str(PART / "escape.json")))
            self.blocked(file, root, "PATH_NOT_ALLOWED")

    def test_machine_evidence_transitions_are_not_engineering_approval(self):
        with self.assertRaises(ContractError) as e:
            transition_review_state("HOLD", "SHA256_VERIFIED", sha_verified=False)
        self.assertEqual(e.exception.code, "APPROVAL_TRANSITION_BLOCKED")
        for current, event in [
            ("HOLD", "ENGINEERING_APPROVED"),
            ("SOURCE_VERIFIED", "APPROVE_FOR_CONSTRUCTION"),
            ("ENGINEER_REVIEW_REQUIRED", "FIELD_APPROVED"),
        ]:
            with self.subTest(current=current, event=event):
                with self.assertRaises(ContractError):
                    transition_review_state(current, event, sha_verified=True)

    def test_private_resolver_is_not_connected_and_redacts_references(self):
        secret = "gdrive://private-source-reference-WITH-HIDDEN-IDENTIFIER"
        pointer = PrivateSourcePointer(
            source_id="PRIVATE_CAD_001", provider="GOOGLE_DRIVE",
            opaque_locator=secret, version_id="V1", sha256="a" * 64)
        response = private_execution_plan("PRIVATE_PROJECT", [pointer])
        self.assertEqual(response["status"], "BLOCKED_PRIVATE_RUNNER_NOT_CONFIGURED")
        self.assertFalse(response["can_fetch"])
        self.assertFalse(response["can_execute"])
        self.assertNotIn(secret, json.dumps(response))
        with self.assertRaises(PrivateBoundaryError) as blocked:
            dispatch_private_design(project_id="PRIVATE_PROJECT", source=pointer,
                                    principal={"self_asserted": True})
        self.assertEqual(str(blocked.exception), "PRIVATE_RUNNER_NOT_CONFIGURED")
        self.assertNotIn(secret, str(blocked.exception))

    def test_cli_emits_redacted_structured_errors(self):
        with TemporaryDirectory() as t:
            root, path = self.fixture(t)
            self.mutate(path, lambda x: x.__setitem__("engineering_approval", "APPROVED"))
            out = root / "reject.json"
            p = subprocess.run(
                [sys.executable, "-m", "backend.cad_bridge.bundle_cli",
                 "--bundle", str(path), "--repo-root", str(root), "--out", str(out)],
                cwd=ROOT, text=True, capture_output=True, check=False)
            self.assertEqual(p.returncode, 2)
            self.assertEqual(json.loads(p.stderr)["code"], "APPROVAL_BLOCKED")
            self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()
