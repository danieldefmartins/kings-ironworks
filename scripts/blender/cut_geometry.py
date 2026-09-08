"""Exact planar stock geometry. Call only after joint/face datums are explicit.

Coordinates u/v are inches in the member's longitudinal/depth plane. The polygon
is the retained material; stock_length is its longitudinal bounding length, not
an ambiguous 'long point' label. Saw angle is measured away from a square cut.
No weld size, anchor choice, allowance or construction style is defaulted here.
"""
import math


def parallel_end_cuts(axis_length, depth, end_angle_deg):
    values=(axis_length,depth,end_angle_deg)
    if not all(math.isfinite(v) for v in values):raise ValueError('Non-finite cutting dimensions')
    if axis_length<=0 or depth<=0 or abs(end_angle_deg)>=89:raise ValueError('Invalid cutting dimensions')
    shear=math.tan(math.radians(end_angle_deg))*depth/2
    polygon=[(-shear,-depth/2),(axis_length-shear,-depth/2),(axis_length+shear,depth/2),(shear,depth/2)]
    low=min(p[0] for p in polygon)
    return {'polygon':[(u-low,v) for u,v in polygon],
            'stock_length':axis_length+2*abs(shear),
            'edge_length':axis_length,'depth':depth,
            'saw_angle_from_square_deg':abs(end_angle_deg),
            'end_cut_relationship':'parallel; same orientation at both ends'}


def rail_between_plumb_faces(clear_horizontal, rise_over_clear, depth, gap_each_end):
    """Gaps measured horizontally, normal to the plumb supporting faces."""
    if not all(math.isfinite(v) for v in (clear_horizontal,rise_over_clear,depth,gap_each_end)):
        raise ValueError('Non-finite joint dimensions')
    if clear_horizontal<=0 or gap_each_end<0 or 2*gap_each_end>=clear_horizontal:
        raise ValueError('Joint gaps leave no rail')
    angle=math.atan2(rise_over_clear,clear_horizontal)
    length=(clear_horizontal-2*gap_each_end)/math.cos(angle)
    result=parallel_end_cuts(length,depth,math.degrees(angle))
    result['gap_basis']='horizontal, normal to plumb post face'
    result['gap_each_end']=gap_each_end
    return result


def vertical_picket_between_parallel_faces(clear_vertical, pitch_deg, picket_width_in_elevation, gap_each_end):
    """Gaps measured vertically between picket end and raked rail face."""
    if not all(math.isfinite(v) for v in (clear_vertical,pitch_deg,picket_width_in_elevation,gap_each_end)):
        raise ValueError('Non-finite infill dimensions')
    if gap_each_end<0 or clear_vertical<=2*gap_each_end:raise ValueError('Joint gaps leave no picket')
    result=parallel_end_cuts(clear_vertical-2*gap_each_end,picket_width_in_elevation,pitch_deg)
    result['gap_basis']='vertical at each raked rail face'
    result['gap_each_end']=gap_each_end
    return result
