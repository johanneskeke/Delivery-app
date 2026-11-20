import json, sys, math
from collections import Counter
path = sys.argv[1]
d = json.load(open(path))
feats = d["features"]
print("Einträge gesamt:", len(feats))
print("subtype:", Counter(f["properties"].get("subtype") for f in feats).most_common())
print("severity:", Counter(f["properties"].get("severity") for f in feats).most_common())
print("Keys:", sorted({k for f in feats for k in f["properties"].keys()}))
# Tourgebiet: Kreuzberg 61 + Graefekiez + Weg vom Depot Tempelhof
S, N, W, E = 52.462, 52.500, 13.370, 13.430
def coords(g):
    if g["type"] == "Point": yield g["coordinates"]
    elif g["type"] == "LineString": yield from g["coordinates"]
    elif g["type"] == "MultiLineString":
        for l in g["coordinates"]: yield from l
    elif g["type"] == "GeometryCollection":
        for gg in g["geometries"]: yield from coords(gg)
inside = []
for f in feats:
    g = f.get("geometry")
    if not g: continue
    if any(S <= lat <= N and W <= lng <= E for lng, lat in coords(g)):
        inside.append(f)
print("\nIm Tourgebiet (bbox):", len(inside))
for f in inside:
    p = f["properties"]
    v = p.get("validity") or {}
    print(f"- [{p.get('subtype')}/{p.get('severity')}] {p.get('street')} | {p.get('section')} | {v.get('from')} → {v.get('to')} | Fahrstreifen {p.get('closed_lanes')}/{p.get('total_lanes')}")
    print(f"    {p.get('content')}")
# Gültig am 26.11.2026?
active = [f for f in inside if (f['properties'].get('validity') or {}).get('from','')<='2026-11-26T23:59' and (f['properties'].get('validity') or {}).get('to','9999')>='2026-11-26T00:00']
print("\nDavon gültig am 26.11.2026:", len(active))
