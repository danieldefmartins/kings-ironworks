import copy
import math
import unittest
from assembly import build_assembly
from test_flight_fabrication import detailed


def terminal_fixture(index=-1):
    payload=detailed();p=payload['posts'][index]
    p.update(pointType='existing_post',sourcePost={'id':'structural-terminal','supportAttachment':{'objectId':'wood-column','gap':'1/4','connection':'Measured clip detail pending shop approval'}},terminal=dict(kind='existing-support',hostId='wood-column',facePoint=copy.deepcopy(p['base']),normal=dict(x=1 if index==0 else -1,y=0,z=0),gap=.25,verified=True,rectangular=True,faceClearance=3,bottomZ=0,topZ=100))
    return payload

class SupportTerminalTests(unittest.TestCase):
    def test_existing_column_terminates_rails_at_face_without_becoming_a_fabricated_post(self):
        payload=terminal_fixture();before=copy.deepcopy(payload);result=build_assembly(payload)
        self.assertEqual(payload,before)
        self.assertEqual([m['mark'] for m in result['members'] if m['kind']=='Post'],['P1','P3'])
        self.assertEqual([p['mark'] for p in result['post_cuts']],['P1','P3'])
        self.assertIn('P2',result['sections'][0]['posts'])
        cap=next(m for m in result['members'] if m['mark']=='F01-L-T')
        bottom=next(m for m in result['members'] if m['mark']=='R02-B')
        self.assertAlmostEqual(max(v['x'] for v in cap['vertices']),59.75)
        self.assertAlmostEqual(max(v['x'] for v in bottom['vertices']),59.75)
        self.assertIn('F01-L-T',[p['mark'] for p in result['cut_parts']])
        self.assertIn('R02-B',[p['mark'] for p in result['cut_parts']])
        self.assertNotIn('P2',[p['mark'] for p in result['cut_parts']+result['post_cuts']])

    def test_start_terminal_gap_is_measured_from_face_not_a_post_center(self):
        result=build_assembly(terminal_fixture(0))
        cap=next(m for m in result['members'] if m['mark']=='F01-L-T')
        bottom=next(m for m in result['members'] if m['mark']=='R01-B')
        self.assertAlmostEqual(min(v['x'] for v in cap['vertices']),.25)
        self.assertAlmostEqual(min(v['x'] for v in bottom['vertices']),.25)

    def test_unknown_oblique_round_narrow_or_short_support_never_releases_native_cuts(self):
        for patch in [dict(verified=False),dict(gap=None),dict(normal=dict(x=0,y=1,z=0)),dict(rectangular=False),dict(faceClearance=.1),dict(topZ=40),dict(bottomZ=50)]:
            with self.subTest(patch=patch):
                payload=terminal_fixture();payload['posts'][-1]['terminal'].update(patch);result=build_assembly(payload)
                self.assertTrue(result['sections'][0]['issues']);self.assertEqual(result['cut_parts'],[]);self.assertEqual(result['post_cuts'],[])

    def test_internal_terminal_and_nonplumb_cap_require_details(self):
        for index,cut in [(1,'plumb'),(-1,'square')]:
            payload=terminal_fixture(index);payload['measurements']['fab']['topRailEndCut']=cut
            result=build_assembly(payload);self.assertTrue(result['sections'][0]['issues']);self.assertEqual(result['cut_parts'],[])

    def test_unresolved_linked_terminal_cannot_leave_a_shorter_apparently_complete_run(self):
        payload=detailed();payload['measurements']['posts']=[dict(id='unresolved',segIdx=0,side='left',pointType='existing_post',supportAttachment=dict(objectId='column'))]
        result=build_assembly(payload);self.assertEqual(result['cut_parts'],[]);self.assertTrue(any('linked existing support' in x for x in result['issues']))

    def test_rotating_the_surveyed_face_keeps_cut_lengths(self):
        payload=terminal_fixture();before=build_assembly(payload);angle=math.radians(37)
        def rotate(p,translate=True):return dict(x=p['x']*math.cos(angle)-p['y']*math.sin(angle)+(120 if translate else 0),y=p['x']*math.sin(angle)+p['y']*math.cos(angle)- (48 if translate else 0),z=p['z'])
        for surface in payload['surfaces']:surface['corners']=[rotate(p) for p in surface['corners']]
        for p in payload['posts']:
            p['base']=rotate(p['base']);p['top']=rotate(p['top'])
            if p.get('terminal'):p['terminal']['facePoint']=rotate(p['terminal']['facePoint']);p['terminal']['normal']=rotate(p['terminal']['normal'],False)
        after=build_assembly(payload)
        self.assertEqual([c['mark'] for c in before['cut_parts']],[c['mark'] for c in after['cut_parts']])
        for a,b in zip(before['cut_parts'],after['cut_parts']):self.assertAlmostEqual(a['stock_length'],b['stock_length'])

if __name__=='__main__':unittest.main()
