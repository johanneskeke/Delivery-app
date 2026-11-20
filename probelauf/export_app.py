"""Export of the planning results for the app (data format v1, decided 2026-11-20, docs/01 "Build plan" P3).

Writes JSON files into lieferplan-prototyp/assets/data/. The app shows these results; it does not calculate.

    ../.venv/bin/python export_app.py                  # departure 08:30 (tour header, decision B6)
    ../.venv/bin/python export_app.py --departure 08:00

Not yet in v1 (later build steps, P1): "what if rejected" per change (if_rejected stays null), the march scenario
for "Update situation". Texts for the app are English; tour data stay German (decision UI language).
"""
import argparse
import datetime as dt
import json
import math
import os
import re
from collections import defaultdict

import openpyxl

import engine
from engine import A, BASE, TO_LL, TOURTAG, fmt

SCHEMA_VERSION = 1
OUT_DIR = os.path.join(BASE, "lieferplan-prototyp", "assets", "data")

# Shelf layout (Step 4, labels A–C/1–4 provisional): rack A at the sliding door, slot 1 at the bottom,
# C4 is the returns/pickups slot, bulky items go on the floor at the back.
RACKS = [("A", [1, 2, 3, 4]), ("B", [1, 2, 3, 4]), ("C", [1, 2, 3])]
RETURNS_SLOT = "C4"
HEAVY_KG = 10.0
SHELF_PRODUCTS = {"Paket", "Päckchen"}

DATA_AS_OF = {  # download dates of the sources (docs/03, 06)
    "closures_viz": "2026-11-19",
    "closures_landesmeldestelle": "2026-11-19",
    "loading_zones_osm": "2026-11-19",
    "road_network_osm": "2026-11-20",
    "weather_dwd": "2026-11-19",
    "demonstrations_police": "2026-11-19",
}
ATTRIBUTIONS = [
    "Closures: Digitale Plattform Stadtverkehr Berlin / Baustellen, Sperrungen und sonstige Störungen von besonderem "
    "verkehrlichem Interesse, dl-de-by-2.0",
    "Weather: Quelle: Deutscher Wetterdienst, CC BY 4.0 (via Bright Sky)",
    "Road network, traffic rules, loading zones, addresses: © OpenStreetMap contributors, ODbL",
    "Map display: Google Maps",
]
ASSUMPTIONS_EN = [
    "Speeds: 22 km/h main roads, 20 km/h collector roads, 16 km/h residential, 7 km/h traffic-calmed",
    "Walking 4.5 km/h, straight line × 1.25, every stop there and back to the van",
    "Stop duration: 2 min + 1 min per shipment; bulky item +3 min; ID/age check +2 min",
    "Parking search: loading zone 1 min, other kerbside 3 min",
    "Depot to tour area 12 min each way; no turn restrictions",
    "Halts: walk up to 150 m, at most 4 stops, bulky items at most 30 m",
]

PARK_KIND = {"Ladezone": "loading_zone", "Straßenrand": "kerbside"}


# ---------------------------------------------------------------- helpers

def ll(pt):
    """Shapely point in metres (EPSG:25833) → [lat, lon]."""
    x, y = TO_LL(pt.x, pt.y)
    return [round(y, 6), round(x, 6)]


def node_ll(k):
    """Graph node key (lon, lat) → [lat, lon]."""
    return [round(k[1], 6), round(k[0], 6)]


def geom_lines(geom):
    parts = getattr(geom, "geoms", [geom])
    out = []
    for g in parts:
        if g.geom_type == "LineString":
            out.append([[round(y, 6), round(x, 6)] for x, y in (TO_LL(*c) for c in g.coords)])
    return out


def fw(wins):
    if any(a <= 0 and b >= 1440 for a, b in wins):
        return "all day"
    return ", ".join(f"{fmt(a)}–{fmt(b)}" for a, b in wins)


def mins(x):
    return int(round(x))


def street_short(text):
    return (text or "").replace("Berlin, ", "")


# ---------------------------------------------------------------- tour, import

def read_header():
    wb = openpyxl.load_workbook(os.path.join(BASE, "tourdaten", "tourliste-kreuzberg.xlsx"))
    kv = {r[0]: r[1] for r in wb["Tourkopf"].iter_rows(values_only=True) if r and r[0]}
    date = kv["Tourdatum"]
    return {
        "tour_id": kv["Tour"],
        "date": date.date().isoformat() if isinstance(date, dt.datetime) else str(date),
        "district": kv["Zustellbezirk"],
        "depot": kv["Start und Ende (Depot)"],
        "vehicle": kv["Fahrzeug"],
        "shift_start": kv["Schichtbeginn"],
        "planned_departure": kv["Geplante Abfahrt"],
        "origin": kv["Herkunft"],
        "carrier": "Havelbote Paketlogistik GmbH (fictional)",
    }


