import copy
import tempfile
import unittest
from pathlib import Path
from assembly import inches, profile, build_assembly
from shop_template import generate


def fixture():
    return dict(id='test',title='Test railing',issues=[],transitions=[],surfaces=[dict(segment=0,step=None,corners=[dict(x=x,y=y,z=0) for x,y in [(0,0),(60,0),(60,36),(0,36)]])],posts=[dict(label=f'P{i+1}',pointType='railing_post',segment=0,side='left',provisional=False,base=dict(x=x,y=0,z=0),top=dict(x=x,y=0,z=36)) for i,x in enumerate((0,60))],measurements=dict(segments=[dict(kind='platform')],materials=dict(post='2 x 2',topRail='2 x 1',bottomRail='1 x 1',picket='1/2 square',picketSpacing='3 1/2'),fab=dict(bottomClearance='2')))


class AssemblyTests(unittest.TestCase):
    def test_measurement_parsing_does_not_guess(self):
        self.assertEqual(inches('3 1/2"'),3.5)
        self.assertEqual(inches('3½'),3.5)
        for text in ['3/0','about 3','4 oc','-1','1e309']:self.assertIsNone(inches(text))
        self.assertEqual(profile('HSS 1 1/2 x 1 1/2 x 1/4')['width'],1.5)
        self.assertTrue(profile('3/4 round')['round'])
        self.assertIsNone(profile('2 nominal pipe Sch 40'))

    def test_profiles_entered_through_measuring_tool_presets(self):
        for spec,width,depth in [('2" sq tube',2,2),('1/2" sq solid',.5,.5),('Flat bar 1-1/2x3/8',1.5,.375),('1-1/2" sq tube',1.5,1.5)]:
            with self.subTest(spec=spec):
                section=profile(spec)
                self.assertIsNotNone(section)
                self.assertEqual((section['width'],section['depth']),(width,depth))
        self.assertIsNone(profile('1-1/2" Sch40 pipe'))

    def test_infill_spacing_and_end_clearances(self):
        result=build_assembly(fixture());pickets=[m for m in result['members'] if m['kind']=='Picket']
        self.assertEqual(len(pickets),14)
        self.assertAlmostEqual(pickets[0]['a']['z'],3)
        self.assertAlmostEqual(pickets[0]['b']['z'],35.5)
        self.assertLessEqual(pickets[0]['a']['x']-.25-1,3.5)
        self.assertLessEqual(pickets[1]['a']['x']-pickets[0]['a']['x']-.5,3.5)
        self.assertTrue(any('not saw cut lengths' in s for s in result['issues']))

    def test_missing_or_special_infill_is_not_invented(self):
        p=fixture();p['measurements']['fab']['infill']='glass'
        self.assertFalse(any(m['kind']=='Picket' for m in build_assembly(p)['members']))
        p=fixture();p['measurements']['materials']['bottomRail']=''
        self.assertFalse(any(m['kind']=='Picket' for m in build_assembly(p)['members']))
        p=fixture();p['measurements']['segments'][0]['kind']='curve'
        self.assertFalse(any(m['kind']=='Top rail' for m in build_assembly(p)['members']))

    def test_hand_only_and_reverse_post_order(self):
        p=fixture();p['posts'].reverse();p['measurements']['rail']={'kind':'Handrail'}
        result=build_assembly(p)
        self.assertEqual([m['kind'] for m in result['members']].count('Top rail'),1)
        self.assertFalse(any(m['kind']=='Picket' for m in result['members']))
        self.assertEqual(result['bays'][0]['start'],'P1')

    def test_special_project_still_produces_review_package(self):
        p=fixture();p['surfaces']=[];p['posts']=[];p['issues']=['drawingNoGeometry']
        p['measurements']['gate']={'widthTop':'120','notes':'Sample gate'}
        with tempfile.TemporaryDirectory() as d:
            count=generate(p,d)
            self.assertGreaterEqual(count,3)
            pdf=Path(d,'shop-drawings.pdf').read_bytes()
            self.assertTrue(pdf.startswith(b'%PDF-'))
            self.assertIn(b'Sample gate',pdf)
            self.assertIn(b'custom geometry detailing',pdf)
            self.assertEqual(len(list(Path(d).glob('sheet-*.svg'))),count)

if __name__=='__main__':unittest.main()
