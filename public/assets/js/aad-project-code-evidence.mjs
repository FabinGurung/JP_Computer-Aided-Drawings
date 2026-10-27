import {checkProjectCodeFacts} from './aad-code-guards.mjs';
export function evaluateAADProjectCodeEvidence(manifest,registry){
 const issue=manifest.restrictions?.issueForConstruction===true||manifest.issueForConstruction===true;
 if(!manifest.jurisdiction){if(issue)throw Error('Construction issue requires verified jurisdiction and code evidence');return{status:'JURISDICTION_NOT_DECLARED',evidenceComplete:false};}
 const j=manifest.jurisdiction;
 if(j.country!=='Nepal'||j.municipality!=='Pokhara Metropolitan City'){
  if(issue)throw Error('No verified applicable code registry for this jurisdiction');return{status:'APPLICABLE_REGISTRY_REQUIRED',evidenceComplete:false};
 }
 if(!registry||registry.id!=='AAD-NP-PKR-CODES-001')throw Error('Missing Nepal/Pokhara code register');
 const e=manifest.engineeringEvidence||{},p=manifest.presentation||{},r=p.roofAccess||{},bounds=p.outerBounds;
 const facts={...e,coverageM2:e.verifiedGrossCoverageM2??(bounds?(bounds[2]-bounds[0])*(bounds[3]-bounds[1]):null),
  maxBayM:e.verifiedMaxStructuralBayM??null,stairWidthM:r.flightWidthM??null,treadM:r.treadM??null,riserM:r.riseM&&r.risers?r.riseM/r.risers:null,risersPerFlight:r.risers?r.risers/2:null,
  finishedStairHeadroomM:e.finishedMeasurementsVerified?e.finishedStairHeadroomM:null,finishedRoomHeadroomM:e.finishedMeasurementsVerified?e.finishedRoomHeadroomM:null};
 const proof=checkProjectCodeFacts(facts,registry);
 if(issue&&(!proof.evidenceComplete||j.parcelVerified!==true))throw Error('Construction issue blocked: code/site/engineering evidence incomplete');
 return{status:proof.evidenceComplete?'SUPPLIED_EVIDENCE_CHECKS_COMPLETE':'ENGINEERING_EVIDENCE_INCOMPLETE',...proof};
}
