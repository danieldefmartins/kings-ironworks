import unittest
from test_assembly import fixture
from assembly import build_assembly


def flight():
    p=fixture();p['measurements']['segments'][0]={'kind':'flight','steps':[]}
    p['posts'][1]['base']['z']=30;p['posts'][1]['top']['z']=66
    p['posts'].insert(1,dict(label='P3',pointType='railing_post',segment=0,side='left',provisional=False,base=dict(x=30,y=0,z=15),top=dict(x=30,y=0,z=51)))
    p['measurements']['fab'].update(topRailConstruction='continuous_per_flight',railHeightDatum='finished_top_at_post',topRailStartExtension='0',topRailEndExtension='0',topRailEndCut='plumb',postTopGap='0')
    return p


class FlightSectionTests(unittest.TestCase):
    def test_three_posts_have_one_continuous_cap(self):
        result=build_assembly(flight());caps=[m for m in result['members'] if m['kind']=='Top rail']
        self.assertEqual(len(caps),1)
        self.assertEqual(result['sections'][0]['posts'],['P1','P3','P2'])
        self.assertEqual(len(result['cut_parts']),1)
        self.assertAlmostEqual(min(v['x'] for v in caps[0]['vertices']),-1)
        self.assertAlmostEqual(max(v['x'] for v in caps[0]['vertices']),61)
        # Every top/bottom corner lands on the proper plane, with no rail/post overlap.
        for post in [m for m in result['members'] if m['kind']=='Post']:
            for v in post['vertices'][4:]:
                self.assertAlmostEqual(v['z'],36+.5*v['x']-(1.25**.5))

    def test_unknown_extensions_block_a_cut_sheet(self):
        p=flight();p['measurements']['fab']['topRailStartExtension']=''
        result=build_assembly(p)
        self.assertEqual(result['cut_parts'],[])
        self.assertTrue(any('both horizontal cap extensions' in i for i in result['issues']))

    def test_non_collinear_supports_block_cutting(self):
        p=flight();p['posts'][1]['top']['z']+=1
        self.assertEqual(build_assembly(p)['cut_parts'],[])

    def test_oversized_post_gap_blocks_a_cut(self):
        p=flight();p['measurements']['fab']['postTopGap']='40'
        self.assertEqual(build_assembly(p)['cut_parts'],[])

    def test_square_cut_extensions_refer_to_top_edge(self):
        p=flight();p['measurements']['fab']['topRailEndCut']='square'
        result=build_assembly(p);m=next(m for m in result['members'] if m['kind']=='Top rail')
        # Top-face vertices are those with the highest z - pitch*x.
        top=[v for v in m['vertices'] if abs(v['z']-.5*v['x']-36)<1e-6]
        self.assertEqual(len(top),4)
        self.assertAlmostEqual(min(v['x'] for v in top),-1)
        self.assertAlmostEqual(max(v['x'] for v in top),61)
        self.assertEqual(result['cut_parts'][0]['saw_angle_from_square_deg'],0)

if __name__=='__main__':unittest.main()
