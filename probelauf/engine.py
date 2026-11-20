"""Probelauf Schritt 3b: grober Routenplan mit echten Daten, offline.

Fahrzeiten kommen hier aus dem OSM-Straßennetz (Overpass-Export), nicht aus OpenRouteService.
Alle Annahmen stehen gesammelt in ANNAHMEN und werden im Ergebnis mit ausgegeben.
"""
import datetime as dt
import json
import math
import re
from collections import defaultdict
from functools import lru_cache

import networkx as nx
from pyproj import Transformer
from shapely.geometry import LineString, Point, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

import os as _os
BASE = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))  # Ordner über probelauf/
TO_M = Transformer.from_crs(4326, 25833, always_xy=True).transform
TO_LL = Transformer.from_crs(25833, 4326, always_xy=True).transform

TOURTAG = dt.date(2026, 11, 26)  # Donnerstag
WOCHENTAG = "Th"

ANNAHMEN = {
    "tempo_kmh": {"primary": 22, "primary_link": 22, "secondary": 22, "secondary_link": 22, "tertiary": 20,
                  "tertiary_link": 20, "unclassified": 16, "residential": 16, "living_street": 7},
    "gehen_kmh": 4.5,
    "umwegfaktor_fussweg": 1.25,
    "suche_ladezone_min": 1.0,
    "suche_sonstiger_halteplatz_min": 3.0,
    "vor_ort_umplanen_min": 3.0,  # nur Vorher-Plan: Halt liegt in Sperrung, Fahrer merkt es erst vor Ort
    "abfahrt_depot": "08:00",
    "depot_bis_tourgebiet_min": 12.0,  # Eresburgstraße → Mehringdamm/Dudenstraße, je Richtung
    "halt_max_fussweg_m": 150, "halt_max_stopps": 4, "sperrgut_max_fussweg_m": 30,
    "stoppdauer": "2 Min. + 1 Min. je Sendung, Sperrgut +3, Ident/Alterssicht +2",
    "fussweg_muster": "je Stopp hin und zurück zum Fahrzeug",
    "abbiegeverbote": "nicht berücksichtigt",
}
A = ANNAHMEN

# ---------------------------------------------------------------- Zeit-Helfer

def hm(s):
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def fmt(mins):
    mins = int(round(mins))
    return f"{mins // 60:02d}:{mins % 60:02d}"


DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]


def day_in(spec, day=WOCHENTAG):
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-")
            if a in DAYS and b in DAYS and DAYS.index(a) <= DAYS.index(day) <= DAYS.index(b):
                return True
        elif part == day:
            return True
    return False


def parse_oh(cond):
    """'Mo-Fr 06:00-20:00; Sa 09:00-15:00' → Liste (von, bis) in Minuten am Tourtag."""
    out = []
    for rule in cond.split(";"):
        rule = rule.strip()
        if not rule:
            continue
        m = re.match(r"^((?:[A-Z][a-z](?:-[A-Z][a-z])?,?)+)\s+(.*)$", rule)
        if m:
            if not day_in(m.group(1)):
                continue
            times = m.group(2)
        else:
            times = rule
        for tr in times.split(","):
            tm = re.match(r"(\d\d:\d\d)-(\d\d:\d\d)", tr.strip())
            if tm:
                out.append((hm(tm.group(1)), hm(tm.group(2))))
    return out


def conditional_windows(value, wanted):
    """'no_stopping @ (Mo-Fr 06:00-09:00,14:00-19:00); loading_only @ (Mo-Fr 09:00-14:00)' → Fenster für wanted."""
    res = []
    for val, cond in re.findall(r"(\w+)\s*@\s*\(([^)]*)\)", value):
        if val == wanted:
            res += parse_oh(cond)
    return res


def active(windows, t):
    return any(a <= t <= b for a, b in windows)


# ---------------------------------------------------------------- Sperrungen

