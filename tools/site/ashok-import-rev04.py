#!/usr/bin/env python3
"""Admit hash-pinned Ashok REV04 source to the shared AAD review template.

Private inputs stay outside Git. No raster tracing, network calls or invented
structural members. Run with --package ZIP --html V09_HTML --out DIR.
"""
import argparse, base64, hashlib, json, re, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

EXPECTED = {
    'package': 'a66e8b0d1ae8767895ecbb5ada4a66d70ede9dee351ac202b1930cc934d12489',
    'html': 'b384df3270ac57758d861ff5ccedb114a014f114dfc14cc6732dcaa566b7a515',
    'model': '6c204ffd644585c391b3bfbc2b553402b52b0657c16eca3d46dc70162105305e',
}
VISUALS = {
    '2321c29b47bcff440fa015666ba4fafd4827eccbc9a7b6c177e0b3bf5be8e861': 'gf-c016.png',
    'e30be57ae3f0c48b2a5eea0d3b29daaf5e76bb6d359041462b4b6889a6b308cf': 'ff-c012.png',
}
PREFIX = 'Ashok_M10_REV04_'
sha = lambda b: hashlib.sha256(b).hexdigest()

def dump(out, name, obj):
    (out / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False, sort_keys=True) + '\n')

def scrub(v):
    """Retain semantic facts, remove provider identities and internal links."""
    if isinstance(v, dict):
        return {k: scrub(x) for k, x in v.items() if not re.search(r'drive.?id|provider.?id', k, re.I)}
    if isinstance(v, list):
        return [scrub(x) for x in v]
    if isinstance(v, str) and re.search(r'drive\.google|docs\.google|sandbox:|sediment:', v):
        return '[private source reference retained by source owner]'
    if isinstance(v, str):
        return re.sub(r'\s*/?\s*Drive\s+[A-Za-z0-9_-]{20,}', ' [private source reference]', v)
    return v

def floor_model(floor, svg, semantic):
    root = ET.fromstring(svg)
    nodes, walls, perimeter = [], [], []
    ids = {}
    def node(x, y):
        # SVG margin 2000; source Y grows SE -> NW; display Z grows NW -> SE.
        p = (round((x - 2000) / 1000, 3), round((y - 2000) / 1000, 3))
        if p not in ids:
            ids[p] = f'{floor}-N{len(nodes)+1:03}'
            nodes.append({'id': ids[p], 'x': p[0], 'z': p[1]})
        return ids[p]
    def wall(id_, a, b, thickness, locator, exterior=False):
        walls.append({'id': id_, 'a': node(*a), 'b': node(*b), 'thickness': thickness,
                      'source': 'REV04_V08_CANONICAL_SVG_CENTERLINE', 'status': 'SOURCE_PLAN_REVIEW_ONLY',
                      'provenance': {'sourceId': id_, 'locator': locator,
                                     'basis': 'Exact deterministic SVG line; full-storey extrusion is display only'}})
        if exterior:
            perimeter.append(id_)
    corners = [(2000, 2000), (9200, 2000), (9200, 16400), (2000, 16400)]
    for i in range(4):
        wall(f'{floor}-EXT-{i+1}', corners[i], corners[(i+1) % 4], .230, 'outerwall path', True)
    for i, line in enumerate(e for e in root.iter() if e.tag.endswith('line') and 'iwall' in e.get('class', '').split()):
        wall(f'{floor}-INT-{i+1:03}', (float(line.get('x1')), float(line.get('y1'))),
             (float(line.get('x2')), float(line.get('y2'))), .100, f'iwall line {i+1}')
    # Source does not establish absolute window sills. Keep every opening in
    # source schedules; do not manufacture window elevations or add ghost solids.
    openings, deferred = [], []
    nodemap = {n['id']: n for n in nodes}
    for o in semantic['openings']:
        if o.get('action') == 'REMOVE':
            deferred.append({'id': o['id'], 'reason': 'REMOVED_IN_SOURCE'})
            continue
        if o['type'] != 'DOOR':
            deferred.append({'id': o['id'], 'reason': 'PLAN_ONLY_VERTICAL_DATUM_OR_HOST_UNVERIFIED'})
            continue
        px, pz = o['anchor'][0]/1000, (14400-o['anchor'][1])/1000
        width, height = [x/1000 for x in o['size_mm']]
        candidates = []
        for w in walls:
            a, b = nodemap[w['a']], nodemap[w['b']]
            dx, dz = b['x']-a['x'], b['z']-a['z']; length = (dx*dx+dz*dz)**.5
            t = ((px-a['x'])*dx+(pz-a['z'])*dz)/length
            distance = abs((px-a['x'])*dz-(pz-a['z'])*dx)/length
            offset = round(t-width/2, 6)
            if distance < .0011 and offset >= -.00001 and offset+width <= length+.00001:
                candidates.append((distance, w['id'], max(0, offset)))
        if not candidates:
            deferred.append({'id': o['id'], 'reason': 'HOST_OR_JAMB_REVIEW_REQUIRED'})
            continue
        _, host, offset = min(candidates)
        openings.append({'id': o['id'], 'wallId': host, 'kind': 'door', 'offset': offset,
                         'width': width, 'height': height, 'sill': 0,
                         'source': 'REV04_V08_DOOR_CENTER_AND_SIZE', 'status': 'PLAN_HOST_CANDIDATE',
                         'provenance': {'sourceId': o['id'], 'basis': 'Source plan centre and scheduled size; jamb/swing QA pending'}})
    return {'schema': 'jp-cad://aad-floor/1', 'height': 3.048,
            'floorGraph': {'nodes': nodes, 'walls': walls, 'perimeter': perimeter,
                           'openings': openings, 'labels': {r['id']: r['name'] for r in semantic['rooms']}}}, deferred

