import json, re
W = json.load(open("words.json"))

FRAC = "⁄"          # fraction slash
def is_num(t): return re.fullmatch(r"\.?\d+(\.\d+)?", t) is not None

def cell(glyphs):
    """Rebuild a size string like '3 1/2 x 3 x 1/4' from positioned glyphs."""
    g = sorted(glyphs, key=lambda a: a["x"])
    slashes = [a for a in g if a["t"] == FRAC]
    used = set()
    parts = []   # (x, text)
    for s in slashes:
        # numerator sits above the slash, denominator below; both share its x
        # numerator/denominator are DIGITS only — the "x" separator sits at a
        # similar offset and was being swallowed as a denominator.
        near = [a for a in g if a is not s and abs(a["x"] - s["x"]) < 7
                and a["h"] < s["h"] - 1 and a["t"].isdigit()]
        num = [a for a in near if a["y"] <= s["y"] + 2]
        den = [a for a in near if a["y"] > s["y"] + 2]
        num.sort(key=lambda a: a["y"]); den.sort(key=lambda a: a["y"])
        if not num or not den:
            continue
        n, d = num[0], den[0]
        used.update(id(a) for a in (s, n, d))
        parts.append((s["x"] - 0.01, f'{n["t"]}/{d["t"]}'))
    for a in g:
        if id(a) in used or a["t"] == FRAC:
            continue
        parts.append((a["x"], a["t"]))
    parts.sort()
    out = " ".join(p[1] for p in parts)
    return re.sub(r"\s+", " ", out).strip()

def rows(xs, xe, ys, ye, wx0, wx1, band=6.0):
    """Rows anchored on the weight column between wx0..wx1.

    Each size glyph goes to its NEAREST weight row rather than any row within a
    fixed band: the tables are ~8pt apart and a stacked fraction is ~6pt tall,
    so a fixed band steals the numerator of the row below.
    """
    anchors = [w for w in W if wx0 <= w["x"] <= wx1 and ys <= w["y"] <= ye
               and w["h"] > 8 and is_num(w["t"])]
    anchors.sort(key=lambda a: a["y"])
    if not anchors:
        return []
    buckets = {i: [] for i in range(len(anchors))}
    for w in W:
        if not (xs <= w["x"] < xe and ys - 8 <= w["y"] <= ye + 8):
            continue
        # a fraction's numerator sits ~1pt above the weight baseline and its
        # denominator ~4pt below, so compare against the glyph's own centre
        cy = w["y"] + w["h"] / 2
        i = min(range(len(anchors)), key=lambda k: abs(anchors[k]["y"] + 4 - cy))
        if abs(anchors[i]["y"] + 4 - cy) <= band:
            buckets[i].append(w)
    out = []
    for i, a in enumerate(anchors):
        s = cell(buckets[i])
        if s:
            out.append((s, a["t"]))
    return out

if __name__ == "__main__":
    import sys
    r = rows(443, 502, 235, 700, 505, 545)
    print(f"ANGLES col1: {len(r)} rows")
    for s, wt in r[:14]:
        print(f"  {s:28} {wt}")
