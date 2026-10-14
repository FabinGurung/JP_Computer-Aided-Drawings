"""M11.2 native source-pinned two-storey/rotated/contact/section acceptance."""
from __future__ import annotations
import hashlib
import json
import math
import unittest
from pathlib import Path
from shutil import copy2
from tempfile import TemporaryDirectory

from backend.cad_bridge.assembly_multilevel import load_multilevel
from backend.cad_bridge.assembly_multilevel_executor import (
    build, exact_assembly_section, shape_instance, source_geometry,
    verify_contacts, xy_polygon,
)

ROOT=Path(__file__).resolve().parents[2]
FOLDER=Path('design_jobs/synthetic')
JOB=ROOT/FOLDER/'m11_2_multistorey.assembly.json'
OLD=ROOT/FOLDER/'m11_demo.assembly.json'
WALLS=ROOT/FOLDER/'m10_2_demo.source.json'


class M112MultiLevelTests(unittest.TestCase):
    def fixture(self,temp):
        root=Path(temp)
        p=root/FOLDER;p.mkdir(parents=True)
        for file in (JOB,OLD,WALLS):copy2(file,p/file.name)
        return root,p/JOB.name

    def rejection(self,mutator,code):
        with TemporaryDirectory() as tmp:
            root,path=self.fixture(tmp)
            record=json.loads(path.read_text())
            mutator(record)
            path.write_text(json.dumps(record)+'\n')
            with self.assertRaisesRegex(ValueError,'M10_REJECTED:'+code):
                load_multilevel(path,root)

    def test_source_pins_template_reuse_multistorey_and_fk_edges(self):
        state=load_multilevel(JOB,ROOT)
        self.assertEqual(len(state['instances']),10)
        self.assertEqual(len(state['templates']),7)
        self.assertEqual(state['levels'],{'Ground':0,'First':3360})
        self.assertEqual(len(state['contacts']),4)
        self.assertEqual(len(state['edges']),42)
        self.assertEqual(state['old']['job']['project_id'],state['job']['project_id'])
        self.assertEqual(state['job_sha256'],hashlib.sha256(JOB.read_bytes()).hexdigest())
        raw=OLD.read_bytes()
        expected=hashlib.sha1(('blob '+str(len(raw))+'\0').encode()+raw).hexdigest()
        self.assertEqual(state['job']['base']['git_blob_sha1'],expected)
        self.assertEqual(state['base_sha256'],hashlib.sha256(raw).hexdigest())

    def test_true_native_geometry_contact_and_assembly_wide_section(self):
        import ezdxf
        import ifcopenshell
        import ifcopenshell.util.placement
        from OCP.STEPControl import STEPControl_Reader
        from OCP.TopExp import TopExp_Explorer
        from OCP.TopAbs import TopAbs_SOLID
        with TemporaryDirectory() as temp:
            output=Path(temp)/'result'
            manifest=build(JOB,ROOT,output)
            self.assertEqual(manifest['status'],'SYNTHETIC_QA_ONLY')
            self.assertEqual(manifest['engineering_approval'],'HOLD')
            self.assertEqual(manifest['quantity_takeoff'],'BLOCKED')
            self.assertFalse(manifest['private_execution_enabled'])
            self.assertFalse(manifest['structural_design_verified'])
            self.assertFalse(manifest['release_authorized'])
            self.assertEqual((manifest['levels'],manifest['component_instances']), (2,10))
            self.assertEqual(manifest['rotated_components'],1)
            self.assertEqual(manifest['contacts_verified'],4)
            self.assertEqual(manifest['lineage_edges'],46)
            self.assertEqual(len(manifest['outputs']),9)
            for entry in manifest['outputs']:
                p=output/entry['name']
                self.assertEqual(len(p.read_bytes()),entry['bytes'])
                self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),entry['sha256'])
            model=ifcopenshell.open(str(output/'assembly.ifc'))
            for kind,count in [('IfcBuildingStorey',2),('IfcFooting',2),
                               ('IfcColumn',4),('IfcBeam',2),('IfcSlab',2),
                               ('IfcWall',4),('IfcOpeningElement',1)]:
                self.assertEqual(len(model.by_type(kind)),count,kind)
            self.assertIn('First',{x.Name for x in model.by_type('IfcBuildingStorey')})
            diagonal=next(x for x in model.by_type('IfcBeam') if x.Tag=='DiagonalBeam01')
            matrix=ifcopenshell.util.placement.get_local_placement(diagonal.ObjectPlacement)
            self.assertAlmostEqual(matrix[0][0],math.cos(math.pi/6),places=8)
            self.assertAlmostEqual(matrix[1][0],0.5,places=8)
            step=STEPControl_Reader()
            self.assertEqual(step.ReadFile(str(output/'assembly.step')),1)
            self.assertGreater(step.TransferRoots(),0)
            explorer=TopExp_Explorer(step.OneShape(),TopAbs_SOLID)
            solids=0
            while explorer.More():solids+=1;explorer.Next()
            self.assertEqual(solids,11)
            dxf=ezdxf.readfile(output/'assembly.dxf')
            self.assertEqual(len(dxf.modelspace().query('LWPOLYLINE')),14)
            self.assertEqual(len(dxf.modelspace().query('POINT')),3)
            self.assertEqual(len(dxf.modelspace().query('LINE')),1)
            rotated=dxf.modelspace().query('LWPOLYLINE[layer=="M11_2_BEAM"]')
            self.assertEqual(len(rotated),1)
            pts=rotated[0].get_points('xy')
            self.assertAlmostEqual(pts[1][0],2300+2100*math.cos(math.pi/6),places=5)
            self.assertAlmostEqual(pts[1][1],600+1050,places=5)
            graph=json.loads((output/'assembly-graph.json').read_text())
            self.assertEqual(len(graph['edges']),46)
            self.assertEqual(sum(x['relation']=='GEOMETRIC_SURFACE_CONTACT'
                                 for x in graph['edges']),4)
            contact=json.loads((output/'contacts.json').read_text())
            self.assertEqual(len(contact['contacts']),4)
            self.assertTrue(all(x['patch_area_mm2']==122500 for x in contact['contacts']))
            self.assertTrue(all(x['native_distance_mm']==0 for x in contact['contacts']))
            self.assertFalse(contact['structural_load_path_verified'])
            section=json.loads((output/'section.json').read_text())
            self.assertTrue(section['section_includes_new_components'])
            self.assertIn('UpperColumnWest01',section['intersection_contributors'])
            self.assertIn('RoofSlab01',section['intersection_contributors'])
            self.assertIn('SlabDeck01',section['intersection_contributors'])
            self.assertGreater(len(section['edges']),10)
            with self.assertRaisesRegex(ValueError,'OUTPUT_MUST_BE_EMPTY'):
                build(JOB,ROOT,output)

    def test_fail_closed_schema_authority_and_keys(self):
        self.rejection(lambda x:x.__setitem__('status','CONSTRUCTION_APPROVED'),
                       'MULTILEVEL_AUTHORITY_BLOCKED')
        self.rejection(lambda x:x.__setitem__('private_access_token','xxx'),
                       'MULTILEVEL_SCHEMA_INVALID')
        self.rejection(lambda x:x.__setitem__('project_id','WRONG_PROJECT'),
                       'BASE_PROJECT_FK_INVALID')
        self.rejection(lambda x:x['base'].__setitem__('git_blob_sha1','0'*40),
                       'BASE_GIT_PIN_INVALID')
        self.rejection(lambda x:x['base'].__setitem__('path','../../private'),
                       'SOURCE_PATH_REJECTED')
        self.rejection(lambda x:x['levels'][0].__setitem__('id','Ground'),
                       'ADDITIONAL_LEVEL_INVALID')
        self.rejection(lambda x:x['templates'][0].__setitem__('height_mm',float('nan')),
                       'TEMPLATE_NUMERIC_INVALID')
        self.rejection(lambda x:x['instances'][0].__setitem__('template_id','UNKNOWN'),
                       'INSTANCE_FOREIGN_KEY_INVALID')
        self.rejection(lambda x:x['instances'][3].__setitem__('yaw_deg',181),
                       'INSTANCE_TRANSFORM_INVALID')
        self.rejection(lambda x:x['contacts'][0].__setitem__('relation','STRUCTURALLY_CERTIFIED'),
                       'CONTACT_IDENTITY_INVALID')
        self.rejection(lambda x:x['contacts'][0].__setitem__('component_b','MISSING'),
                       'CONTACT_IDENTITY_INVALID')
        self.rejection(lambda x:x['section'].__setitem__('axis','Z'),
                       'SECTION_IDENTITY_INVALID')

    def test_native_contact_rejects_gaps_and_no_overlap(self):
        state=load_multilevel(JOB,ROOT)
        old=source_geometry(state['old']['instances'],state['old']['templates'])
        new=source_geometry(state['job']['instances'],state['templates'])
        boxes={x['id']:x for x in old+new}
        shapes={key:shape_instance(item) for key,item in boxes.items()}
        self.assertEqual(len(verify_contacts(state['contacts'],boxes,shapes)),4)
        moved=dict(boxes['UpperColumnWest01']);moved['z_mm']+=2
        bad={**boxes,'UpperColumnWest01':moved}
        bad_shapes={**shapes,'UpperColumnWest01':shape_instance(moved)}
        with self.assertRaisesRegex(ValueError,'CONTACT_NOT_OPPOSING_HORIZONTAL_FACES'):
            verify_contacts(state['contacts'],bad,bad_shapes)
        moved=dict(boxes['UpperColumnWest01']);moved['y_mm']=3300
        bad={**boxes,'UpperColumnWest01':moved}
        bad_shapes={**shapes,'UpperColumnWest01':shape_instance(moved)}
        with self.assertRaisesRegex(ValueError,'CONTACT_PATCH_TOO_SMALL'):
            verify_contacts(state['contacts'],bad,bad_shapes)

    def test_symlink_and_modified_base_source_rejected(self):
        with TemporaryDirectory() as tmp:
            root,job=self.fixture(tmp)
            (root/FOLDER/OLD.name).write_bytes(OLD.read_bytes()+b' ')
            with self.assertRaisesRegex(ValueError,'BASE_GIT_PIN_INVALID'):
                load_multilevel(job,root)
        with TemporaryDirectory() as tmp:
            root,job=self.fixture(tmp)
            anchor=root/FOLDER/OLD.name; external=root/'outside.json'
            external.write_bytes(OLD.read_bytes());anchor.unlink();anchor.symlink_to(external)
            with self.assertRaisesRegex(ValueError,'SOURCE_PATH_REJECTED'):
                load_multilevel(job,root)

if __name__=='__main__':unittest.main()