def main():
    p = argparse.ArgumentParser(); p.add_argument('--package', type=Path, required=True)
    p.add_argument('--html', type=Path, required=True); p.add_argument('--out', type=Path, required=True)
    args = p.parse_args(); out = args.out; out.mkdir(parents=True, exist_ok=True)
    for key in ('package', 'html'):
        if sha(getattr(args, key).read_bytes()) != EXPECTED[key]:
            raise ValueError('Source hash mismatch: ' + key)
    with zipfile.ZipFile(args.package) as z:
        source_bytes = z.read(PREFIX+'Semantic_Spatial_Model_v0.8.json')
        if sha(source_bytes) != EXPECTED['model']:
            raise ValueError('Semantic model hash mismatch')
        source = json.loads(source_bytes)
        # Check the admitted package's independently inspectable internal hashes.
        hm = json.loads(z.read(PREFIX+'Hashes_Manifest_v0.8.json'))
        entries = hm['files']
        if len(entries) != 26:
            raise ValueError('Expected exactly 26 internal hashes')
        for name, e in entries.items():
            if sha(z.read(name)) != e['sha256'] or len(z.read(name)) != e['size_bytes']:
                raise ValueError('Internal package hash mismatch: '+name)
        deferred, svg_hashes = {}, {}
        for floor in ('GF', 'FF'):
            data = z.read(PREFIX+floor+'_Deterministic_Reference_v0.8.svg')
            (out/(floor.lower()+'.svg')).write_bytes(data); svg_hashes[floor] = sha(data)
            model, deferred[floor] = floor_model(floor, data, source[floor])
            dump(out, 'aad-'+floor.lower()+'-model.json', model)
        data = z.read(PREFIX+'Site_Deterministic_Reference_v0.8.svg')
        (out/'site.svg').write_bytes(data); svg_hashes['site'] = sha(data)
    found = set()
    for b64 in re.findall(r'data:image/png;base64,([A-Za-z0-9+/=]+)', args.html.read_text()):
        data = base64.b64decode(b64); digest = sha(data)
        if digest in VISUALS:
            (out/VISUALS[digest]).write_bytes(data); found.add(digest)
    if found != set(VISUALS):
        raise ValueError('Approved GF/FF image byte streams missing')
    dump(out, 'model.public.json', scrub(source))
    holds = [
        {'code': 'SOURCE_CUSTODY', 'message': 'M08 native DXF/PDF/GLB byte custody remains unresolved; this is a REV04 JSON/SVG review migration.'},
        {'code': 'SETBACK', 'message': 'Zero-right setback accepted for design review only; municipal verification pending. No right-wall openings permitted.'},
        {'code': 'STAIR', 'message': 'M10 U-stair section, landing, slab void and headroom require QA; no stair solid invented from earlier M08.'},
        {'code': 'PARKING', 'message': 'Tight transverse fit only; access, turning, carport/truss and structural sizing unresolved.'},
        {'code': 'OPENINGS', 'message': 'Absolute window/vent sills unresolved. Full source schedule and anchors retained; deferred openings are not modeled in 3D.'},
        {'code': 'PLAN_WALLS', 'message': 'Canonical SVG wall centre-lines include unresolved overlaps and front carport enclosure. Jambs, swings and room circulation still need QA.'},
        {'code': 'VERTICAL_ENVELOPE', 'message': '3048 mm storey rise comes from M10 stair schedule. Wall extrusion uses that display envelope; finished wall heights and absolute survey levels are not verified.'},
    ]
    manifest = {'schema': 'jp-cad://aad-building/1', 'projectId': 'ashok-adhikari',
                'name': 'Ashok Adhikari · REV04 working architectural review', 'revision': 'M10-REV04-v08-QA01',
                'representation': 'ARCHITECTURAL_REVIEW_ONLY', 'sourceLedger': 'source-manifest.public.json',
                'coordinateSystem': {'units': 'm', 'axes': 'X page-right NE; Z page-down SE; Y elevation',
                                     'conversion': 'source (x,y) mm -> (x/1000,(14400-y)/1000) m',
                                     'surveyAlignment': 'NOT_VERIFIED'},
                'levels': [{'id': f.lower(), 'name': n, 'elevation': e, 'height': 3.048,
                            'model': 'aad-'+f.lower()+'-model.json', 'sourceArea': 103.68,
                            'transform': {'x': 0, 'z': 0, 'rotationDeg': 0}, 'status': 'SOURCE_ENVELOPE_NOT_NET_USABLE_AREA'}
                           for f,n,e in [('GF','Ground floor',0),('FF','First floor',3.048)]],
                'reviewHolds': holds, 'restrictions': {'issueForConstruction': False, 'engineeringApproval': 'HOLD'},
                'sourceAuthority': {'geometry': 'M10_REV04_v0.8', 'modelSha256': EXPECTED['model']}}
    dump(out, 'aad-building-v1.json', manifest)
    dump(out, 'source-manifest.public.json', {
        'schema': 'jp-cad://project-publication/1.0', 'slug': 'ashok-adhikari', 'dateNpt': '2026-10-27',
        'identifierPolicy': 'Route slug is the technical namespace; no unverified PRJ number assigned.',
        'authority': {'clientBaseline': 'M10_REV03_v0.4', 'geometry': 'M10_REV04_v0.8',
                      'reviewPackage': 'M10_REV04_v0.9', 'promoted': False, 'status': 'NOT_FOR_CONSTRUCTION'},
        'admission': 'User authorized selection and GitHub working publication on 2026-10-27; QA continues.',
        'inputHashes': EXPECTED, 'canonicalSvgHashes': svg_hashes,
        'approvedVisuals': [{'file': name, 'sha256': h, 'authority': 'VISUAL_ONLY'} for h,name in VISUALS.items()],
        'deferredOpenings': deferred, 'holds': holds,
        'template': 'AAD-CAD-TEMPLATE-001 / shared cad/aad/multistorey editor',
        'conversion': 'Canonical SVG wall lines -> source-indexed floor graph; no raster tracing. Original SVGs and approved PNG bytes unchanged.',
        'scope': 'GF and FF only. No new top/roof floor, structural members, stair solids or engineering acceptance.'})
    outputs = {f.name: sha(f.read_bytes()) for f in sorted(out.iterdir()) if f.is_file() and f.name != 'output-hashes.json'}
    dump(out, 'output-hashes.json', {'schema': 'jp-cad://output-hashes/1', 'sha256': outputs})
    print(json.dumps({'result': 'PASS', 'files': len(outputs), 'deferred': deferred}))

if __name__ == '__main__':
    main()
