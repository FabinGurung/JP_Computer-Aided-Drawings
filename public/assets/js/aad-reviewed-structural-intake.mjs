/* M26: reusable project-owned source intake for the shared building engine.
 * Every URL comes from the project manifest / governed stage adapter.
 * Original source snapshots are read-only. No project coordinates hardcoded.
 */
import {createSourceGroundFloorReview} from "./aad-source-ground-floor.mjs";
import {bridgeM70Plinth} from "./aad-m70-plinth-bridge.mjs";
import {reconcileM23Stages} from "./aad-m23-governed-stages.mjs";
import {deriveUserQAPreview} from "./aad-m24-user-reviewed-preview.mjs";
import {buildAADReviewedStructure} from "./aad-reviewed-structural-assembly.mjs";
const requireValue=(v,msg)=>{if(!v)throw Error("M26 source intake: "+msg);return v};
export async function loadAADReviewedStructure(manifest,manifestURL,fetchJSON){
 const spec=requireValue(manifest?.structuralReview,"project manifest lacks structuralReview");
 if(spec.schema!=="jp-cad://aad-structural-source-review/1"||
    spec.mode!=="OWNER_APPROVED_SOURCE_QA_GROUND_FLOOR_ONLY"||
    spec.constructionApproval!==false)
  throw Error("M26 invalid structural review mode or approval");
 if(typeof fetchJSON!=="function")throw Error("M26 source JSON fetcher required");
 const base=new URL("./",manifestURL),origin=base.origin;
 const load=async (path,from=base)=>{
  if(typeof path!=="string"||!path.endsWith(".json")||path.includes(".."))
   throw Error("Invalid structural reference path");
  const url=new URL(path,from);
  if(url.origin!==origin||!url.pathname.includes("/JP_Computer-Aided-Drawings/"))
   throw Error("Structural review reference is not same-origin project source");
  return await fetchJSON(url);
 };
 const [raw,stageLinks]=await Promise.all([
  load(spec.sourceLedger),load(spec.stageLinks)
 ]);
 if(stageLinks.projectId!==manifest.projectId)throw Error("M26 stage adapter project mismatch");
 const dxf=createSourceGroundFloorReview(raw);
 const m70links=stageLinks.additionalLayers?.find(x=>x.kind==="plinth-beam"&&x.stage==="M70");
 if(!m70links)throw Error("M26 frozen M70 not linked");
 const [stage70,meta70]=await Promise.all([
  load(m70links.dataPath),load(m70links.metadataPath)
 ]);
 const m70=bridgeM70Plinth(dxf,stage70,meta70);m70.grid=stage70.spatial_db.grid;
 const all={};
 for(const key of ["m60","m40","v03"]){
  const v=requireValue(stageLinks.governedStages?.[key],"missing "+key+" stage");
  const [stage,meta]=await Promise.all([load(v.dataPath),load(v.metadataPath)]);
  all[key]=stage;all[key+"Meta"]=meta;
 }
 const m23=reconcileM23Stages(dxf,m70,all.m60,all.m40,all.v03,
  {m60:all.m60Meta,m40:all.m40Meta,v03:all.v03Meta});
 const qa=await load(spec.userQA);
 const approval=await load(spec.userApproval);
 const reviewed=deriveUserQAPreview(dxf,m70,m23,qa,approval);
 if(!reviewed.userMessageApproval)throw Error("M26 user message authorization missing");
 const ownerVerification=spec.ownerVerification?await load(spec.ownerVerification):null;
 if(ownerVerification&&(ownerVerification.schema!=="jp-cad://aad-owner-verification/1"||
  ownerVerification.projectId!==manifest.projectId||
  ownerVerification.previousApprovalEventId!==reviewed.userMessageApproval.eventId||
  ownerVerification.ownerDecisionStatus!=="VERIFIED_AND_APPROVED_NO_REAPPROVAL_REQUEST"||
  ownerVerification.constructionApproval!==false||
  ownerVerification.independentEngineeringCalculationEvidenceAttached!==false))
   throw Error("M28 owner verification source chain invalid");
 const assembly=buildAADReviewedStructure(manifest,reviewed,m70);
 return{...assembly,approvalEventId:reviewed.userMessageApproval.eventId,
  userAuthorization:ownerVerification?"M28_OWNER_VERIFIED":assembly.userAuthorization,
  ownerVerificationEventId:ownerVerification?.eventId||null,
  sourceFiles:{sourceLedger:spec.sourceLedger,stageLinks:spec.stageLinks,
   userQA:spec.userQA,userApproval:spec.userApproval,
   ...(ownerVerification?{ownerVerification:spec.ownerVerification}:{})},
  sourceCounts:reviewed.counts,discrepancies:reviewed.discrepancies};
}
