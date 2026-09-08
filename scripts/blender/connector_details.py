"""Reference stations and weld identification for no-post landing connectors."""
import math


def add_connector_details(payload,assembly):
    sections=assembly.get('sections',[]);welds=[]
    for t in payload.get('transitions',[]):
        source=t.get('source',{});side=source.get('side')
        lower=next((s for s in sections if s['segment']==t.get('lowerSegment') and s['side']==side),None)
        upper=next((s for s in sections if s['segment']==t.get('upperSegment') and s['side']==side),None)
        points=t['points']
        for i,point in enumerate(points):
            left=lower['topRail'] if i==0 and lower else f'{t["label"]}-{i}' if i else 'Lower flight / identify'
            right=upper['topRail'] if i==len(points)-1 and upper else f'{t["label"]}-{i+1}' if i<len(points)-1 else 'Upper flight / identify'
            mark=f'{t["label"]}-W{i+1}'
            welds.append(dict(mark=mark,joins=f'{left} to {right}',point=point,location=source.get('weldLocation') or 'SPECIFY',type=source.get('weldType') or 'SPECIFY',size=source.get('weldSize') or 'SPECIFY',preparation=source.get('jointPreparation') or 'SPECIFY END PREPARATION'))
        if not all(source.get(k) for k in ('weldLocation','weldType','weldSize','jointPreparation')):
            assembly['issues'].append(t['label']+': record weld location, type, size and joint preparation for the numbered connector joints.')
        # Match reference endpoints to the cap top faces for the supported plumb detail.
        for section,p,which in ((lower,points[0],'end'),(upper,points[-1],'start')):
            if not section:continue
            member=next(m for m in assembly['members'] if m['mark']==section['topRail'])
            source_post=next((post for post in payload['posts'] if post.get('sourcePost',{}).get('id')==source.get('lowerPostId' if which=='end' else 'upperPostId')),None)
            if not source_post:continue
            if payload['measurements'].get('fab',{}).get('topRailEndCut')=='plumb' and member.get('vertices'):
                # Any end cap top-face vertex has the same z and longitudinal
                # station, although lateral coordinates differ by rail width.
                end=member['b'] if which=='end' else member['a']
                if math.hypot(end['x']-p['x'],end['y']-p['y'])>.01:
                    assembly['issues'].append(t['label']+': connector station does not meet '+section['topRail']+'; resolve cap end registration.')
    assembly['welds']=welds
    return assembly
