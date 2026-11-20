# 04 Routing logic and trial run
Last updated: 2026-11-20 · Spec = decided (see 01). Results = trial run of 2026-11-20 with real data, departure 08:00.

## 1. What the trial run is
Before building the app we ran the decided logic offline with real data to check whether the rules give sensible results and to get numbers and a map for the before/after slide.
- Scripts (Python, in the workspace bundle, folder `probelauf/`): `engine.py` (road network, closures, bollards, loading zones, no-stopping zones, address lookup), `planer.py` (halts, order, schedule, three variants), `bericht.py` (key figures, decision list, routes as JSON), `karte.py` (map PNG).
- Data: OSM road network and addresses (export of 2026-11-20), VIZ closures (2026-11-19), OSM loading/no-stopping zones (2026-11-19), DWD weather (dry, no surcharge).
- Travel times come from the OSM road network with assumed speeds, **not from OpenRouteService** (ORS cannot be reached from the chat workspace). In the app, ORS will provide travel times.

## 2. How the scripts implement the decided logic
**Road network**
- Drivable: primary, secondary, tertiary (+ links), unclassified, residential, living_street. Excluded: access/motor_vehicle/vehicle = no or private. motor_vehicle=destination ("access only") is allowed (delivery traffic counts as access).
- One-way: oneway=yes/true/1 forward only, -1 backward only; roundabouts are one-way.
- Barriers on the road block cars (bollard, block, gate, lift gate, cycle barrier, chain, etc.) unless motor_vehicle/access = yes/destination/delivery.
- Full closures (VIZ, valid on 2026-11-26 07:00–18:00): road segments of the same street within 15 m of the closure line are removed. One-direction closures: only the stated direction is removed (Möckernstraße towards Kreuzbergstraße). Narrowing / lane closures (e.g. Gneisenaustraße) are only notes for stops within 50 m.
- Only the largest strongly connected part of the network is used.

**Parking points**
- Loading zones: OSM street ways with `parking:*:restriction(=|:conditional) = loading_only` and separate `amenity=parking` areas with `restriction(:conditional)`. Opening-hours conditions are parsed for Thursday (e.g. "Mo-Fr 07:00-17:00", "Mo-Sa 06:00-22:00", "Mo-Fr 06:00-20:00; Sa 09:00-15:00"). Lines are sampled every 10 m. Loading zones inside a closure are dropped.
- Kerbside: the nearest point on a drivable, non-closed street; rejected if within 6 m of a no-stopping line (both sides).
- Search time: loading zone 1 min, other kerbside 3 min (assumption).

**Addresses**
- Exact match of street + house number; with several matches (entrance, building) the one closest to a drivable road; otherwise the nearest existing house number (at most 3 numbers away), labelled. Import fixes from Step 1 applied (street typo, abbreviation, house number with extra text).

**Halts**
- Limits per rule D: walk ≤150 m (straight line × 1.25), ≤4 stops, bulky item ≤30 m; time windows of the stops in a halt must overlap.
- Bundling only if a parking point exists that is valid for the whole shift (kerbside, or loading zone covering 08:00–18:00).
- If no parking point is within the limit (e.g. street closed to cars), the nearest legal kerbside is used and a **warning** is shown.
- "Only necessary changes": walk the list in its order and bundle consecutive stops. "Replan completely": form halts independent of the order (seed = stop with most neighbours, add the nearest stops while the limits hold).

**Schedule** (per halt): drive → choose the cheapest parking point that is valid at arrival (if only loading zones exist and none is valid yet, wait until the earliest opens) → search time → for each stop: walk there, wait if the time window has not started, deliver (stop duration rule E), walk back. Lateness against time window end or priority deadline is a violation. At the end: back to the start point plus 12 min to the depot.

**Order**
- "Only necessary changes": keep the list order; while a stop is late, move its halt to the best earlier position (objective below).
- "Replan completely": insert halts by urgency (earliest deadline first) at the cheapest position, then relocate single halts and reverse sections while the objective improves.
- Objective: total time + 100 × minutes late (lateness is effectively forbidden).

**"Before" plan (baseline):** the list exactly as it comes: every stop its own halt, parked at the nearest kerbside in front of the door, no data knowledge, no waiting before time windows (arriving too early counts as a conflict), +3 min if the spot at the door lies inside a closure (driver finds out on site). Local knowledge of a real driver is not modelled.

**Assumptions (labelled):** effective speeds 22 km/h main roads, 20 km/h collector roads, 16 km/h residential, 7 km/h traffic-calmed; walking 4.5 km/h, straight line × 1.25, each stop there and back; departure from the depot 08:00 plus 12 min to the start point Mehringdamm/Dudenstraße; stop duration rule E; no turn restrictions.

