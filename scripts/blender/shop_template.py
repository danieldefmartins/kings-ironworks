"""KIW project-scaled sheet set: arrangements, assemblies, schedules and review."""
import math
import textwrap
from pathlib import Path
from drawing_sheets import Page, project, save_pdf
from assembly import build_assembly, fmt, inches, mix


def wrapped(page,x,y,text,width=28,size=9):
    lines=textwrap.wrap(str(text),width) or ['']
    for line in lines:page.text(x,y,line,size);y+=size+4
    return y


def frame(page,payload,title,mark,index,total):
    page.line([(24,24),(1200,24),(1200,768),(24,768),(24,24)],'#202020',.8)
    page.line([(1030,24),(1030,768)],'#202020',.8)
    page.text(1043,60,'KING',28);page.text(1043,83,'IRON WORKS',17)
    page.text(1043,109,'CUSTOM SHOP DRAWINGS',8)
    for y in (130,260,365,485,600,686):page.line([(1030,y),(1200,y)],'#202020',.6)
    page.text(1043,149,'PROJECT',8);wrapped(page,1043,170,payload['title'],24,10)
    page.text(1043,280,'DRAWING',8);wrapped(page,1043,300,title,26,10)
    page.text(1043,386,'ISSUE STATUS',8);wrapped(page,1043,407,'SHOP REVIEW / NOT RELEASED',24,10)
    wrapped(page,1043,450,'Generated from saved measurements. Resolve listed open items.',28,8)
    page.text(1043,508,'SOURCE REVISION',8);wrapped(page,1043,528,payload.get('sourceUpdatedAt',''),24,8)
    page.text(1043,570,'UNITS: INCHES',9)
    page.text(1043,622,'SCALE: VIEW DEPENDENT',8);page.text(1043,642,'PRINT AT 100% / 17 x 11',8)
    page.text(1043,664,'DIMENSIONS GOVERN',8);page.text(1043,721,mark,24);page.text(1043,746,f'SHEET {index} OF {total}',9)
    page.text(40,747,'KIW | '+payload['id']+' | Reference lengths require shop detailing before cutting.',8)


