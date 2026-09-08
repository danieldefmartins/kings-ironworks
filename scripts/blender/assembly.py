"""Deterministic railing envelopes shared by Blender and vector shop sheets.

No profile or connection size is invented. Member lengths are geometry references,
not saw lengths: end treatments and joint allowances remain explicit shop review.
"""
import math
import re
from fractions import Fraction


def inches(value):
    text=str(value or '').strip().lower()
    for glyph, fraction in [('½',' 1/2'),('¼',' 1/4'),('¾',' 3/4'),('⅛',' 1/8'),('⅜',' 3/8'),('⅝',' 5/8'),('⅞',' 7/8')]:
        text=text.replace(glyph,fraction)
    text=re.sub(r'\s*(?:inches|inch|in|["″])\s*$', '', text).strip()
    if not re.fullmatch(r'\d+(?:\.\d+)?(?:\s+\d+/\d+)?|\d+/\d+',text):return None
    try:
        result=sum(float(Fraction(v)) for v in text.split())
        return result if math.isfinite(result) and result>=0 else None
    except (ValueError,ZeroDivisionError):return None


def profile(spec):
    """Parse unambiguous common inch profiles; retain original shop specification."""
    text=str(spec or '').lower().replace('×','x')
    text=re.sub(r'\b(?:hss|tube|square|rectangular|solid|flat|bar|round|pipe|diameter|dia)\b|[Øø]', '',text).strip()
    parts=text.split('x');dims=[inches(p) for p in parts]
    if not dims or any(v is None or v<=0 or v>24 for v in dims) or len(dims)>3:return None
    round_=bool(re.search(r'round|pipe|diameter|\bdia\b|[Øø]',str(spec),re.I))
    if len(dims)==1 and not (round_ or 'square' in str(spec).lower()):return None
    return {'width':dims[0],'depth':dims[1] if len(dims)>1 else dims[0],'round':round_,'spec':spec}


def fmt(value):
    n=round(abs(value)*16);whole,rem=divmod(n,16)
    return ('-' if value<0 else '')+(str(whole) if whole or not rem else '')+(' ' if whole and rem else '')+(str(Fraction(rem,16)) if rem else '')+'"'


def xyz(p):return [p[k] for k in ('x','y','z')]
def point(v):return dict(zip(('x','y','z'),v))
def mix(a,b,t):return {k:a[k]+(b[k]-a[k])*t for k in ('x','y','z')}
def moved(a,z):return dict(a,z=a['z']+z)
def distance(a,b):return math.dist(xyz(a),xyz(b))


def envelope(a,b,section):
    axis=[b[k]-a[k] for k in ('x','y','z')];length=math.sqrt(sum(x*x for x in axis))
    if length<1e-6:return [],[]
    axis=[v/length for v in axis];h=math.hypot(axis[0],axis[1])
    u=[-axis[1]/h,axis[0]/h,0] if h>1e-8 else [1,0,0]
    v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]]
    ring=([(math.cos(i*math.pi/8),math.sin(i*math.pi/8)) for i in range(16)] if section['round'] else [(-1,-1),(1,-1),(1,1),(-1,1)])
    vertices=[point([p[k]+u[j]*x*section['width']/2+v[j]*y*section['depth']/2 for j,k in enumerate(('x','y','z'))]) for p in (a,b) for x,y in ring]
    n=len(ring);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return vertices,faces


