import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
// Stage this builder in a temporary directory linked to the Codex primary runtime dependencies.
// Run with that runtime (artifact-tool), not the website Node dependencies.
const out=process.argv[3];if(!out||!process.argv[2])throw Error('Usage: primary-node ashok-v2-workbook.mjs MANIFEST_JSON OUTPUT_DIR');
const model=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const w=Workbook.create(),s=w.worksheets.add('Coordination'),r=w.worksheets.add('MEP routes');
s.getRange('A2').values=[['Ashok Adhikari | v2 coordination template']];
s.getRange('A4:H4').values=[['Asset','Plot X mm','Plot Y mm','Width mm','Length mm','Building X mm','Building Y mm','Siting result']];
s.getRange('A5:E6').values=model.services.assets.map(a=>[a.id,a.xMm,a.yMm,a.widthMm,a.lengthMm]);
for(const row of [5,6]){
 s.getRange('F'+row).formulas=[['=B'+row+'-1944']];s.getRange('G'+row).formulas=[['=C'+row+'-2000']];
 s.getRange('H'+row).formulas=[['=IF(OR(B'+row+'-D'+row+'/2<0,B'+row+'+D'+row+'/2>9144,C'+row+'-E'+row+'/2<0,C'+row+'+E'+row+'/2>18288),"Outside plot",IF(AND(B'+row+'+D'+row+'/2>1944,C'+row+'+E'+row+'/2>2000,C'+row+'-E'+row+'/2<16400),"House outline clash",IF(AND(B'+row+'+D'+row+'/2>127,B'+row+'-D'+row+'/2<1327,C'+row+'+E'+row+'/2>16863,C'+row+'-E'+row+'/2<18263),"Outside WC clash","No outline clash")))']];
}
s.getRange('A9:B19').values=[['Hydraulic planning inputs',null],['Occupants (assumed)',8],['L/person/day',100],['Design flow L/day',null],['Retention days',1],['Retention m3',null],['Digestion m3',null],['Two-year sludge m3',null],['Required liquid m3',null],['Net provided liquid m3',null],['Measured infiltration L/m2/day',null]];
for(const [cell,f] of Object.entries({B12:'=B10*B11',B14:'=B12*B13/1000',B15:'=0.0425*B10',B16:'=0.0708*B10',B17:'=B14+B15+B16'}))s.getRange(cell).formulas=[[f]];
s.getRange('A20:B22').values=[['Effective soak depth m',1.5],['Hydraulic soak diameter m',null],['Release status','Coordination only; no construction issue']];
s.getRange('B21').formulas=[['=IF(OR(B19="",B19<=0),"Measure infiltration",B12/(PI()*B20*B19))']];
s.getRange('D10').values=[['Sources and assumptions']];
s.getRange('D11:H15').values=[['User coordinates',null,null,null,'Plot front-left origin; house offsets 1944 / 2000 mm'],['NBC208 B1.3-B1.8',null,null,null,model.services.sources[0].url],['UWSSP 8.4.4',null,null,null,model.services.sources[1].url],['Revit systems workflow',null,null,null,model.services.sources[2].url],['Soak permeability',null,null,null,'Blank until measured; no assumed soil capacity']];
r.getRange('A2:F2').values=[['Route ID','System','Name','Nominal diameter mm','Connections','Source / scope']];
r.getRange('A3:F'+(model.services.routes.length+2)).values=model.services.routes.map(x=>[x.id,x.system,x.name,x.diameterMm,x.fixtureIds.join(', '),x.diameterBasis]);
for(const sh of [s,r]){sh.showGridLines=false;sh.getUsedRange().format.font={name:'Arial',size:11};sh.getUsedRange().format.rowHeight=28;sh.getUsedRange().format.columnWidth=20;}
s.getRange('A2').format.font={name:'Arial',size:16,bold:true};s.getRange('A4:H4').format={fill:'#263E56',font:{bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:42};s.getRange('B5:E6').format.fill='#FFF1BF';s.getRange('B10:B11').format.fill='#FFF1BF';s.getRange('B19:B20').format.fill='#FFF1BF';s.getRange('H4:H22').format.columnWidth=42;s.getRange('A9:A22').format.columnWidth=35;s.getRange('H5:H6').format.wrapText=true;s.getRange('H5:H6').format.rowHeight=38;s.getRange('B14:B18').setNumberFormat('0.0000');s.getRange('D11:H15').format.wrapText=true;s.getRange('D11:H15').format.rowHeight=55;s.getRange('H5:H6').conditionalFormats.add('containsText',{text:'clash',format:{fill:'#FBE0DE',font:{color:'#9C2626',bold:true}}});
r.getRange('A2:F2').format={fill:'#263E56',font:{bold:true,color:'#FFFFFF'}};r.getRange('A3:F'+(model.services.routes.length+2)).format.wrapText=true;r.getUsedRange().format.rowHeight=60;r.getRange('A:A').format.columnWidth=33;r.getRange('C:C').format.columnWidth=38;r.getRange('F:F').format.columnWidth=55;r.freezePanes.freezeRows(2);
s.getRange('H6').formulas=[['=IF(AND(B6+D6/2>1944,C6+E6/2>2000,C6-E6/2<16400),IF(AND(B6+D6/2>127,B6-D6/2<1327,C6+E6/2>16863,C6-E6/2<18263),"Envelope + outside WC clash","House envelope clash"),IF(AND(B6+D6/2>127,B6-D6/2<1327,C6+E6/2>16863,C6-E6/2<18263),"Outside WC clash","No outline clash"))']];
for(const [row,url,label] of [[12,model.services.sources[0].url,'NBC208 official PDF'],[13,model.services.sources[1].url,'UWSSP official PDF'],[14,model.services.sources[2].url,'Autodesk plumbing reference']])s.getRange('H'+row).formulas=[['=HYPERLINK("'+url+'","'+label+'")']];
s.getRange('A4:H22').format.verticalAlignment='center';r.getUsedRange().format.verticalAlignment='center';s.getRange('A4:H4').format.horizontalAlignment='center';r.getRange('A2:F2').format.horizontalAlignment='center';s.getRange('B22').format.font={name:'Arial',size:11};
s.getRange('B10').values=[[10]];console.log('INPUT_CHANGE_TEST', (await w.inspect({kind:'table',range:'Coordination!B17',include:'values',maxChars:500})).ndjson);s.getRange('B10').values=[[8]];
s.getRange('A24:B25').values=[['Gross liquid envelope m3',2],['Baffle displacement m3',0.09775]];s.getRange('B18').formulas=[['=B24-B25']];s.getRange('B24:B25').setNumberFormat('0.00000');s.getRange('A24:B25').format.rowHeight=28;s.getRange('B24:B25').format.fill='#FFF1BF';
w.recalculate();
console.log((await w.inspect({kind:'table',range:'Coordination!A5:H6',include:'values,formulas',tableMaxRows:2,tableMaxCols:8,maxChars:2200})).ndjson);
console.log((await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
await fs.mkdir(out,{recursive:true});
for(const [sheetName,range] of [['Coordination','A2:H25'],['MEP routes','A2:F8']]){const b=await w.render({sheetName,range,scale:1.4,format:'png'});await fs.writeFile(out+'/'+sheetName.replaceAll(' ','_')+'.png',new Uint8Array(await b.arrayBuffer()));}
await (await SpreadsheetFile.exportXlsx(w)).save(out+'/Ashok_v2_Coordination_Template.xlsx');
