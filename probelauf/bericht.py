"""Ergebnis des Probelaufs als Markdown + JSON (für Folie C und die App)."""
import json
import sys

from engine import A, TO_LL, fmt


def fw(wins):
    return "ganztägig" if any(a <= 0 and b >= 1440 for a, b in wins) else ", ".join(f"{fmt(a)}–{fmt(b)}" for a, b in wins)
from planer import hints_for, run, walk_m


def stop_times(r):
    out = {}
    for p in r["plan"]:
        for s, t in p["stopps"]:
            out[s["nr"]] = (t, p)
    return out


def decisions(res):
    netz = res["netz"]
    v0t, v1t = stop_times(res["v0"]), stop_times(res["v1"])
    v0_pos = {s["nr"]: i for i, s in enumerate(res["stops"])}
    konf = {s["nr"]: (what, src) for s, what, src in res["v0_konf"]}
    moved = {h["stops"][0]["nr"]: (a, b) for h, a, b in res["v1_moves"]}
    out = []
    for i, p in enumerate(res["v1"]["plan"]):
        h, c = p["halt"], p["park"]
        names = ", ".join(f"{s['nr']} {s['label']}" for s in h["stops"])
        if len(h["stops"]) > 1:
            far = max(walk_m(c["pt"], s["pt"]) for s in h["stops"])
            out.append(("Halte bündeln", names, f"ein Parkpunkt für {len(h['stops'])} Stopps, längster Fußweg ca. {far:.0f} m",
                        "Regel D (bis 150 m, höchstens 4 Stopps)"))
        if c["typ"] == "Ladezone":
            w = fw(c["wins"])
            out.append(("Parken in Ladezone", names, f"{c['street']}, gültig {w}, Ankunft {fmt(p['ankunft'])}",
                        "OpenStreetMap (parking:*:restriction)"))
        if p.get("lz_inaktiv"):
            z = p["lz_inaktiv"]
            w = fw(z["wins"])
            out.append(("Ladezone zur Ankunft nicht gültig", names,
                        f"{z['street']} gilt {w}, Ankunft {fmt(p['ankunft'])} → stattdessen {c['typ']} {c['street']}",
                        "OpenStreetMap"))
        if c.get("warn"):
            out.append(("Fußweg über Grenze", names, f"{c['warn']}; Parkpunkt {c['street']} (näher geht nicht)",
                        "Regel D"))
        for s in h["stops"]:
            if s["nr"] in konf:
                what, src = konf[s["nr"]]
                out.append(("Parkpunkt verlegt", f"{s['nr']} {s['label']}", f"{what}; neu: {c['typ']} {c['street']}", src))
            for hint in hints_for(netz, s):
                out.append(("Hinweis", f"{s['nr']} {s['label']}", hint, "VIZ Berlin"))
            for fx in s["fixes"]:
                out.append(("Adresse bereinigt", f"{s['nr']} {s['label']}", fx, "Import (Schritt 1)"))
        first = h["stops"][0]["nr"]
        if first in moved:
            a, b = moved[first]
            why = []
            for s in h["stops"]:
                if s["prio"]:
                    why.append(f"Prio bis {fmt(s['prio'])}")
                elif s["limit"]:
                    why.append(f"Zeitfenster bis {fmt(s['limit'])}")
            t_old = v0t[first][0]
            out.append(("Halt vorgezogen", names,
                        f"{'; '.join(why) or 'Zeitfenster'}: Ankunft vorher {fmt(t_old)}, jetzt {fmt(v1t[first][0])}",
                        "Tourliste"))
    return out


def md(res):
    L = []
    L.append("# Probelauf Schritt 3b – Ergebnis")
    L.append("")
    L.append(f"Netz: {res['netz'].quelle_netz}. Tourtag Do 26.11.2026, Wetter laut DWD trocken (kein Aufschlag).")
    if res["missing"]:
        L.append(f"Ohne Koordinate oder Anbindung: {', '.join(s['label'] for s in res['missing'])}")
    L.append("")
    L.append("| Variante | Halte | Fahrzeit | Fußweg | Warten | Verspätung | zurück im Depot |")
    L.append("|---|---|---|---|---|---|---|")
    for name, r in (("Vorher: Liste, wie sie kommt", res["v0"]), ("Nur nötige Änderungen", res["v1"]),
                    ("Ganz neu planen", res["v2"])):
        L.append(f"| {name} | {r['halte']} | {r['fahrt']:.0f} Min. | {r['fuss']:.0f} Min. | {r['warten']:.0f} Min. | "
                 f"{r['verspaetung']:.0f} Min. ({len(r['spaet'])} Stopps) | {fmt(r['ende'])} |")
    L.append("")
    L.append("## Konflikte im Vorher-Plan")
    for s, what, src in res["v0_konf"]:
        L.append(f"- {s['nr']} {s['label']}: {what} ({src})")
    for s, m in res["v0"]["spaet"]:
        L.append(f"- {s['nr']} {s['label']}: {m:.0f} Min. zu spät (Zeitfenster/Prio)")
    for s, m in res["v0"]["frueh"]:
        L.append(f"- {s['nr']} {s['label']}: {m:.0f} Min. vor Beginn des Zeitfensters da (Empfänger noch nicht erreichbar)")
    L.append("")
    L.append("## Entscheidungen „nur nötige Änderungen“ (mit Grund und Quelle)")
    L.append("| Art | Stopp(s) | Was und warum | Quelle |")
    L.append("|---|---|---|---|")
    for art, wer, was, src in decisions(res):
        L.append(f"| {art} | {wer} | {was} | {src} |")
    L.append("")
    L.append("## Annahmen")
    for k, v in A.items():
        L.append(f"- {k}: {v}")
    return "\n".join(L)


def to_json(res):
    def ll(pt):
        x, y = TO_LL(pt.x, pt.y)
        return [round(y, 6), round(x, 6)]

    def plan(r):
        return [{"ankunft": fmt(p["ankunft"]), "park": {"typ": p["park"]["typ"], "strasse": p["park"]["street"],
                                                        "latlon": ll(p["park"]["pt"])},
                 "stopps": [{"nr": s["nr"], "adresse": s["label"], "latlon": ll(s["pt"]), "zeit": fmt(t)} for s, t in p["stopps"]]}
                for p in r["plan"]]
    return {"vorher": plan(res["v0"]), "nur_noetige": plan(res["v1"]), "ganz_neu": plan(res["v2"])}


if __name__ == "__main__":
    res = run(placeholder="--platzhalter" in sys.argv)
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    open(os.path.join(here, "probelauf_ergebnis.md"), "w").write(md(res))
    json.dump(to_json(res), open(os.path.join(here, "probelauf_routen.json"), "w"), ensure_ascii=False, indent=1)
    print(md(res)[:6000])
