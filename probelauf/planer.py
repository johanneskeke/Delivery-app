"""Probelauf Schritt 3b: Halte bilden, Parkpunkt wählen, Reihenfolge, Zeitplan, Vergleich vorher/nachher."""
import json
import re
import sys

from shapely.geometry import Point

from engine import A, BASE, TO_M, Netz, active, find_address, fmt, hm

FIX_STREET = {"Zossner Str.": "Zossener Straße", "Bergmannstr.": "Bergmannstraße"}
LATE_PENALTY = 100.0  # Zielfunktion: 1 Min. Verspätung zählt wie 100 Min. Mehrzeit (harte Bedingung)


# ---------------------------------------------------------------- Stopps

def placeholder_xy(netz, street, hnr):
    lines = [e[0] for e in netz.edges if e[1] == street]
    if not lines:
        return None
    num = int(re.match(r"\d+", hnr).group())
    ln = lines[(num * 7) % len(lines)]
    return ln.interpolate(0.5, normalized=True).coords[0]


def load_stops(netz, placeholder=False):
    rows = json.load(open(f"{BASE}/tourdaten/tourliste.json"))["rows"]
    by = {}
    for r in rows:
        by.setdefault(r["Stopp"], []).append(r)
    out = []
    for nr in sorted(by):
        rs = by[nr]
        r0 = rs[0]
        street = FIX_STREET.get(r0["Straße"], r0["Straße"])
        hnr = re.match(r"(\d+)([a-zA-Z])?\b", r0["Hausnr."].strip()).group()
        fixes = []
        if street != r0["Straße"]:
            fixes.append(f"Straße korrigiert: {r0['Straße']} → {street}")
        if hnr != r0["Hausnr."].strip():
            fixes.append(f"Hausnummer bereinigt: {r0['Hausnr.']} → {hnr}")
        sperrgut = any(r["Produkt"] == "Sperrgut" for r in rs)
        ident = any(("Ident" in r["Service"]) or ("Alters" in r["Service"]) for r in rs)
        prio = [hm(re.search(r"(\d\d:\d\d)", r["Service"]).group(1)) for r in rs if r["Service"].startswith("Prio")]
        von = [hm(r["Zeitfenster von"]) for r in rs if r["Zeitfenster von"]]
        bis = [hm(r["Zeitfenster bis"]) for r in rs if r["Zeitfenster bis"]]
        xy, how = find_address(netz, street, hnr)
        if xy is None and placeholder:
            xy, how = placeholder_xy(netz, street, hnr), "Platzhalter"
        limits = [x for x in ([min(bis)] if bis else []) + ([min(prio)] if prio else [])]
        out.append(dict(
            nr=nr, street=street, hnr=hnr, label=f"{street} {hnr}", empf=r0["Empfänger"], n=len(rs),
            sperrgut=sperrgut, ident=ident, von=max(von) if von else None, limit=min(limits) if limits else None,
            prio=min(prio) if prio else None, dur=2 + len(rs) + (3 if sperrgut else 0) + (2 if ident else 0),
            pt=Point(xy) if xy else None, geo=how, fixes=fixes, kg=round(sum(r["Gewicht kg"] for r in rs), 1)))
    return out


# ---------------------------------------------------------------- Halte und Parkpunkte

def walk_m(a, b):
    return a.distance(b) * A["umwegfaktor_fussweg"]


def walk_min(m):
    return m / (A["gehen_kmh"] * 1000 / 60)


def max_walk(s):
    return A["sperrgut_max_fussweg_m"] if s["sperrgut"] else A["halt_max_fussweg_m"]


def park_candidates(netz, stops, top=6):
    cands = []
    for s in stops:
        for i in netz.lz_tree.query(s["pt"].buffer(A["halt_max_fussweg_m"])):
            z = netz.ladezonen[i]
            cands.append({"typ": "Ladezone", "pt": z["pt"], "node": z["node"], "wins": z["wins"], "street": z["street"],
                          "search": A["suche_ladezone_min"]})
        for c in netz.curb_points(s["pt"], k=3):
            if c["nostop"]:
                continue
            cands.append({"typ": "Straßenrand", "pt": c["pt"], "node": c["node"], "wins": [(0, 1440)],
                          "street": c["street"], "search": A["suche_sonstiger_halteplatz_min"]})
    ok = []
    for c in cands:
        if all(walk_m(c["pt"], s["pt"]) <= max_walk(s) for s in stops):
            c = dict(c)
            c["walk"] = sum(2 * walk_min(walk_m(c["pt"], s["pt"])) for s in stops)
            c["cost"] = c["walk"] + c["search"]
            ok.append(c)
    ok.sort(key=lambda c: c["cost"])
    # je Straße/Typ nur die besten behalten, damit die Auswahl schnell bleibt
    seen, res = set(), []
    for c in ok:
        key = (c["typ"], c["street"], c["node"])
        if key in seen:
            continue
        seen.add(key)
        res.append(c)
    lz = [c for c in res if c["typ"] == "Ladezone"][:top]
    rd = [c for c in res if c["typ"] == "Straßenrand"][:3]
    return lz + rd


