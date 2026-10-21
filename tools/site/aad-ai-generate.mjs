#!/usr/bin/env node
/* Reusable AI-to-AAD compiler CLI: author design JSON with any AI; this
 * program validates, builds and publishes only project DATA and tiny adapters.
 * It does not host a model, change AAD engine code or access private sources.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {compileAADDesign} from "../../public/assets/js/aad-ai-design-compiler.mjs";
import {getAADPublicationCopy} from "./aad-ai-publication-copy.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const args=process.argv.slice(2);
if(args.length!==2||!["--check","--publish"].includes(args[1]))
 throw Error("Usage: node tools/site/aad-ai-generate.mjs <design-spec.json> --check|--publish");
const file=path.resolve(root,args[0]);
if(!file.startsWith(root+path.sep))throw Error("Input design specification must be repository-local");
if(fs.statSync(file).size>200000)throw Error("Design specification exceeds 200 KB");
const raw=fs.readFileSync(file,"utf8"),spec=JSON.parse(raw);
const built=compileAADDesign(spec),fingerprint=crypto.createHash("sha256").update(raw).digest("hex");
built.manifest.sourceAuthority.designSpecPath=path.relative(root,file).replaceAll(path.sep,"/");
built.manifest.sourceAuthority.designSpecSha256=fingerprint;
built.qa.designSpecSha256=fingerprint;

const dataDir=path.join(root,"public/data/projects",built.slug);
const siteDir=path.join(root,"public/projects",built.slug);
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const projectName=esc(built.projectName),slug=built.slug;
const publicationCopy=getAADPublicationCopy(spec.publication.mode);

function pageStart(title,depth){
 const up="../".repeat(depth);
 return [
 '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<title>'+esc(title)+' · AAD</title>',
 '<link rel="stylesheet" href="'+up+'assets/css/cad-unified-theme.css">',
 '<style>body{margin:0;background:#edf5f6;color:#173c49;font:14px/1.6 Inter,system-ui,Arial,sans-serif}',
 'header{padding:12px 18px;border-bottom:1px solid #d4e3e7;background:white;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}',
 'header a{color:#096e6d;text-decoration:none}main{max-width:1700px;margin:auto;padding:16px}h1{letter-spacing:-.035em}',
 'p{color:#526f7e}.hold{padding:10px 12px;border:1px solid #eed4a6;background:#fff5e2;color:#78561f;border-radius:7px;font-size:12px}',
 'a.button{display:inline-block;background:#0f7068;border-radius:7px;color:white;text-decoration:none;padding:10px 14px;font-weight:700}',
 'iframe{display:block;width:100%;height:1720px;border:1px solid #c4d6db;border-radius:9px;background:white;margin-top:12px}',
 '.links{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0}.links a{color:#076d67}@media(max-width:800px){iframe{height:1950px}}</style></head><body>',
 '<header><strong>AAD · '+projectName+'</strong><nav><a href="'+up+'projects/">All projects</a> · <a href="'+up+'cad/aad/">Shared AAD template</a></nav></header>',
 '<main>'
 ].join("\n");
}
const projectIndex=[
 pageStart(projectName,2),'<h1>'+projectName+'</h1>',
 '<p>'+esc(publicationCopy.overview)+'</p>',
 '<div class="hold">'+esc(publicationCopy.overviewHold)+'</div>',
 '<p><a class="button" href="./aad/">Open linked AAD design studio →</a></p>',
 '<div class="links"><a href="../../data/projects/'+slug+'/aad-building-v1.json">Building manifest</a>',
 '<a href="../../data/projects/'+slug+'/aad-ai-qa.json">Assumptions / QA</a>',
 '<a href="../../data/projects/'+slug+'/'+built.ifcFile+'">IFC4 export</a></div>',
 '<p>Area quantities are computed from the submitted polygons. Structural column/beam/slab dimensions remain conceptual.</p>',
 '</main><script defer src="../../assets/js/cad-site-shell.js" data-cad-root="../../"></script></body></html>'
].join("\n")+"\n";
const projectStudio=[
 pageStart(projectName+" — Design Studio",3),
 '<h1>'+projectName+' · Unified AAD</h1>',
 '<p>Linked 2D plan, multi-storey 3D, room and element schedules, editable dimensions, IFC4 from one shared model.</p>',
 '<div class="hold">'+esc(publicationCopy.studioHold)+'</div>',
 '<iframe id="aad-unified-engine" title="Shared AAD linked 2D and 3D design studio" loading="eager"></iframe>',
 '<div class="links"><a id="aad-open-full" target="_blank" rel="noopener">Open full-screen shared editor ↗</a>',
 '<a href="../../../data/projects/'+slug+'/aad-ai-qa.json">QA / assumption ledger</a></div>',
 '</main><script>(function(){',
 'const editor=new URL("../../../cad/aad/multistorey/",location.href);',
 'const manifest=new URL("../../../data/projects/'+slug+'/aad-building-v1.json",location.href);',
 'editor.searchParams.set("manifest",manifest.pathname);',
 'document.getElementById("aad-unified-engine").src=editor.href;',
 'document.getElementById("aad-open-full").href=editor.href;',
 '})();</script>',
 '<script defer src="../../../assets/js/cad-site-shell.js" data-cad-root="../../../"></script></body></html>'
].join("\n")+"\n";

const outputs=new Map([
 [path.join(dataDir,"aad-building-v1.json"),JSON.stringify(built.manifest,null,2)+"\n"],
 [path.join(dataDir,"aad-ai-qa.json"),JSON.stringify(built.qa,null,2)+"\n"],
 [path.join(dataDir,built.ifcFile),built.ifc],
 [path.join(siteDir,"index.html"),projectIndex],
 [path.join(siteDir,"aad/index.html"),projectStudio]
]);
for(const [id,model] of Object.entries(built.models))
 outputs.set(path.join(dataDir,"aad-"+id+"-model.json"),JSON.stringify(model,null,2)+"\n");
if(args[1]==="--publish"){
 // Preflight every planned file before writing any, so partial overlaps cannot
 // silently overwrite private/canonical project artifacts.
 for(const [name,value] of outputs){
  if(fs.existsSync(name)&&fs.readFileSync(name,"utf8")!==value)
   throw Error("Refusing overwrite of project authority: "+path.relative(root,name)+". Use a new project slug/revision.");
 }
 for(const [name,value] of outputs){
  if(!fs.existsSync(name)){fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,value,"utf8");}
 }
}
console.log("AAD_AI_DESIGN_PIPELINE_PASS",JSON.stringify({
 mode:args[1],projectId:built.projectId,slug,storeys:built.manifest.levels.length,
 modelElements:built.assembly.elements.length,areas_m2:built.assembly.area.model,
 ifcBytes:built.ifc.length,generatedArtifacts:[...outputs.keys()].map(p=>path.relative(root,p)),
 expectedPublishedRoute:"/JP_Computer-Aided-Drawings/projects/"+slug+"/aad/",
 engineeringApproval:"HOLD",publicationMode:spec.publication.mode
}));
