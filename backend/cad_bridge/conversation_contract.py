"""M12.1 deterministic geometry-brief compiler for AI interpreted speech.

An assistant may identify evidence spans, but the GitHub engine always
re-parses original quoted units and numbers, rejects unsupported assumptions
and records missing facts rather than hallucinating construction geometry.
"""
from __future__ import annotations

import hashlib
import json
import re
from decimal import Decimal, InvalidOperation

SCHEMA = "fabin-cad://spoken-cad-intent/0.1"
RESULT_SCHEMA = "fabin-cad://validated-envelope-brief/0.1"
REQUIRED = ("length_mm", "width_mm", "storeys", "storey_height_mm")
MEASURES = {
    "mm": Decimal("1"), "millimeter": Decimal("1"), "millimeters": Decimal("1"),
    "cm": Decimal("10"), "centimeter": Decimal("10"),
    "m": Decimal("1000"), "metre": Decimal("1000"), "meter": Decimal("1000"),
    "metres": Decimal("1000"), "meters": Decimal("1000"),
    "ft": Decimal("304.8"), "foot": Decimal("304.8"), "feet": Decimal("304.8"),
    "inch": Decimal("25.4"), "inches": Decimal("25.4"), "in": Decimal("25.4"),
}
UNIT_RE = re.compile(
    r"(?<![\w.])([0-9]+(?:\.[0-9]+)?)\s*("
    + "|".join(sorted(map(re.escape, MEASURES), key=len, reverse=True))
    + r")\b", re.IGNORECASE)
COUNT_WORDS = {
    "one":1,"two":2,"three":3,"four":4,"five":5,
    "six":6,"seven":7,"eight":8,"nine":9,"ten":10,
}
COUNT_RE = re.compile(
    r"\b(1[0-2]|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten)"
    r"\s*(?:storeys?|stories|floors?|levels?)\b", re.IGNORECASE)
NAME_RULE = {
    "length_mm": re.compile(r"\b(length|long|depth|front.to.back)\b", re.I),
    "width_mm": re.compile(r"\b(width|wide|breadth)\b", re.I),
    "storey_height_mm": re.compile(
        r"\b((?:storey|story|floor|level)\s*height|"
        r"height\s*(?:of\s*)?(?:each|every)\s*(?:storey|story|floor)|"
        r"(?:each|every)\s*(?:storey|story|floor))\b", re.I),
}
BOUNDS = {
    "length_mm": (Decimal("100"),Decimal("100000")),
    "width_mm": (Decimal("100"),Decimal("100000")),
    "storey_height_mm": (Decimal("1800"),Decimal("8000")),
}
QUESTIONS = {
    "length_mm": "What is the building length, with units?",
    "width_mm": "What is the building width, with units?",
    "storeys": "How many storeys should the building have?",
    "storey_height_mm": "What is the floor-to-floor height, with units?",
}


def _fail(code):
    raise ValueError("CAD_INTENT_REJECTED:" + code)


def compile_intent(doc):
    if type(doc) is not dict or set(doc) != {
        "schema","project_id","utterance","facts","authority"}:
        _fail("SCHEMA")
    if doc["schema"] != SCHEMA or doc["authority"] != "UNVERIFIED_BRIEF":
        _fail("AUTHORITY")
    if not isinstance(doc["project_id"],str) or not re.fullmatch(
            r"[A-Z0-9][A-Z0-9_-]{2,63}",doc["project_id"]):
        _fail("PROJECT_ID")
    speech = doc["utterance"]
    if not isinstance(speech,str) or not (12 <= len(speech) <= 3000):
        _fail("SOURCE_UTTERANCE")
    records = doc["facts"]
    if not isinstance(records,list) or len(records)>12:
        _fail("FACTS")
    values = {}
    proof = []
    for record in records:
        if type(record) is not dict or set(record) != {"field","evidence"}:
            _fail("FACT_SCHEMA")
        field, quote = record["field"], record["evidence"]
        if field not in REQUIRED or field in values:
            _fail("FIELD_DUPLICATE_OR_UNKNOWN")
        if not isinstance(quote,str) or not (3 <= len(quote) <= 200) or quote not in speech:
            _fail("EVIDENCE_NOT_IN_SOURCE")
        if field == "storeys":
            matches=list(COUNT_RE.finditer(quote))
            if len(matches)!=1:
                _fail("STOREY_COUNT_EVIDENCE")
            token=matches[0].group(1).lower()
            value=COUNT_WORDS.get(token)
            if value is None:value=int(token)
            if not (1<=value<=12):_fail("STOREYS_OUT_OF_RANGE")
        else:
            matches=list(UNIT_RE.finditer(quote))
            if len(matches)!=1 or not NAME_RULE[field].search(quote):
                _fail("DIMENSION_EVIDENCE_AMBIGUOUS")
            matched=matches[0]
            try:
                value=(Decimal(matched.group(1))*
                       MEASURES[matched.group(2).lower()])
            except InvalidOperation:
                _fail("DIMENSION_NUMERIC_INVALID")
            if not (BOUNDS[field][0] <= value <= BOUNDS[field][1]):
                _fail("DIMENSION_OUT_OF_RANGE")
            value=float(value)
        values[field]=value
        proof.append({"field":field,"value":value,
                      "evidence":quote,"method":"UNIT_PARSED_SOURCE_SPAN"})
    missing=[key for key in REQUIRED if key not in values]
    # No wall/slab/column dimensions are invented by conversational geometry.
    return {
        "schema":RESULT_SCHEMA,
        "project_id":doc["project_id"],
        "source_sha256":hashlib.sha256(speech.encode("utf-8")).hexdigest(),
        "status":"GEOMETRIC_MASS_PREVIEW_READY" if not missing
                  else "MORE_INFORMATION_REQUIRED",
        "facts":dict(sorted(values.items())),
        "evidence":sorted(proof,key=lambda x:x["field"]),
        "missing":missing,
        "questions":[QUESTIONS[key] for key in missing],
        "permission":"SYNTHETIC_OR_USER_BRIEF_GEOMETRY_ONLY",
        "classification":"USER_PROVIDED_UNVERIFIED",
        "structural_elements_inferred":False,
        "engineering_approval":"HOLD",
        "quantity_takeoff":"BLOCKED",
        "construction_release":"BLOCKED",
        "private_execution_enabled":False,
    }


def main():
    import argparse
    from pathlib import Path
    parser=argparse.ArgumentParser(description="Validate evidence-grounded ChatGPT CAD intent")
    parser.add_argument("--infile",required=True)
    parser.add_argument("--out",required=True)
    args=parser.parse_args()
    source=Path(args.infile)
    target=Path(args.out)
    if not source.is_file() or target.exists() or source.resolve()==target.resolve():
        _fail("IO_BOUNDARY")
    data=json.loads(source.read_text(encoding="utf-8"))
    result=compile_intent(data)
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":result["status"],"missing":result["missing"],
                      "project_id":result["project_id"]},sort_keys=True))


if __name__=="__main__":
    main()
