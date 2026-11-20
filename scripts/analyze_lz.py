import json, re, math, sys
from collections import Counter, defaultdict
d = json.load(open(sys.argv[1]))
F = d["features"]
print("Objekte:", len(F), Counter(f["geometry"]["type"] for f in F).most_common())
print("davon amenity=parking:", sum(1 for f in F if f["properties"].get("amenity") == "parking"))
def length_m(coords):
    L = 0
    for (x1, y1), (x2, y2) in zip(coords, coords[1:]):
        dx = (x2 - x1) * 111320 * math.cos(math.radians((y1 + y2) / 2)); dy = (y2 - y1) * 111320
        L += math.hypot(dx, dy)
    return L
load = defaultdict(list); nostop = Counter(); times = Counter()
for f in F:
    p = f["properties"]; name = p.get("name") or "(ohne Namen)"
    g = f["geometry"]
    L = length_m(g["coordinates"]) if g["type"] == "LineString" else 0
    for k, v in p.items():
        if not re.search(r"restriction", k): continue
        if "loading_only" in v:
            cond = v if "@" in v else None
            side = re.match(r"parking:(\w+)", k).group(1) if k.startswith("parking:") else "separat"
            load[name].append((side, round(L), cond))
            if cond: times[re.search(r"loading_only @ \(([^)]*)\)", v).group(1) if re.search(r"loading_only @ \(([^)]*)\)", v) else v] += 1
        if "no_stopping" in v: nostop[name] += 1
n_load = sum(len(v) for v in load.values())
print("Ladezonen-Einträge:", n_load, "| mit Uhrzeit:", sum(times.values()), "| ohne Uhrzeit (ganztägig bzw. Schild ohne Zeit):", n_load - sum(times.values()))
print("Häufigste Zeiten:", times.most_common(8))
tour = ["Baerwaldstraße","Bergmannstraße","Blücherstraße","Gneisenaustraße","Marheinekeplatz","Mehringdamm","Mittenwalder Straße","Nostitzstraße","Riemannstraße","Solmsstraße","Zossener Straße","Arndtstraße","Chamissoplatz","Fidicinstraße","Friesenstraße","Heimstraße","Katzbachstraße","Kopischstraße","Kreuzbergstraße","Methfesselstraße","Willibald-Alexis-Straße","Yorckstraße","Böckhstraße","Dieffenbachstraße","Fichtestraße","Graefestraße","Grimmstraße","Hasenheide","Körtestraße","Urbanstraße"]
print("\nTourstraßen: Ladezonen (Anzahl, Länge) | Halteverbots-Abschnitte")
none = []
for s in tour:
    lz = load.get(s, [])
    if lz:
        conds = sorted({c.split("@")[1].strip() for _, _, c in lz if c})
        print(f"  {s}: {len(lz)} Ladezone(n), ca. {sum(l for _, l, _ in lz)} m{(' | Zeiten: ' + ', '.join(conds)) if conds else ''} | Halteverbot: {nostop.get(s, 0)}")
    else:
        none.append(f"{s} (Halteverbot: {nostop.get(s,0)})")
print("  Ohne eigene Ladezone:", ", ".join(none))
