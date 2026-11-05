/** Source interpretation, not a structural design or fabrication BBS. Units: m, kg. */
export const unitMass = diameterMm => diameterMm ** 2 / 162;
export function assembly(source) {
 const d=source.dimensions,nodes=[],plinth=[],straps=[];
 for(const r of source.rows){
  for(const [axis,x] of [['A',0],['B',d.leftBay],[r.rightGrid,d.leftBay+r.rightBay]]){
   const type=axis==='B'?(r.row===4?'C1':[3,5].includes(r.row)?'C2':'C3'):(axis==='A'&&[2,3,4,5].includes(r.row)?'C4':'C3');
   nodes.push({id:axis+r.row,x,z:r.z,type,footing:axis==='B'?'F1':'F2',row:r.row,side:axis==='A'?'left':axis==='B'?'middle':'right'});
  }
 }
 const beam=(a,b,id,kind)=>({id,kind,a,b,length:Math.hypot(b.x-a.x,b.z-a.z)});
 for(const r of source.rows){const row=nodes.filter(n=>n.row===r.row);for(let i=0;i<2;i++){plinth.push(beam(row[i],row[i+1],`PB-${row[i].id}-${row[i+1].id}`,'plinth'));straps.push(beam(row[i],row[i+1],`ST-${row[i].id}-${row[i+1].id}`,'strap'));}}
 for(const side of ['left','middle','right']){const row=nodes.filter(n=>n.side===side);for(let i=0;i<5;i++)plinth.push(beam(row[i],row[i+1],`PB-${row[i].id}-${row[i+1].id}`,'plinth'));}
 return {nodes,plinth,straps};
}
export function calculate(source,settings={}) {
 const p={...source.defaults,...settings},d=source.dimensions,a=assembly(source),steel=[],concrete=[];
 for(const [key,min,max] of [['footCover',.02,.1],['beamCover',.02,.075],['columnCover',.02,.075],['rccCementKgM3',200,500],['steelWastePercent',0,20],['cementWastePercent',0,20]])if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error(`Invalid ${key}`);
 if(![8,10].includes(p.columnTieDiameter)||![1,2].includes(p.footingMats)||p.columnTieSpacing<=0||p.columnTieSpacing>.2)throw Error('Invalid tie or mat setting');
 const bar=(id,stage,diameter,count,cut,ref,note='')=>{const length=count*cut;steel.push({id,stage,diameter,count,cut,length,kg:length*unitMass(diameter),ref,note});};
 const vol=(id,stage,v,formula,ref)=>concrete.push({id,stage,volume:v,formula,ref});
 let padArea=0;
 for(const n of a.nodes){
  const [x,z]=n.footing==='F1'?[2.55,2.55]:[2.1,2.7];padArea+=x*z;
  vol(`PAD-${n.id}`,'Footing envelope',x*z*d.footingDepth,`${x} × ${z} × ${d.footingDepth}; full prism envelope`,'STR-01/02');
  const c=p.footCover,axisCover=c+.016/2;
  const nx=Math.ceil((z-2*axisCover)/.15)+1,nz=Math.ceil((x-2*axisCover)/.15)+1;
  bar(`F-${n.id}-X`,'Footings',16,nx*p.footingMats,x-2*c,'STR-01','Straight meshes; no hook/chair allowance');
  bar(`F-${n.id}-Z`,'Footings',16,nz*p.footingMats,z-2*c,'STR-01','Top/bottom mat count is an unresolved source conflict');
 }
 const h=d.foundingBelowGround-d.footingDepth+d.plinthAboveGround;
 // Columns own all joints above the footing; beams are measured between column faces.
 for(const n of a.nodes){
  vol(`COL-${n.id}`,'Columns to plinth',d.column**2*h,`${d.column}² × ${h.toFixed(3)}`,'STR-01/02/03 + ARC-07');
  // Stage-boundary length from bar level in pad to top of plinth. Anchorage/projection not invented.
  const vertical=d.foundingBelowGround+d.plinthAboveGround-p.footCover;
  bar(`C-${n.id}-20`,'Column verticals',20,n.type==='C1'?6:12,vertical,'STR-03','Excludes horizontal anchorage, bends, lap and continuation above plinth');
  if(n.type==='C1')bar(`C-${n.id}-25`,'Column verticals',25,6,vertical,'STR-03','C1 only: 6Ø25 + 6Ø20');
  const t=p.columnTieDiameter/1000,b=d.column-2*p.columnCover-t;
  const hoop=4*b+20*t,cross=b+20*t,set=hoop+4*cross;
  const count=Math.ceil(h/p.columnTieSpacing)+1;
  bar(`CT-${n.id}`,'Column ties',p.columnTieDiameter,count,set,'STR-02/03/06','One hoop + four cross-ties per level; modeled 10d tails, no bend deductions');
 }
 for(const b of a.straps){
  const clear=b.length-d.column;
  // Outer eccentric pad inward extension after column face=1.65; middle pad=1.05.
  const padOverlap=2.7;
  const net=d.strapWidth*(clear*d.strapDepth-padOverlap*d.footingDepth);
  vol(b.id,'Strap beams',net,`0.45 × [(${b.length.toFixed(4)} − 0.45) × 0.8 − 2.7 × 0.6]`,'STR-01/04/06');
  bar(b.id+'-20','Strap longitudinal',20,12,b.length,'STR-06','8 top + 4 bottom; centreline length, excluding anchor/lap');
  const links=2*Math.ceil(clear/4/.1)+Math.ceil(clear/2/.125)+1;
  const cut=2*(d.strapWidth+d.strapDepth-4*p.beamCover-2*.008)+20*.008;
  bar(b.id+'-8','Strap links',8,links,cut,'STR-06','Outer hoop only; additional internal cross-ties unresolved');
 }
 for(const b of a.plinth){
  const clear=b.length-d.column;
  vol(b.id,'Plinth beams',clear*d.plinthWidth*d.plinthDepth,`(${b.length.toFixed(4)} − 0.45) × 0.30 × 0.35`,'STR-04/05');
  bar(b.id+'-20','Plinth longitudinal',20,4,b.length,'STR-05','2Ø20 + 1Ø16 at EACH face: 4Ø20 and 2Ø16 total');
  bar(b.id+'-16','Plinth longitudinal',16,2,b.length,'STR-05','Centreline lengths; no anchor/lap');
  const end=.7; // 2 × overall depth; general note also says .6 m: conservative link scenario.
  const links=2*Math.ceil(end/.1)+Math.ceil(Math.max(0,clear-2*end)/.15)+1;
  const cut=2*(d.plinthWidth+d.plinthDepth-4*p.beamCover-2*.008)+20*.008;
  bar(b.id+'-8','Plinth links',8,links,cut,'STR-05','100 mm in 0.70 m end zones, 150 mm midspan; note also says 0.60 m');
 }
 vol('PCC-PADS','PCC below pads',padArea*d.pccDepth,`${padArea.toFixed(3)} × 0.075; pad footprint only`,'STR-02');
 const rcc=concrete.filter(v=>v.id!=='PCC-PADS').reduce((s,v)=>s+v.volume,0),pcc=padArea*d.pccDepth;
 const rccCement=rcc*p.rccCementKgM3,pccCement=pcc*p.pccDryFactor*p.cementDensity/10;
 const totalSteel=steel.reduce((s,v)=>s+v.kg,0),byDiameter={};
 for(const row of steel){const t=byDiameter[row.diameter]??={diameter:row.diameter,length:0,kg:0};t.length+=row.length;t.kg+=row.kg;}
 return {settings:p,assembly:a,steel,concrete,rcc,pcc,footingEnvelope:padArea*d.footingDepth,rccCement,pccCement,cementKg:rccCement+pccCement,cementBags:(rccCement+pccCement)/p.bagKg,cementAllowanceBags:Math.ceil((rccCement+pccCement)*(1+p.cementWastePercent/100)/p.bagKg),totalSteel,steelWithAllowance:totalSteel*(1+p.steelWastePercent/100),byDiameter:Object.values(byDiameter).sort((x,y)=>x.diameter-y.diameter),plinthLength:a.plinth.reduce((s,b)=>s+b.length,0),strapLength:a.straps.reduce((s,b)=>s+b.length,0),columnHeight:h};
}
