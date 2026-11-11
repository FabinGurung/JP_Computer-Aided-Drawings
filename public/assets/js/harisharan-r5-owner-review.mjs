/**
 * Harisharan R5 owner-direction arithmetic.
 * No footing geometry, L-shaped dowel, tank cage, soil or roof is construction approved.
 * This module is independent of existing released R0 and R2 BOQ engines.
 */
const r=(value,dp=4)=>Number(value.toFixed(dp));
export const R5_STATUS='OWNER_SCENARIO_ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION';
export function rejectOrCheckSource(source){
 if(source?.schema!=='jp-cad://harisharan-r5-source-review/1'
 ||source.projectId!=='INTAKE-20260826-HARISHARAN'
 ||source.issueForConstruction!==false
 ||source.approvedByEngineer!==false)throw Error('Unadmitted engineering source or approval');
 if(source.footings.families.length!==2||source.ownerDirections.length!==9)throw Error('Wrong source scope');
 if(source.footings.families[0].count!==12||source.footings.families[1].count!==6)throw Error('Footing counts changed');
 if(source.tank.hasSourceRebarSchedule!==true)throw Error('Original tank design omitted');
 return true;
}
/**
 * Lower rectangular prism + upper linearly narrowing rectangular prismatoid.
 * Assumes BOTH width and length interpolate linearly with height. This formula
 * permits distinct top and base aspect ratios and is not the footing drawing
 * without a dimensioned top plateau and slope breaks.
 */
export function taperedFootingGrossM3({baseWm,baseLm,topWm,topLm,edgeHeightM,totalThicknessM}){
 const x=[baseWm,baseLm,topWm,topLm,edgeHeightM,totalThicknessM];
 if(x.some(v=>!Number.isFinite(v)||v<=0)||topWm>baseWm||topLm>baseLm||edgeHeightM>totalThicknessM)throw Error('Invalid footing scenario');
 const slope=totalThicknessM-edgeHeightM;
 const lower=baseWm*baseLm*edgeHeightM;
 const upper=slope*(baseWm*baseLm/3 + (baseWm*topLm+baseLm*topWm)/6 + topWm*topLm/3);
 return lower+upper;
}
export function computeFootingSensitivity(source){
 rejectOrCheckSource(source);
 const {families,comparisonInputs}=source.footings;
 const fullPrism=families.reduce((sum,foot)=>sum+foot.count*(foot.baseMm[0]/1000)*(foot.baseMm[1]/1000)*foot.sourceCentralThicknessMm/1000,0);
 const cases=[];
 for(const e of comparisonInputs.edgeHeightsMm)for(const p of comparisonInputs.topPlateauSideMm){
  if(e<source.footings.known.minimumEdgeThicknessCodeReferenceMm)throw Error('Below reference minimum edge');
  const entries=families.map(f=>{
   const total=taperedFootingGrossM3({
    baseWm:f.baseMm[0]/1000,baseLm:f.baseMm[1]/1000,
    topWm:p/1000,topLm:p/1000,
    edgeHeightM:e/1000,totalThicknessM:f.sourceCentralThicknessMm/1000
   });
   return {mark:f.mark,count:f.count,unitGrossM3:r(total,6),familyGrossM3:r(total*f.count,5)};
  });
  const value=entries.reduce((sum,x)=>sum+x.familyGrossM3,0);
  cases.push({edgeHeightMm:e,slopedRiseMm:600-e,topPlateauSideMm:p,
   entries,totalGrossM3:r(value,4),differenceFromFullPrismM3:r(fullPrism-value,4),
   status:R5_STATUS});
 }
 return {fullPrismGrossM3:r(fullPrism,4),cases,
 recommendedScenario:cases.find(x=>x.edgeHeightMm===comparisonInputs.preferredResearchCase.edgeHeightMm&&x.topPlateauSideMm===comparisonInputs.preferredResearchCase.topPlateauSideMm),
 approvedConcreteM3:null,actualTopPlateauMm:null,actualEdgeThicknessMm:null,constructionApproval:false};
}
export function computeDowelStudy(source){
 rejectOrCheckSource(source);
 const d=source.dowels;
 const tau=d.materialScenario.bondStressDeformedTensionMPa;
 const stress=d.materialScenario.fullyStressedLimitStateTensionMPa;
 const vertical=d.verticalReview.availableStraightMm;
 if(tau!==2.24||stress!==435||vertical!==525)throw Error('Unexpected M25/Fe500 study setup');
 return d.barDiameterMm.map(phi=>{
  const development=phi*stress/(4*tau);
  const assumedBendValue=phi*d.bendResearch.nominal90DegreeAnchorageValueDiameters;
  return {diameterMm:phi,
   referenceLdTensionMm:r(development,1),owner50dMm:50*phi,
   hypotheticalStraightVerticalInsideFootingMm:vertical,
   verticalShortfallBeforeBendEquivalentMm:r(Math.max(0,development-vertical),1),
   hypotheticalRemainingAfter90DegreeBendValueMm:r(Math.max(0,development-vertical-assumedBendValue),1),
   permittedCutTailMm:null,approvedLapMm:null,approvedAnchorageMm:null,
   status:R5_STATUS};
 });
}
export function computeTankStudy(source){
 rejectOrCheckSource(source);
 const t=source.tank;
 const current=t.originalReportedInternalPlanM[0]*t.originalReportedInternalPlanM[1]*t.originalReportedWaterDepthM;
 if(Math.abs(current-t.originalNominalUsableM3)>.001)throw Error('Old tank source mismatch');
 const cases=t.freeboardResearchScenariosM.map(freeboard=>{
  const waterDepth=t.minimumDepthM-freeboard;
  if(waterDepth<=0)throw Error('Unusable tank depth');
  const area=t.ownerTargetM3/waterDepth;
  return {internalTotalDepthM:t.minimumDepthM,freeboardScenarioM:freeboard,
   waterDepthScenarioM:r(waterDepth,4),requiredInternalWaterPlanM2:r(area,4),
   equivalentSquareInternalSideM:r(Math.sqrt(area),4),
   otherSideForFixed2p7M:r(area/t.illustrationFixedDimensionM,4),
   usableLitresTarget:t.ownerTargetM3*1000,status:R5_STATUS};
 });
 return {originalPlanM:t.originalReportedInternalPlanM,originalNominalWaterDepthM:t.originalReportedWaterDepthM,
 originalNominalCapacityLitres:r(current*1000,1),targetLitres:t.ownerTargetM3*1000,
 capacityShortfallLitres:r((t.ownerTargetM3-current)*1000,1),
 floorAndWallRebarQuantities:null,approvedCapacityLitres:null,cases,
 status:R5_STATUS};
}
export function computeAll(source){
 return {schema:'jp-cad://harisharan-r5-computed-research/1',sourceRevision:source.revision,
  projectId:source.projectId,constructionApproval:false,readOnly:true,
  footing:computeFootingSensitivity(source),
  dowels:computeDowelStudy(source),
  tank:computeTankStudy(source),roof:source.roof,
  decisions:source.ownerDirections,codeReferences:source.codeReferences,
  sourceFingerprints:source.sources.map(x=>({id:x.id,sha256:x.sha256}))};
}
