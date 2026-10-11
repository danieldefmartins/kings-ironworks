"""Surveyed structural faces bound rail runs; they are never manufactured posts."""
import math

def is_terminal(point):
    return point.get('pointType') in ('existing_post','concrete_wall','clip') and isinstance(point.get('terminal'),dict) and point['terminal'].get('kind')=='existing-support'

def finite(value):return isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)

def face_inset(point,post_width):
    return 0 if is_terminal(point) else post_width/2

def terminal_gap(point):
    value=point.get('terminal',{}).get('gap')
    return value if finite(value) and value>=0 else None

def terminal_problems(point,hx,hy,at_start,profiles,clearance):
    t=point['terminal'];issues=[]
    def fail(text):issues.append(point['label']+': '+text)
    if t.get('verified') is not True or t.get('rectangular') is not True:fail('Verify the existing rectangular support face and connection record.')
    if terminal_gap(point) is None:fail('Record the horizontal gap at the existing support, including zero.')
    n=t.get('normal',{});v=[n.get(k) for k in ('x','y','z')]
    if not all(finite(x) for x in v) or abs(sum(x*x for x in v)-1)>1e-8 or abs(v[2])>1e-8 or abs(v[0]*hx+v[1]*hy-(1 if at_start else -1))>1e-8:fail('Existing support must present a plumb face perpendicular to the rail run; detail oblique connections.')
    face=t.get('facePoint',{})
    if any(not finite(face.get(k)) or abs(face[k]-point['base'][k])>1e-6 for k in ('x','y','z')):fail('Existing support face and rail datum do not match.')
    margin=t.get('faceClearance');width=max((p['width'] for p in profiles if p),default=0)
    if not finite(margin) or margin<width/2:fail('Rail profile does not fit within the measured supporting face.')
    low,high=t.get('bottomZ'),t.get('topZ')
    if not finite(low) or not finite(high) or low>high or clearance is None or point['base']['z']+clearance<low-1e-8 or point['top']['z']>high+1e-8:fail('Rail height and bottom clearance must fit the measured supporting face.')
    return issues
