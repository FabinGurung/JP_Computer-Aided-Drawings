// Shared navigation contract. Design editions, source revisions and work phases
// are separate concepts. No private records or engineering dimensions live here.
const level=(id,name,note='')=>({id,name,note});
const archive={title:'Earlier interface record',href:'record.html',note:'Retained navigation, explanations and source links. Interface history is not a new design edition.'};
export const PROJECTS={
 'ashok-adhikari':{
  name:'Ashok Adhikari',company:'Rohini Engineering and Builders',status:'v3 owner changes · engineering review HOLD',defaultLevel:'gf',
  editions:[{id:'v3',name:'v3 · Owner revisions (REVIEW)',basis:'6 November 2026 owner-directed GF/FF layout and opening revisions. Parametric architectural review only; zero-right setback, elderly access and stair glazing under HOLD. Earlier v2 remains selectable.',manifest:'data/projects/ashok-adhikari/aad-building-v3-review.json',levels:[level('gf','Ground floor','Enlarged bathroom and revised hosted doors; accessibility QA pending'),level('ff','First floor','Large aluminum windows and slider; stair separation review pending'),level('roof','Roof access','Existing v2 roof and service proposal retained; coordination only')]},{id:'v2',name:'v2 · Coordination',basis:'Current architectural and MEP coordination edition.',manifest:'data/projects/ashok-adhikari/aad-building-qa02.json',levels:[level('gf','Ground floor'),level('ff','First floor'),level('roof','Roof access','Roof-access geometry; engineering clearances remain under review.')]},{id:'v1',name:'v1 · Architecture',basis:'Frozen architectural baseline, from repository commit 49a2647. Later MEP additions are absent.',manifest:'data/projects/ashok-adhikari/editions/v1/aad-building-qa02.json',levels:[level('gf','Ground floor'),level('ff','First floor'),level('roof','Roof access')]}],
  quantities:'Modeled components and geometric quantities. Architectural coordination columns are not designed structural members. No accepted concrete mix, BBS or priced BOQ is supplied.',
  programme:'No accepted activity network, durations or start date is published for this edition. The Gantt chapter remains available for an admitted schedule; no dates are invented.',
  sourceGroups:[{title:'5.1 · Original plans',links:[{title:'Ground-floor source plan',href:'../../data/projects/ashok-adhikari/gf.svg',image:true},{title:'First-floor source plan',href:'../../data/projects/ashok-adhikari/ff.svg',image:true},{title:'Site source plan',href:'../../data/projects/ashok-adhikari/site.svg',image:true}]},{title:'5.2 · Visual references',links:[{title:'Ground floor · c016',href:'../../data/projects/ashok-adhikari/gf-c016.png',image:true},{title:'First floor · c012',href:'../../data/projects/ashok-adhikari/ff-c012.png',image:true}]},{title:'5.3 · Decisions, records and exports',links:[{title:'Source and coordination manifest',href:'../../data/projects/ashok-adhikari/source-manifest.public.json'},archive,{title:'Coordination workbook and QA notes',href:'record.html#qa-workbook',note:'The workbook does not publish geometry edits. Existing local QA notes remain available.'},{title:'v1 snapshot provenance',href:'../../data/projects/ashok-adhikari/editions/v1/provenance.json'}]},{title:'5.4 · Owner changes · 6 Nov 2026',links:[{title:'v3 owner architectural change and chapter impacts',href:'../../data/projects/ashok-adhikari/owner-revision-20261106.json',note:'Owner markup transcription and mathematical draft. Window sizes, accessible bath and stair glazing remain engineering holds; source images not republished.'}]}]
 },
 'narayani-parajuli':{
  name:'Narayani Parajuli',company:'Fishtail Builders · PRJ-000007',status:'Source review · engineering HOLD',defaultLevel:'gf',
  editions:[{id:'source-current',name:'Current · Source model',basis:'Source-based current AAD model. M-series checkpoints and V02/V03 work packages are records, not alternate architectural editions.',manifest:'data/projects/narayani-parajuli/aad-building-v1.json',structure:'source-review',levels:[level('substructure','Through plinth beam','GF source columns, footing outlines and plinth beams. Heights, thicknesses and registration remain under review.'),level('gf','Ground floor','Source-preferred GF structure; architecture/structure registration remains provisional.'),level('ff','First floor','Architectural model only. Upper-storey structural members are not verified.'),level('sf','Second floor','Architectural model only. Upper-storey structural members are not verified.')]}],
  quantities:'Component quantities follow the current source interpretation. Footing thicknesses and vertical datums are schematic; do not treat geometric volumes as an approved material order.',
  programme:'Frozen work packages preserve their own sequencing evidence. An accepted consolidated programme and current start date are not admitted to this workspace.',
  sourceGroups:[{title:'5.1 · Source model and engineering decisions',links:[{title:'Current source-review record',href:'aad/'},{title:'Current engineering evidence register',href:'../../data/projects/narayani-parajuli/aad-engineering-current-register.json'},{title:'Source / assumption ledger',href:'../../data/projects/narayani-parajuli/MODEL_QA_MANIFEST_v2.json'}]},{title:'5.2 · Earlier interface',links:[archive]}]
 },
 'harisharan-adhikari':{
  name:'Harisharan Adhikari',company:'Fishtail Builders · Pokhara 12',status:'Source interpretation · review open',defaultLevel:'ground',
  editions:[{id:'without-basement',name:'Without basement',basis:'September drawing/report source set. Workspace release numbers track presentation, not new design editions.',engine:'harisharan',levels:[level('substructure','Through plinth beam','Footings, straps, substructure columns and plinth beams.'),level('ground','Ground floor'),level('first','First floor'),level('second','Second floor'),level('third','Third floor'),level('fourth','Fourth floor / roof')]}],
  quantities:'Each floor phase includes its columns, main beams, stairs and overhead slab. Basic rebar excludes unquantified ties, support extras, laps and chairs; gross slab voids and secondary members remain incomplete.',
  programme:'Quantity-based editable planning scenario. Dates, rates and holds are assumptions; schedule ownership and engineering approval remain separate.',
  sourceGroups:[{title:'5.1 · Original floor-plan vectors',harisharanSources:true,links:[]},{title:'5.2 · Source evidence and assumptions',links:[{title:'Source fingerprints and conflicts',action:'evidence'},{title:'Change model / material assumptions',action:'scenarios'}]}]
 },
 'ramachandra-devkota':{
  name:'Ramachandra Devkota',company:'Rohini Engineering and Builders · REB-002',status:'Planned · public model pending',defaultLevel:'gf',
  editions:[{id:'rev02',name:'REV02 · CAD source',basis:'Current governed DWG/DXF source family. Public geometry admission is pending.',levels:[level('substructure','Through plinth beam'),level('gf','Ground floor'),level('roof','Roof')]}],
  quantities:'Public measurement lines, structural schedules and a checked BBS are not supplied. Pending quantities remain unknown, not zero.',
  programme:'Construction start and an accepted activity network are not established. No programme dates are invented.',
  sourceGroups:[{title:'5.1 · Authorized workspaces',links:[{title:'Restricted live Estimate / BOQ',href:'https://docs.google.com/spreadsheets/d/1JoCVJnHHMAAe42uvpGK6PydJ6p85apWwVqIYCzlkYrc/edit',note:'Google named-account access applies. Internal preliminary estimate; not a contract sum.'},{title:'Restricted current project state',href:'https://docs.google.com/document/d/13tFNFy0MX2ZbXRW3KlkgzsafitPKS8rrVJnmcqKFx1M/edit',note:'Google named-account access applies.'}]},{title:'5.2 · Source and publication gates',links:[archive]}]
 }
};
export const CHAPTERS=[['views','01','Views'],['boq','02','Quantities / BOQ'],['gantt','03','Programme / Gantt'],['packages','04','Packages / Site Modules'],['sources','05','Sources & records']];