def shipment_json(r):
    return {
        "id": r["Sendungsnummer"],
        "stop_no": r["Stopp"],
        "recipient": r["Empfänger"],
        "street": r["Straße"],
        "house_no": r["Hausnr."],
        "address_extra": r["Adresszusatz"],
        "postcode": r["PLZ"],
        "city": r["Ort"],
        "product": r["Produkt"],
        "service": r["Service"],
        "window_from": r["Zeitfenster von"] or None,
        "window_to": r["Zeitfenster bis"] or None,
        "weight_kg": r["Gewicht kg"],
        "note": r["Hinweis"],
    }


def import_notes(tour, stops):
    notes = []
    issue_kind = {
        "Tippfehler im Straßennamen": "street_fixed",
        "Straße abgekürzt": "street_fixed",
        "PLZ fehlt": "postcode_missing",
        "Adresszusatz in der Hausnummer": "house_no_cleaned",
    }
    by_nr = {s["nr"]: s for s in stops}
    rows = {r["Sendungsnummer"]: r for r in tour["rows"]}
    for iss in tour["issues"]:
        r = rows[iss["Sendungsnummer"]]
        s = by_nr.get(iss["Stopp"])
        kind = issue_kind.get(iss["Fehler"], "postcode_wrong" if "falsche PLZ" in iss["Fehler"] else "other")
        original = f"{r['Straße']} {r['Hausnr.']}, {r['PLZ'] or '(no postcode)'}"
        used = s["label"] if s else None
        text = {
            "street_fixed": f"Street name corrected: {r['Straße']} → {s['street'] if s else '?'}",
            "postcode_missing": "Postcode missing; address found via street and house number",
            "house_no_cleaned": f"House number cleaned: {r['Hausnr.']} → {s['hnr'] if s else '?'}",
            "postcode_wrong": f"Postcode {r['PLZ']} does not match the street; address found via street and house number",
        }.get(kind, iss["Fehler"])
        notes.append({"kind": kind, "shipment_id": r["Sendungsnummer"], "stop_no": iss["Stopp"],
                      "original": original, "used": used, "text": text, "source": "Import check (Step 1)",
                      "deliberate_test_error": True})
    for s in stops:
        if s["geo"] and s["geo"].startswith("Nachbar-Hausnummer"):
            nb = s["geo"].split()[-1]
            notes.append({"kind": "house_no_not_found", "shipment_id": None, "stop_no": s["nr"],
                          "original": s["label"], "used": f"{s['street']} {nb}",
                          "text": f"{s['label']} not found, {s['street']} {nb} used",
                          "source": "OpenStreetMap addresses", "deliberate_test_error": False})
    return notes


# ---------------------------------------------------------------- map, weather

def map_json(netz, start):
    closures = []
    for kind, lst in (("full", netz.full), ("one_direction", netz.oneway_cl), ("note", netz.hints)):
        for c in lst:
            closures.append({
                "id": c["id"], "kind": kind, "street": c["name"], "section": street_short(c["abschnitt"]),
                "text": c["text"], "valid_from": c["von"], "valid_to": c["bis"],
                "source": c["quelle"], "lines": geom_lines(c["geom"]),
            })
    return {
        "depot": {"name": "Zustellbasis Tempelhof", "address": "Eresburgstraße 24, 12103 Berlin"},
        "start_point": {"name": "Mehringdamm / Dudenstraße", "latlon": node_ll(start),
                        "note": f"Depot to here {mins(A['depot_bis_tourgebiet_min'])} min (assumption)"},
        "closures": closures,
    }


