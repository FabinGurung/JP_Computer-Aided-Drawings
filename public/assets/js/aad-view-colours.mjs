// Canonical AAD DISPLAY palette; not IFC material specifications or engineering semantics.
// Purpose: make hosted architectural windows recognizable in linked 2D/3D views.
// Sources: W3C WCAG 2.2 SC 1.4.11 (non-text contrast), Autodesk Revit view filters
// and buildingSMART IFC4 IfcSurfaceStyleShading (rendering only).
// Do not recolour project-owned source element properties or edit the model geometry.
export const AAD_VIEW_COLOURS=Object.freeze({
 wall:'#4D7889',column:'#40997D',beam:'#CEA365',slab:'#96BBA8',
 window:'#0B4F9E',door:'#C28D72',stair:'#9386BB',
 roof:'#9DB9B0',footing:'#926AAE',landing:'#A48CC9'
});
export const AAD_WINDOW_COLOURS=Object.freeze({
 planStroke:'#0B4F9E',
 planPane:'#66D4F5',
 frame3D:'#0B4F9E',
 glass3D:'#4EC3EB',
 glassOpacity:.72
});
export const AAD_VIEW_COLOUR_SOURCES=Object.freeze([
 'https://www.w3.org/TR/WCAG22/#non-text-contrast',
 'https://help.autodesk.com/cloudhelp/2026/ENU/Revit-DocumentPresent/files/GUID-87A63C25-99A6-428D-A0FF-112E4FC9C3D7.htm',
 'https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/schema/ifcpresentationappearanceresource/lexical/ifcsurfacestyleshading.htm'
]);
export function aadRelativeLuminance(hex){
 const n=hex.replace('#','');
 if(!/^[0-9a-fA-F]{6}$/.test(n))throw new TypeError('Expected #RRGGBB');
 const c=[0,2,4].map(i=>parseInt(n.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
export function aadContrastRatio(a,b){
 const x=aadRelativeLuminance(a),y=aadRelativeLuminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
