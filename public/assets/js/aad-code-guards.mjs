/* Jurisdiction-aware checks. Unknown evidence can never become a compliance pass. */
export function checkProjectCodeFacts(facts,registry){
 const out=[],rule=id=>{const r=registry.rules.find(r=>r.id===id);if(!r)throw Error('Unknown rule '+id);return r;};
 const add=(id,value,pass,note)=>out.push({ruleId:id,value,status:value===null||value===undefined?'EVIDENCE_REQUIRED':typeof value==='number'&&(!Number.isFinite(value)||value<=0)?'INPUT_INVALID':pass?'PASS':'DOES_NOT_MEET',note,source:rule(id).source,clause:rule(id).clause,required:!id.startsWith('NP-205-')||facts.structuralRoute!=='SITE_SPECIFIC_NBC105'});
 const p=registry.parameters;
 add('NP-205-COVERAGE',facts.coverageM2,Number.isFinite(facts.coverageM2)&&facts.coverageM2<=p.nbc205.coverageMaxM2,'Eligibility for the ready-to-use route only; a larger building may use project-specific engineering.');
 add('NP-205-BAY',facts.maxBayM,Number.isFinite(facts.maxBayM)&&facts.maxBayM<=p.nbc205.maxBayM,'Structural bays, not room dimensions.');
 add('NP-105-SOIL',facts.soilClassification,facts.soilClassification?.evidenceType==='SITE_TEST','Site subsoil class cannot be inferred from ward number or a neighbouring project.');
 add('NP-STRUCTURAL-DESIGN',facts.structuralDesignEvidence,facts.structuralDesignEvidence?.verifiedByOwnerRepository===true&&Boolean(facts.structuralDesignEvidence?.calculationHash)&&Boolean(facts.structuralDesignEvidence?.sectionAndFoundationRecord),'A model display envelope is not a calculated member or footing section.');
 add('NP-206-STAIR-WIDTH',facts.stairWidthM,facts.stairWidthM>=p.nbc206.residentialExitWidthMinM,'General residence; check occupant-load width separately.');
 add('NP-206-TREAD',facts.treadM,facts.treadM>=p.nbc206.treadMinM,'Main residential stair.');
 add('NP-206-RISER',facts.riserM,facts.riserM<=p.nbc206.riserMaxM,'Main residential stair.');
 add('NP-206-RISERS-FLIGHT',facts.risersPerFlight,facts.risersPerFlight<=p.nbc206.risersPerFlightMax,'Main residential stair.');
 add('NP-206-STAIR-HEAD',facts.finishedStairHeadroomM,facts.finishedStairHeadroomM>=p.nbc206.stairHeadroomMinM,'Includes actual beams, waist slab, finishes and services.');
 add('NP-206-ROOM-HEAD',facts.finishedRoomHeadroomM,facts.finishedRoomHeadroomM>=p.nbc206.roomHeightMinM,'Lowest ceiling/slab; under-beam clearance has its own 2.1 m criterion.');
 add('NP-208-WATER-SEPARATION',facts.waterWasteClearanceM,facts.waterWasteClearanceM>=p.nbc208.undergroundWaterWasteClearanceMinM,'Underground potable water tank separation; do not apply this as a building-to-septic setback.');
 add('NP-UWSSP-PERCOLATION',facts.percolationLPerM2Day,Number.isFinite(facts.percolationLPerM2Day)&&facts.percolationLPerM2Day>0,'A measured rate, seasonal groundwater and site hazard assessment are required before soak-pit selection.');
 add('PKR-CURRENT-AMENDMENT',facts.currentMunicipalClausesVerified,facts.currentMunicipalClausesVerified===true,'Read the current amendment, cadastral zoning/ROW and parcel conditions.');
 add('PKR-PERMIT',facts.permit,facts.permit?.issuer==='Pokhara Metropolitan City'&&Boolean(facts.permit?.reference),'Owner approval and a geometry test are not a municipal permit.');
 return{checks:out,evidenceComplete:out.filter(x=>x.required).every(x=>x.status==='PASS'),municipalAcceptanceReferencePresent:out.find(x=>x.ruleId==='PKR-PERMIT').status==='PASS',note:'Checks supplied evidence fields; does not independently authenticate a permit or certify engineering.'};
}
export function septicSizing({people,litresPerPersonDay=100,returnFraction=1,cleaningYears=2},registry){
 if(!Number.isInteger(people)||people<1||!Number.isFinite(litresPerPersonDay)||litresPerPersonDay<=0||!(returnFraction>0&&returnFraction<=1))throw Error('Positive occupancy and water demand are required');
 const p=registry.parameters.uwssp,storage=p.sludgeStorageM3PerPerson[String(cleaningYears)];
 if(storage===undefined)throw Error('Use a supported desludging period');
 const dailyM3=people*litresPerPersonDay*returnFraction/1000;
 return{people,planningDemandLPerDay:dailyM3*1000,retentionM3:dailyM3*p.detentionDays,digestionM3:p.digestionM3PerPerson*people,sludgeStorageM3:storage*people,
  requiredLiquidVolumeM3:dailyM3*p.detentionDays+(p.digestionM3PerPerson+storage)*people,assumptions:{litresPerPersonDay,returnFraction,cleaningYears},constructionReleased:false};
}
export function soakDiameter({litresPerDay,effectiveDepthM,measuredInfiltrationLPerM2Day},registry){
 if(![litresPerDay,effectiveDepthM,measuredInfiltrationLPerM2Day].every(x=>Number.isFinite(x)&&x>0))return{status:'EVIDENCE_REQUIRED',diameterM:null,constructionReleased:false};
 const p=registry.parameters.uwssp,d=litresPerDay/(Math.PI*effectiveDepthM*measuredInfiltrationLPerM2Day);
 return{status:d>p.soakMaxDiameterM?'MULTIPLE_PITS_OR_DIFFERENT_TREATMENT_REQUIRED':'HYDRAULIC_SIZE_ONLY',diameterM:Math.max(p.soakMinDiameterM,d),constructionReleased:false};
}
export function checkOutsidePlinth({rectangle,plot,plinth,obstacles=[]}){
 const positive=rectangle.length===4&&rectangle.every(Number.isFinite)&&rectangle[2]>rectangle[0]&&rectangle[3]>rectangle[1];
 const inside=positive&&rectangle[0]>=plot[0]&&rectangle[1]>=plot[1]&&rectangle[2]<=plot[2]&&rectangle[3]<=plot[3];
 const overlap=(a,b)=>Math.min(a[2],b[2])>Math.max(a[0],b[0])&&Math.min(a[3],b[3])>Math.max(a[1],b[1]);
 return{insidePlot:inside,outsidePlinth:positive&&!overlap(rectangle,plinth),obstacleClashes:obstacles.filter(x=>overlap(rectangle,x.rectangle)).map(x=>x.id),constructionReleased:false};
}
