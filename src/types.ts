export interface ProjectEntry {
  project_id: string;
  project_code?: string;
  slug: string;
  name: string;
  organization: string;
  location: string;
  project_status: string;
  portal_status: string;
  summary: string;
  href: string;
  modules: string[];
}
export interface ProjectRegistry { schema:string; generated_at_npt:string; projects:ProjectEntry[]; }
