"""Dependency-free vector PDF/SVG draft sheets from the same inch geometry as Blender."""
import math
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


def project(p, view, heading=0):
    x = p['x']*math.cos(heading)+p['y']*math.sin(heading)
    y = -p['x']*math.sin(heading)+p['y']*math.cos(heading)
    if view == 'plan': return x,y
    if view == 'side': return x,-p['z']
    return (x+y)*math.sqrt(3)/2, -x/2+y/2-p['z']


def generate_sheets(payload, output):
    from shop_template import generate
    return generate(payload, output)