def draw_view(page,payload,assembly,view,box,title,segment=None):
    x,y,w,h=box
    surfaces=[s for s in payload['surfaces'] if segment is None or s['segment']==segment]
    members=[m for m in assembly['members'] if segment is None or m['segment']==segment]
    heading=0
    if segment is not None and surfaces:
        a,b=surfaces[0]['corners'][:2];heading=math.atan2(b['y']-a['y'],b['x']-a['x'])
    coords=[p for s in surfaces for p in s['corners']]+[p for m in members for p in (m['vertices'] or [m['a'],m['b']])]
    if not coords:page.text(x+15,y+30,'No measured geometry for this view.',10);return
    pts=[project(p,view,heading) for p in coords];minx=min(p[0] for p in pts);maxx=max(p[0] for p in pts);miny=min(p[1] for p in pts);maxy=max(p[1] for p in pts)
    fit=min((w-90)/max(1,maxx-minx),(h-115)/max(1,maxy-miny))
    denominator=next((d for d in (1,2,4,8,12,16,24,32,48,64,96,128,192,256,384,512,1024) if 72/d<=fit),max(1024,math.ceil(72/fit)))
    scale=72/denominator
    ox=x+(w-(maxx-minx)*scale)/2;oy=y+35+(h-110-(maxy-miny)*scale)/2
    def xy(p):
        a,b=project(p,view,heading);return ox+(a-minx)*scale,oy+(b-miny)*scale
    for s in surfaces:
        a,b,c,d=s['corners']
        if view=='side':page.line([xy(dict(a,z=a['z']-s.get('riseDepth',0))),xy(a),xy(b)],'#a3a3a3',.6)
        else:page.line([xy(p) for p in (a,b,c,d,a)],'#b0b0b0',.5)
    for wall in payload.get('walls',[]):
        if segment is None or wall['segment']==segment:page.line([xy(p) for p in wall['points']],'#888888',1.5)
    for m in members:
        color='#777777' if m['provisional'] else '#181818'
        if m['vertices']:
            edges=set()
            for face in m['faces']:
                for a,b in zip(face,face[1:]+face[:1]):edges.add(tuple(sorted((a,b))))
            for a,b in edges:page.line([xy(m['vertices'][a]),xy(m['vertices'][b])],color,.55)
        else:page.line([xy(m['a']),xy(m['b'])],'#b45309',.8)
        if segment is not None and m['kind'] in ('Post','Top rail'):
            p=xy(m['b'] if m['kind']=='Post' else {k:(m['a'][k]+m['b'][k])/2 for k in ('x','y','z')});page.text(p[0]+3,p[1]-7,m['mark'],8)
            if m['kind']=='Top rail':page.dimension(xy(m['a']),xy(m['b']),fmt(math.hypot(m['b']['x']-m['a']['x'],m['b']['y']-m['a']['y']) if view=='plan' else m['length'])+(' PLAN' if view=='plan' else ' REF'),-22)
    if segment is not None:
        posts=[p for p in payload['posts'] if p['segment']==segment]
        if posts and view=='side':
            for i,post in enumerate(posts):
                at=xy(post['base']);end=(at[0],at[1]+25+(i%2)*16)
                page.line([at,end],'#777777',.5)
                page.text(end[0]+3,end[1],'FIRST -> '+post['label']+': '+(post.get('firstStepToPostEdge') or 'VERIFY')+' FIELD',7)
            p=posts[0];page.dimension(xy(p['base']),xy(p['top']),fmt(p['top']['z']-p['base']['z'])+' AXIS HT',-30)
    if segment is not None and view=='plan':
        for post in [p for p in payload['posts'] if p['segment']==segment][:1]:
            source=post.get('sourcePost',{})
            surface=next((s for s in surfaces if s.get('step')==source.get('stepIdx')),None)
            if surface:
                c=surface['corners'];a,b=(c[3],c[2]) if post['side']=='right' else (c[0],c[1])
                along=inches(source.get('fromNosing') if source.get('stepIdx') is not None else source.get('pos'))
                run=math.hypot(b['x']-a['x'],b['y']-a['y'])
                if along is not None and run:
                    edge=mix(a,b,along/run)
                    page.dimension(xy(edge),xy(post['base']),(source.get('fromEdge') or 'VERIFY')+' in',50)
    page.text(x+12,y+h-30,title,12);page.text(x+12,y+h-14,f'SCALE 1:{denominator} | '+('AXONOMETRIC REFERENCE' if view=='iso' else 'DIMENSIONS IN INCHES'),8)


def table_pages(rows,headings,widths,title,prefix,pages):
    # Row heights follow wrapped cells. Repeat headers on every continuation sheet.
    page=None;y=0
    for row in rows:
        cells=[textwrap.wrap(str(v),max(5,int(width/5.1))) or ['-'] for v,width in zip(row,widths)]
        height=max(len(c) for c in cells)*12+12
        # Long freeform notes are split into continuation rows instead of overflowing.
        chunks=max(1,math.ceil(max(len(c) for c in cells)/35))
        for chunk in range(chunks):
            sliced=[c[chunk*35:(chunk+1)*35] for c in cells];height=max(1,max(len(c) for c in sliced))*12+12
            if page is None or y+height>710:
                page=Page();pages.append((page,title,f'{prefix}-{sum(1 for _,_,m in pages if m.startswith(prefix+"-"))+1:02d}'))
                page.text(42,55,title,16);x=42;y=88
                for label,width in zip(headings,widths):page.text(x+5,y,label,9);x+=width
                page.line([(42,96),(1010,96)],'#222222',.8);y=100
            x=42
            for lines,width in zip(sliced,widths):
                for i,line in enumerate(lines):page.text(x+5,y+13+i*12,line,9)
                x+=width
            y+=height;page.line([(42,y),(1010,y)],'#b0b0b0',.4)


