#!/usr/bin/env python3
"""M30 reproducible, READ-ONLY full model-space DXF index. Run locally with
original Drive DXFs downloaded under their existing IDs, not on GitHub Actions.
Writes compressed JSONL, one source handle per entity; originals untouched.
For DIMENSION/HATCH/IMAGE and other objects, original DXF stays authoritative.
Usage: python tools/site/aad-m30-extract-original-dxf.py input.dxf output.jsonl.gz
Requires pip install ezdxf==1.4.4. Never infer beam members from labels.
"""
import ezdxf, gzip, json, collections, hashlib, sys, os
source,target=sys.argv[1:3]
doc=ezdxf.readfile(source); types=collections.Counter(); layers=collections.Counter()
def v3(v): return [v.x,v.y,v.z] if v is not None else None
with gzip.open(target,'wt',encoding='utf8',compresslevel=6) as out:
 for e in doc.modelspace():
  k=e.dxftype(); d=e.dxf;h=d.get('handle');layer=d.get('layer','0')
  if not h: raise ValueError('No DXF modelspace source handle')
  types[k]+=1;layers[layer]+=1
  row={'handle':h,'type':k,'layer':layer,'entitySpace':'modelspace'}
  if k=='LINE':row.update(a=v3(d.start),b=v3(d.end))
  elif k=='LWPOLYLINE':row.update(points=[list(p) for p in e.get_points('xyseb')],closed=bool(e.closed))
  elif k in ('TEXT','ATTRIB'):row.update(pos=v3(d.get('insert')),text=d.get('text',''))
  elif k=='MTEXT':row.update(pos=v3(d.get('insert')),text=e.text)
  elif k=='INSERT':row.update(pos=v3(d.get('insert')),blockName=d.name,rotation=d.get('rotation',0),scale=[d.get('xscale',1),d.get('yscale',1),d.get('zscale',1)])
  elif k=='CIRCLE':row.update(pos=v3(d.center),radius=d.radius)
  elif k=='ARC':row.update(pos=v3(d.center),radius=d.radius,startAngle=d.start_angle,endAngle=d.end_angle)
  elif k=='DIMENSION':row.update(defPoint=v3(d.get('defpoint')),text=d.get('text',''),dimType=d.get('dimtype'))
  elif k=='HATCH':row.update(boundaryPaths=len(e.paths),solidFill=d.get('solid_fill'))
  else:row['geometryRepresentation']='ORIGINAL_DXF_REQUIRED_FOR_FULL_DETAIL'
  out.write(json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n')
sha=hashlib.sha256(open(source,'rb').read()).hexdigest()
metadata={'schema':'jp-cad://aad-m30-dxf-full-modelspace-index/1','source':os.path.basename(source),
          'sha256':sha,'modelspaceRows':sum(types.values()),'byType':dict(types),
          'byLayer':dict(sorted(layers.items())),'originalRawImmutable':True,
          'nativeCoordinates':True,'constructionApproval':False}
open(target+'.manifest.json','w').write(json.dumps(metadata,indent=2,ensure_ascii=False)+'\n')
print('AAD_M30_FULL_MODELSPACE_SOURCE_INDEX_PASS',json.dumps({'sourceSha256':sha,'count':metadata['modelspaceRows']}))