def weather_json():
    w = json.load(open(os.path.join(BASE, "data_weather", "weather_26-11.json")))
    hours = []
    for h in w["weather"]:
        t = dt.datetime.fromisoformat(h["timestamp"])
        if t.date() == TOURTAG and 7 <= t.hour <= 18:
            hours.append({"hour": t.strftime("%H:%M"), "condition": h["condition"], "precip_mm": h["precipitation"],
                          "precip_prob": h["precipitation_probability"], "temp_c": h["temperature"],
                          "gust_kmh": h["wind_gust_speed"]})
    wet = [h for h in hours if (h["precip_mm"] or 0) > 0]
    temps = [h["temp_c"] for h in hours if h["temp_c"] is not None]
    return {
        "source": "Deutscher Wetterdienst (MOSMIX) via Bright Sky, station Berlin-Tempelhof",
        "fetched": DATA_AS_OF["weather_dwd"],
        "summary": ("dry all day" if not wet else f"precipitation in {len(wet)} hours")
                   + (f", {min(temps):.0f} to {max(temps):.0f} °C" if temps else ""),
        "surcharge": "none" if not wet else "see hours",
        "note": "Frost in the morning" if temps and min(temps) < 0.5 else None,
        "hours": hours,
    }


# ---------------------------------------------------------------- plans

def stop_flags(rows):
    services = {r["Service"] for r in rows}
    return {
        "bulky": any(r["Produkt"] == "Sperrgut" for r in rows),
        "pickup": any(r["Produkt"].startswith("Abholung") for r in rows),
        "id_check": "Identcheck" in services,
        "age_check": "Alterssichtprüfung 18" in services,
        "priority": next((s for s in services if s.startswith("Prio")), None),
        "preferred_neighbour": "Wunschnachbar" in services,
        "preferred_dropoff": "Wunschablageort" in services,
    }


def window_of(s):
    if s["von"] is None and s["limit"] is None:
        return None
    return {"from": fmt(s["von"]) if s["von"] is not None else None,
            "until": fmt(s["limit"]) if s["limit"] is not None else None}


def build_plan(netz, start, sim, rows_by_stop, mode, extra_halt_info=None):
    halts, prev = [], start
    for i, p in enumerate(sim["plan"]):
        h, c = p["halt"], p["park"]
        hid = f"H{i + 1:02d}"
        node_path = netz.path(prev, c["node"]) if prev != c["node"] else [prev]
        drive_path = [node_ll(k) for k in node_path] + [ll(c["pt"])]
        stops_out = []
        for s, t in p["stopps"]:
            wm = engine_walk_m(c["pt"], s["pt"])
            stops_out.append({
                "no": s["nr"], "address": s["label"], "door": ll(s["pt"]), "eta": fmt(t),
                "walk_m": mins(wm), "window": window_of(s),
                "shipment_ids": [r["Sendungsnummer"] for r in rows_by_stop[s["nr"]]],
                "flags": stop_flags(rows_by_stop[s["nr"]]),
                "notes": [{"text": hint, "source": "VIZ Berlin"} for hint in hints_en(netz, s)],
            })
        warnings = []
        if c.get("warn"):
            m = re.match(r"Fußweg (\d+) m, Grenze (\d+) m", c["warn"])
            warnings.append({"kind": "walk_over_limit",
                             "text": f"Walk {m.group(1)} m, limit {m.group(2)} m; nothing closer ({c['street']})" if m
                             else c["warn"], "source": "Rule D (assumption)"})
        halt = {
            "id": hid, "seq": i + 1, "arrival": fmt(p["ankunft"]), "leave": fmt(p["ab"]),
            "parking": {"kind": PARK_KIND[c["typ"]], "street": c["street"], "latlon": ll(c["pt"]),
                        "valid": fw(c["wins"]) if c["typ"] == "Ladezone" else None,
                        "search_min": c["search"]},
            "stops": stops_out, "warnings": warnings, "conflicts": [],
            "drive_path": drive_path, "drive_min": None,
        }
        halt["drive_min"] = round(netz.t(prev, c["node"]), 1)
        halts.append(halt)
        prev = c["node"]
    back_path = [node_ll(k) for k in netz.path(prev, start)]
    kpis = {
        "halts": sim["halte"], "drive_min": mins(sim["fahrt"]), "walk_min": mins(sim["fuss"]),
        "wait_min": mins(sim["warten"]), "late_min": mins(sim["verspaetung"]), "late_stops": len(sim["spaet"]),
        "early_stops": len(sim["frueh"]), "back_at_depot": fmt(sim["ende"]),
    }
    return {"schema_version": SCHEMA_VERSION, "mode": mode, "kpis": kpis, "halts": halts,
            "return_path": back_path, "changes": [], "slots": {}}


def engine_walk_m(a, b):
    return a.distance(b) * A["umwegfaktor_fussweg"]


