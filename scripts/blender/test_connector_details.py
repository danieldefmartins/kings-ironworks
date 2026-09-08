import unittest
from test_flight_sections import flight
from assembly import build_assembly

class ConnectedSectionsTests(unittest.TestCase):
    def test_landing_reaches_drive_both_cap_endpoints_and_weld_marks(self):
        p=flight()
        for post in p['posts']:post['sourcePost']={'id':post['label']}
        p['measurements']['segments'] += [{'kind':'platform'},{'kind':'flight','steps':[]}]
        p['surfaces'].append(dict(segment=2,step=None,corners=[dict(x=x,y=y,z=45) for x,y in [(70,24),(10,24),(10,-12),(70,-12)]]))
        p['posts'] += [dict(label=label,sourcePost={'id':label},pointType='railing_post',segment=2,side='left',provisional=False,base=dict(x=x,y=24,z=z),top=dict(x=x,y=24,z=z+36)) for label,x,z in [('U1',68,45),('U2',8,75)]]
        source=dict(kind='drop',side='left',lowerFlightIdx=0,upperFlightIdx=2,lowerPostId='P2',upperPostId='U1',lowerReach='9',upperReach='1')
        p['measurements']['landingTransitions']=[source]
        p['transitions']=[dict(label='T1',source=source,lowerSegment=0,upperSegment=2,provisional=False,points=[dict(x=69,y=0,z=70.5),dict(x=69,y=0,z=80.5),dict(x=69,y=24,z=80.5)])]
        result=build_assembly(p)
        self.assertEqual(len(result['sections']),2)
        self.assertEqual([s['mark'] for s in result['sections']],['F01-L','F02-L'])
        self.assertEqual(len(result['cut_parts']),2)
        self.assertEqual(len(result['welds']),3)
        self.assertEqual(result['welds'][0]['joins'],'F01-L-T to T1-1')
        self.assertEqual(result['welds'][-1]['joins'],'T1-2 to F02-L-T')
        lower=next(m for m in result['members'] if m['mark']=='F01-L-T')
        upper=next(m for m in result['members'] if m['mark']=='F02-L-T')
        self.assertAlmostEqual(lower['b']['x'],69)
        self.assertAlmostEqual(upper['a']['x'],69)
        self.assertEqual(result['sections'][0]['capEndOverhang'],8)
        self.assertTrue(any('record weld location' in issue for issue in result['issues']))
        self.assertFalse(any('does not meet' in issue for issue in result['issues']))

if __name__=='__main__':unittest.main()
