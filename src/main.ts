import type { ProjectEntry, ProjectRegistry } from "./types";

function need<T extends Element>(selector:string):T {
  const el=document.querySelector<T>(selector);
  if(!el) throw new Error(`Missing DOM element: ${selector}`);
  return el;
}

const loadState=need<HTMLElement>("#loadState");
const cards=need<HTMLElement>("#cards");
const search=need<HTMLInputElement>("#projectSearch");
let registry:ProjectRegistry|null=null;

function projectCard(project:ProjectEntry):HTMLElement {
  const article=document.createElement("article");
  article.className="card project-card";
  const code=project.project_code ? `${project.project_id} · ${project.project_code}` : project.project_id;
  article.innerHTML=`
    <div class="project-top"><span class="stage">${code}</span><span class="pill">${project.portal_status}</span></div>
    <h3>${project.name}</h3>
    <p class="project-subline">${project.organization} · ${project.location}</p>
    <p>${project.summary}</p>
    <div class="module-pills">${project.modules.map(item=>`<span class="pill">${item}</span>`).join("")}</div>
    <div class="project-actions"><a class="button" href="${project.href}">Open project →</a><span class="pill">${project.project_status}</span></div>`;
  return article;
}

function render(query=""):void {
  if(!registry) return;
  const q=query.trim().toLowerCase();
  cards.innerHTML="";
  const filtered=registry.projects.filter(project => {
    const hay=[project.project_id,project.project_code??"",project.name,project.organization,project.location,project.summary,...project.modules].join(" ").toLowerCase();
    return !q || hay.includes(q);
  });
  filtered.forEach(project=>cards.appendChild(projectCard(project)));
  loadState.textContent=`${filtered.length} of ${registry.projects.length} projects`;
  if(!filtered.length) cards.innerHTML=`<article class="card"><h3>No matching project</h3><p>Try a client name, project ID, company or location.</p></article>`;
}

async function boot():Promise<void> {
  try {
    const response=await fetch("/data/projects.json",{cache:"no-store"});
    if(!response.ok) throw new Error(`project registry HTTP ${response.status}`);
    registry=(await response.json()) as ProjectRegistry;
    if(!Array.isArray(registry.projects)) throw new Error("projects is not an array");
    render();
  } catch(error) {
    loadState.textContent="Load failed";
    loadState.classList.add("hold");
    cards.innerHTML=`<article class="card"><h3>Project registry unavailable</h3><p>The public-safe registry could not be loaded.</p></article>`;
    console.error(error);
  }
}

search.addEventListener("input",()=>render(search.value));
void boot();