def load_closures():
    d = json.load(open(f"{BASE}/tourdaten/sperrungen_tourgebiet_2026-11-19.json"))
    day_start = dt.datetime.combine(TOURTAG, dt.time(7, 0))
    day_end = dt.datetime.combine(TOURTAG, dt.time(18, 0))
    full, oneway, hints = [], [], []
    for e in d["eintraege"]:
        von = dt.datetime.fromisoformat(e["von"]) if e["von"] else None
        bis = dt.datetime.fromisoformat(e["bis"]) if e["bis"] else None
        if (von and von > day_end) or (bis and bis < day_start):
            continue
        s = e["strasse"]
        m = re.match(r"(?:Berlin, )?(.+?)(?: zwischen| \(|,|$)", s)
        name = m.group(1).strip() if m else s
        gg = e["geometrie"] or {}
        parts = gg.get("geometries", [gg]) if gg else []
        lines = []
        for g in parts:
            if g.get("type") == "LineString":
                lines.append(transform(TO_M, shape(g)))
            elif g.get("type") == "MultiLineString":
                lines += list(transform(TO_M, shape(g)).geoms)
        if not lines:
            continue
        geom = unary_union(lines)
        rec = {"id": e["id"], "quelle": e["quelle"], "name": name, "geom": geom, "text": e["text"],
               "abschnitt": e["abschnitt"], "von": e["von"], "bis": e["bis"]}
        text = (e["text"] or "").lower()
        if e["schwere"] == "Fahrtrichtungssperrung":
            rm = re.search(r"Richtung (\S+straße)", e["abschnitt"] or "")
            rec["richtung"] = rm.group(1) if rm else None
            oneway.append(rec)
        elif e["typ"] == "Sperrung" and e["schwere"] in (None, "Vollsperrung") and ("gesperrt" in text or "vollsperrung" in text):
            full.append(rec)
        else:
            hints.append(rec)
    return full, oneway, hints


# ---------------------------------------------------------------- Straßennetz

