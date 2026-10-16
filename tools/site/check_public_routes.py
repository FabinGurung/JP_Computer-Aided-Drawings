#!/usr/bin/env python3
"""Public-safe built-site QA: run after npm run build; no network/engineering authority."""
from __future__ import annotations
import json, re, sys
from pathlib import Path
from html.parser import HTMLParser

root=Path(sys.argv[1] if len(sys.argv)>1 else "dist")
required=[
"index.html","cad/brief/index.html","cad/aad/index.html","research/index.html","research/open-architecture-engine/index.html",
"research/open-architecture-engine/v0.2/index.html","research/open-architecture-engine-v0.2/index.html",
"research/open-architecture-engine-v0.2/plan.svg","research/open-architecture-engine-v0.2/plan.dxf",
"research/open-architecture-engine-v0.2/model.gltf","research/open-architecture-engine-v0.2/rooms.json",
"research/open-architecture-engine-v0.2/dimensions.json","research/open-architecture-engine-v0.1/index.html",
"projects/index.html","projects/narayani-parajuli/index.html","projects/ramachandra-devkota/index.html",
"releases/index.html","guide/index.html","source/index.html",
"data/projects.json","data/navigation.json","stages/m80/index.html",".nojekyll"]
missing=[x for x in required if not (root/x).is_file()]
guide=(root/"guide/index.html").read_text() if (root/"guide/index.html").exists() else ""
assert all(x in guide for x in ("How It Works","UNDERSTAND","RESOLVE","VALIDATE","EXECUTE","VERIFY","VIEW","TRACE","3D","2D","4D","5D","engineering acceptance","CAD-owned AAD template","AI_AIDED_DRAWING_GUIDE_ADOPTION_v0.1.md")), "AI aided CAD guide missing canonical policy or safety details"
assert 'href="./guide/"' in (root/"index.html").read_text() and "How It Works" in (root/"index.html").read_text(),"home missing guide navigation"
assert 'href="../../guide/"' in (root/"cad/brief/index.html").read_text(),"brief must reach guide"
assert 'href="../guide/"' in (root/"cad/index.html").read_text(),"CAD studio must reach guide"
assert 'href="./cad/aad/"' in (root/"index.html").read_text(),"Homepage must link live AAD studio"
assert 'href="./aad/"' in (root/"cad/index.html").read_text(),"CAD studio must link AAD"
assert 'src="./main.ts"' not in (root/"cad/aad/index.html").read_text(),"AAD TypeScript must be compiled to deployable JavaScript"
assert not missing,"missing built pages: "+", ".join(missing)
project=json.loads((root/"data/projects.json").read_text())
assert all(re.fullmatch(r"projects/[a-z0-9-]+/",p["href"]) for p in project["projects"])
for p in project["projects"]: assert (root/p["href"]/"index.html").is_file()
assert "CODAL_NOT_VERIFIED" in (root/"projects/narayani-parajuli/index.html").read_text()
assert "HOLD" in (root/"stages/m80/index.html").read_text()
class Links(HTMLParser):
 def __init__(self): super().__init__();self.a=[]
 def handle_starttag(self,t,attrs):
  if t=="a": self.a.append(dict(attrs).get("href",""))
navpages=["index.html","research/index.html","research/open-architecture-engine/index.html","research/open-architecture-engine/v0.2/index.html","projects/index.html","releases/index.html","guide/index.html","source/index.html"]
for page in navpages:
 f=root/page; p=Links();p.feed(f.read_text())
 for link in p.a:
  if not link or link.startswith(("#","https://","mailto:")):continue
  loc=(f.parent/link.split("#",1)[0].split("?",1)[0]).resolve()
  assert loc.is_relative_to(root.resolve()),(page,link)
  assert loc.is_file() or (loc/"index.html").is_file(),(page,link)
for page in navpages:
 text=(root/page).read_text()
 assert "/blob/" not in text and ("/tree/" not in text or page=="source/index.html"),"User navigation must not open GitHub source branches: "+page
for stage in ["v02","v03","m40","m50","m60","m70","m80"]:
 for name in ["index.html","stage.css","stage.js","stage-data.json","meta.json"]:
  assert (root/"stages"/stage/name).read_bytes()==(Path("public")/"stages"/stage/name).read_bytes(),"stage mutation "+stage+"/"+name
# Unified current CAD site style and navigation. Preserve historical stage bytes.
current_pages=[
    "index.html","cad/index.html","cad/aad/index.html","cad/brief/index.html",
    "guide/index.html","projects/index.html","research/index.html","releases/index.html","source/index.html",
    "projects/narayani-parajuli/index.html","projects/ramachandra-devkota/index.html",
    "research/open-architecture-engine/index.html","research/open-architecture-engine/v0.2/index.html",
]
assert (root/"assets/css/cad-unified-theme.css").is_file(), "CAD shared theme missing"
assert (root/"assets/js/cad-site-shell.js").is_file(), "CAD shared nav missing"
for page in current_pages:
    content=(root/page).read_text()
    assert "cad-unified-theme.css" in content,(page,"missing shared theme")
    assert "cad-site-shell.js" in content,(page,"missing shared navigation")
home=(root/"index.html").read_text()
for anchor in ('id="capabilities"','id="research"','id="projects"','id="releases"','href="./cad/aad/"','href="./cad/brief/"','href="./cad/"'):
    assert anchor in home, ("missing product-first homepage control", anchor)
for title in ("WORKING · LIMITED ROOM DEMO","MASS PREVIEW ONLY","ENGINEERING"):
    assert title in home+((root/"assets/css/cad-unified-theme.css").read_text()),("missing UI capability context",title)
print("CAD_UNIFIED_STATIC_SITE_QA=PASS",len(required),"required paths; 7 unchanged Narayani stage families")
