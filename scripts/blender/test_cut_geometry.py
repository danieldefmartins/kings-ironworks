import math
import unittest
from cut_geometry import rail_between_plumb_faces, vertical_picket_between_parallel_faces

class CutGeometryTests(unittest.TestCase):
    def test_level_rail_is_square_and_deducts_two_gaps(self):
        cut=rail_between_plumb_faces(60,0,2,.125)
        self.assertEqual(cut['stock_length'],59.75)
        self.assertEqual(cut['saw_angle_from_square_deg'],0)

    def test_raked_rail_end_vertices_land_on_two_plumb_planes(self):
        clear,rise,depth,gap=60,30,2,.125
        cut=rail_between_plumb_faces(clear,rise,depth,gap)
        theta=math.atan2(rise,clear)
        # Transform local polygon back to elevation; each cut must be plumb.
        world=[(u*math.cos(theta)-v*math.sin(theta),u*math.sin(theta)+v*math.cos(theta)) for u,v in cut['polygon']]
        self.assertAlmostEqual(world[0][0],world[3][0])
        self.assertAlmostEqual(world[1][0],world[2][0])
        self.assertAlmostEqual(world[1][0]-world[0][0],clear-2*gap)
        self.assertAlmostEqual(cut['stock_length']-cut['edge_length'],depth*rise/clear)

    def test_downhill_cut_has_same_stock_length_and_mirrored_ends(self):
        up=rail_between_plumb_faces(60,30,2,.125)
        down=rail_between_plumb_faces(60,-30,2,.125)
        self.assertEqual(up['stock_length'],down['stock_length'])
        self.assertNotEqual(up['polygon'],down['polygon'])

    def test_vertical_picket_has_extra_stock_for_both_sloping_ends(self):
        cut=vertical_picket_between_parallel_faces(32,45,.5,.0625)
        self.assertAlmostEqual(cut['edge_length'],31.875)
        self.assertAlmostEqual(cut['stock_length'],32.375)

    def test_invalid_gaps_do_not_generate_cut_lengths(self):
        with self.assertRaises(ValueError):rail_between_plumb_faces(1,1,2,1)
        with self.assertRaises(ValueError):vertical_picket_between_parallel_faces(1,45,.5,1)

if __name__=='__main__':unittest.main()
