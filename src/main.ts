import type { ProjectEntry, ProjectRegistry } from "./types";
function need<T extends Element>(selector:string):T { const e=document.querySelector<T>(selector);if(!e)throw new Error("Missing DOM element "+selector);return e; }
const loadState=need<HTMLElement>("#loadState"),cards=need<HTMLElement>("#cards"),search=need<HTMLInputElement>("#projectSearch");
let registry:ProjectRegistry|null=null;
function textEl(tag:string,content:string,cls?:string){const el=document.createElement(tag);el.textContent=content;if(cls)el.className=cls;return el;}
function projectCard(p:ProjectEntry):HTMLElement {
  const card=document.createElement("article");card.className="card project-card";
  card.append(textEl("div",p.project_id+(p.project_code?" · "+p.project_code:""),"stage"),textEl("h3",p.name),
    textEl("p",p.organization+" · "+p.location,"project-subline"),textEl("p",p.summary));
  const flags=document.createElement("div");flags.className="module-pills";
  for(const item of p.modules)flags.append(textEl("span",item,"pill"));card.append(flags);
  const controls=document.createElement("div");controls.className="project-actions";
  const link=document.createElement("a");link.className="button";link.textContent="Open project →";
  // Registry links are public-safe paths relative to the website root, never GitHub branches.
  if (!/^projects\/[a-z0-9-]+\/$/.test(p.href)) throw new Error("Unsupported project route");
  link.href=new URL(p.href,new URL(import.meta.env.BASE_URL,location.origin)).href;
  controls.append(link,textEl("span",p.project_status,"pill"));card.append(controls);return card;
}
function render(query=""):void {
  if(!registry)return;cards.replaceChildren();const q=query.trim().toLowerCase();
  const found=registry.projects.filter(p=>[p.project_id,p.project_code??"",p.name,p.organization,p.location,p.summary,...p.modules].join(" ").toLowerCase().includes(q));
  for(const p of found)cards.append(projectCard(p));
  loadState.textContent=found.length+" of "+registry.projects.length+" projects";
  if(!found.length)cards.append(textEl("p","No matching projects. Try a name, project ID or location."));
}
async function boot():Promise<void> {
  try{
    const response=await fetch(new URL("data/projects.json",new URL(import.meta.env.BASE_URL,location.origin)),{cache:"no-store"});
    if(!response.ok)throw new Error("Project registry HTTP "+response.status);
    registry=await response.json() as ProjectRegistry;
    if(!Array.isArray(registry.projects))throw new Error("Invalid registry");
    render();
  }catch(error){loadState.textContent="Unavailable";cards.append(textEl("p","Public project registry unavailable."));console.error(error);}
}
search.addEventListener("input",()=>render(search.value));void boot();
