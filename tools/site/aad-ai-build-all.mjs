#!/usr/bin/env node
/* Deterministic AI-to-AAD batch entry point for GitHub Actions.
 * One approved spec per new project; shared compiler, no code forks and
 * no runtime model/API token. Include synthetic as a safe smoke test.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
const mode=process.argv[2];
if(!["--check","--publish"].includes(mode)||process.argv.length!==3)
 throw Error("Usage: node tools/site/aad-ai-build-all.mjs --check|--publish");
const all=["design_jobs/synthetic/aad-ai-two-storey.json"];
const dir="design_jobs/ai-projects";
if(fs.existsSync(dir)){
 const files=fs.readdirSync(dir,{withFileTypes:true})
  .filter(x=>x.isFile()&&/^[a-z][a-z0-9-]*\.json$/.test(x.name))
  .map(x=>path.posix.join(dir,x.name)).sort();
 if(files.length>40)throw Error("Maximum 40 AI AAD designs per batch");
 all.push(...files);
}
const unique=new Set();
for(const file of all){
 const spec=JSON.parse(fs.readFileSync(file,"utf8")),slug=spec.project?.slug;
 if(unique.has(slug))throw Error("Repeated project slug in source design queue: "+slug);
 unique.add(slug);
 const command=["tools/site/aad-ai-generate.mjs",file,mode];
 execFileSync(process.execPath,command,{stdio:"inherit",timeout:45000});
}
console.log("AAD_AI_BATCH_VERIFIED",JSON.stringify({mode,count:all.length,sourceSpecs:all}));
