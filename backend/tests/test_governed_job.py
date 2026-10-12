"""M09.1 acceptance and negative tests (no native dependency required)."""
import copy
import json
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from shutil import copy2

from backend.cad_bridge.governed_job import ContractError, read_contract, write_validation

ROOT = Path(__file__).resolve().parents[2]
FOLDER = "design_jobs/synthetic"
FILENAME = "m09_demo.governed.json"


class M09ContractTests(unittest.TestCase):
    def fixture(self, tmp):
        root = Path(tmp)
        folder = root / FOLDER
        folder.mkdir(parents=True)
        for name in (FILENAME, "m08_demo.job.json", "m08_demo.source.json"):
            copy2(ROOT / FOLDER / name, folder / name)
        return root, folder / FILENAME

    def edit(self, file, mutation):
        data = json.loads(file.read_text())
        mutation(data)
        file.write_text(json.dumps(data) + "\n")

    def assert_blocked(self, file, root, code):
        with self.assertRaises(ContractError) as caught:
            read_contract(file, root)
        self.assertEqual(caught.exception.code, code)

    def test_good_contract_has_stable_id_and_full_source_lineage(self):
        first = read_contract(ROOT / FOLDER / FILENAME, ROOT)
        second = read_contract(ROOT / FOLDER / FILENAME, ROOT)
        self.assertEqual(first, second)
        self.assertEqual(first["validation"], "PASS")
        self.assertFalse(first["release_authorized"])
        self.assertFalse(first["private_execution_enabled"])
        self.assertEqual(first["engineering_approval"], "HOLD")
        self.assertEqual(first["objects"], 6)
        self.assertEqual(len(first["edges"]), 15)  # 3 levels + 5 objects x 2 + 1 opening x 2
        self.assertEqual(len({(e["from_id"], e["role"]) for e in first["edges"]}), 15)
        self.assertEqual({e["relation"] for e in first["edges"]}, {"REFERENCES"})
        self.assertTrue(first["output_id"].startswith("m09-"))

    def test_deterministic_result_and_no_silent_overwrite(self):
        with TemporaryDirectory() as tmp:
            dest = Path(tmp) / "result.json"
            first = write_validation(ROOT / FOLDER / FILENAME, ROOT, dest)
            self.assertEqual(json.loads(dest.read_text()), first)
            with self.assertRaises(FileExistsError):
                write_validation(ROOT / FOLDER / FILENAME, ROOT, dest)
            other = Path(tmp) / "second.json"
            self.assertEqual(first["run_key"],
                             write_validation(ROOT / FOLDER / FILENAME, ROOT, other)["run_key"])
            self.assertEqual(dest.read_bytes(), other.read_bytes())

    def test_rejects_private_or_approval_promotion(self):
        for key, value in (("classification", "PRIVATE_CLIENT"),
                           ("approval_state", "APPROVED"),
                           ("approval_state", "PROPOSED")):
            with self.subTest(key=key, value=value), TemporaryDirectory() as tmp:
                root, file = self.fixture(tmp)
                self.edit(file, lambda x: x["project"].__setitem__(key, value))
                self.assert_blocked(file, root, "APPROVAL_BLOCKED")

    def test_source_and_job_hash_mutations_fail(self):
        for key, expected in (("design_job", "JOB_HASH_MISMATCH"),
                              ("sources", "SOURCE_HASH_MISMATCH")):
            with self.subTest(key=key), TemporaryDirectory() as tmp:
                root, file = self.fixture(tmp)
                def edit(data):
                    record = data["design_job"] if key == "design_job" else data["sources"][0]
                    record["sha256"] = "0" * 64
                self.edit(file, edit)
                self.assert_blocked(file, root, expected)

    def test_invalid_source_identity_and_reference_fail(self):
        mutations = [
            (lambda x: x["sources"][0].__setitem__("revision", ""), "SOURCE_IDENTITY_INVALID"),
            (lambda x: x["sources"][0].__setitem__("source_id", "DIFFERENT_SPEC"), "SOURCE_FK_INVALID"),
            (lambda x: x["sources"].append(copy.deepcopy(x["sources"][0])), "SOURCE_CARDINALITY_INVALID"),
            (lambda x: x["sources"][0].__setitem__("authority_state", "EXTERNAL_UNREVIEWED"), "SOURCE_AUTHORITY_BLOCKED"),
            (lambda x: x["project"].__setitem__("project_id", "DIFFERENT_PROJECT"), "CROSS_DOCUMENT_MISMATCH"),
            (lambda x: x["sources"][0].__setitem__("path", "../private/secret.json"), "PATH_NOT_ALLOWED"),
            (lambda x: x["design_job"].__setitem__("path", "/tmp/private.job.json"), "PATH_NOT_ALLOWED"),
            (lambda x: x.__setitem__("unknown_approval", True), "SCHEMA_INVALID"),
        ]
        for mutation, expected in mutations:
            with self.subTest(expected=expected), TemporaryDirectory() as tmp:
                root, file = self.fixture(tmp)
                self.edit(file, mutation)
                self.assert_blocked(file, root, expected)

    def test_source_byte_tampering_rejected_even_with_valid_contract(self):
        with TemporaryDirectory() as tmp:
            root, file = self.fixture(tmp)
            source = root / FOLDER / "m08_demo.source.json"
            source.write_text(source.read_text() + " ")
            self.assert_blocked(file, root, "SOURCE_HASH_MISMATCH")

    def test_cli_diagnostic_is_machine_readable_and_fails_closed(self):
        with TemporaryDirectory() as tmp:
            root, file = self.fixture(tmp)
            self.edit(file, lambda x: x["project"].__setitem__("approval_state", "APPROVED"))
            proc = subprocess.run([sys.executable, "-m", "backend.cad_bridge.governed_cli",
                                   "--contract", str(file), "--repo-root", str(root),
                                   "--out", str(root / "result.json")],
                                  capture_output=True, text=True, cwd=ROOT, check=False)
            self.assertEqual(proc.returncode, 2)
            diagnostic = json.loads(proc.stderr)
            self.assertEqual(diagnostic["code"], "APPROVAL_BLOCKED")
            self.assertFalse((root / "result.json").exists())


if __name__ == "__main__":
    unittest.main()
