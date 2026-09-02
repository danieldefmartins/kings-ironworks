import re, json, sys
xml = open("lc.xml").read()
words = []
for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', xml):
    x0,y0,x1,y1,t = float(m.group(1)),float(m.group(2)),float(m.group(3)),float(m.group(4)),m.group(5)
    t = t.replace("&amp;","&").replace("&lt;","<").replace("&gt;",">").replace("&#39;","'").replace("&quot;",'"')
    words.append({"x":x0,"y":y0,"x1":x1,"y1":y1,"h":y1-y0,"t":t})
json.dump(words, open("words.json","w"))
print("words:", len(words))
# headings = tall text
big = [w for w in words if w["h"] >= 11]
big.sort(key=lambda w:(round(w["y"]/6), w["x"]))
out=[]
cur=None
for w in big:
    if cur and abs(w["y"]-cur["y"])<6 and w["x"]-cur["x1"]<30:
        cur["t"]+=" "+w["t"]; cur["x1"]=w["x1"]
    else:
        if cur: out.append(cur)
        cur=dict(w)
if cur: out.append(cur)
for o in out:
    if len(o["t"])>2 and not o["t"][0].isdigit():
        print(f'x={o["x"]:7.0f} y={o["y"]:6.0f} h={o["h"]:4.1f}  {o["t"][:52]}')