## 3. Results (departure 08:00)
| Variant | Halts | Driving | Walking | Waiting | Late | Back at depot |
|---|---|---|---|---|---|---|
| Before: list as it comes | 58 | 225 min | 43 min | 0 min | 4 stops (780 min in total) | 19:39 |
| Only necessary changes (default) | 45 | 200 min | 91 min | 12 min | 0 | 18:51 |
| Replan completely | 34 | 68 min | 104 min | 0 min | 0 | 16:19 |

**Conflicts in the before plan (10):**
- 3 halts inside a closure: Solmsstraße 7 and 12, Zossener Straße 14 (VIZ: closed between Gneisenaustraße and Fürbringerstraße).
- 2 nearest kerbside spots in a no-stopping zone: Baerwaldstraße 18, Friesenstraße 16.
- 4 time windows/priority deadlines missed: Feinkost Marheinekeplatz 15 at 10:59 (window until 10:00); dentist Fidicinstraße 33 about 14:58 (priority until 12:00); Dieffenbachstraße 36 about 17:43 (priority until 12:00); Graefestraße 74 about 18:20 (window until 15:00).
- 1 too early: bookshop Bergmannstraße 9 at 09:01, opens 10:00.

**Both plans:** 0 conflicts. Warnings: Baerwaldstraße 18 walk 205 m (limit 150 m); Zossener Straße 14 walk 32 m (bulky-item limit 30 m; nothing closer because of the closure).

**Where the time goes (before → replan completely, 699 → 499 min):** driving −157, parking search −105 (183 → 78), walking +61, stop duration equal (225).

**How to read the numbers:** absolute clock times depend strongly on the assumptions (stop duration, speeds, search time). The before plan has no local knowledge. → In the pitch show conflicts avoided and differences, not "3 hours earlier".

**Sensitivity, departure 08:30 (as in the tour header):** before 10 conflicts (same stops); only necessary changes 45 halts, 191 min driving, 0 conflicts, back 19:01; replan completely 34 halts, 82 min driving, 0 conflicts, back 17:03. Same conclusions. Open decision which time to use for slides (02).

**Checks passed:** no route uses a closed segment or passes a bollard (5,127 route segments checked); every loading zone used is valid at arrival; no parking point in a no-stopping zone; all 58 stops in every plan; the time components add up to the total time.

## 4. Test cases (rule G)
| Test case | Before | Only necessary changes | Replan completely |
|---|---|---|---|
| Solmsstraße 7/12 (closure) | spot at the door inside the closure | shared halt in Fürbringerstraße, walk 23/107 m | same |
| Zossener Straße 14, bulky item (closure; loading zone only from 11:00) | spot at the door inside the closure | halt Gneisenaustraße, 32 m (just over the 30 m limit; nothing closer because of the closure) | same |
| Feinkost Marheinekeplatz, window 8–10 | 10:59 (late) | 09:05, loading zone at Marheinekeplatz | 09:29 |
| Kiosk Mittenwalder Straße 30, bulky item | kerbside 16 m | own halt, 16 m | 09:21, bundled with Feinkost |
| Architecture office Gneisenaustraße 66, priority by 12 | 10:43 | 11:54 (tight) | 10:06 |
| Dentist Fidicinstraße 33, priority by 12 | about 15:00 (late) | 08:53 | 08:36 |

Other checks of the demo labels: Gneisenaustraße 43 (two recipients) → one halt, loading zone Gneisenaustraße; Bergmannstraße 9 → loading zone at Bergmannstraße (valid 09–22), at the door 10:00; Urbanstraße 112 → last halt in the default mode, but halt 14 of 34 when replanning completely (the label hint "probably late in the route" only holds for the default mode).

## 5. Findings
- **Baerwaldstraße 18:** street closed to cars (OSM motor_vehicle=no plus VIZ closure); nearest legal stopping place about 205 m walk (Gneisenaustraße) → above the 150 m limit; the app warns instead of breaking the rule silently.
- **Five synthetic house numbers do not exist in OSM** (Bergmannstraße 34 and 61, Chamissoplatz 9, Methfesselstraße 22, Willibald-Alexis-Straße 24) → neighbouring number used; decision open (02).
- **Bergmannstraße:** loading zones exist as separate parking areas (Mon–Fri 9–22, Mon–Sat 6–22, partly only until 13:00/15:00); the app uses them. The 6–11 delivery time is still not in OSM.
- **Zossener Straße 14** lies inside the closed section, so the test case "loading zone from 11:00" is overridden by the closure.