def build_assembly(payload):
    data=payload['measurements'];materials=data.get('materials',{});fab=data.get('fab',data.get('fabrication',{}))
    issues=[{'drawingNoGeometry':'This project type requires custom geometry detailing. Recorded dimensions are included in the specifications.', 'landingDrawingOpen':'Complete the landing connection measurements.', 'drawingGeometryOpen':'Resolve provisional surface measurements.', 'drawingPostsOpen':'Complete post positions and measurement reference datums.', 'drawingProfilesOpen':'Complete rail height and member profiles.', 'drawingConnectionsOpen':'Complete mounting and anchor specifications.', 'drawingJointsOpen':'Complete segment joint methods and allowances.'}.get(i,i) for i in payload.get('issues',[])];members=[];bays=[]
    def issue(s):
        if s not in issues:issues.append(s)
    def add(mark,kind,a,b,spec,segment,provisional=False):
        if distance(a,b)<1e-6:return
        if len(members)>=20000:raise ValueError('Assembly exceeds 20000 members')
        section=profile(spec)
        if not section:issue(f'{kind}: specify an unambiguous inch profile (recorded: {spec or "missing"}).')
        vertices,faces=envelope(a,b,section) if section else ([],[])
        members.append(dict(mark=mark,kind=kind,a=a,b=b,profile=spec or 'VERIFY',section=section,segment=segment,length=distance(a,b),vertices=vertices,faces=faces,provisional=provisional))
    posts=[p for p in payload.get('posts',[]) if p.get('pointType')=='railing_post']
    for p in posts:add(p['label'],'Post',p['base'],p['top'],materials.get('post',''),p['segment'],p['provisional'])
    groups={}
    for p in posts:groups.setdefault((p['segment'],p['side']),[]).append(p)
    for (segment,side),group in sorted(groups.items()):
        surfaces=[s for s in payload['surfaces'] if s['segment']==segment]
        if not surfaces:continue
        a,b=surfaces[0]['corners'][:2];dx,dy=b['x']-a['x'],b['y']-a['y']
        group.sort(key=lambda p:(p['base']['x']-a['x'])*dx+(p['base']['y']-a['y'])*dy)
        seg=data['segments'][segment]
        if seg.get('kind')=='curve' or any(s.get('winder') for s in seg.get('steps',[])):
            issue(f'Segment {segment+1}: curved/winder rail development needs shop detailing; straight chords are not fabricated rails.');continue
        for p,q in zip(group,group[1:]):
            mark=f'R{len(bays)+1:02d}';provisional=p['provisional'] or q['provisional']
            bays.append(dict(mark=mark,segment=segment,side=side,start=p['label'],end=q['label']))
            # Saved post tops define a rail reference line; face offsets are not assumed.
            add(mark+'-T','Top rail',p['top'],q['top'],materials.get('topRail',''),segment,provisional)
            if data.get('rail',{}).get('kind')=='Handrail':continue
            if fab.get('infill','').strip().lower() not in ('','vertical','vertical pickets'):
                issue(f'{mark}: custom infill specification requires detailing; no default pickets substituted.');continue
            lower=profile(materials.get('bottomRail',''));upper=profile(materials.get('topRail',''));picket=profile(materials.get('picket',''));post=profile(materials.get('post',''))
            clearance=inches(fab.get('bottomClearance'));spacing=inches(materials.get('picketSpacing'))
            if clearance is None or not lower:
                issue(f'{mark}: bottom rail profile and bottom clearance are required for infill layout.');continue
            run=math.hypot(q['base']['x']-p['base']['x'],q['base']['y']-p['base']['y'])
            if run<1e-6:issue(f'{mark}: coincident post plan locations.');continue
            slope=(q['base']['z']-p['base']['z'])/run;factor=math.sqrt(1+slope*slope)
            low_a=moved(p['base'],clearance+lower['depth']*factor/2);low_b=moved(q['base'],clearance+lower['depth']*factor/2)
            add(mark+'-B','Bottom rail',low_a,low_b,materials.get('bottomRail',''),segment,provisional)
            if not all((upper,picket,post)) or spacing is None or spacing<=0:
                issue(f'{mark}: post, top rail and picket profiles plus numeric clear picket spacing are required.');continue
            # Recorded spacing lacks a clear/center convention: never silently resolve it.
            issue(f'{mark}: infill preview treats picket spacing as maximum horizontal clear opening; confirm spacing convention and rail face datums.')
            clear=run-post['width'];count=max(0,math.ceil((clear-spacing)/(picket['width']+spacing)))
            if count>1000:issue(f'{mark}: picket count exceeds drawing limit.');continue
            gap=(clear-count*picket['width'])/(count+1)
            if gap<0:issue(f'{mark}: picket profile does not fit between posts.');continue
            for i in range(count):
                t=(post['width']/2+gap+picket['width']/2+i*(gap+picket['width']))/run
                bottom=moved(mix(low_a,low_b,t),lower['depth']*factor/2)
                top=moved(mix(p['top'],q['top'],t),-upper['depth']*factor/2)
                if top['z']<=bottom['z']:issue(f'{mark}: infill height is not positive.');break
                add(f'{mark}-I{i+1:02d}','Picket',bottom,top,materials.get('picket',''),segment,True)
    for t in payload.get('transitions',[]):
        for i,(a,b) in enumerate(zip(t['points'],t['points'][1:])):add(f'{t["label"]}-{i+1}','Transition',a,b,materials.get('topRail',''),None,t['provisional'])
    if data.get('rail',{}).get('kind')=='Both':issue('Separate graspable handrail, brackets and returns require detailing in addition to the guard assembly.')
    if not posts:issue('No measured railing posts: add supports before a complete railing assembly can be generated.')
    issue('Member lengths are reference-axis lengths, not saw cut lengths. Confirm rail face offsets, end cuts, weld gaps, embedment and joint allowances before fabrication.')
    from flight_sections import apply_flight_sections
    return apply_flight_sections(payload,dict(members=members,bays=bays,issues=issues))
