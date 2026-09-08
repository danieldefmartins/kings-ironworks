"""Dependency-free vector PDF/SVG draft sheets from the same inch geometry as Blender."""
import math
import textwrap
from html import escape
from pathlib import Path

W, H = 1224, 792  # ANSI B, 17 x 11 inches


def ascii_text(value):
    return str(value).replace('→', ' -> ').replace('″', ' in').replace('½', ' 1/2').replace('¼', ' 1/4').replace('¾', ' 3/4').encode('latin-1', 'replace').decode('latin-1')


class Page:
    def __init__(self):
        self.pdf, self.svg = [], []

    def line(self, points, color='#334155', width=1, fill=None):
        rgb = tuple(int(color[i:i+2], 16)/255 for i in (1, 3, 5))
        command = f'{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} RG {width:.2f} w '
        command += ' '.join(f'{x:.2f} {H-y:.2f} {"m" if i == 0 else "l"}' for i, (x, y) in enumerate(points))
        if fill:
            c = tuple(int(fill[i:i+2], 16)/255 for i in (1, 3, 5))
            command += f' h {c[0]:.3f} {c[1]:.3f} {c[2]:.3f} rg B'
        else:
            command += ' S'
        self.pdf.append(command)
        self.svg.append(f'<polyline points="{" ".join(f"{x:.2f},{y:.2f}" for x,y in points)}" fill="{fill or "none"}" stroke="{color}" stroke-width="{width}"/>')

    def text(self, x, y, value, size=10, color='#0f172a'):
        value = ascii_text(value)
        safe = value.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        rgb = tuple(int(color[i:i+2], 16)/255 for i in (1, 3, 5))
        self.pdf.append(f'BT /F1 {size} Tf {rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} rg 1 0 0 1 {x:.2f} {H-y:.2f} Tm ({safe}) Tj ET')
        self.svg.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}">{escape(value)}</text>')

    def dimension(self, a, b, label, offset=20):
        dx, dy = b[0]-a[0], b[1]-a[1]
        length = math.hypot(dx, dy)
        if length < 4:
            return
        nx, ny = -dy/length, dx/length
        c, d = (a[0]+nx*offset,a[1]+ny*offset), (b[0]+nx*offset,b[1]+ny*offset)
        for points in ([a,c], [b,d], [c,d]):
            self.line(points, '#64748b', .5)
        for p in (c,d):
            self.line([(p[0]-3,p[1]-3),(p[0]+3,p[1]+3)], '#64748b', .7)
        self.text((c[0]+d[0])/2+3, (c[1]+d[1])/2-3, label, 8)

    def save_svg(self, path):
        Path(path).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="17in" height="11in" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial, sans-serif">'+''.join(self.svg)+'</g></svg>')


def save_pdf(pages, path):
    objects = [b'', b'', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']
    kids = []
    for page in pages:
        stream = '\n'.join(page.pdf).encode('latin-1')
        page_id, stream_id = len(objects)+1, len(objects)+2
        kids.append(f'{page_id} 0 R')
        objects.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {W} {H}] /Resources << /Font << /F1 3 0 R >> >> /Contents {stream_id} 0 R >>'.encode())
        objects.append(f'<< /Length {len(stream)} >>\nstream\n'.encode()+stream+b'\nendstream')
    objects[0] = b'<< /Type /Catalog /Pages 2 0 R >>'
    objects[1] = f'<< /Type /Pages /Kids [{" ".join(kids)}] /Count {len(kids)} >>'.encode()
    document = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(document)); document.extend(f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n')
    start = len(document)
    document.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]:
        document.extend(f'{offset:010d} 00000 n \n'.encode())
    document.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n'.encode())
    Path(path).write_bytes(document)


def frame(page, payload, title, number):
    page.line([(24,24),(1200,24),(1200,768),(24,768),(24,24)])
    page.text(42,52,'KIW | SHOP DRAWINGS',20)
    page.text(42,76,ascii_text(payload['title'])[:130],13)
    page.text(42,100,title,12)
    page.line([(24,708),(1200,708)])
    page.text(42,731,'DRAFT - DO NOT FABRICATE | Field dimensions govern. Views fitted to sheet; do not scale.',11,'#b45309')
    page.text(42,751,f"Source: {payload.get('sourceUpdatedAt','sample')} | Request: {payload['id']} | Inches",9)
    page.text(1100,751,f'Sheet {number}',10)


def project(p, view, heading=0):
    x = p['x']*math.cos(heading)+p['y']*math.sin(heading)
    y = -p['x']*math.sin(heading)+p['y']*math.cos(heading)
    if view == 'plan': return x,y
    if view == 'side': return x,-p['z']
    return (x+y)*math.sqrt(3)/2, -x/2+y/2-p['z']


