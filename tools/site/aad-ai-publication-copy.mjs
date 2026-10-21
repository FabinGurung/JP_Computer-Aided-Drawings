/* Shared descriptions for AI-to-AAD-generated project launchers.
 * Match the explicit publication mode; never call an approved real design
 * "synthetic" and never imply engineering or survey approval.
 */
export function getAADPublicationCopy(mode){
 if(mode==="synthetic-demo")return{
  overview:"Synthetic AI-authored software test, rendered by the canonical shared AAD engine. Not a real client's property.",
  overviewHold:"SYNTHETIC TEST · NOT SURVEYED · ENGINEERING HOLD · NOT FOR CONSTRUCTION",
  studioHold:"Synthetic AI-authored test geometry · NOT SURVEYED · ENGINEERING HOLD · NOT FOR CONSTRUCTION"
 };
 if(mode==="owner-approved-public")return{
  overview:"AI-authored conceptual building data marked owner-approved for public publication, rendered by the canonical shared AAD engine. Source dimensions and geometry have not been independently verified.",
  overviewHold:"OWNER-APPROVED PUBLICATION · GEOMETRY UNVERIFIED · ENGINEERING HOLD · NOT FOR CONSTRUCTION",
  studioHold:"Owner-approved public AI-authored concept · GEOMETRY UNVERIFIED · ENGINEERING HOLD · NOT FOR CONSTRUCTION"
 };
 throw Error("Unsupported AAD project publication mode: "+String(mode));
}
