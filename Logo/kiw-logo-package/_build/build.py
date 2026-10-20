import json, os
P=json.load(open('paths.json')); BB=json.load(open('bbox.json'))
OUT=os.path.expanduser('~/Projects/kings-ironworks/Logo/kiw-logo-package')
BLACK='#282425'; GOLD='#C38D35'; CROWN='#D4A034'; WHITE='#FFFFFF'; PURE='#000000'
POT='translate(0 901) scale(0.025 -0.025)'   # potrace space -> source px
def g(d,fill,extra=''):
    return f'<path fill="{fill}" fill-rule="evenodd" d="{d}"/>'
def logo_parts(scheme):
    """returns svg inner (in source px space) for the full horizontal logo"""
    if scheme in ('color','whitegold'):
        k = BLACK if scheme=='color' else WHITE
        return (g(P['king'],k)+g(P['crown'],CROWN)+g(P['bar'],GOLD)+g(P['letters'],WHITE))
    c={'black':PURE,'charcoal':BLACK,'white':WHITE}[scheme]
    return g(P['king'],c)+g(P['crown'],c)+g(P['bar']+' '+P['letters'],c)
def crown_parts(fill): return g(P['crown'],fill)
def mono_parts(scheme):
    kc={'color':BLACK,'whitegold':WHITE,'black':PURE,'white':WHITE,'charcoal':BLACK}[scheme]
    cc={'color':CROWN,'whitegold':CROWN,'black':PURE,'white':WHITE,'charcoal':BLACK}[scheme]
    return kc,cc
def svg(w,h,body,title,bg=None,rx=0):
    b=f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:g}" height="{h:g}" viewBox="0 0 {w:g} {h:g}">'
            f'<title>King Iron Works — {title}</title>{b}{body}</svg>\n')
def place(inner,sx,dx,dy):
    return f'<g transform="translate({dx:.3f} {dy:.3f}) scale({sx:.5f})"><g transform="{POT}">{inner}</g></g>'
files=[]  # (svgpath, base widths)
def write(folder,name,content,widths):
    d=os.path.join(OUT,folder); os.makedirs(d,exist_ok=True)
    p=os.path.join(d,name+'.svg'); open(p,'w').write(content); files.append((p,widths))
# ---------- horizontal ----------
x0,y0,x1,y1=BB['all']; pad=36
W=x1-x0+2*pad; H=y1-y0+2*pad
for scheme,name,bg in [('color','color-transparent',None),('whitegold','white-gold-transparent',None),
    ('white','white-transparent',None),('black','black-transparent',None),('charcoal','charcoal-transparent',None),
    ('color','color-white',WHITE),('whitegold','color-dark','#111111')]:
    body=place(logo_parts(scheme),1,pad-x0,pad-y0)
    write('horizontal',f'kiw-horizontal-{name}',svg(W,H,body,'horizontal '+name,bg),[800,1600,3200])
# ---------- monogram (crown over K, as in the brand icon) ----------
kx0,ky0,kx1,ky1=BB['k']; cx0,cy0,cx1,cy1=BB['crown']
cap=746-ky0; kcenter=(119+573.5)/2
cs=0.72*cap/(cx1-cx0); gap=0.04*cap
ch=(cy1-cy0)*cs
# monogram local space: K at native scale, crown scaled+placed above
mono_w=max(kx1-kx0, (cx1-cx0)*cs); top=ky0-gap-ch
def monogram(scheme,size,frac=0.80,bg=None,rx=0):
    kc,cc=mono_parts(scheme)
    mw=kx1-kx0; mh=ky1-top
    s=size*frac/max(mw,mh)
    ox=(size-mw*s)/2-kx0*s; oy=(size-mh*s)/2-top*s
    # crown transform in K space: x' = (x-cx0)*cs + kcenter-(cx1-cx0)*cs/2 ; y'=(y-cy0)*cs+top
    ctx=kcenter-(cx1-cx0)*cs/2-cx0*cs; cty=top-cy0*cs
    body=(f'<g transform="translate({ox:.3f} {oy:.3f}) scale({s:.5f})">'
          f'<g transform="{POT}">{g(P["konly"],kc)}</g>'
          f'<g transform="translate({ctx:.3f} {cty:.3f}) scale({cs:.5f})"><g transform="{POT}">{g(P["crown"],cc)}</g></g></g>')
    return body
for scheme,name in [('color','color-transparent'),('whitegold','white-gold-transparent'),('white','white-transparent'),('black','black-transparent')]:
    write('monogram',f'kiw-monogram-{name}',svg(512,512,monogram(scheme,512),'monogram '+name),[256,512,1024])
# ---------- crown icon ----------
def crown_icon(fill,size=512,frac=0.82):
    w=cx1-cx0; h=cy1-cy0; s=size*frac/max(w,h)
    return place(crown_parts(fill),s,(size-w*s)/2-cx0*s,(size-h*s)/2-cy0*s)
for fill,name in [(CROWN,'gold-transparent'),(WHITE,'white-transparent'),(PURE,'black-transparent')]:
    write('icon',f'kiw-crown-{name}',svg(512,512,crown_icon(fill),'crown '+name),[256,512,1024])
# ---------- app icon ----------
write('app-icon','kiw-app-icon',svg(1024,1024,monogram('whitegold',1024,0.66),'app icon',BLACK),[1024])
write('app-icon','kiw-app-icon-light',svg(1024,1024,monogram('color',1024,0.66),'app icon light',WHITE),[1024])
# ---------- favicon ----------
write('favicon','favicon',svg(512,512,monogram('whitegold',512,0.78),'favicon',BLACK,rx=96),[16,32,48,512])
write('favicon','apple-touch-icon',svg(512,512,monogram('whitegold',512,0.68),'apple touch icon',BLACK),[180,192,512])
json.dump(files,open('files.json','w'),indent=0)
print(len(files),'svgs')
