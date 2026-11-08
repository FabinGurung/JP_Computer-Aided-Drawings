import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const paths=['.github/workflows/harisharan-stages-r0-release.yml','.github/workflows/ashok-grid-v31-milestone-release.yml'];
for(const path of paths){
 const s=readFileSync(path,'utf8');
 assert.match(s,/id: existing_seal/);
 assert.match(s,/HISTORICAL_RELEASE_VERIFIED_NOOP/);
 assert.equal(s.split("if: steps.existing_seal.outputs.already_sealed != 'true'").length-1,4,'Must bypass all four old release gates: '+path);
 assert.match(s,/recorded.*EXPECTED_FROZEN_SHA/);
 assert.match(s,/git ls-remote --exit-code/);
 assert.match(s,/GitHub Release/);
}
const pages=readFileSync('.github/workflows/cad-main-pages.yml','utf8');
const live=readFileSync('.github/workflows/cad-m01-live-audit.yml','utf8');
assert.match(pages,/cad-pages-provenance\.mjs/);
assert.match(live,/cad-live-provenance-readback\.mjs/);
for(const p of ['tools/site/cad-pages-provenance.mjs','tools/site/cad-live-provenance-readback.mjs'])assert.ok(existsSync(p),p);
const code=readFileSync('tools/site/cad-live-provenance-readback.mjs','utf8');
assert.match(code,/pagesWorkflowRunId===expectedRun/);
assert.match(code,/sourceCommitSha===expectedSha/);
assert.match(code,/Published byte mismatch/);
assert.match(code,/harisharan-adhikari\/upper-floor-source-r000001\.json/);
assert.match(code,/ashok-adhikari\/coordinate-grid-v1\.json/);
console.log('CAD_IDEMPOTENT_RELEASE_AND_EXACT_DEPLOYED_BYTES_QA_PASS');