def windows_ok(stops):
    vons = [s["von"] for s in stops if s["von"]]
    lims = [s["limit"] for s in stops if s["limit"]]
    return not vons or not lims or max(vons) <= min(lims)


def make_halt(netz, stops):
    if len(stops) > A["halt_max_stopps"] or not windows_ok(stops):
        return None
    c = park_candidates(netz, stops)
    if not c:
        return None
    # Bündeln nur, wenn es einen Parkpunkt gibt, der die ganze Schicht gilt (Straßenrand oder Ladezone 08–18 Uhr);
    # zeitlich begrenzte Ladezonen bleiben bevorzugte Option, wenn sie zur Ankunft gelten.
    robust = any(k["typ"] == "Straßenrand" or any(a <= 480 and b >= 1080 for a, b in k["wins"]) for k in c)
    if len(stops) > 1 and not robust:
        return None
    return {"stops": list(stops), "cands": c}


def single_halt(netz, s):
    h = make_halt(netz, [s])
    if h is not None and not any(k["typ"] == "Straßenrand" or any(a <= 480 and b >= 1080 for a, b in k["wins"]) for k in h["cands"]):
        h = None
    if h is None:  # z. B. Sperrgut weiter als 30 m vom nächsten Bordstein, Straße für Kfz gesperrt
        cs = netz.curb_points(s["pt"], k=4)
        cs = [c for c in cs if not c["nostop"]] or cs
        c = cs[0]
        h = {"stops": [s], "cands": [{"typ": "Straßenrand", "pt": c["pt"], "node": c["node"], "wins": [(0, 1440)],
                                      "street": c["street"], "search": A["suche_sonstiger_halteplatz_min"],
                                      "walk": 2 * walk_min(walk_m(c["pt"], s["pt"])),
                                      "cost": 2 * walk_min(walk_m(c["pt"], s["pt"])) + A["suche_sonstiger_halteplatz_min"],
                                      "warn": f"Fußweg {walk_m(c['pt'], s['pt']):.0f} m, Grenze {max_walk(s)} m"}]}
    return h


def halts_sequential(netz, stops):
    """'Nur nötige Änderungen': Reihenfolge der Liste bleibt, aufeinanderfolgende Stopps werden gebündelt."""
    halts, cur = [], []
    for s in stops:
        trial = cur + [s]
        h = make_halt(netz, trial) if cur else None
        if h:
            cur = trial
        else:
            if cur:
                halts.append(make_halt(netz, cur) or single_halt(netz, cur[0]))
            cur = [s]
    if cur:
        halts.append(make_halt(netz, cur) or single_halt(netz, cur[0]))
    return halts


def halts_greedy(netz, stops):
    """'Ganz neu planen': Halte unabhängig von der Listenreihenfolge bilden."""
    free = {s["nr"]: s for s in stops}
    halts = []
    while free:
        def nb(s):
            return sum(1 for o in free.values() if o is not s and walk_m(o["pt"], s["pt"]) <= A["halt_max_fussweg_m"] * 1.4)
        seed = max(free.values(), key=lambda s: (nb(s), -s["nr"]))
        grp = [seed]
        others = sorted((o for o in free.values() if o is not seed), key=lambda o: o["pt"].distance(seed["pt"]))
        for o in others:
            if len(grp) >= A["halt_max_stopps"]:
                break
            if walk_m(o["pt"], seed["pt"]) > 2 * A["halt_max_fussweg_m"]:
                break
            if make_halt(netz, grp + [o]):
                grp.append(o)
        h = make_halt(netz, grp) or single_halt(netz, grp[0])
        for s in h["stops"]:
            free.pop(s["nr"])
        halts.append(h)
    return halts


# ---------------------------------------------------------------- Zeitplan

