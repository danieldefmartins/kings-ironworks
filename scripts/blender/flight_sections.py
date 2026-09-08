"""Continuous cap rail per flight. Missing fitting decisions remain explicit."""
import math
from cut_geometry import parallel_end_cuts


def apply_flight_sections(payload,result):
    from assembly import profile,inches,envelope,moved,distance
    data=payload['measurements'];fab=data.get('fab',{});members=result['members'];issues=result['issues']
    if fab.get('topRailConstruction','continuous_per_flight')!='continuous_per_flight':return result
    groups={}
    for p in payload['posts']:
        if p.get('pointType')=='railing_post' and data['segments'][p['segment']]['kind']=='flight':groups.setdefault((p['segment'],p['side']),[]).append(p)
    result['sections']=[];result['cut_parts']=[]
    for (segment,side),posts in sorted(groups.items()):
        if len(posts)<2:continue
        surfaces=[s for s in payload['surfaces'] if s['segment']==segment]
        if any(s.get('winder') for s in data['segments'][segment].get('steps',[])):continue
        start,end=surfaces[0]['corners'][:2];dx,dy=end['x']-start['x'],end['y']-start['y'];mag=math.hypot(dx,dy)
        if mag<=0:continue
        hx,hy=dx/mag,dy/mag
        along=lambda p:p['x']*hx+p['y']*hy
        posts.sort(key=lambda p:along(p['base']))
        first,last=posts[0],posts[-1];run=along(last['base'])-along(first['base'])
        if run<=0:continue
        rise=last['top']['z']-first['top']['z'];slope=rise/run;theta=math.atan(slope);cos=math.cos(theta)
        mark=f'F{segment+1:02d}-{side[0].upper()}';part=mark+'-T'
        top=profile(data.get('materials',{}).get('topRail',''));post_profile=profile(data.get('materials',{}).get('post',''))
        concerns=[]
        def missing(s):concerns.append(s);issues.append(mark+': '+s)
        if any(abs(p['top']['z']-(first['top']['z']+slope*(along(p['base'])-along(first['base']))))>1/32 or abs((p['base']['x']-first['base']['x'])*hy-(p['base']['y']-first['base']['y'])*hx)>1/32 for p in posts):
            missing('Measured supports do not lie on one straight rail plane; resolve the fit before cutting.')
        if any(p['provisional'] for p in posts):missing('Resolve provisional post coordinates before cutting.')
        ext0=inches(fab.get('topRailStartExtension'));ext1=inches(fab.get('topRailEndExtension'));gap=inches(fab.get('postTopGap'))
        datum=fab.get('railHeightDatum');cut=fab.get('topRailEndCut')
        if not top or top['round']:missing('Continuous cap detail requires an explicit rectangular profile, width across x depth in elevation.')
        if not post_profile or post_profile['round'] or post_profile['width']!=post_profile['depth']:missing('Post fit currently requires a square post profile; other orientations require detailing.')
        if datum!='finished_top_at_post':missing('Confirm rail height is to the finished top, from the finished surface under each post.')
        if ext0 is None or ext1 is None:missing('Record both horizontal cap extensions beyond the end post outer faces, including zero.')
        if cut not in ('plumb','square'):missing('Define cap end cuts, or detail the connection-specific ends.')
        if gap is None:missing('Record the vertical fitting gap between each post and cap underside, including zero.')
        impossible_fit=bool(top and gap is not None and any(p['top']['z']-p['base']['z']<=top['depth']/cos+gap for p in posts))
        if impossible_fit:missing('Cap depth and fitting gap leave no positive post height.')
        # Join all cap references into one part, even while end fitting is unresolved.
        a=dict(first['top']);b=dict(last['top'])
        can_fit=not impossible_fit and top and not top['round'] and post_profile and not post_profile['round'] and post_profile['width']==post_profile['depth'] and datum=='finished_top_at_post'
        if can_fit:
            e0=post_profile['width']/2+(ext0 or 0);e1=post_profile['width']/2+(ext1 or 0)
            a=dict(a,x=a['x']-hx*e0,y=a['y']-hy*e0,z=a['z']-slope*e0)
            b=dict(b,x=b['x']+hx*e1,y=b['y']+hy*e1,z=b['z']+slope*e1)
            for p in (a,b):
                if cut=='square':
                    p['x']+=hx*math.sin(theta)*top['depth']/2;p['y']+=hy*math.sin(theta)*top['depth']/2;p['z']-=cos*top['depth']/2
                else:p['z']-=top['depth']/(2*cos)
        vertices,faces=envelope(a,b,top) if top else ([],[])
        if can_fit and cut=='plumb':
            axis=(hx*cos,hy*cos,math.sin(theta));normal=(-hx*math.sin(theta),-hy*math.sin(theta),cos)
            for i,v in enumerate(vertices):
                center=a if i<len(vertices)//2 else b
                depth=sum((v[k]-center[k])*normal[j] for j,k in enumerate(('x','y','z')))
                for j,k in enumerate(('x','y','z')):v[k]+=axis[j]*depth*math.tan(theta)
        baymarks={bay['mark'] for bay in result['bays'] if bay['segment']==segment and bay['side']==side}
        members[:]=[m for m in members if not (m['kind']=='Top rail' and m['mark'].split('-T')[0] in baymarks)]
        member=dict(mark=part,kind='Top rail',a=a,b=b,profile=data['materials'].get('topRail') or 'VERIFY',section=top,segment=segment,length=distance(a,b),vertices=vertices,faces=faces,provisional=bool(concerns))
        members.append(member)
        result['sections'].append(dict(mark=mark,segment=segment,side=side,topRail=part,posts=[p['label'] for p in posts],pitchDeg=math.degrees(theta),construction='Continuous top rail; one fabricated section per flight',issues=concerns))
        if can_fit and gap is not None:
            for p in posts:
                m=next((m for m in members if m['mark']==p['label']),None)
                if not m or not m['vertices']:continue
                underside=first['top']['z']+slope*(along(p['base'])-along(first['base']))-top['depth']/cos-gap
                m['b']=dict(m['b'],z=underside)
                m['vertices'],m['faces']=envelope(m['a'],m['b'],post_profile)
                # Orient the square post faces to the flight, then trim the top to the cap.
                n=len(m['vertices'])//2
                for i,v in enumerate(m['vertices']):
                    x,y=v['x']-p['base']['x'],v['y']-p['base']['y']
                    v['x']=p['base']['x']+hx*x-hy*y;v['y']=p['base']['y']+hy*x+hx*y
                    if i>=n:v['z']=underside+slope*x
                m['length']=distance(m['a'],m['b']);m['provisional']=True
                m['topFit']={'angleDeg':math.degrees(theta),'aboveSurfaceShort':min(v['z'] for v in m['vertices'][n:])-p['base']['z'],'aboveSurfaceLong':max(v['z'] for v in m['vertices'][n:])-p['base']['z'],'verticalGap':gap}
            for m in members:
                if m['kind']=='Picket' and m['mark'].split('-I')[0] in baymarks:
                    m['b']=moved(m['b'],-top['depth']/(2*cos));m['length']=distance(m['a'],m['b']);m['vertices'],m['faces']=envelope(m['a'],m['b'],m['section']) if m['section'] else ([],[])
        if not concerns:
            detail=parallel_end_cuts(member['length'],top['depth'],math.degrees(theta) if cut=='plumb' else 0)
            result['cut_parts'].append(dict(mark=part,profile=member['profile'],quantity=1,**detail,section=mark,notes='Geometric cut shape only. Confirm stock wall thickness/material and final section connection before release.'))
    return result