## 6. Outputs
- `probelauf_ergebnis.md` (German, generated), `probelauf_routen.json` (routes of all three variants with parking points, coordinates and times; usable for the app and slides), `Probelauf_Karte_vorher_nachher.png` (three-panel map, draft for slide C). All in the workspace bundle.
- Rerun: `python3 probelauf/bericht.py` and `python3 probelauf/karte.py` (needs `pip install shapely pyproj networkx matplotlib`).

## 7. Full decision list, mode "only necessary changes" (as the app would show it)
| Type | Stop(s) | What and why | Source |
|---|---|---|---|
| Halt moved earlier | 49 Dieffenbachstraße 36 | Priority until 12:00: arrival before 17:43, now 08:30 | Tour list |
| Bundle stops | 34 Fidicinstraße 10, 35 Fidicinstraße 33 | one parking point for 2 stops, longest walk approx. 44 m | Rule D (≤150 m, ≤4 stops) |
| Halt moved earlier | 34 Fidicinstraße 10, 35 Fidicinstraße 33 | Priority until 12:00: arrival before 14:46, now 08:49 | Tour list |
| Park in loading zone | 15 Marheinekeplatz 15 | Parking area at Marheinekeplatz, valid 06:00–15:00, arrival 09:04 | OpenStreetMap |
| Halt moved earlier | 15 Marheinekeplatz 15 | Time window until 10:00: arrival before 10:59, now 09:05 | Tour list |
| Walk exceeds limit | 1 Baerwaldstraße 18 | Walk 205 m, limit 150 m; parking point Gneisenaustraße (nothing closer) | Rule D |
| Parking point moved | 1 Baerwaldstraße 18 | nearest kerbside spot is in a no-stopping zone; new: kerbside Gneisenaustraße | OpenStreetMap |
| Park in loading zone | 2 Baerwaldstraße 49 | Parking area at Blücherstraße, valid 06:00–20:00, arrival 09:26 | OpenStreetMap |
| Bundle stops | 3 Bergmannstraße 3, 4 Bergmannstraße 9 | one parking point for 2 stops, longest walk approx. 109 m | Rule D (≤150 m, ≤4 stops) |
| Park in loading zone | 3 Bergmannstraße 3, 4 Bergmannstraße 9 | Parking area at Bergmannstraße, valid 09:00–22:00, arrival 09:44 | OpenStreetMap |
| Park in loading zone | 5 Bergmannstraße 18 | Parking area at Bergmannstraße, valid 06:00–22:00, arrival 10:09 | OpenStreetMap |
| Park in loading zone | 6 Bergmannstraße 26 | Friesenstraße, valid 06:00–20:00, arrival 10:16 | OpenStreetMap |
| Loading zone not valid at arrival | 7 Bergmannstraße 34 | Schleiermacherstraße valid 11:00–23:00, arrival 10:24 → instead kerbside Bergmannstraße | OpenStreetMap |
| Address cleaned | 9 Bergmannstraße 61 | Street corrected: Bergmannstr. → Bergmannstraße | Import (Step 1) |
| Bundle stops | 52 Graefestraße 11, 53 Graefestraße 74 | one parking point for 2 stops, longest walk approx. 146 m | Rule D (≤150 m, ≤4 stops) |
| Park in loading zone | 52 Graefestraße 11, 53 Graefestraße 74 | Parking area at Graefestraße, valid all day, arrival 10:53 | OpenStreetMap |
| Halt moved earlier | 52 Graefestraße 11, 53 Graefestraße 74 | Time window until 15:00: arrival before 18:12, now 10:54 | Tour list |
| Park in loading zone | 12 Gneisenaustraße 43 | Gneisenaustraße, valid 09:00–19:00, arrival 11:34 | OpenStreetMap |
| Note | 12 Gneisenaustraße 43 | Gneisenaustraße: utility works, carriageway narrowed and shifted | VIZ Berlin |
| Park in loading zone | 13 Gneisenaustraße 58 | Gneisenaustraße, valid 10:00–18:00, arrival 11:45 | OpenStreetMap |
| Note | 13 Gneisenaustraße 58 | Gneisenaustraße: utility works, carriageway narrowed and shifted | VIZ Berlin |
| Note | 14 Gneisenaustraße 66 | Gneisenaustraße: utility works, carriageway narrowed and shifted | VIZ Berlin |
| Park in loading zone | 16 Mehringdamm 57 | Mehringdamm, valid 08:00–16:00, arrival 12:09 | OpenStreetMap |
| Park in loading zone | 17 Mittenwalder Straße 6 | Mittenwalder Straße, valid 06:00–22:00, arrival 12:20 | OpenStreetMap |
| Bundle stops | 19 Nostitzstraße 15, 20 Nostitzstraße 41 | one parking point for 2 stops, longest walk approx. 91 m | Rule D (≤150 m, ≤4 stops) |
| Bundle stops | 21 Riemannstraße 9, 22 Riemannstraße 21 | one parking point for 2 stops, longest walk approx. 122 m | Rule D (≤150 m, ≤4 stops) |
| Bundle stops | 23 Solmsstraße 7, 24 Solmsstraße 12 | one parking point for 2 stops, longest walk approx. 107 m | Rule D (≤150 m, ≤4 stops) |
| Parking point moved | 23 Solmsstraße 7 | kerbside spot at the door is inside a closure; new: kerbside Fürbringerstraße | VIZ: Solmsstraße between Fürbringerstraße and Gneisenaustraße |
| Parking point moved | 24 Solmsstraße 12 | kerbside spot at the door is inside a closure; new: kerbside Fürbringerstraße | VIZ: Solmsstraße between Fürbringerstraße and Gneisenaustraße |
| Address cleaned | 24 Solmsstraße 12 | House number cleaned: 12 HH 3.OG → 12 | Import (Step 1) |
| Park in loading zone | 25 Solmsstraße 30 | Parking area at Bergmannstraße, valid 06:00–22:00, arrival 13:47 | OpenStreetMap |
| Walk exceeds limit | 26 Zossener Straße 14 | Walk 32 m, limit 30 m (bulky item); parking point Gneisenaustraße (nothing closer) | Rule D |
| Parking point moved | 26 Zossener Straße 14 | kerbside spot at the door is inside a closure; new: kerbside Gneisenaustraße | VIZ: Zossener Straße between Gneisenaustraße and Fürbringerstraße |
| Bundle stops | 27 Zossener Straße 22, 28 Zossener Straße 37 | one parking point for 2 stops, longest walk approx. 104 m | Rule D (≤150 m, ≤4 stops) |
| Park in loading zone | 27 Zossener Straße 22, 28 Zossener Straße 37 | Riemannstraße, valid 08:00–15:00, arrival 14:07 | OpenStreetMap |
| Address cleaned | 28 Zossener Straße 37 | Street corrected: Zossner Str. → Zossener Straße | Import (Step 1) |
| Bundle stops | 30 Arndtstraße 12, 31 Arndtstraße 29, 32 Chamissoplatz 4, 33 Chamissoplatz 9 | one parking point for 4 stops, longest walk approx. 142 m | Rule D (≤150 m, ≤4 stops) |
| Park in loading zone | 36 Friesenstraße 6 | Friesenstraße, valid 08:00–19:00, arrival 15:06 | OpenStreetMap |
| Parking point moved | 37 Friesenstraße 16 | nearest kerbside spot is in a no-stopping zone; new: kerbside Jüterboger Straße | OpenStreetMap |
| Bundle stops | 38 Heimstraße 3, 39 Heimstraße 17 | one parking point for 2 stops, longest walk approx. 87 m | Rule D (≤150 m, ≤4 stops) |
| Loading zone not valid at arrival | 42 Kreuzbergstraße 30 | Parking area at Kreuzbergstraße valid 08:00–15:00, arrival 16:06 → instead kerbside Kreuzbergstraße | OpenStreetMap |
| Park in loading zone | 43 Kreuzbergstraße 62 | Parking area at Kreuzbergstraße, valid 11:00–17:00, arrival 16:16 | OpenStreetMap |
| Bundle stops | 45 Willibald-Alexis-Straße 8, 46 Willibald-Alexis-Straße 24 | one parking point for 2 stops, longest walk approx. 133 m | Rule D (≤150 m, ≤4 stops) |
| Park in loading zone | 47 Yorckstraße 84 | Yorckstraße, valid 07:00–17:00, arrival 16:57 | OpenStreetMap |
| Park in loading zone | 48 Böckhstraße 25 | Kottbusser Damm, valid all day, arrival 17:14 | OpenStreetMap |
| Park in loading zone | 54 Grimmstraße 4 | Grimmstraße, valid all day, arrival 17:44 | OpenStreetMap |
| Park in loading zone | 55 Hasenheide 54 | Hasenheide, valid 06:00–22:00, arrival 17:57 | OpenStreetMap |
| Bundle stops | 56 Körtestraße 8, 57 Körtestraße 20 | one parking point for 2 stops, longest walk approx. 116 m | Rule D (≤150 m, ≤4 stops) |