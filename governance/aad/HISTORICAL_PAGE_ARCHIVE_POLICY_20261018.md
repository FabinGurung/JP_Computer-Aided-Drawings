# CAD public site — current product and recoverable historical pages

**Current public product:** `/cad/aad/`, served from one versioned semantic floor-model engine. The homepage is a product launchpad, not another CAD engine.

**Historical / research routes deliberately retained and not promoted as current editors:**
- `/cad/` — earlier CAD studio with IFC/plan/elevation/section experiments
- `/cad/brief/` — restricted phrase-to-geometry preview
- `/research/` and `/research/open-architecture-engine/` — research and v0.1/v0.2 geometry proofs
- `/projects/` and historical Narayani/Ramachandra public-safe viewers
- `/releases/`, `/source/`, and historical `/stages/{v02,v03,m40,m50,m60,m70,m80}/`

## Why these are not silently deleted

The original pages are immutable proof, may have inbound references, and provide frozen design-review evidence. Source-control history **does** make their HTML/JS recoverable, but reverting public URLs before updating required route/cross-link tests risks breaking external consumers. The active UI hides them in grouped, collapsed **More → Earlier design tools / Research & prototypes / Projects & history**, and the homepage does not promote them as alternate current products.

**Archive-as-text approach for later approved pruning:**
1. Preserve byte-identical historical HTML/JS files in an archive commit or tag.
2. Produce a Markdown index recording original route, Git blob SHA, last verified CI and the appropriate successor.
3. Replace legacy public route with a very small explanatory read-only redirect/stub **only after** checking references, route guards and external usage. Do not delete the original file from all history.
4. Retain source and pre-release commit IDs as rollback handles. Direct Git syntax: `git show <commit>:public/stages/m70/index.html`.
5. Maintain private-source boundaries. A frozen page is not evidence that private DWG admission is approved.

**Baseline before free-form graph:** `063fc817c3ce2e513f20e17cb93f0b2dd4a5ee32` (published and read back). Do not archive or remove current model/test/manifest files.

## Real project pilot

The Narayani ground-floor **private** v0.5 review model is delivered through the conversation, not committed into this public GitHub Pages repo. It records exactly which text dimensions came from the indexed architectural PDF and which details were assumed. The 205.16 m² Block B ground-floor total is not matched by the provisional 14.54 × 10.64 m rectangular pilot. All unverified geometry remains private and clearly marked.
