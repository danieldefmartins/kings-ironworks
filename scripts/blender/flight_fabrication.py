"""Rectangular flight fitting, only from explicitly recorded face and gap datums."""
import math
from cut_geometry import rail_between_plumb_faces, vertical_picket_between_parallel_faces

def add_flight_fabrication(payload,assembly):
    from assembly import inches,profile,envelope,distance
    data=payload['measurements'];fab=data.get('fab',{});members=assembly['members']
    assembly['post_cuts']=[];assembly['picket_layouts']=[]
    lookup={p['label']:p for p in payload['posts']}
    member_lookup={m['mark']:m for m in members}
    for section in assembly.get('sections',[]):
        if section['issues']:continue
        for label in section['posts']:
            m=member_lookup.get(label);p=lookup[label];source=p.get('sourcePost',{})
            if not m or not m.get('topFit'):continue
            embed=inches(source.get('embedment'))
            if source.get('mount')!='Core-drill' or embed is None:
                assembly['issues'].append(label+': record core-drill embedment, or detail the selected mounting construction before full post cutting.')
                continue
            if embed<=0:
                assembly['issues'].append(label+': core-drill embedment must be greater than zero.')
                continue
            base=p['base']['z'];m['a']=dict(m['a'],z=base-embed)
            for v in m['vertices'][:len(m['vertices'])//2]:v['z']=base-embed
            m['length']=distance(m['a'],m['b'])
            detail=dict(mark=label,section=section['mark'],profile=m['profile'],embedment=embed,
                        shortLength=m['topFit']['aboveSurfaceShort']+embed,longLength=m['topFit']['aboveSurfaceLong']+embed,
                        stockLength=m['topFit']['aboveSurfaceLong']+embed,topCutDeg=abs(m['topFit']['angleDeg']),
                        bottomCutDeg=0,width=m['section']['width'],datum='Finished support surface; embedment extends below it')
            m['postCut']=detail;m['provisional']=False;assembly['post_cuts'].append(detail)
        if fab.get('bottomRailConstruction')!='between_posts':continue
        bottom_gap=inches(fab.get('bottomRailEndGap'));picket_gap=inches(fab.get('picketEndGap'))
        if bottom_gap is None:assembly['issues'].append(section['mark']+': record horizontal bottom-rail end gaps.');continue
        if fab.get('infill')!='vertical pickets' or fab.get('picketSpacingDatum')!='max_clear_horizontal':
            assembly['issues'].append(section['mark']+': confirm vertical pickets and maximum horizontal clear spacing for fabrication.');continue
        if picket_gap is None:assembly['issues'].append(section['mark']+': record vertical picket end gaps.');continue
        post_shape=profile(data['materials'].get('post'));top_shape=profile(data['materials'].get('topRail'))
        picket_shape=profile(data['materials'].get('picket'));bottom_shape=profile(data['materials'].get('bottomRail'))
        if not all((post_shape,top_shape,picket_shape,bottom_shape)) or any(s['round'] for s in (post_shape,top_shape,picket_shape,bottom_shape)) or picket_shape['width']!=picket_shape['depth']:
            assembly['issues'].append(section['mark']+': detailed fitting requires rectangular rails and square vertical pickets.');continue
        clearance=inches(fab.get('bottomClearance'))
        if clearance is None:continue
        for bay in [b for b in assembly['bays'] if b['segment']==section['segment'] and b['side']==section['side']]:
            p,q=lookup[bay['start']],lookup[bay['end']];a,b=p['base'],q['base']
            run=math.hypot(b['x']-a['x'],b['y']-a['y']);hx=(b['x']-a['x'])/run;hy=(b['y']-a['y'])/run
            slope=(b['z']-a['z'])/run;factor=math.hypot(1,slope);theta=math.atan(slope)
            lower=member_lookup.get(bay['mark']+'-B')
            if not lower:continue
            try:cut=rail_between_plumb_faces(run-post_shape['width'],slope*(run-post_shape['width']),bottom_shape['depth'],bottom_gap)
            except ValueError as e:assembly['issues'].append(bay['mark']+': '+str(e));continue
            offset=post_shape['width']/2+bottom_gap
            def axis_at(u,z):return dict(x=a['x']+hx*u,y=a['y']+hy*u,z=a['z']+slope*u+z)
            lower['a']=axis_at(offset,clearance+bottom_shape['depth']*factor/2)
            lower['b']=axis_at(run-offset,clearance+bottom_shape['depth']*factor/2)
            lower['vertices'],lower['faces']=envelope(lower['a'],lower['b'],bottom_shape)
            axis=(hx/factor,hy/factor,slope/factor);normal=(-hx*slope/factor,-hy*slope/factor,1/factor)
            for i,v in enumerate(lower['vertices']):
                center=lower['a'] if i<4 else lower['b']
                d=sum((v[k]-center[k])*normal[j] for j,k in enumerate(('x','y','z')))
                for j,k in enumerate(('x','y','z')):v[k]+=axis[j]*d*slope
            lower['length']=distance(lower['a'],lower['b']);lower['provisional']=False
            assembly['cut_parts'].append(dict(mark=lower['mark'],kind='Bottom rail',profile=lower['profile'],quantity=1,section=section['mark'],notes='Between plumb post faces; end gaps measured horizontally. '+str(bottom_gap)+' inch each end.',**cut))
            pickets=[m for m in members if m['kind']=='Picket' and m['mark'].startswith(bay['mark']+'-I')]
            layout=[]
            for m in pickets:
                u=(m['a']['x']-a['x'])*hx+(m['a']['y']-a['y'])*hy
                bottom=a['z']+slope*u+clearance+bottom_shape['depth']*factor
                top=p['top']['z']+slope*u-top_shape['depth']*factor
                try:cut=vertical_picket_between_parallel_faces(top-bottom,math.degrees(theta),picket_shape['depth'],picket_gap)
                except ValueError as e:assembly['issues'].append(m['mark']+': '+str(e));continue
                m['a']=dict(m['a'],z=bottom+picket_gap);m['b']=dict(m['b'],z=top-picket_gap)
                m['vertices'],m['faces']=envelope(m['a'],m['b'],picket_shape)
                for v in m['vertices']:
                    dx=v['x']-m['a']['x'];dy=v['y']-m['a']['y']
                    v['x']=m['a']['x']+hx*dx-hy*dy;v['y']=m['a']['y']+hy*dx+hx*dy;v['z']+=slope*dx
                m['length']=distance(m['a'],m['b']);m['provisional']=False
                assembly['cut_parts'].append(dict(mark=m['mark'],kind='Picket',profile=m['profile'],quantity=1,section=section['mark'],notes='Vertical member. Parallel raked end faces; '+str(picket_gap)+' inch vertical gap to each rail face.',**cut))
                layout.append(dict(mark=m['mark'],centerFromStartPostFace=u-post_shape['width']/2))
            if layout:
                clear=run-post_shape['width'];width=picket_shape['depth'];gap=layout[0]['centerFromStartPostFace']-width/2
                assembly['picket_layouts'].append(dict(bay=bay['mark'],section=section['mark'],startPost=p['label'],endPost=q['label'],clearWidth=clear,quantity=len(layout),equalClearGap=gap,picketWidth=width,centers=layout))
                assembly['issues'][:]=[i for i in assembly['issues'] if not i.startswith(bay['mark']+': infill preview treats')]
    return assembly
