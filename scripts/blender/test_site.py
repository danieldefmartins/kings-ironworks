import tempfile
import unittest
from pathlib import Path
from test_assembly import fixture
from shop_template import generate
from assembly import build_assembly


class SiteTests(unittest.TestCase):
    def test_site_geometry_and_dimensions_are_included_without_entering_cut_lists(self):
        payload=fixture()
        vertices=[dict(x=x,y=y,z=z) for z in (0,84) for x,y in [(60,-6),(120,-6),(120,0),(60,0)]]
        payload['site']=dict(datum='First stair ground corner',objects=[dict(id='wall',label='House wall',kind='wall',section='rectangular',x='60',y='-6',z='0',length='60',depth='6',height='84',rotation=0,source='laser',verified=True,notes='Brick face',photoPaths=[])],meshes=[dict(id='wall',label='House wall',kind='wall',vertices=vertices,faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4]],provisional=False)])
        before=build_assembly(fixture())
        after=build_assembly(payload)
        self.assertEqual(before['members'],after['members'])
        with tempfile.TemporaryDirectory() as folder:
            count=generate(payload,folder)
            sheets='\n'.join(p.read_text() for p in Path(folder).glob('sheet-*.svg'))
            self.assertIn('House wall',sheets)
            self.assertIn('First stair ground corner',sheets)
            self.assertIn('60 / -6 / 0',sheets)
            self.assertIn('60 x 6 x 84',sheets)
            self.assertIn('FIELD VERIFIED',sheets)
            self.assertGreater(count,1)
            self.assertTrue((Path(folder)/'shop-drawings.pdf').read_bytes().startswith(b'%PDF-'))

    def test_attached_layout_and_connection_notes_do_not_enter_cut_lists(self):
        payload=fixture()
        source=dict(id='rail-1',label='Wall to column',start=dict(objectId='wall',face='left',along=.5,angle=0,elevation='0',connection='WALL BRACKET DETAIL'),end=dict(objectId='col',face='right',along=.5,angle=0,elevation='0',connection='COLUMN BRACKET DETAIL'),height='36',bottomClearance='2',profiles='Steel flat cap',infill='pickets',notes='Check substrate')
        vertices=[dict(x=x,y=0,z=z) for x,z in [(0,2),(64,2),(64,36),(0,36)]]
        payload['site']=dict(objects=[],rails=[dict(source=source,verified=False,issues=['siteRailFabricationOpen'],layout=dict(id='rail-1',label='Wall to column',vertices=vertices,horizontal=64,length=64,rise=0,pitch=0))])
        before=build_assembly(fixture());after=build_assembly(payload)
        self.assertEqual(before['members'],after['members'])
        self.assertEqual(before.get('cut_parts'),after.get('cut_parts'))
        with tempfile.TemporaryDirectory() as folder:
            generate(payload,folder)
            sheets='\n'.join(p.read_text() for p in Path(folder).glob('sheet-*.svg'))
            for phrase in ('Wall to column','WALL BRACKET DETAIL','COLUMN BRACKET DETAIL','NOT CUT LENGTHS','Shop connection details and cut geometry'):
                self.assertIn(phrase,sheets)
            self.assertNotIn('Wall to column',(Path(folder)/'member-schedule.csv').read_text())

    def test_site_only_package_preserves_incomplete_objects_and_open_items(self):
        payload=fixture();payload['surfaces']=[];payload['posts']=[]
        payload['site']=dict(datum='',objects=[dict(id='col',label='Column to verify',kind='column',section='round',x='',y='',z='',length='',height='',source='unknown',verified=False)],meshes=[])
        payload['issues']=['siteDimensionsOpen']
        with tempfile.TemporaryDirectory() as folder:
            generate(payload,folder)
            sheets='\n'.join(p.read_text() for p in Path(folder).glob('sheet-*.svg'))
            self.assertIn('Column to verify',sheets)
            self.assertIn('VERIFY / VERIFY / VERIFY',sheets)
            self.assertIn('siteDimensionsOpen',sheets)


if __name__=='__main__':unittest.main()