def simulate(netz, route, start, t0, detail=False):
    t, cur = t0, start
    drive = walk = wait = late = 0.0
    late_list, early_list, plan = [], [], []
    for h in route:
        best, inactive = None, []
        for c in h["cands"]:
            tt = netz.t(cur, c["node"])
            cost = tt + c["cost"]
            if c["typ"] == "Ladezone" and not active(c["wins"], t + tt):
                inactive.append((cost, c, t + tt))
                continue
            if best is None or cost < best[0]:
                best = (cost, c, tt)
        lz_wait = 0.0
        if best is None:
            # nur Ladezonen in Reichweite und keine gilt schon: bis zur frühesten Öffnung warten (Warten zählt mit)
            opts = []
            for cost_, c_, arr_ in inactive:
                nxt = [a for a, b in c_["wins"] if a > arr_]
                if nxt:
                    opts.append((cost_ + (min(nxt) - arr_), c_, min(nxt) - arr_))
            if not opts:
                return None
            cost_, c_, lz_wait = min(opts, key=lambda x: x[0])
            best = (cost_, c_, netz.t(cur, c_["node"]))
            inactive = []
        _, c, tt = best
        blocked_lz = min((x for x in inactive if x[0] < best[0]), key=lambda x: x[0], default=None)
        t += tt
        drive += tt
        arr = t
        if lz_wait:
            wait += lz_wait
            t += lz_wait
        t += c["search"] + h.get("extra", 0)
        stops_out = []
        for s in sorted(h["stops"], key=lambda s: (s["von"] or 0, s["limit"] or 9999)):
            w = walk_min(walk_m(c["pt"], s["pt"]))
            t += w
            walk += 2 * w
            if s["von"] and t < s["von"]:
                if h.get("no_wait"):  # Vorher-Plan: Fahrer fährt die Liste ab, Laden/Empfänger noch zu → Konflikt
                    early_list.append((s, s["von"] - t))
                else:
                    wait += s["von"] - t
                    t = s["von"]
            if s["limit"] and t > s["limit"]:
                late += t - s["limit"]
                late_list.append((s, t - s["limit"]))
            stops_out.append((s, t))
            t += s["dur"] + w
        if detail:
            plan.append({"halt": h, "park": c, "ankunft": arr, "stopps": stops_out, "ab": t,
                         "lz_inaktiv": blocked_lz[1] if blocked_lz else None})
        cur = c["node"]
    back = netz.t(cur, start)
    t += back
    drive += back
    res = {"ende": t + A["depot_bis_tourgebiet_min"], "fahrt": drive, "fuss": walk, "warten": wait, "verspaetung": late,
           "spaet": late_list, "frueh": early_list, "halte": len(route)}
    res["ziel"] = (t - t0) + LATE_PENALTY * late
    if detail:
        res["plan"] = plan
    return res


def cost(netz, route, start, t0):
    r = simulate(netz, route, start, t0)
    return r["ziel"] if r else 1e12


def repair(netz, route, start, t0, max_iter=25):
    """Nur nötige Änderungen: Halte mit Verspätung an die beste frühere Stelle verschieben."""
    moves = []
    for _ in range(max_iter):
        r = simulate(netz, route, start, t0)
        if r is None or not r["spaet"]:
            break
        s_late = r["spaet"][0][0]
        i = next(k for k, h in enumerate(route) if s_late in h["stops"])
        h = route[i]
        rest = route[:i] + route[i + 1:]
        best = min(((cost(netz, rest[:j] + [h] + rest[j:], start, t0), j) for j in range(i + 1)), key=lambda x: x[0])
        if best[0] >= r["ziel"] - 1e-6:
            break
        route = rest[:best[1]] + [h] + rest[best[1]:]
        moves.append((h, i, best[1]))
    return route, moves


def optimize(netz, halts, start, t0):
    """Ganz neu planen: Einfügen nach Dringlichkeit, dann Verschieben/Umdrehen solange es besser wird."""
    def urg(h):
        lims = [s["limit"] for s in h["stops"] if s["limit"]]
        return min(lims) if lims else 9999
    route = []
    for h in sorted(halts, key=urg):
        best = min(((cost(netz, route[:j] + [h] + route[j:], start, t0), j) for j in range(len(route) + 1)), key=lambda x: x[0])
        route.insert(best[1], h)
    cur = cost(netz, route, start, t0)
    improved = True
    while improved:
        improved = False
        n = len(route)
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                cand = route[:i] + route[i + 1:]
                cand.insert(j, route[i])
                c = cost(netz, cand, start, t0)
                if c < cur - 1e-6:
                    route, cur, improved = cand, c, True
        for i in range(n - 1):
            for j in range(i + 2, n + 1):
                cand = route[:i] + route[i:j][::-1] + route[j:]
                c = cost(netz, cand, start, t0)
                if c < cur - 1e-6:
                    route, cur, improved = cand, c, True
    return route