class Netz:
    def __init__(self):
        self.full, self.oneway_cl, self.hints = load_closures()
        import os
        src = f"{BASE}/data_netz/netz.geojson"
        self.quelle_netz = src if os.path.exists(src) else f"{BASE}/data_osm/osm.geojson (gefiltert, nur Test)"
        feats = json.load(open(src if os.path.exists(src) else f"{BASE}/data_osm/osm.geojson"))["features"]
        self.adressen = {}
        blocked = set()
        BLOCK = {"bollard", "block", "jersey_barrier", "cycle_barrier", "chain", "gate", "lift_gate", "planter",
                 "barrier_board", "bar", "rope", "log", "fence", "wall", "swing_gate"}
        OK = {"yes", "destination", "delivery", "permissive"}
        for f in feats:
            p, g = f["properties"], f["geometry"]
            if g["type"] != "Point":
                continue
            if "addr:housenumber" in p and "addr:street" in p:
                self.adressen.setdefault(p["addr:street"], []).append((p["addr:housenumber"], TO_M(*g["coordinates"])))
            if p.get("barrier") in BLOCK and p.get("motor_vehicle") not in OK and p.get("access") not in OK \
                    and p.get("vehicle") not in OK:
                x, y = g["coordinates"]
                blocked.add((round(x, 7), round(y, 7)))
        self.blocked = blocked
        G = nx.DiGraph()
        self.removed = defaultdict(int)
        edges_geo = []
        name_pts = defaultdict(list)
        raw = []
        for f in feats:
            p, g = f["properties"], f["geometry"]
            if g["type"] != "LineString":
                continue
            hw = p.get("highway")
            if hw not in A["tempo_kmh"]:
                continue
            if p.get("access") in ("no", "private") or p.get("motor_vehicle") in ("no", "private") \
                    or p.get("vehicle") in ("no", "private"):
                continue
            ow = p.get("oneway", "no")
            if p.get("junction") == "roundabout" and ow == "no":
                ow = "yes"
            name = p.get("name", "")
            pts = [(round(x, 7), round(y, 7)) for x, y in g["coordinates"]]
            xy = [TO_M(*q) for q in pts]
            for q in xy:
                name_pts[name].append(q)
            raw.append((hw, ow, name, pts, xy, p.get("@id")))
        self.name_centroid = {n: (sum(x for x, _ in v) / len(v), sum(y for _, y in v) / len(v)) for n, v in name_pts.items()}
        for hw, ow, name, pts, xy, wid in raw:
            v = A["tempo_kmh"][hw] / 3.6
            for (ka, a), (kb, b) in zip(zip(pts, xy), zip(pts[1:], xy[1:])):
                L = math.dist(a, b)
                if L == 0:
                    continue
                if ka in blocked or kb in blocked:
                    self.removed["Poller/Sperre (OSM)"] += 1
                    continue
                mid = Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                cl = self._closed(name, mid)
                if cl:
                    self.removed[cl["name"]] += 1
                    edges_geo.append((LineString([a, b]), name, hw, ka, kb, cl))
                    continue
                fwd, bwd = ow in ("yes", "true", "1"), ow == "-1"
                both = not fwd and not bwd
                blk = self._dir_closed(name, mid, a, b)
                if fwd or both:
                    if not blk[0]:
                        G.add_edge(ka, kb, t=L / v, d=L, name=name)
                if bwd or both:
                    if not blk[1]:
                        G.add_edge(kb, ka, t=L / v, d=L, name=name)
                edges_geo.append((LineString([a, b]), name, hw, ka, kb, None))
        for k in G.nodes:
            G.nodes[k]["xy"] = TO_M(*k)
        scc = max(nx.strongly_connected_components(G), key=len)
        self.G = G.subgraph(scc).copy()
        self.edges = edges_geo
        self.tree = STRtree([e[0] for e in self.edges])
        self._sp = {}
        self._load_parking()

    def _closed(self, name, mid):
        for c in self.full:
            if name and (name == c["name"] or name in c["name"] or c["name"] in name) and c["geom"].distance(mid) < 15:
                return c
        return None

    def _dir_closed(self, name, mid, a, b):
        """(vorwärts gesperrt, rückwärts gesperrt) für Fahrtrichtungssperrungen."""
        for c in self.oneway_cl:
            if name and name in c["name"] and c["geom"].distance(mid) < 15 and c.get("richtung") in self.name_centroid:
                tx, ty = self.name_centroid[c["richtung"]]
                towards = math.dist(b, (tx, ty)) < math.dist(a, (tx, ty))
                self.removed[c["name"] + " (eine Richtung)"] += 1
                return (towards, not towards)
        return (False, False)

    # -------- Halteplätze
    def _load_parking(self):
        feats = json.load(open(f"{BASE}/data_osm_lz/lz.geojson"))["features"]
        self.ladezonen = []
        nostop = []
        for f in feats:
            p = f["properties"]
            geom = transform(TO_M, shape(f["geometry"]))
            name = p.get("name", "")
            wins, always = [], False
            keys = [k for k in p if "restriction" in k and "reason" not in k]
            for k in keys:
                val = p[k]
                if k.endswith(":conditional"):
                    wins += conditional_windows(val, "loading_only")
                    ns = conditional_windows(val, "no_stopping")
                    if ns and "both" in k:
                        nostop.append((geom, ns))
                elif val == "loading_only":
                    always = True
                elif val == "no_stopping" and ("both" in k):
                    nostop.append((geom, [(0, 24 * 60)]))
            if always and not any(k.endswith(":conditional") and "loading_only" in p[k] for k in keys):
                wins = [(0, 24 * 60)]
            if not wins:
                continue
            if geom.geom_type == "Polygon":
                samples = [geom.centroid]
            else:
                n = max(1, int(geom.length // 10))
                samples = [geom.interpolate(i / n, normalized=True) for i in range(n + 1)]
            if geom.geom_type == "Polygon" or not name:
                near = self.tree.query_nearest(geom.centroid)
                nn = self.edges[int(near[0])][1] if len(near) else ""
                name = f"{'Parkfläche' if geom.geom_type == 'Polygon' else 'Ladezone'} bei {nn}" if nn else "Parkfläche"
            for s in samples:
                if any(c["geom"].distance(s) < 15 and (not name or c["name"] in name or name in c["name"]) for c in self.full):
                    continue
                node = self.snap(s, prefer_name=name if geom.geom_type != "Polygon" and " bei " not in name else None)
                if node is None:
                    continue
                self.ladezonen.append({"pt": s, "node": node, "wins": wins, "street": name, "osm": p.get("@id")})
        self.lz_tree = STRtree([z["pt"] for z in self.ladezonen])
        self.nostop = nostop
        self.nostop_tree = STRtree([g for g, _ in nostop]) if nostop else None

    def no_stopping_at(self, pt, t=None):
        if not self.nostop_tree:
            return False
        for i in self.nostop_tree.query(pt.buffer(6)):
            g, wins = self.nostop[i]
            if g.distance(pt) < 6 and (t is None or active(wins, t) or wins == [(0, 1440)]):
                return True
        return False

    def snap(self, pt, prefer_name=None, allow_closed=False):
        """Nächster Knoten im befahrbaren Netz (auf derselben Straße, wenn möglich)."""
        idx = self.tree.query(pt.buffer(80))
        cands = sorted(idx, key=lambda i: self.edges[i][0].distance(pt))
        for want in ([prefer_name] if prefer_name else []) + [None]:
            for i in cands:
                ln, name, hw, ka, kb, cl = self.edges[i]
                if cl is not None and not allow_closed:
                    continue
                if want and name != want:
                    continue
                k = ka if Point(TO_M(*ka)).distance(pt) <= Point(TO_M(*kb)).distance(pt) else kb
                if k in self.G:
                    return k
                other = kb if k == ka else ka
                if other in self.G:
                    return other
        return None

    def curb_points(self, pt, k=4, allow_closed=False, radius=120):
        """Nächste Bordsteinpunkte an befahrbaren Straßen (für 'sonstigen Halteplatz')."""
        idx = self.tree.query(pt.buffer(radius))
        out, seen = [], set()
        for i in sorted(idx, key=lambda i: self.edges[i][0].distance(pt)):
            ln, name, hw, ka, kb, cl = self.edges[i]
            if (cl is not None and not allow_closed) or name in seen:
                continue
            q = ln.interpolate(ln.project(pt))
            node = self.snap(q, prefer_name=name)
            if node is None:
                continue
            seen.add(name)
            out.append({"pt": q, "node": node, "street": name, "closed": cl, "nostop": self.no_stopping_at(q)})
            if len(out) >= k:
                break
        if not out and radius < 400:
            return self.curb_points(pt, k, allow_closed, radius=400)
        return out

    def t(self, a, b):
        if a == b:
            return 0.0
        if a not in self._sp:
            self._sp[a] = nx.single_source_dijkstra_path_length(self.G, a, weight="t")
        return self._sp[a].get(b, math.inf) / 60.0  # Minuten

    def path(self, a, b):
        return nx.shortest_path(self.G, a, b, weight="t")

    def dist_km(self, a, b):
        p = self.path(a, b)
        return sum(self.G[u][v]["d"] for u, v in zip(p, p[1:])) / 1000


def norm_hnr(h):
    return re.sub(r"\s+", "", str(h)).lower()


def find_address(netz, street, hnr):
    """Koordinate einer Adresse aus den OSM-Adressen (exakt, dann Nummer ohne Zusatz, dann Bereich)."""
    cands = netz.adressen.get(street, [])
    want = norm_hnr(hnr)
    num = re.match(r"\d+", want)
    num = int(num.group()) if num else None
    exact = [xy for h, xy in cands if norm_hnr(h) == want]
    if exact:
        # bei mehreren Treffern (Eingang, Gebäude) den nehmen, der am nächsten an einer befahrbaren Straße liegt
        def road_dist(xy):
            pt = Point(xy)
            near = netz.tree.query_nearest(pt)
            return min(netz.edges[int(i)][0].distance(pt) for i in near) if len(near) else 1e9
        return min(exact, key=road_dist), "exakt"
    for h, xy in cands:
        for part in re.split(r"[;,]", norm_hnr(h)):
            m = re.match(r"(\d+)", part)
            if m and num is not None and int(m.group(1)) == num:
                return xy, "ohne Zusatz"
            r = re.match(r"(\d+)[a-z]?-(\d+)", part)
            if r and num is not None and int(r.group(1)) <= num <= int(r.group(2)):
                return xy, "Bereich"
    # Nachbar-Hausnummer (höchstens 3 Nummern Abstand), gekennzeichnet
    best = None
    for h, xy in cands:
        m = re.match(r"(\d+)", norm_hnr(h))
        if m and num is not None:
            diff = abs(int(m.group(1)) - num)
            if 0 < diff <= 3 and (best is None or diff < best[0]):
                best = (diff, h, xy)
    if best:
        return best[2], f"Nachbar-Hausnummer {best[1]}"
    return None, None
