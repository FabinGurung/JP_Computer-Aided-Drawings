/** CAD Knowledge Centre static contract: existing authorities, no competing technical standard. */
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname,join,extname} from "node:path";
import assert from "node:assert/strict";
const root=resolve("public"), page=resolve(root,"knowledge-centre/index.html");
const html=readFileSync(page,"utf8");
const ids=["start","authority","inheritance","publishing","projects","status"];
for(const id of ids){
  assert.match(html,new RegExp('id="'+id+'"'),"missing unique section "+id);
  assert.equal((html.match(new RegExp('id="'+id+'"',"g"))||[]).length,1,"duplicate section "+id);
  assert(html.includes('href="#'+id+'"'),"missing section navigation "+id);
}
const dest=[];
for(const m of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)){
  const href=m[1];if(href.startsWith("#")||/^https:\/\//.test(href))continue;
  assert(!href.startsWith("/"),"avoid root-relative CAD Pages links: "+href);
  const rel=resolve(dirname(page),href);
  assert(rel===root||rel.startsWith(root+"/"),"link escapes public: "+href);
  const expected=href==="../cad/aad/"?resolve("cad/aad/index.html"):(rel===root?resolve("index.html"):(extname(rel)?rel:join(rel,"index.html")));
  assert(existsSync(expected),"broken local link "+href);
  dest.push(href);
}
for(const p of [
 "../memory-wall/","../memory-wall/pages/","../templates/project-workspace/control-tower/",
 "../projects/narayani-parajuli/memory-wall/","../projects/ashok-adhikari/memory-wall/",
 "../projects/harisharan-adhikari/memory-wall/","../projects/ramachandra-devkota/memory-wall/"
])assert(dest.includes(p),"missing authority / project reference "+p);
assert(!html.includes("PRJ-000007__")&&!html.includes("1mosr2gahKr4j7xj6BmrIjz4vdCxBYetF"),"do not publish Drive folder IDs");
const shell=readFileSync(resolve(root,"assets/js/cad-site-shell.js"),"utf8");
assert(shell.includes('["Knowledge Centre","knowledge-centre/"]'),"Knowledge Centre must be in global primary menu");
assert(shell.includes('["Shared CAD rules","memory-wall/"]'),"old CAD Memory Wall must remain discoverable");
for(const p of [
 "index.html","memory-wall/index.html","memory-wall/pages/index.html",
 "templates/project-workspace/control-tower/index.html"
])assert(readFileSync(resolve(root,"..",p==="index.html"?"index.html":"public/"+p),"utf8").includes("knowledge-centre/"),"missing return route in "+p);
assert(existsSync(resolve("governance/aad/project-room-inheritance.v0.1.md")),"missing project room design reference");
console.log("CAD_KNOWLEDGE_CENTRE_STATIC_PASS", ids.length,"sections",dest.length,"internal links");