# ---------------------------------------------------------------- Vorher-Plan (Liste, wie sie kommt)

def baseline(netz, stops):
    """Jeder Stopp ein Halt, in Listenreihenfolge, geparkt am nächsten Bordstein vor der Tür (ohne Datenwissen)."""
    route, konflikte = [], []
    for s in stops:
        near = netz.curb_points(s["pt"], k=1, allow_closed=True)[0]
        extra = 0.0
        if near["closed"] is not None:
            cl = near["closed"]
            konflikte.append((s, "Halteplatz vor der Tür liegt in einer Sperrung", f"VIZ: {cl['abschnitt'].replace('Berlin, ', '')}"))
            extra = A["vor_ort_umplanen_min"]
            near = netz.curb_points(s["pt"], k=1)[0]
        if near["nostop"]:
            konflikte.append((s, "nächster Halteplatz an der Straße liegt im Halteverbot", "OpenStreetMap"))
        c = {"typ": "Straßenrand", "pt": near["pt"], "node": near["node"], "wins": [(0, 1440)], "street": near["street"],
             "search": A["suche_sonstiger_halteplatz_min"]}
        c["walk"] = 2 * walk_min(walk_m(c["pt"], s["pt"]))
        c["cost"] = c["walk"] + c["search"]
        route.append({"stops": [s], "cands": [c], "extra": extra, "no_wait": True})
    return route, konflikte


def hints_for(netz, s):
    out = []
    for c in netz.hints:
        if c["geom"].distance(s["pt"]) <= 50:
            out.append(f"{c['name']}: {(c['text'] or '').split('. ')[0]}")
    return out


def run(placeholder=False):
    netz = Netz()
    stops = load_stops(netz, placeholder=placeholder)
    missing = [s for s in stops if s["pt"] is None]
    if missing:
        print("Ohne Koordinate:", [s["label"] for s in missing])
        stops = [s for s in stops if s["pt"] is not None]
    unreach = [s for s in stops if not netz.curb_points(s["pt"], k=1, allow_closed=True)]
    if unreach:
        print("Nicht ans Netz angebunden:", [s["label"] for s in unreach])
        stops = [s for s in stops if s not in unreach]
    missing += unreach
    start = netz.snap(Point(TO_M(13.3856, 52.4857)), prefer_name="Mehringdamm")
    t0 = hm(A["abfahrt_depot"]) + A["depot_bis_tourgebiet_min"]

    v0_route, v0_konf = baseline(netz, stops)
    v0 = simulate(netz, v0_route, start, t0, detail=True)

    v1_halts = halts_sequential(netz, stops)
    v1_route, v1_moves = repair(netz, v1_halts, start, t0)
    v1 = simulate(netz, v1_route, start, t0, detail=True)

    v2_halts = halts_greedy(netz, stops)
    v2_route = optimize(netz, v2_halts, start, t0)
    v2 = simulate(netz, v2_route, start, t0, detail=True)
    return dict(netz=netz, stops=stops, start=start, t0=t0, v0=v0, v0_konf=v0_konf, v1=v1, v1_moves=v1_moves,
                v2=v2, missing=missing)


def summary(name, r):
    return (f"{name:28s} Halte {r['halte']:3d} | Fahrt {r['fahrt']:5.0f} Min | Fuß {r['fuss']:5.0f} Min | "
            f"Warten {r['warten']:4.0f} | Verspätung {r['verspaetung']:4.0f} Min ({len(r['spaet'])} Stopps) | "
            f"zurück im Depot {fmt(r['ende'])}")


if __name__ == "__main__":
    res = run(placeholder="--platzhalter" in sys.argv)
    print(summary("Vorher (Liste)", res["v0"]))
    print(summary("Nur nötige Änderungen", res["v1"]))
    print(summary("Ganz neu planen", res["v2"]))
    print("Konflikte vorher:", len(res["v0_konf"]))
    for s, what, src in res["v0_konf"]:
        print("  ", s["nr"], s["label"], "→", what, "|", src)
    for s, m in res["v0"]["spaet"]:
        print("   verspätet vorher:", s["nr"], s["label"], f"+{m:.0f} Min")
    print("Verschiebungen (nur nötige):", [(h["stops"][0]["label"], a, b) for h, a, b in res["v1_moves"]])
