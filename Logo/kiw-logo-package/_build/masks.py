from PIL import Image, ImageDraw, ImageFilter; import numpy as np, subprocess, sys
S=4; BL=float(sys.argv[1]) if len(sys.argv)>1 else 0.8
src=Image.open('src.jpg').convert('RGB')
a=np.array(src).astype(float)
R,G,B=a[...,0],a[...,1],a[...,2]
L=0.299*R+0.587*G+0.114*B
H,W=L.shape
chrom=np.array(Image.fromarray(np.clip(R-B,0,255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))).astype(float)
goldish=chrom>45
yy=np.arange(H)[:,None]
Lg=np.where(yy<270,163.,147.)
gc=np.where(goldish,np.clip((248-L)/(248-Lg),0,1),0)
kc=np.where(~goldish,np.clip((248-L)/(248-37),0,1),0)
for (x,y) in [(105,50),(1480,50),(105,822),(1480,822)]:
    kc[y-8:y+9,x-8:x+9]=0; gc[y-8:y+9,x-8:x+9]=0
def up(m):
    im=Image.fromarray((m*255).astype(np.uint8))
    if BL>0: im=im.filter(ImageFilter.GaussianBlur(BL))
    im=im.resize((W*S,H*S),Image.BICUBIC).filter(ImageFilter.GaussianBlur(BL*S*0.5))
    return np.array(im)>127
K=up(kc); Gd=up(gc)
YY=np.arange(H*S)[:,None]
crown=Gd&(YY<265*S)
bar=Gd&(YY>=530*S)
im=Image.fromarray((~bar).astype(np.uint8)*255).copy()
ImageDraw.floodfill(im,(0,0),128)
barsolid=np.array(im)!=128
letters=barsolid&~bar
def save(m,name):
    Image.fromarray(np.where(m,0,255).astype(np.uint8)).convert('1').save(name+'.bmp')
    subprocess.run(['potrace','-b','svg','-t','60','-a','1.1','-O','0.6','-u','10','-o',name+'.svg',name+'.bmp'],check=True)
for m,n in [(K,'king'),(crown,'crown'),(barsolid,'bar'),(letters,'letters')]: save(m,n)
# K-only via floodfill from stem pixel
im=Image.fromarray(np.where(K,255,0).astype(np.uint8)).copy()
ImageDraw.floodfill(im,(220*S,500*S),128)
ImageDraw.floodfill(im,(790*S,755*S),128)
Konly=np.array(im)==128
save(Konly,'konly')
import json
def bbox(m):
    ys,xs=np.nonzero(m); return [xs.min()/S,ys.min()/S,(xs.max()+1)/S,(ys.max()+1)/S]
json.dump({'all':bbox(K|Gd),'k':bbox(Konly),'crown':bbox(crown),'bar':bbox(barsolid),'king':bbox(K)},open('bbox.json','w'))
print(open('bbox.json').read())
