import json, sys
from collections import Counter
tic = json.load(open(sys.argv[1]))["features"]
viz = json.load(open(sys.argv[2]))["features"]
viz_lms = {f["properties"].get("lms_id") for f in viz}
S, N, W, E = 52.462, 52.500, 13.370, 13.430
def coords(g):
    if g["type"] == "Point": yield g["coordinates"]
    elif g["type"] == "LineString": yield from g["coordinates"]
    elif g["type"] == "MultiLineString":
        for l in g["coordinates"]: yield from l
    elif g["type"] == "GeometryCollection":
        for gg in g["geometries"]: yield from coords(gg)
inside = [f for f in tic if f.get("geometry") and any(S <= la <= N and W <= lo <= E for lo, la in coords(f["geometry"]))]
print("TIC im Tourgebiet:", len(inside), "| davon nicht im VIZ-Feed:", sum(1 for f in inside if f["properties"]["id"] not in viz_lms))
print(Counter(f["properties"]["subtype"] for f in inside))
for f in inside:
    p = f["properties"]; v = p.get("validity") or {}
    flag = "" if p["id"] in viz_lms else "  [NUR TIC]"
    print(f"- [{p['subtype']}] {p['street'][:150]} | {v.get('from')} → {v.get('to')}{flag}")
    if p.get("content"): print("    ", p["content"][:160])
