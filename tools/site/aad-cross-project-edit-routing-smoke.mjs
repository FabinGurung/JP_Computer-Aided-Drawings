/** CAD project-wide edit-mode routing and source-only request boundaries. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PROJECTS,ALL_WORKSPACE_PROJECTS} from "../../public/assets/js/project-workspace-config.mjs";
const modelProjects=["narayani-parajuli","ashok-adhikari"],sourceOnly=["harisharan-adhikari","ramachandra-devkota","example-empty"];
for(const slug of modelProjects){
 const p=ALL_WORKSPACE_PROJECTS[slug];assert(p&&p.editions?.length>0);
 assert(p.editions.some(e=>e.manifest?.startsWith("data/projects/"+slug+"/")),slug+" expected exact model-owned source");
 for(const e of p.editions.filter(e=>e.manifest)){
  const file="public/"+e.manifest;
  const data=JSON.parse(readFileSync(file,"utf8"));
  assert(data.projectId,"Manifest requires project ID: "+file);
  assert(data.levels?.length>0,"Manifest requires model levels: "+file);
 }
}
for(const slug of sourceOnly){
 const p=ALL_WORKSPACE_PROJECTS[slug];assert(p);
 assert(p.editions.every(e=>!e.manifest),slug+" must NOT be represented as editable shared AAD graph");
}
const page=readFileSync("public/assets/js/project-workspace.mjs","utf8");
for(const id of ["pw-edit-direct","pw-edit-request-open","pw-change-request","pw-request-record",
 "pw-request-copy","pw-request-export","pw-request-export-preview"])assert(page.includes('id="'+id+'"'),"Missing project-wide control: "+id);
assert(page.includes("new URL(edition.manifest,root).pathname"),"Model entry must use actual selected manifest");
assert(page.includes("if(edition.structure)url.searchParams.set('structure',edition.structure)"),"Narayani source-review mode must be preserved");
assert(page.includes("jp-cad://aad-project-change-requests/1"),"Distinct request-only schema needed for unsupported projects");
assert(page.includes("REVIEW_REQUIRED_NOT_APPLIED"),"All source-only requests must be non-applied");
assert(page.includes("getEditableManifest"),"Browser QA must inspect model admission status");
assert(page.includes("if(edition.manifest){"),"Only existing manifest editions can expose direct editor");
assert(page.includes("link.hidden=true;link.removeAttribute('href')"),"Source-only rooms must not offer fake editor");
const doc=readFileSync("governance/aad/browser-edit-handover.v1.md","utf8");
assert(doc.includes("Harisharan"),"Cross-project gate rationale missing from governance");
assert(doc.includes("Ramachandra"),"Missing model source HOLD details");
console.log("AAD_CROSS_PROJECT_EDITOR_GATE_PASS",JSON.stringify({modelReady:modelProjects,sourceOnly,editionCount:modelProjects.reduce((n,s)=>n+PROJECTS[s].editions.length,0)}));
