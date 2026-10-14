"""M11.2 additive, source-pinned, public synthetic multistorey assembly.

Does not replace M11.1; keeps its stable fixtures and all prior public source
restrictions. Position is lower-left local box corner; yaw rotates about +Z.
Declared contacts are geometric proximity, never structural connections.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
from .assembly_job import read_assembly, confined, exact_object, KINDS
from .design_job import identity, num
from .oriented_job import check

SCHEMA = 'fabin-cad://multi-level-assembly-job/0.2'
RESULT_SCHEMA = 'fabin-cad://multi-level-assembly-result/0.2'


def load_multilevel(path, repo_root):
    root = Path(repo_root).resolve()
    job = Path(path).resolve()
    allow = (root / 'design_jobs' / 'synthetic').resolve()
    check(job.is_file() and job.is_relative_to(allow), 'JOB_PATH_REJECTED')
    raw = job.read_bytes()
    check(0 < len(raw) <= 100000, 'JOB_SIZE_REJECTED')
    try:
        doc = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise ValueError('M10_REJECTED:MULTILEVEL_JSON_INVALID') from None
    exact_object(doc, ('schema', 'status', 'assembly_id', 'project_id',
                       'base', 'levels', 'templates', 'instances', 'contacts',
                       'section'), 'MULTILEVEL_SCHEMA_INVALID')
    check(doc['schema'] == SCHEMA and doc['status'] == 'SYNTHETIC_QA_ONLY',
          'MULTILEVEL_AUTHORITY_BLOCKED')
    check(identity(doc['assembly_id']) and identity(doc['project_id']),
          'MULTILEVEL_IDENTITY_INVALID')
    base = doc['base']
    exact_object(base, ('path', 'git_blob_sha1'), 'BASE_RECORD_INVALID')
    base_path = confined(root, base['path'])
    blob = base_path.read_bytes()
    expected = hashlib.sha1(('blob ' + str(len(blob)) + '\0').encode() + blob).hexdigest()
    check(isinstance(base['git_blob_sha1'], str) and
          expected == base['git_blob_sha1'], 'BASE_GIT_PIN_INVALID')
    old = read_assembly(base_path, root)
    check(old['job']['project_id'] == doc['project_id'], 'BASE_PROJECT_FK_INVALID')
    oldlevels = old['baseline']['levels']
    newlevels = doc['levels']
    check(type(newlevels) is list and 1 <= len(newlevels) <= 12,
          'ADDITIONAL_LEVELS_INVALID')
    levels = dict(oldlevels)
    taken = {doc['assembly_id'], old['job']['assembly_id'], doc['project_id']}
    taken.update(x['id'] for x in old['groups'])
    taken.update(old['templates'])
    taken.update(x['id'] for x in old['instances'])
    taken.update(x['id'] for x in old['baseline']['walls'])
    taken.update(x['id'] for x in old['baseline']['openings'])
    taken.update(x['id'] for x in old['baseline']['joints'])
    for lvl in newlevels:
        exact_object(lvl, ('id', 'z_mm'), 'LEVEL_SCHEMA_INVALID')
        name = lvl['id']
        check(identity(name) and name not in taken and name not in levels and
              num(lvl['z_mm']) and 0 < lvl['z_mm'] <= 100000,
              'ADDITIONAL_LEVEL_INVALID')
        levels[name] = lvl['z_mm']; taken.add(name)
    check(len(set(levels.values())) == len(levels), 'DUPLICATE_ELEVATION')
    templates = doc['templates']
    check(type(templates) is list and 1 <= len(templates) <= 16,
          'ADDITIONAL_TEMPLATES_INVALID')
    new_templates = {}
    for template in templates:
        exact_object(template, ('id', 'kind', 'length_mm', 'width_mm',
                                'height_mm'), 'TEMPLATE_SCHEMA_INVALID')
        name = template['id']
        check(identity(name) and name not in taken and name not in new_templates and
              template['kind'] in KINDS, 'TEMPLATE_IDENTITY_INVALID')
        check(all(num(template[k]) for k in ('length_mm','width_mm','height_mm')),
              'TEMPLATE_NUMERIC_INVALID')
        check(all(10 <= template[k] <= 20000 for k in
                  ('length_mm','width_mm','height_mm')),
              'TEMPLATE_DIMENSIONS_INVALID')
        new_templates[name] = template
    taken.update(new_templates)
    all_templates = dict(old['templates']); all_templates.update(new_templates)
    ids = set(x['id'] for x in old['instances'])
    group_ids = {x['id'] for x in old['groups']}
    added = doc['instances']
    check(type(added) is list and 2 <= len(added) <= 40,
          'ADDITIONAL_INSTANCES_INVALID')
    for item in added:
        exact_object(item, ('id','template_id','group_id','level_id','source_id',
                            'x_mm','y_mm','z_mm','yaw_deg'),
                     'INSTANCE_SCHEMA_INVALID')
        check(identity(item['id']) and item['id'] not in taken and
              item['id'] not in ids and item['template_id'] in all_templates and
              item['group_id'] in group_ids and item['level_id'] in levels and
              item['source_id'] == 'SYNTHETIC_SPEC',
              'INSTANCE_FOREIGN_KEY_INVALID')
        ids.add(item['id'])
        check(all(num(item[k]) for k in ('x_mm','y_mm','z_mm','yaw_deg')),
              'INSTANCE_NUMERIC_INVALID')
        check(all(abs(item[k]) < 1000000 for k in ('x_mm','y_mm','z_mm')) and
              -180 <= item['yaw_deg'] <= 180 and
              -1500 <= item['z_mm'] - levels[item['level_id']] <= 15000,
              'INSTANCE_TRANSFORM_INVALID')
    check(set(new_templates) <= {x['template_id'] for x in added},
          'UNUSED_ADDITIONAL_TEMPLATE')
    known = {x['id'] for x in old['instances']} | ids
    taken.update(ids)
    contacts = doc['contacts']
    check(type(contacts) is list and 1 <= len(contacts) <= 40,
          'CONTACT_COUNT_INVALID')
    touched = set()
    for link in contacts:
        exact_object(link, ('id','component_a','component_b','relation'),
                     'CONTACT_SCHEMA_INVALID')
        aa, bb = link['component_a'],link['component_b']
        pair = tuple(sorted([aa,bb]))
        check(identity(link['id']) and link['id'] not in taken and
              link['id'] not in touched and aa in known and bb in known and
              aa != bb and pair not in touched and
              link['relation'] == 'SURFACE_TOUCH_ONLY',
              'CONTACT_IDENTITY_INVALID')
        touched.add(link['id']); touched.add(pair)
    taken.update(link['id'] for link in contacts)
    section = doc['section']
    exact_object(section, ('id','axis','position_mm'),
                 'SECTION_SCHEMA_INVALID')
    check(identity(section['id']) and section['id'] not in taken and
          section['axis'] == 'X' and
          num(section['position_mm']) and
          abs(section['position_mm']) < 1000000,
          'SECTION_IDENTITY_INVALID')
    edges = list(old['edges'])
    edges.append({'from_id':doc['assembly_id'],'relation':'EXTENDS_ASSEMBLY',
                  'to_id':old['job']['assembly_id']})
    for lvl in newlevels:
        edges.append({'from_id':doc['assembly_id'],'relation':'ADDS_LEVEL',
                      'to_id':lvl['id']})
    for template in templates:
        edges.append({'from_id':doc['assembly_id'],'relation':'DEFINES_TEMPLATE',
                      'to_id':template['id']})
    for item in added:
        for relation,target in (
            ('INSTANCE_OF',item['template_id']),
            ('GROUPED_IN',item['group_id']),
            ('ON_LEVEL',item['level_id'])):
            edges.append({'from_id':item['id'],'relation':relation,'to_id':target})
    edges.sort(key=lambda e:(e['from_id'],e['relation'],e['to_id']))
    return {'job':doc,'old':old,'levels':levels,'templates':all_templates,
            'instances':list(old['instances'])+added,'contacts':contacts,
            'edges':edges,'job_sha256':hashlib.sha256(raw).hexdigest(),
            'base_sha256':hashlib.sha256(blob).hexdigest(),
            'baseline':old['baseline'],'status':'SYNTHETIC_QA_ONLY'}
