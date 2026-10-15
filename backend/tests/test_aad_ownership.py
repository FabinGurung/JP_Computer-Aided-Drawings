"""AAD bounded-context ownership guard. A7 must remain read-only for CAD work."""
from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "governance/aad/aad-domain-template.v0.1.json"


class AADOwnershipTests(unittest.TestCase):
    def test_contract_is_owned_by_cad_not_a7(self):
        template = json.loads(CONTRACT.read_text(encoding="utf-8"))
        self.assertEqual(template["schema"], "jp-cad://aad-domain-template/0.1")
        self.assertEqual(template["owner_repository"], "FabinGurung/JP_Computer-Aided-Drawings")
        self.assertEqual(template["template_id"], "AAD-CAD-TEMPLATE-001")
        self.assertEqual(template["architecture"]["a7_role"], "READ_ONLY_FEDERATED_CATALOGUE")
        self.assertEqual(template["architecture"]["a7_write_authorization"],
                         "REQUIRES_SEPARATE_EXPLICIT_USER_INSTRUCTION_FOR_A7_SCOPE")
        self.assertTrue(template["controls"]["no_a7_mutation_as_side_effect"])
        self.assertTrue(template["controls"]["no_private_source_publication"])
        self.assertEqual(len(template["pipeline"]), 7)

    def test_guides_and_agent_readme_do_not_reassign_ownership(self):
        source = [(ROOT / p).read_text(encoding="utf-8") for p in (
            "README.md", "AGENTS.md",
            "governance/aad/README.md",
            "governance/AI_AIDED_DRAWING_GUIDE_ADOPTION_v0.1.md",
            "public/guide/index.html")]
        self.assertTrue(all(("A7" in text or "a7" in text) and
                            "CAD" in text for text in source))
        self.assertIn("CAD-owned AAD template", source[-1])
        self.assertIn("A7 is the read-only catalogue", source[-1])
        self.assertIn("DO NOT change A7", source[1])
        self.assertIn("governance/aad/aad-domain-template.v0.1.json", source[0])
        self.assertNotIn("A7 owns the common interaction template", source[-1])
        self.assertNotIn("single cross-repository A7 How It Works standard", source[-1])


if __name__ == "__main__":
    unittest.main()
