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
