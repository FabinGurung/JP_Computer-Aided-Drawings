/* AAD informal design-brief intake. No LLM, OCR, audio ASR or code validation.
 * Client-side / Node deterministic extraction; ChatGPT may interpret images,
 * voice transcripts, and requested room programmes BEFORE making a design spec.
 * Never publishes, grants permission or manufactures site survey evidence.
 */
const m3=x=>Math.round(x*1000)/1000;
const numbers={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
 twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,
 hundred:100};
const readable=word=>numbers[word.toLowerCase()]??Number(word);
const unit=s=>/^(?:'|ft|feet|foot)$/i.test(s)?"ft":"m";
export function prepareAADDesignBrief(input){
 const channel=input?.channel;
 if(!["natural-language","voice-transcript","hand-sketch","dwg","dxf","skp","image","pdf","drawing"].includes(channel))
  throw Error("Unsupported AAD brief intake channel");
 const text=String(input?.text??"").trim();
 if(!text||text.length>9000)throw Error("AAD brief requires a concise transcription or description (max 9000 characters)");
 const sourceStatus=["natural-language","voice-transcript","hand-sketch"].includes(channel)?
  "USER_REPORTED_NOT_SURVEYED":"SOURCE_DESCRIBED_NOT_INDEPENDENTLY_VERIFIED";
 const token="(?:\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";
 const re=new RegExp("\\b("+token+")\\s*(feet|foot|ft|'|m|metres|meters)?\\s*(?:by|x|×)\\s*("+token+")\\s*(feet|foot|ft|'|m|metres|meters)?(?=\\W|$)","i");
 // Apostrophe is sometimes attached directly to the first number.
 const match=text.match(re);
 let plot=null;
 if(match){
  const a=readable(match[1]),b=readable(match[3]),u1=match[2]?unit(match[2]):null,
   u2=match[4]?unit(match[4]):null;
  if(Number.isFinite(a)&&Number.isFinite(b)&&a>0&&b>0&&a<=500&&b<=500){
   if(u1&&u2&&u1!==u2)throw Error("Mixed dimension units need explicit conversion review");
   const usedUnit=u1||u2||null,mult=usedUnit==="ft"?.3048:1;
   plot={widthM:usedUnit?m3(a*mult):null,lengthM:usedUnit?m3(b*mult):null,
    areaM2:usedUnit?m3(a*b*mult*mult):null,
    original:{width:a,length:b,unit:usedUnit||"UNSPECIFIED"},
    status:usedUnit?sourceStatus:"NEEDS_UNIT_CONFIRMATION"};
  }
 }
 const people=text.match(/(?:family\\s+of|for|household\\s+of)\\s*(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)\\s*(?:people|persons|members)?/i);
 const occupants=people?readable(people[1]):null;
 const city=/\\bpokhara\\b/i.test(text)?"Pokhara, Nepal":null;
 const explicitBedrooms=text.match(/(\\d+)\\s*(?:bedrooms?|beds?)\\b/i);
 const bedrooms=explicitBedrooms?Number(explicitBedrooms[1]):null;
 const wantsStoreys=/(?:two|2)[ -]?(?:storeys|stories|floors)/i.test(text)?2:
  /(?:single|one|1)[ -]?(?:storey|story|floor)/i.test(text)?1:null;
 const suggestedBedrooms=bedrooms||((occupants??0)>=5?3:null);
 const programme=suggestedBedrooms?[
  {space:"Bedroom",targetCount:suggestedBedrooms,status:bedrooms?"USER_REQUESTED":"AI_SUGGESTION_REQUIRES_REVIEW"},
  {space:"Living room",targetCount:1,status:"AI_SUGGESTION_REQUIRES_REVIEW"},
  {space:"Kitchen",targetCount:1,status:"AI_SUGGESTION_REQUIRES_REVIEW"},
  {space:"Dining area",targetCount:1,status:"AI_SUGGESTION_REQUIRES_REVIEW"},
  {space:"Bathroom / toilet",targetCount:2,status:"AI_SUGGESTION_REQUIRES_REVIEW"},
  {space:"Utility / laundry",targetCount:1,status:"AI_SUGGESTION_REQUIRES_REVIEW"}
 ]:[];
 const issues=[];
 if(!plot)issues.push("SITE_DIMENSIONS_NOT_EXTRACTED");
 else if(!plot.original.unit||plot.original.unit==="UNSPECIFIED")issues.push("UNITS_NEED_CONFIRMATION");
 if(!city)issues.push("LOCATION_NEEDS_CONFIRMATION");
 if(occupants===null)issues.push("OCCUPANCY_NOT_SPECIFIED");
 issues.push("ROAD_EDGE_AND_ORIENTATION_NOT_VERIFIED","SITE_BOUNDARIES_AND_SETBACKS_NOT_VERIFIED",
  "ACCESS_VENTILATION_AND_PLUMBING_NOT_DESIGNED","ROOM_SIZES_TOPOLOGY_AND_STAIR_UNVERIFIED");
 return{
  schema:"jp-cad://aad-design-brief/1",channel,
  evidence:{kind:channel,status:sourceStatus,reference:input.reference||"User-provided description / unverified transcription"},
  extracted:{plot,location:city,occupants,requestedStoreys:wantsStoreys,requestedBedrooms:bedrooms},
  suggestedProgramme:programme,unresolved:issues,
  geometryAuthority:"CONCEPTUAL_INPUT_ONLY_NOT_SURVEYED",
  buildingCodeCompliance:"NOT_ASSESSED",publicationApproved:false,
  nextStep:"AI design author must resolve constraints and create source-tagged coordinates; explicit owner approval required before publishing"
 };
}