def view_page(payload, view, segment=None):
    page = Page()
    surfaces = [s for s in payload['surfaces'] if segment is None or s['segment']==segment]
    posts = [p for p in payload['posts'] if segment is None or p['segment']==segment]
    heading = 0
    if segment is not None:
        a,b = surfaces[0]['corners'][:2]
        heading = math.atan2(b['y']-a['y'],b['x']-a['x'])
    pts = [project(p,view,heading) for s in surfaces for p in s['corners']]
    pts += [project(p[k],view,heading) for p in posts for k in ('base','top')]
    minx,miny = min(p[0] for p in pts),min(p[1] for p in pts)
    maxx,maxy = max(p[0] for p in pts),max(p[1] for p in pts)
    scale = min(860/max(1,maxx-minx),510/max(1,maxy-miny))
    def xy(p):
        x,y = project(p,view,heading)
        return 65+(x-minx)*scale,145+(y-miny)*scale
    # Sorting makes upper surfaces conceal lower surfaces in plan and iso views.
    for s in sorted(surfaces,key=lambda s:sum(p['z'] if view=='plan' else -p['x']+p['y']+p['z'] for p in s['corners'])):
        points = [xy(p) for p in s['corners']]
        color = '#b45309' if s['provisional'] else '#334155'
        if view == 'side':
            a,b = s['corners'][:2]; low = dict(a,z=a['z']-s.get('riseDepth',0))
            page.line([xy(low),xy(a),xy(b)],color,1.3)
        else:
            if view=='iso' and s.get('riseDepth',0)>0:
                a,d=s['corners'][0],s['corners'][3]
                page.line([xy(dict(a,z=a['z']-s['riseDepth'])),xy(a),xy(d),xy(dict(d,z=d['z']-s['riseDepth']))],color,1,'#dbe2ea')
            page.line(points+[points[0]],color,1,'#fff7ed' if s['provisional'] else '#f1f5f9')
        if segment is not None:
            page.text(points[0][0]+3,points[0][1]-8,s['label'],8)
            page.dimension(points[0],points[1],s['run'] or 'VERIFY',-23)
            if view=='side' and s.get('riseDepth',0)>0:
                page.dimension(xy(dict(s['corners'][0],z=s['corners'][0]['z']-s['riseDepth'])),points[0],s['rise'] or 'VERIFY',-15)
    for wall in payload.get("walls",[]):
        if segment is None or wall["segment"]==segment:page.line([xy(p) for p in wall["points"]],"#94a3b8",3)
    for i,p in enumerate(posts):
        page.line([xy(p['base']),xy(p['top'])],'#92400e',2)
        page.text(xy(p['top'])[0]+4,xy(p['top'])[1]-4,p['label'],10)
        matches=[q for q in posts[i+1:] if q['segment']==p['segment'] and q['side']==p['side'] and q.get('pointType')=='railing_post']
        if p.get('pointType')=='railing_post' and matches:
            page.line([xy(p['top']),xy(matches[0]['top'])],'#92400e',1.5)
    if segment is None:
        for t in payload['transitions']:
            page.line([xy(p) for p in t['points']],'#0369a1',2)
            page.text(*xy(t['points'][0]),t['label'],10)
    if segment is None:
        page.text(960,150,'DRAWING OVERVIEW',12)
        page.text(960,174,f"{len({s['segment'] for s in surfaces if s['step'] is not None})} flights / {len(posts)} posts",10)
        page.text(960,195,'Gray edges: wall boundaries',9)
        page.text(960,214,'Brown: post / rail references',9)
        page.text(960,233,'Blue: landing connections',9)
        page.text(960,262,'FIRST STEP -> POST EDGE',10)
        for i,p in enumerate(posts):
            page.text(960,285+i*23,f"{p['label']}: {p.get('firstStepToPostEdge') or 'VERIFY'} in",10)
    if segment is not None:
        page.text(970,150,'POST EDGE REFERENCES',10)
        for i,p in enumerate(posts):
            page.text(970,175+i*26,f"First step -> {p['label']} edge:",9)
            page.text(970,187+i*26,p.get('firstStepToPostEdge') or 'VERIFY',10)
    return page


def generate_sheets(payload, output):
    output=Path(output); pages=[]
    for view in ('plan','side','iso'):
        pages.append((view_page(payload,view),f'Whole staircase - {view.upper()}'))
    for segment in sorted({s['segment'] for s in payload['surfaces'] if s['step'] is not None}):
        pages.append((view_page(payload,'side',segment),f'Segment {segment+1} - local side elevation and step dimensions'))
    lines=['MEASUREMENT AND CONNECTION SCHEDULE', 'Post distances use the first-step edge as their common field reference.']
    data=payload['measurements']
    for key,value in data.get('materials',{}).items():
        if isinstance(value,str) and value: lines.append(f'{key}: {value}')
    for i,p in enumerate(data.get('posts',[]),1):
        lines.append(f"P{i} | segment {p['segIdx']+1} | step {p['stepIdx']+1 if p['stepIdx'] is not None else 'landing'} | {p.get('side','')} | first step to post edge: {p.get('firstStepToPostEdge') or 'VERIFY'}")
        lines.append('    '+ ' | '.join(f'{k}: {p[k]}' for k in ('fromNosing','fromEdge','mount','anchor','plate','anchors','substrate') if p.get(k)))
    for i,t in enumerate(data.get('landingTransitions',[]),1):
        lines.append(f"T{i} | "+' | '.join(f'{k}: {v}' for k,v in t.items() if isinstance(v,(str,int)) and v!=''))
    for i,j in enumerate(data.get('joints',[]),1):
        lines.append(f"J{i} | "+' | '.join(f'{k}: {v}' for k,v in j.items() if v!=''))
    lines += ['OPEN ITEMS / SHOP REVIEW'] + list(payload.get('issues',[]))
    lines += ['Post and rail objects are centerline references; solid profiles, welds and anchors require detailing.', 'Unresolved geometry uses reference dimensions and is marked VERIFY. No automatic fabrication release.']
    wrapped=[part for line in lines for part in (textwrap.wrap(ascii_text(line),150) or [''])]
    for start in range(0,len(wrapped),32):
        page=Page()
        for i,line in enumerate(wrapped[start:start+32]): page.text(45,132+i*17,line,10)
        pages.append((page,'Materials, post references and connection notes'))
    for i,(page,title) in enumerate(pages,1):
        frame(page,payload,title,i);page.save_svg(output/f'sheet-{i:02d}.svg')
    save_pdf([page for page,_ in pages],output/'shop-drawings.pdf')
    return len(pages)
