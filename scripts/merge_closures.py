"""Beide VIZ-Feeds auf das Tourgebiet filtern und in ein einheitliches Format bringen."""
import json, re, sys
viz = json.load(open(sys.argv[1]))["features"]
tic = json.load(open(sys.argv[2]))["features"]
S, N, W, E = 52.462, 52.500, 13.370, 13.430
def coords(g):
    if g["type"] == "Point": yield g["coordinates"]
    elif g["type"] == "LineString": yield from g["coordinates"]
    elif g["type"] == "GeometryCollection":
        for gg in g["geometries"]: yield from coords(gg)
def inside(f): return f.get("geometry") and any(S <= la <= N and W <= lo <= E for lo, la in coords(f["geometry"]))
def de2iso(s):
    m = re.match(r"(\d\d)\.(\d\d)\.(\d{4}) (\d\d:\d\d)", s or "")
    return f"{m[3]}-{m[2]}-{m[1]}T{m[4]}" if m else None
out = []
viz_lms = set()
for f in filter(inside, viz):
    p = f["properties"]; viz_lms.add(p.get("lms_id"))
    out.append({"id": p["id"], "quelle": "VIZ Verkehrsredaktion", "typ": p["subtype"], "schwere": p["severity"],
                "strasse": p["street"], "abschnitt": p["section"], "text": p["content"],
                "von": p["validity"]["from"] or None, "bis": p["validity"]["to"] or None,
                "fahrstreifen": [p.get("closed_lanes"), p.get("total_lanes")], "geometrie": f["geometry"]})
for f in filter(inside, tic):
    p = f["properties"]
    if p["id"] in viz_lms: continue
    out.append({"id": p["id"], "quelle": "VIZ Landesmeldestelle", "typ": p["subtype"], "schwere": None,
                "strasse": p["street"], "abschnitt": p["section"], "text": p["content"],
                "von": de2iso(p["validity"].get("from")), "bis": de2iso(p["validity"].get("to")),
                "fahrstreifen": None, "geometrie": f["geometry"]})
meta = {"abgerufen": "2026-11-19", "gebiet_bbox": [W, S, E, N], "lizenz": "dl-de-by-2.0, Digitale Plattform Stadtverkehr Berlin / Baustellen, Sperrungen und sonstige Störungen von besonderem verkehrlichem Interesse", "eintraege": out}
json.dump(meta, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
print(len(out), "Einträge gespeichert")