/**
 * This is a deliberately EMPTY, FICTIONAL sample. It must never appear in
 * public project registries, finance metrics or approved engineering counts.
 * The ordinary site workspace shell is used so future uploads can follow
 * the same chapter, phase and package semantics.
 */
export const EMPTY_DUMMY_PROJECT={
 name:'Empty Template Project — FICTIONAL',company:'DEMONSTRATION ONLY · NO CLIENT / NO SITE',
 status:'TEMPLATE ONLY · NO DRAWINGS OR ENGINEERING',defaultLevel:'gf',synthetic:true,
 editions:[{id:'template-empty',name:'Template · Empty',basis:'No real project, source drawings or adopted revisions. This is a zero-data template, not a zero-quantity estimate.',
 levels:[level('gf','Unpopulated phase','No level dimensions, building geometry or engineering evidence are present.')]}],
 quantities:'No measurements, unit rates, takeoff, material schedule, BBS or BOQ have been admitted. Every quantity is unknown, never assumed zero.',
 programme:'No programme, activities, dependencies, dates or resource allocation exist for this fictional starter.',
 sourceGroups:[{title:'5.1 · Starter guides and memory posters',links:[{title:'Empty dummy project memory wall',href:'memory-wall/',note:'Guardrail instructions only; contains no real source file or person.'},
 {title:'CAD-wide publication memory wall',href:'../../memory-wall/pages/',note:'Actions, Pages, source safety and release checks; no dummy project data.'}]}]
};
export const ALL_WORKSPACE_PROJECTS={...PROJECTS,'example-empty':EMPTY_DUMMY_PROJECT};