def generate(payload,output):
    output=Path(output);assembly=build_assembly(payload);pages=[]
    p=Page();pages.append((p,'General arrangement','G-01'))
    p.text(42,53,'RAILING / GENERAL ARRANGEMENT',16)
    draw_view(p,payload,assembly,'plan',(36,65,480,320),'01 / PLAN')
    draw_view(p,payload,assembly,'iso',(526,65,490,320),'02 / ASSEMBLY VIEW')
    draw_view(p,payload,assembly,'side',(36,395,980,325),'03 / PROJECT ELEVATION')
    segments=sorted({s['segment'] for s in payload['surfaces']})
    for segment in segments:
        if not any(m['segment']==segment for m in assembly['members']):continue
        kind=payload['measurements']['segments'][segment]['kind'];p=Page();pages.append((p,f'Segment {segment+1} / {kind}',f'A-{segment+1:02d}'))
        p.text(42,54,f'SEGMENT {segment+1} / {kind.upper()} / ASSEMBLY',16)
        draw_view(p,payload,assembly,'side',(36,65,980,385),'01 / LOCAL ELEVATION',segment)
        draw_view(p,payload,assembly,'plan',(36,465,520,250),'02 / POST LAYOUT',segment)
        p.text(580,490,'ASSEMBLY REFERENCES',11)
        notes=['Post positions: see P schedule.','Post tops define rail reference axes.','Solid envelopes show recorded profiles.','Infill and end treatments: see open items.', 'Bottom clearance: '+(payload['measurements'].get('fab',{}).get('bottomClearance') or 'VERIFY')]
        bays=[b['mark'] for b in assembly['bays'] if b['segment']==segment]
        notes+=['Assemblies: '+(', '.join(bays) or 'No connected post bays')]
        y=516
        for note in notes:y=wrapped(p,580,y,note,62,9)+9
    grouped={}
    for m in assembly['members']:
        key=(m['kind'],m['profile'],round(m['length'],5),m['segment'],m['mark'].split('-I')[0] if m['kind']=='Picket' else m['mark'])
        grouped.setdefault(key,[]).append(m)
    member_rows=[]
    for group in grouped.values():
        m=group[0];marks=m['mark'] if len(group)==1 else m['mark']+' through '+group[-1]['mark']
        member_rows.append((marks,str(len(group)),m['kind'],m['profile'],fmt(m['length'])))
    table_pages(member_rows,['MARK','QTY','MEMBER','RECORDED PROFILE','AXIS LENGTH / REF'],[260,55,150,300,203],'Member schedule / reference lengths','M',pages)
    for i,t in enumerate(payload.get('transitions',[])):
        page=Page();pages.append((page,'Landing connection '+t['label'],f'D-{i+1:02d}'))
        page.text(42,55,'LANDING CONNECTION / '+t['label'],16)
        points=t['points'];start,end=points[0],points[-1]
        heading=math.atan2(end['y']-start['y'],end['x']-start['x'])
        for view,box,title in [('plan',(60,85,900,260),'01 / PLAN'),('side',(60,390,900,260),'02 / CONNECTION ELEVATION')]:
            x,y,w,h=box;pts=[project(p,view,heading) for p in points]
            lo=[min(p[k] for p in pts) for k in (0,1)];hi=[max(p[k] for p in pts) for k in (0,1)]
            scale=min((w-120)/max(1,hi[0]-lo[0]),(h-100)/max(1,hi[1]-lo[1]))
            xy=lambda p:(x+60+(p[0]-lo[0])*scale,y+40+(p[1]-lo[1])*scale)
            page.line([xy(p) for p in pts],'#222222',2)
            for j,(a,b) in enumerate(zip(points,points[1:])):
                length=math.dist([a[k] for k in (('x','y') if view=='plan' else ('x','y','z'))],[b[k] for k in (('x','y') if view=='plan' else ('x','y','z'))])
                page.dimension(xy(pts[j]),xy(pts[j+1]),t['label']+f'-{j+1} / '+fmt(length)+' REF',-22)
            page.text(x,y+h,title+' / NOT TO SCALE',11)
        page.text(65,687,'Rail reference path. See connection schedule for measured reaches, height difference and joint specifications.',9)
        page.text(65,708,'Connection profiles, miters and infill around the landing require shop detailing.',9)
    data=payload['measurements'];raw=[p.get('sourcePost',{}) for p in payload.get('posts',[])] or data.get('posts',[])
    rows=[]
    # Payload labels include non-railing support points; match the source order used by drawingPosts.
    for i,p in enumerate(raw):
        rows.append((payload['posts'][i]['label'] if payload.get('posts') else f'Record {i+1}',f"{p.get('segIdx',0)+1} / {p.get('side','')}",p.get('firstStepToPostEdge') or 'VERIFY',p.get('fromNosing') or 'VERIFY',p.get('fromEdge') or 'VERIFY',' | '.join(f'{k}: {p[k]}' for k in ('pointType','mount','plate','anchors','anchor','substrate','edgeDist') if p.get(k))))
    table_pages(rows,['POST','SEGMENT / SIDE','FIRST STEP TO EDGE','NOSING OFFSET','SIDE SETBACK','MOUNT / SPECIFICATION'],[65,110,145,115,110,423],'Post locations and mounting schedule','P',pages)
    connection_rows=[]
    labels={p.get('sourcePost',{}).get('id'):p['label'] for p in payload.get('posts',[]) if p.get('sourcePost',{}).get('id')}
    def fields(item,prefix=''):
        result=[]
        for key,value in item.items():
            if key=='id' or value in ('',None):continue
            label=__import__('re').sub(r'(?<!^)(?=[A-Z])',' ',key).capitalize()
            if isinstance(value,dict):result.extend(fields(value,prefix+label+' / '))
            elif isinstance(value,list):
                for i,v in enumerate(value):
                    if isinstance(v,dict):result.extend(fields(v,prefix+label+f' {i+1} / '))
            else:result.append((prefix+label,labels.get(value,value) if isinstance(value,str) else str(value)))
        return result
    for key in ('landingTransitions','joints','spans'):
        for i,item in enumerate(data.get(key,[])):
            details=fields(item)
            label={'landingTransitions':'T','joints':'J','spans':'Span '}[key]+str(i+1)
            if details:connection_rows.append((label,' | '.join(name+': '+str(value) for name,value in details)))
    table_pages(connection_rows,['CONNECTION','RECORDED CONNECTION DATA'],[180,788],'Connections / recorded fabrication details','C',pages)
    spec_rows=[(section,key,str(value)) for section in ('rail','materials','fab','datums','overall','finish') for key,value in data.get(section,{}).items() if value not in ('',None,False)]
    for section in ('spiral','well','fire','gate','fence','balcony','deck','plan'):
        if data.get(section):spec_rows.extend((section,key,value) for key,value in fields(data[section]))
    table_pages(spec_rows,['SECTION','PROPERTY','RECORDED SPECIFICATION'],[140,190,638],'Project specifications','S',pages)
    table_pages([(f'{i+1:02d}',issue) for i,issue in enumerate(assembly['issues'])],['ITEM','RESOLVE BEFORE FABRICATION'],[65,903],'Open items / fabrication review','V',pages)
    for i,(page,title,mark) in enumerate(pages,1):frame(page,payload,title,mark,i,len(pages));page.save_svg(output/f'sheet-{i:02d}.svg')
    save_pdf([p for p,_,_ in pages],output/'shop-drawings.pdf')
    import json,csv
    (output/'assembly.json').write_text(json.dumps(assembly,indent=2))
    with (output/'member-schedule.csv').open('w',newline='') as f:
        writer=csv.writer(f);writer.writerow(['Mark','Member','Profile','Reference axis length (in)','Not saw cut length'])
        for m in assembly['members']:writer.writerow([m['mark'],m['kind'],m['profile'],round(m['length'],4),'SHOP DETAILING REQUIRED'])
    return len(pages)
