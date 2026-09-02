import json
from recon import rows

# (name, size_x0, size_x1, y0, y1, wt_x0, wt_x1)
REGIONS = [
 ("angle",        443, 502, 235, 700,  505, 545),
 ("angle",        543, 605, 235, 700,  608, 640),
 ("flat_bar",      55, 108, 235, 850,  110, 140),
 ("flat_bar",     160, 214, 235, 850,  216, 245),
 ("squares",      296, 340, 235, 330,  368, 400),
 ("rounds",       296, 340, 380, 560,  368, 400),
 ("tube",        1155,1200, 235, 860, 1203, 1240),
]
out = {}
for name, x0, x1, y0, y1, wx0, wx1 in REGIONS:
    r = rows(x0, x1, y0, y1, wx0, wx1)
    out.setdefault(name, []).extend(r)
    print(f"{name:10} x{x0}-{x1}  {len(r):3} rows   e.g. " +
          " | ".join(f"{s}={w}" for s, w in r[:3]))
json.dump(out, open("linecard_raw.json","w"), indent=1)
print("\ntotals:", {k: len(v) for k, v in out.items()})
