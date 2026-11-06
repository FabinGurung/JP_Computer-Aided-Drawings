// CAD-owned mathematical reference guardrails, not shop drawings or design approval.
// No generic stirrup hook, lap, bend deduction, stock length or cement dosage is assumed.
const positive=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw new RangeError(label+' requires a finite positive source value');return value;};
export const unknown=()=>null;
export function theoreticalSteelMass({diameterMm,cutLengthM,barCount=1,steelDensityKgM3=7850}){
 positive(diameterMm,'Diameter in mm');positive(cutLengthM,'Cut length in metres');
 positive(steelDensityKgM3,'Steel density in kg/m³');
 if(!Number.isInteger(barCount)||barCount<=0)throw new RangeError('Bar count must be a positive integer');
 const unitWeightKgPerM=Math.PI/4*Math.pow(diameterMm/1000,2)*steelDensityKgM3;
 return Object.freeze({
  theoreticalUnitMassKgPerM:unitWeightKgPerM,
  theoreticalTotalMassKg:unitWeightKgPerM*cutLengthM*barCount,
  sourceBarMarks:null,approvingEngineer:null,
  qualification:'MATHEMATICAL REFERENCE ONLY. Not a measured, procured or accepted BBS; approved geometry, hooks, laps, length, count and product variation remain separate.'
 });
}
export function simpleRectangularVolume({lengthM,widthM,heightM}){
 positive(lengthM,'Length in metres');positive(widthM,'Width in metres');positive(heightM,'Height in metres');
 return {grossM3:lengthM*widthM*heightM,netM3:null,qualification:'Gross rectangular mathematical volume only. No junction deduction, sloping section, reinforcement, opening or engineering acceptance.'};
}
export function cementBagsFromApprovedDosage({volumeM3,dosageKgPerM3,bagSizeKg,acceptedMixReference}){
 positive(volumeM3,'Concrete volume in m³');positive(dosageKgPerM3,'Dosage in kg/m³');positive(bagSizeKg,'Bag size in kg');
 if(typeof acceptedMixReference!=='string'||!acceptedMixReference.trim())return {bagCount:null,status:'BLOCKED: approved mix/dosage evidence missing'};
 return {theoreticalBagCount:volumeM3*dosageKgPerM3/bagSizeKg,status:'MATHEMATICAL REFERENCE / NOT AN ORDER',note:'No wastage, batching, tolerances or approved site release inferred.'};
}
export function stirrupOrDowelCutLengthWithoutAcceptedDetail(){
 return {cutLengthM:null,barWeightKg:null,status:'BLOCKED: engineer-accepted shape, cover, hook, bend, lap/development and member detail required'};
}