def hints_en(netz, s):
    """VIZ notes within 50 m (e.g. narrowing). The VIZ text itself stays German, like all source data."""
    out = []
    for c in netz.hints:
        if c["geom"].distance(s["pt"]) <= 50:
            first = (c["text"] or "").split(". ")[0]
            out.append(f"{c['name']}: {first}")
    return out


# ---------------------------------------------------------------- changes (reason + source)

def changes_for(netz, res, plan, sim, mode):
    """Change list with reason and source, English. if_rejected stays null in v1 (Mon build step)."""
    v0_times = {s["nr"]: t for p in res["v0"]["plan"] for s, t in p["stopps"]}
    konf = {s["nr"]: (what, src) for s, what, src in res["v0_konf"]}
    moved = {h["stops"][0]["nr"]: (a, b) for h, a, b in res["v1_moves"]} if mode == "only_necessary" else {}
    out = []
    prefix = {"only_necessary": "N", "replan_full": "F"}[mode]

    def add(kind, halt, stop_nos, title, detail, source, rejectable, not_rejectable_reason=None):
        out.append({"id": f"{prefix}-{len(out) + 1:02d}", "kind": kind, "halt_id": halt["id"], "stop_nos": stop_nos,
                    "title": title, "detail": detail, "source": source, "rejectable": rejectable,
                    "not_rejectable_reason": not_rejectable_reason, "if_rejected": None})

    if mode == "replan_full":
        late_before = [s for s, _ in res["v0"]["spaet"]]
        out.append({"id": f"{prefix}-00", "kind": "order_replanned", "halt_id": None,
                    "stop_nos": [s["nr"] for s in late_before],
                    "title": f"Order replanned completely: {sim['halte']} halts instead of 58",
                    "detail": f"Driving {mins(sim['fahrt'])} min instead of {mins(res['v0']['fahrt'])} min; "
                              f"{len(late_before)} late deliveries of the list order are on time",
                    "source": {"name": "Tour list", "ref": "time windows and priority shipments"},
                    "rejectable": True, "not_rejectable_reason": None, "if_rejected": None})

    for p, halt in zip(sim["plan"], plan["halts"]):
        h, c = p["halt"], p["park"]
        nos = [s["nr"] for s in h["stops"]]
        names = ", ".join(f"{s['nr']} {s['label']}" for s in h["stops"])
        if len(h["stops"]) > 1:
            far = max(engine_walk_m(c["pt"], s["pt"]) for s in h["stops"])
            add("bundle", halt, nos, f"Bundle {len(nos)} stops: {names}",
                f"One parking point for {len(nos)} stops, longest walk about {far:.0f} m",
                {"name": "Rule D (assumption)", "ref": "walk ≤150 m, ≤4 stops"}, True)
        for s in h["stops"]:
            if s["nr"] in konf:
                what, src = konf[s["nr"]]
                if "Sperrung" in what:
                    why = "The kerbside spot at the door is inside a closure"
                    reason = "Hard rule: never park inside a closure"
                else:
                    why = "The nearest kerbside spot is in a no-stopping zone"
                    reason = "Hard rule: never park in a no-stopping zone"
                add("parking_moved", halt, [s["nr"]], f"Park in {c['street']} for {s['nr']} {s['label']}",
                    f"{why}; new: {'loading zone' if c['typ'] == 'Ladezone' else 'kerbside'} {c['street']}",
                    {"name": "VIZ Berlin" if src.startswith("VIZ") else "OpenStreetMap",
                     "ref": street_short(src.replace("VIZ: ", "")) if src.startswith("VIZ") else "no-stopping zones"},
                    False, reason)
        if c["typ"] == "Ladezone":
            add("loading_zone", halt, nos, f"Park in the loading zone {c['street']}",
                f"Valid {fw(c['wins'])}, arrival {fmt(p['ankunft'])}",
                {"name": "OpenStreetMap", "ref": "parking:*:restriction / restriction:conditional"}, True)
        if p.get("lz_inaktiv"):
            z = p["lz_inaktiv"]
            add("loading_zone_not_valid", halt, nos, f"Loading zone {z['street']} not valid at arrival",
                f"Valid {fw(z['wins'])}, arrival {fmt(p['ankunft'])} → instead "
                + (f"another loading zone {c['street']} (valid {fw(c['wins'])})" if c["typ"] == "Ladezone"
                   else f"kerbside {c['street']}"),
                {"name": "OpenStreetMap", "ref": "loading-zone times"}, False,
                "Hard rule: loading zones only at their times")
        first = h["stops"][0]["nr"]
        if first in moved:
            why = []
            for s in h["stops"]:
                if s["prio"]:
                    why.append(f"priority until {fmt(s['prio'])}")
                elif s["limit"]:
                    why.append(f"time window until {fmt(s['limit'])}")
            now = next(t for s, t in p["stopps"] if s["nr"] == first)
            add("halt_moved_earlier", halt, nos, f"Move halt earlier: {names}",
                f"{'; '.join(why).capitalize() or 'Time window'}: at the door {fmt(v0_times[first])} in the list "
                f"order, now {fmt(now)}", {"name": "Tour list", "ref": "time windows and priority shipments"}, True)
    return out


