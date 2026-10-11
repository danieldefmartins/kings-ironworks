import math
import unittest
from assembly import build_assembly
from test_flight_sections import flight

def detailed():
    p=flight()
    p['measurements']['fab'].update(bottomRailConstruction='between_posts',bottomRailEndGap='1/16',picketEndGap='1/32',picketSpacingDatum='max_clear_horizontal',infill='vertical pickets')
    for post in p['posts']:post['sourcePost']={'mount':'Core-drill','embedment':'4'}
    return p

class FabricationTests(unittest.TestCase):
    def test_native_cut_lengths_are_invariant_under_scene_placement(self):
        payload=detailed();before=build_assembly(payload)
        def move(p):
            angle=math.radians(37)
            return dict(x=120+p['x']*math.cos(angle)-p['y']*math.sin(angle),y=-36+p['x']*math.sin(angle)+p['y']*math.cos(angle),z=12+p['z'])
        for surface in payload['surfaces']:surface['corners']=[move(p) for p in surface['corners']]
        for post in payload['posts']:
            post['base']=move(post['base']);post['top']=move(post['top'])
        after=build_assembly(payload)
        self.assertEqual([p['mark'] for p in before['cut_parts']],[p['mark'] for p in after['cut_parts']])
        for a,b in zip(before['cut_parts'],after['cut_parts']):
            self.assertAlmostEqual(a['stock_length'],b['stock_length'])
            self.assertAlmostEqual(a['edge_length'],b['edge_length'])
            self.assertAlmostEqual(a['saw_angle_from_square_deg'],b['saw_angle_from_square_deg'])
        for a,b in zip(before['post_cuts'],after['post_cuts']):
            self.assertEqual(a['mark'],b['mark']);self.assertAlmostEqual(a['stockLength'],b['stockLength'])

    def test_post_cut_includes_embedment_and_sloped_top(self):
        a=build_assembly(detailed());posts=[m for m in a['members'] if m['kind']=='Post']
        self.assertEqual(len(a.get('post_cuts',[])),3)
        for m in posts:
            base=next(p['base']['z'] for p in detailed()['posts'] if p['label']==m['mark'])
            self.assertAlmostEqual(min(v['z'] for v in m['vertices']),base-4)
            self.assertAlmostEqual(m['postCut']['stockLength'],max(v['z'] for v in m['vertices'])-(base-4))

    def test_bottom_rail_end_faces_clear_posts_by_recorded_gap(self):
        a=build_assembly(detailed());m=next(m for m in a['members'] if m['mark']=='R01-B')
        self.assertAlmostEqual(min(v['x'] for v in m['vertices']),1+1/16)
        self.assertAlmostEqual(max(v['x'] for v in m['vertices']),29-1/16)
        self.assertTrue(any(c['mark']=='R01-B' for c in a['cut_parts']))

    def test_each_picket_vertex_meets_offset_parallel_rail_faces(self):
        a=build_assembly(detailed());pickets=[m for m in a['members'] if m['kind']=='Picket']
        self.assertGreater(len(pickets),0)
        for m in pickets:
            for v in m['vertices'][:4]:self.assertAlmostEqual(v['z'],.5*v['x']+2+math.sqrt(1.25)+1/32)
            for v in m['vertices'][4:]:self.assertAlmostEqual(v['z'],.5*v['x']+36-math.sqrt(1.25)-1/32)
        self.assertEqual(len(a['picket_layouts']),2)
        self.assertFalse(any('confirm spacing convention' in i for i in a['issues']))

    def test_missing_mount_depth_does_not_create_post_cut(self):
        p=detailed();p['posts'][0]['sourcePost']['embedment']=''
        a=build_assembly(p)
        self.assertFalse(any(c['mark']=='P1' for c in a.get('post_cuts',[])))
        self.assertTrue(any('P1' in i and 'embedment' in i for i in a['issues']))

if __name__=='__main__':unittest.main()
