/**
 * Harisharan upper-floor source reconciliation R000001.
 * Takes report table and architectural floors as separate pieces of evidence.
 * This is NOT a capacity design, IFC, BBS or procurement calculation.
 */
export const STATUS='SOURCE_REPORTED_SCENARIO_NOT_FOR_CONSTRUCTION';
export const DENSITY_STEEL_KG_M3=7850;
export const BAR_FORMULA='kg/m = count × (π/4) × (diameter_mm/1000)² × 7850';
const round=(x,n=6)=>Number(x.toFixed(n));
export function readBars(label){
 if(typeof label!=='string')throw Error('No source notation');
 const groups=[...label.matchAll(/(\d+)#-(\d+)\s*mm/g)];
 if(!groups.length)throw Error('Unknown report bar notation: '+label);
 const leftover=label.replace(/(\d+)#-(\d+)\s*mm/g,'').replace(/[\s&]/g,'');
 if(leftover.length)throw Error('Unrecognized token in report bar notation: '+label);
 const bars=groups.map((m)=>({count:Number(m[1]),diameterMm:Number(m[2])}));
 if(bars.some(x=>x.count<1||x.count>30||![12,16,20,25,28,32,36,40].includes(x.diameterMm)))throw Error('Unadmitted report bar category');
 return bars;
}
export const steelMassPerMetre=(bars)=>bars.reduce((sum,b)=>sum+b.count*(Math.PI/4)*Math.pow(b.diameterMm/1000,2)*DENSITY_STEEL_KG_M3,0);
export const quoteCsv=(x)=>{
 let s=String(x??'');
 if(/^[=+@-]/.test(s)&&!/^[-+]?\d+(\.\d+)?$/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
};
export function csv(rows,fields){return [fields.map(quoteCsv).join(','),...rows.map(r=>fields.map(f=>quoteCsv(r[f])).join(','))].join('\r\n')+'\r\n'}
export const EXPORT_FIELDS=['recordId','grid','columnType','floor','sourceScheduleField','barNotation','longitudinalBars','barAreaMm2','kgPerVerticalMetre','scenarioLengthM','scenarioKg','grossConcreteM3','approval','sourceId','sourceStatus'];
export function computeUpperFloorReview(input,{heightScenarioM}={}){
 if(input?.schema!=='jp-cad://harisharan-upper-floor-source-ledger/1'||input.projectId!=='INTAKE-20260826-HARISHARAN'||input.issueForConstruction!==false)throw Error('Untrusted project source');
 if(input.records.length!==18||input.architecturalFloorIdentifiers.length!==5)throw Error('Unexpected count or floor scope');
 const h=heightScenarioM??input.reportStoreyHeightScenarioM;
 if(typeof h!=='number'||!Number.isFinite(h)||h<2||h>4.5)throw Error('Scenario segment length outside bounded study range');
 const grids=new Set(input.records.map(r=>r.grid));
 if(grids.size!==18||!grids.has('A1')||!grids.has('F1')||!grids.has('B4'))throw Error('Source grid register changed');
 const entries=input.architecturalFloorIdentifiers.flatMap(floor=>input.records.map(record=>{
  if(record.sectionMm.join('x')!=='450x450')throw Error('Unknown column section: '+record.grid);
  const b=readBars(record.reportBarNotation[floor.scheduleField]);
  const kgM=steelMassPerMetre(b),area=b.reduce((n,x)=>n+x.count*Math.PI*Math.pow(x.diameterMm,2)/4,0);
  return Object.freeze({
   recordId:'UF-'+floor.id.toUpperCase()+'-'+record.grid,
   grid:record.grid,columnType:record.type,floor:floor.title,floorId:floor.id,
   sourceScheduleField:floor.scheduleField,
   barNotation:record.reportBarNotation[floor.scheduleField],
   longitudinalBars:b.reduce((n,x)=>n+x.count,0),
   barFamilies:b,
   barAreaMm2:round(area,3),
   kgPerVerticalMetre:round(kgM,6),
   scenarioLengthM:h,scenarioKg:round(kgM*h,5),
   grossConcreteM3:round((record.sectionMm[0]/1000)*(record.sectionMm[1]/1000)*h,6),
   approvedConcreteM3:null,approvedSteelKg:null,
   tieSteelKg:null,lapSteelKg:null,approvedBbs:null,
   approval:false,sourceId:input.basis.structuralReport.sourceId,sourceStatus:STATUS
  });
 }));
 const totals=input.architecturalFloorIdentifiers.map(floor=>{
  const arr=entries.filter(e=>e.floorId===floor.id);
  return {
   floorId:floor.id,floor:floor.title,
   sourceCategory:floor.scheduleField,reportRows:arr.length,
   theoreticalLongitudinalKgPerVerticalMetre:round(arr.reduce((a,e)=>a+e.kgPerVerticalMetre,0),4),
   scenarioLongitudinalKg:round(arr.reduce((a,e)=>a+e.scenarioKg,0),3),
   grossColumnPrismM3:round(arr.reduce((a,e)=>a+e.grossConcreteM3,0),5),
   status:'COMPARISON_SCENARIO_ONLY',approvedSteelKg:null,approvedConcreteM3:null
  };
 });
 return Object.freeze({
  schema:'jp-cad://harisharan-upper-floor-computed-review/1',
  sourceRevision:input.revision,projectId:input.projectId,
  sourceFingerprint:input.basis.structuralReport.sha256,
  approval:false,issueForConstruction:false,status:STATUS,
  heightScenarioM:h,entries,perFloor:totals,conflicts:input.unresolved,
  totals:{referenceLongitudinalKgPerMAllFiveCategories:round(totals.reduce((a,x)=>a+x.theoreticalLongitudinalKgPerVerticalMetre,0),4),
    scenarioLongitudinalKg:round(totals.reduce((a,x)=>a+x.scenarioLongitudinalKg,0),2),
    scenarioGrossColumnPrismsM3:round(totals.reduce((a,x)=>a+x.grossColumnPrismM3,0),5),
    approvedSteelKg:null,approvedConcreteM3:null,tiesKg:null,lapKg:null,approvedProcurementKg:null},
  limitations:input.limitations
 });
}
