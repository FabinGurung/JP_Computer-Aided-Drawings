"""CAD M12.1 DXF private-local inventory and evidence-grounded spoken geometry QA."""
from __future__ import annotations
import hashlib
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

import ezdxf

from backend.cad_bridge.dxf_inventory import inventory
from backend.cad_bridge.conversation_contract import compile_intent, SCHEMA


class CADM121Tests(unittest.TestCase):
    def make_dxf(self,root,unit=4):
        dest=Path(root)/"review.dxf"
        d=ezdxf.new("R2007");d.units=unit
        space=d.modelspace()
        space.add_line((0,0),(3500,0),dxfattribs={"layer":"PLAN_LINE"})
        space.add_lwpolyline([(0,0),(1000,0),(1000,1800),(0,1800)],close=True,
                            dxfattribs={"layer":"UNKNOWN_BOUNDARY"})
        space.add_lwpolyline([(0,200,0,0,1),(1000,200)],dxfattribs={"layer":"CURVE"})
        space.add_circle((2100,1100),100,dxfattribs={"layer":"GRID_MARK"})
        space.add_text("SYNTHETIC",dxfattribs={"layer":"TEXT"})
        d.saveas(dest)
        return dest

    def test_native_dxf_source_inventory_and_no_approval(self):
        with TemporaryDirectory() as tmp:
            path=self.make_dxf(tmp)
            original=path.read_bytes()
            response=inventory(path,source_id="TEST-PLAN-01")
            self.assertEqual(response["schema"],"fabin-cad://dxf-intake-inventory/0.1")
            self.assertEqual(response["status"],"SOURCE_INVENTORY_ONLY")
            self.assertEqual(response["file"]["sha256"],hashlib.sha256(original).hexdigest())
            self.assertEqual(response["modelspace"]["entity_count"],5)
            self.assertEqual(response["modelspace"]["entity_types"]["LWPOLYLINE"],2)
            self.assertEqual(response["modelspace"]["unresolved"]["BULGE_CURVE_REQUIRES_REAL_ARC"],1)
            self.assertEqual(response["gates"]["real_project_bim_promotion"],"BLOCKED")
            self.assertEqual(response["gates"]["quantity_takeoff"],"BLOCKED")
            self.assertFalse(response["gates"]["public_upload"])
            self.assertTrue(all(x["semantic_status"]=="UNCLASSIFIED"
                                for x in response["modelspace"]["entity_sample"]))
            self.assertEqual(path.read_bytes(),original)

    def test_dwg_and_wrong_units_are_not_silently_ingested(self):
        with TemporaryDirectory() as tmp:
            path=self.make_dxf(tmp,unit=1)
            with self.assertRaisesRegex(ValueError,"MILLIMETRE"):
                inventory(path,source_id="TEST-PLAN-01")
            wrong=Path(tmp)/"drawing.dwg"
            wrong.write_bytes(path.read_bytes())
            with self.assertRaisesRegex(ValueError,"DXF_FILE_REQUIRED"):
                inventory(wrong,source_id="TEST-PLAN-01")
            with self.assertRaisesRegex(ValueError,"SOURCE_ID_INVALID"):
                inventory(path,source_id="../../secret")

    def brief(self,facts,words="A building 9 m long, 7 m wide, 2 floors with floor height 3 m."):
        return {"schema":SCHEMA,"project_id":"TEST-M12",
                "authority":"UNVERIFIED_BRIEF","utterance":words,"facts":facts}

    def test_spoken_evidence_produces_exact_mm_and_missing_questions(self):
        facts=[{"field":"length_mm","evidence":"9 m long"},
               {"field":"width_mm","evidence":"7 m wide"},
               {"field":"storeys","evidence":"2 floors"},
               {"field":"storey_height_mm","evidence":"floor height 3 m"}]
        compiled=compile_intent(self.brief(facts))
        self.assertEqual(compiled["status"],"GEOMETRIC_MASS_PREVIEW_READY")
        self.assertEqual(compiled["facts"],{
            "length_mm":9000.0,"width_mm":7000.0,
            "storey_height_mm":3000.0,"storeys":2})
        self.assertEqual(compiled["questions"],[])
        self.assertFalse(compiled["structural_elements_inferred"])
        self.assertEqual(compiled["engineering_approval"],"HOLD")
        self.assertEqual(compiled["quantity_takeoff"],"BLOCKED")
        missing=compile_intent(self.brief(facts[:1]))
        self.assertEqual(missing["status"],"MORE_INFORMATION_REQUIRED")
        self.assertEqual(missing["missing"],["width_mm","storeys","storey_height_mm"])
        self.assertEqual(len(missing["questions"]),3)

    def test_converted_units_and_word_count(self):
        words="Make a house 30 ft long, 20 ft wide with two storeys, floor height 10 ft."
        facts=[{"field":"length_mm","evidence":"30 ft long"},
               {"field":"width_mm","evidence":"20 ft wide"},
               {"field":"storeys","evidence":"two storeys"},
               {"field":"storey_height_mm","evidence":"floor height 10 ft"}]
        a=compile_intent(self.brief(facts,words))
        self.assertEqual(a["facts"]["length_mm"],9144)
        self.assertEqual(a["facts"]["width_mm"],6096)
        self.assertEqual(a["facts"]["storey_height_mm"],3048)
        self.assertEqual(a["facts"]["storeys"],2)

    def test_fabricated_values_and_authority_fail_closed(self):
        base=self.brief([{"field":"length_mm","evidence":"9 m long"}])
        cases=[
            ({**base,"authority":"SIGNED_ENGINEERING_APPROVAL"},"AUTHORITY"),
            ({**base,"release":"TRUE"},"SCHEMA"),
            ({**base,"facts":[{"field":"length_mm","evidence":"50 m long"}]},
             "EVIDENCE_NOT_IN_SOURCE"),
            ({**base,"facts":[{"field":"width_mm","evidence":"9 m long"}]},
             "DIMENSION_EVIDENCE_AMBIGUOUS"),
            ({**base,"facts":[{"field":"length_mm","evidence":"9 m long"}]*2},
             "FIELD_DUPLICATE_OR_UNKNOWN"),
        ]
        for x,code in cases:
            with self.subTest(code=code):
                with self.assertRaisesRegex(ValueError,"CAD_INTENT_REJECTED:"+code):
                    compile_intent(x)


if __name__=="__main__":
    unittest.main()