def before_conflicts(res, plan):
    konf = defaultdict(list)
    for s, what, src in res["v0_konf"]:
        konf[s["nr"]].append({"kind": "closure" if "Sperrung" in what else "no_stopping",
                              "text": "Spot at the door is inside a closure" if "Sperrung" in what
                              else "Nearest kerbside spot is in a no-stopping zone",
                              "source": "VIZ Berlin" if src.startswith("VIZ") else "OpenStreetMap"})
    for s, m in res["v0"]["spaet"]:
        konf[s["nr"]].append({"kind": "late", "text": f"{mins(m)} min late (time window / priority)",
                              "source": "Tour list"})
    for s, m in res["v0"]["frueh"]:
        konf[s["nr"]].append({"kind": "too_early", "text": f"{mins(m)} min before the time window opens",
                              "source": "Tour list"})
    n = 0
    for halt in plan["halts"]:
        for st in halt["stops"]:
            halt["conflicts"] += konf.get(st["no"], [])
        n += len(halt["conflicts"])
    plan["kpis"]["conflicts"] = n


# ---------------------------------------------------------------- slots (Step 4)

def assign_slots(plan, rows_by_stop):
    """Rack by route position (A = first part, near the sliding door), contiguous blocks of halts per slot,
    blocks with heavy parcels (>10 kg) get the bottom slots 1–2. Bulky → floor, pickups → returns slot C4."""
    slots = {}
    seq = []  # (halt_id, shelf rows)
    for halt in plan["halts"]:
        shelf = []
        for st in halt["stops"]:
            for r in rows_by_stop[st["no"]]:
                if r["Produkt"] == "Sperrgut":
                    slots[r["Sendungsnummer"]] = {"slot": "FLOOR", "halt_id": halt["id"],
                                                  "reason": "Bulky item: floor area at the back"}
                elif r["Produkt"].startswith("Abholung"):
                    slots[r["Sendungsnummer"]] = {"slot": RETURNS_SLOT, "halt_id": halt["id"], "pickup": True,
                                                  "reason": "Pickup: not scanned; goes into the returns slot"}
                elif r["Produkt"] in SHELF_PRODUCTS:
                    shelf.append(r)
        seq.append((halt, shelf))
    total = sum(len(s) for _, s in seq)
    n_slots = sum(len(sl) for _, sl in RACKS)
    # split halts contiguously into racks by parcel count
    bounds, acc, k = [], 0, 0
    targets, cum = [], 0
    for _, sl in RACKS:
        cum += len(sl)
        targets.append(total * cum / n_slots)
    rack_of = []
    for halt, shelf in seq:
        mid = acc + len(shelf) / 2
        while k < len(RACKS) - 1 and mid > targets[k]:
            k += 1
        rack_of.append(k)
        acc += len(shelf)
    for ri, (rack, slot_nos) in enumerate(RACKS):
        items = [(halt, shelf) for (halt, shelf), r in zip(seq, rack_of) if r == ri]
        if not items:
            continue
        n_items = sum(len(s) for _, s in items)
        first_halt = items[0][0]["seq"]
        last_halt = items[-1][0]["seq"]
        # halts with a parcel over 10 kg first (bottom slots 1–2), then the others; route order inside each group;
        # then contiguous blocks, one per slot, so the halts of one slot follow each other
        is_heavy = lambda sh: any(r["Gewicht kg"] > HEAVY_KG for r in sh)
        items = [it for it in items if is_heavy(it[1])] + [it for it in items if not is_heavy(it[1])]
        blocks, acc, b = [[] for _ in slot_nos], 0, 0
        for halt, shelf in items:
            mid = acc + len(shelf) / 2
            while b < len(slot_nos) - 1 and mid > n_items * (b + 1) / len(slot_nos):
                b += 1
            blocks[b].append((halt, shelf))
            acc += len(shelf)
        for slot_no, block in zip(slot_nos, blocks):
            slot = f"{rack}{slot_no}"
            for halt, shelf in block:
                for r in shelf:
                    why = (f"Rack {rack}: halts {first_halt}–{last_halt}"
                           f"{' (near the sliding door)' if ri == 0 else ''}; same halt → same slot")
                    if r["Gewicht kg"] > HEAVY_KG:
                        why += f"; {r['Gewicht kg']} kg → bottom slot" if slot_no <= 2 else \
                            f"; {r['Gewicht kg']} kg (bottom slots full)"
                    slots[r["Sendungsnummer"]] = {"slot": slot, "halt_id": halt["id"], "reason": why}
    plan["slots"] = slots


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--departure", default="08:30", help="departure from the depot (HH:MM)")
    ap.add_argument("--start-mode", default="only_necessary", choices=["only_necessary", "replan_full"],
                    help="plan the app shows first (open decision B8)")
    args = ap.parse_args()
    A["abfahrt_depot"] = args.departure

    from planer import run  # import after the departure is set
    res = run()
    netz, start = res["netz"], res["start"]
    tour = json.load(open(os.path.join(BASE, "tourdaten", "tourliste.json")))
    rows_by_stop = defaultdict(list)
    for r in tour["rows"]:
        rows_by_stop[r["Stopp"]].append(r)

    os.makedirs(OUT_DIR, exist_ok=True)

    def write(name, data):
        path = os.path.join(OUT_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(f"{name:28s} {os.path.getsize(path) / 1024:7.1f} KB")

    header = read_header()
    stops_json = []
    for s in res["stops"]:
        stops_json.append({"no": s["nr"], "address": s["label"], "door": ll(s["pt"]), "recipient": s["empf"],
                           "shipment_ids": [r["Sendungsnummer"] for r in rows_by_stop[s["nr"]]],
                           "window": window_of(s), "flags": stop_flags(rows_by_stop[s["nr"]]),
                           "geocoding": s["geo"]})

    plans = {}
    plans["before"] = build_plan(netz, start, res["v0"], rows_by_stop, "before")
    before_conflicts(res, plans["before"])
    for mode, key in (("only_necessary", "v1"), ("replan_full", "v2")):
        p = build_plan(netz, start, res[key], rows_by_stop, mode)
        p["changes"] = changes_for(netz, res, p, res[key], mode)
        p["kpis"]["conflicts"] = 0
        assign_slots(p, rows_by_stop)
        plans[mode] = p

    meta = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "engine": "probelauf/engine.py + planer.py (offline, OSM road network)",
        "tour_date": TOURTAG.isoformat(),
        "departure": args.departure,
        "start_mode": args.start_mode,
        "synthetic": True,
        "synthetic_label": "Synthetic tour (fictional carrier Havelbote Paketlogistik GmbH), real open data",
        "data_as_of": DATA_AS_OF,
        "attributions": ATTRIBUTIONS,
        "assumptions": ASSUMPTIONS_EN,
        "weather": weather_json(),
        "not_yet_included": ["if_rejected per change", "scenario_march.json (Update situation)"],
        "files": ["meta.json", "tour.json", "import.json", "map.json", "plan_before.json",
                  "plan_only_necessary.json", "plan_replan_full.json"],
    }
    write("meta.json", meta)
    write("tour.json", {"schema_version": SCHEMA_VERSION, "header": header,
                        "shipments": [shipment_json(r) for r in tour["rows"]], "stops": stops_json})
    write("import.json", {"schema_version": SCHEMA_VERSION, "notes": import_notes(tour, res["stops"]),
                          "missing": [s["label"] for s in res["missing"]]})
    write("map.json", {"schema_version": SCHEMA_VERSION, **map_json(netz, start)})
    for mode, p in plans.items():
        write(f"plan_{mode}.json", p)
    for mode, p in plans.items():
        k = p["kpis"]
        print(f"{mode:16s} halts {k['halts']:3d} | drive {k['drive_min']:4d} | walk {k['walk_min']:4d} | "
              f"wait {k['wait_min']:3d} | late {k['late_stops']} | conflicts {k['conflicts']:2d} | "
              f"changes {len(p['changes']):2d} | back {k['back_at_depot']}")


if __name__ == "__main__":
    main()
