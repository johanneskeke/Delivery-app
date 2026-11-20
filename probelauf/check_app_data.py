"""Check of the app data bundle (lieferplan-prototyp/assets/data/) before it goes into the app.

    ../.venv/bin/python check_app_data.py

Exit code 0 = all hard checks passed; warnings are printed but do not fail.
Hard checks: format version, every stop exactly once per plan, every shipment has a slot (planned modes), driving
paths only use open road segments (no closure, no bollard, one-way respected), loading zones valid at arrival,
no parking point in a no-stopping zone or a closure, walks within the limits unless a warning says so,
0 conflicts in the planned modes.
"""
import json
import os
import re
import sys

from shapely.geometry import Point

from engine import A, BASE, TO_M, Netz, hm

DATA = os.path.join(BASE, "lieferplan-prototyp", "assets", "data")
SCHEMA_VERSION = 1
errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def pt(latlon):
    return Point(TO_M(latlon[1], latlon[0]))


def valid_at(valid, t):
    if valid == "all day":
        return True
    for a, b in re.findall(r"(\d\d:\d\d)–(\d\d:\d\d)", valid or ""):
        if hm(a) <= t <= hm(b):
            return True
    return False


def main():
    meta = load("meta.json")
    tour = load("tour.json")
    files = {name: load(name) for name in meta["files"]}
    for name, d in files.items():
        if d.get("schema_version") != SCHEMA_VERSION:
            err(f"{name}: schema_version {d.get('schema_version')} != {SCHEMA_VERSION}")

    stop_nos = {s["no"] for s in tour["stops"]}
    shipments = {s["id"]: s for s in tour["shipments"]}
    if len(stop_nos) != 58 or len(shipments) != 95:
        err(f"tour: {len(stop_nos)} stops / {len(shipments)} shipments (expected 58 / 95)")

    netz = Netz()
    G = {(round(k[1], 6), round(k[0], 6)): k for k in netz.G.nodes}  # [lat, lon] in the JSON → graph node key

    for mode in ("before", "only_necessary", "replan_full"):
        p = files[f"plan_{mode}.json"]
        seen = [st["no"] for h in p["halts"] for st in h["stops"]]
        if sorted(seen) != sorted(stop_nos):
            err(f"{mode}: stops not exactly once (missing {sorted(stop_nos - set(seen))}, "
                f"duplicates {sorted({n for n in seen if seen.count(n) > 1})})")
        segs = 0
        for h in p["halts"]:
            # driving path: every step must be an edge of the open road graph (closures and bollards removed)
            nodes = [G.get(tuple(c)) for c in h["drive_path"][:-1]]
            if None in nodes:
                err(f"{mode} {h['id']}: driving path point not in the road graph")
            else:
                for u, v in zip(nodes, nodes[1:]):
                    segs += 1
                    if not netz.G.has_edge(u, v):
                        err(f"{mode} {h['id']}: driving path uses a segment that is not open ({u} → {v})")
            park = h["parking"]
            arr = hm(h["arrival"])
            if park["kind"] == "loading_zone" and not valid_at(park["valid"], arr):
                err(f"{mode} {h['id']}: loading zone {park['street']} valid {park['valid']}, arrival {h['arrival']}")
            q = pt(park["latlon"])
            if mode != "before" and netz.no_stopping_at(q):
                err(f"{mode} {h['id']}: parking point in a no-stopping zone ({park['street']})")
            for c in netz.full:
                if mode != "before" and c["geom"].distance(q) < 15 and (c["name"] in park["street"] or park["street"] in c["name"]):
                    err(f"{mode} {h['id']}: parking point inside closure {c['name']}")
            has_walk_warning = any(w["kind"] == "walk_over_limit" for w in h["warnings"])
            for st in h["stops"]:
                limit = A["sperrgut_max_fussweg_m"] if st["flags"]["bulky"] else A["halt_max_fussweg_m"]
                if mode != "before" and st["walk_m"] > limit + 0.5 and not has_walk_warning:
                    err(f"{mode} {h['id']}: walk {st['walk_m']} m to {st['address']} over {limit} m without a warning")
        if mode != "before":
            if p["kpis"]["conflicts"] != 0 or p["kpis"]["late_stops"] != 0:
                err(f"{mode}: conflicts {p['kpis']['conflicts']}, late {p['kpis']['late_stops']}")
            missing = set(shipments) - set(p["slots"])
            if missing:
                err(f"{mode}: shipments without a slot: {sorted(missing)}")
            heavy_up = [i for i, s in p["slots"].items()
                        if shipments[i]["weight_kg"] > 10 and s["slot"][-1] in "34" and s["slot"] != "C4"]
            if heavy_up:
                warn(f"{mode}: {len(heavy_up)} parcels over 10 kg in an upper slot: {heavy_up}")
            ids = [c["id"] for c in p["changes"]]
            if len(ids) != len(set(ids)):
                err(f"{mode}: duplicate change ids")
            if any(c["if_rejected"] is None for c in p["changes"] if c["rejectable"]):
                warn(f"{mode}: 'what if rejected' not yet computed (planned build step Mon 2026-11-23)")
        print(f"{mode:16s} halts {len(p['halts']):3d}, driving segments checked {segs}")

    for w in warnings:
        print("WARNING", w)
    for e in errors:
        print("ERROR  ", e)
    print(f"{'OK' if not errors else 'FAILED'}: {len(errors)} errors, {len(warnings)} warnings "
          f"(departure {meta['departure']}, generated {meta['generated_at']})")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
