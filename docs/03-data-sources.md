# 03 Data sources for the prototype (Berlin)
Last updated: 2026-11-20 · All sources are free. Checked 2026-11-19/20.

**Tour area for queries:** south 52.481, west 13.370, north 52.499, east 13.430 (Kreuzberg 61 to Graefekiez). For closures also down to south 52.462 (approach from the depot in Tempelhof). The road-network export uses 52.478, 13.365, 52.501, 13.432.

## 1. Overview
| Data | Best source | Access | Key | Catch |
|---|---|---|---|---|
| Roadworks, closures, also big events and demos | Verkehrsinformationszentrale (VIZ) Berlin, dataset "Baustellen, Sperrungen und sonstige Störungen von besonderem verkehrlichem Interesse" (daten.berlin.de) | GeoJSON: editorial feed https://api.viz.berlin.de/daten/baustellen_sperrungen_viz.json and state reporting office (Landesmeldestelle) feed https://api.viz.berlin.de/tic3/baustellen_sperrungen_tic.json | no | two parallel feeds because of a system migration; only events "of special traffic interest", small sites missing; old URL baustellen_sperrungen.json is frozen, do not use |
| One-way streets, no-through roads, access rules, bollards | OpenStreetMap (ODbL) via Overpass Turbo (https://overpass-turbo.eu); ORS routing uses the same data | GeoJSON export | no | Bergmannstraße delivery time 6–11 is not mapped |
| Loading zones, no-stopping zones | OSM street-parking data for Friedrichshain-Kreuzberg (mapped together with the district office) via Overpass Turbo; alternative: parking survey of the Senate (Geoportal Berlin, eUVM) | GeoJSON export; Geoportal WFS | no | mapping status, not legal proof |
| Addresses → coordinates | OSM addresses via Overpass Turbo (used for the trial); in the app: OpenRouteService geocoding | GeoJSON / JSON | ORS: yes, free | — |
| Christmas markets, street festivals | daten.berlin.de "Berliner und Brandenburger Weihnachtsmärkte" (Senate Department for Economics, CC BY), with coordinates | CSV/XLS/JSON via berlin.de search | no | 2026 list not yet published on 2026-11-19 |
| Demonstrations | Berlin Police, list of registered assemblies and marches: https://www.berlin.de/polizei/service/versammlungsbehoerde/versammlungen-aufzuege/ (updated twice a day); large demos also in the VIZ Landesmeldestelle feed | save web page as HTML (table) | no | spontaneous assemblies missing; march route only as free text |
| Weather forecast | Deutscher Wetterdienst (DWD), MOSMIX model, via Bright Sky: https://api.brightsky.dev/weather?lat=52.489&lon=13.398&date=YYYY-MM-DD&last_date=…&tz=Europe/Berlin | JSON, hourly | no | Bright Sky is run independently; credit "Deutscher Wetterdienst" |
| Weather warnings | DWD via Bright Sky: https://api.brightsky.dev/alerts?lat=52.489&lon=13.398&tz=Europe/Berlin | JSON | no | only currently valid warnings |
| Geocoding, routing | OpenRouteService (HeiGIT, Heidelberg University); sign up at openrouteservice.org | JSON API | yes, free | free quota (e.g. 2,000 directions/day), enough for the demo; alternative geocoder Nominatim (OSM) only 1 request/s under its usage policy |
| Navigation | Google Maps | URL hand-off | no | output, not a data source |

**Deliberately not used:** live traffic (Google Maps covers it while navigating); speed cameras (illegal to use while driving, § 23 (1c) StVO; little use in the Kiez).

**How the user's ideas were evaluated (2026-11-19):** closures/roadworks → yes (VIZ); weather → yes, value is in planning (slower driving/walking → start earlier, reorder around time windows and priority); one-way streets → yes, plus the related problem "hard to stop there → find a better parking point, e.g. side street" → loading/no-stopping data; blitzer.de → no (see above); live data → Google Maps. Marathons, sports events, state visits and large demos are included in the VIZ feed.

**Download tips:** save VIZ feeds directly as .json (do not print to PDF; a PDF copy of the TIC feed had broken encoding and line breaks and needed a repair script). Save the police page as HTML. In Overpass Turbo confirm the "large amount of data" warning; then Export → GeoJSON → download.

## 2. Overpass queries
**a) Full road network + barriers + addresses (used for the trial on 2026-11-20, file "export-4.geojson", 5,159 features: 2,361 road ways, 42 barrier nodes, 2,757 address points):**
```
[out:json][timeout:120];
way["highway"~"^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street)$"](52.478,13.365,52.501,13.432)->.strassen;
node(w.strassen)["barrier"]->.sperren;
nwr["addr:housenumber"]["addr:street"~"^(Arndtstraße|Baerwaldstraße|Bergmannstraße|Blücherstraße|Böckhstraße|Chamissoplatz|Dieffenbachstraße|Fichtestraße|Fidicinstraße|Friesenstraße|Gneisenaustraße|Graefestraße|Grimmstraße|Hasenheide|Heimstraße|Katzbachstraße|Kopischstraße|Kreuzbergstraße|Körtestraße|Marheinekeplatz|Mehringdamm|Methfesselstraße|Mittenwalder Straße|Nostitzstraße|Riemannstraße|Solmsstraße|Urbanstraße|Willibald-Alexis-Straße|Yorckstraße|Zossener Straße)$"](52.478,13.365,52.501,13.432)->.adressen;
.strassen out geom;
.sperren out;
.adressen out center;
```
**b) Loading zones and no-stopping zones (export of 2026-11-19, 583 objects).** The original query text was not kept; this reconstructed query returns the same kind of data:
```
[out:json][timeout:120];
(
  way["highway"]["parking:both:restriction"](52.478,13.365,52.501,13.432);
  way["highway"]["parking:left:restriction"](52.478,13.365,52.501,13.432);
  way["highway"]["parking:right:restriction"](52.478,13.365,52.501,13.432);
  way["highway"]["parking:both:restriction:conditional"](52.478,13.365,52.501,13.432);
  way["highway"]["parking:left:restriction:conditional"](52.478,13.365,52.501,13.432);
  way["highway"]["parking:right:restriction:conditional"](52.478,13.365,52.501,13.432);
  nwr["amenity"="parking"]["restriction"](52.478,13.365,52.501,13.432);
  nwr["amenity"="parking"]["restriction:conditional"](52.478,13.365,52.501,13.432);
);
out geom;
```
**c) Traffic rules (export of 2026-11-19, 6,916 objects, 4 MB):** ways with one-way/access tags plus barrier points. Was a filtered export (e.g. Fürbringerstraße and Kreuzbergstraße were missing), so it cannot be used for routing; query a) replaces it.

## 3. Check results
### 3.1 Roadworks and closures (VIZ, downloaded 2026-11-19)
- **Editorial feed (Verkehrsredaktion):** 259 entries for Berlin, clean fields (type; severity: full closure / one-direction closure / no closure; street; section; closed lanes; period in ISO format; line + point geometry).
- **State reporting office (Landesmeldestelle):** 410 entries, less clean (German dates, start date often empty, no severity, street as free text), but more entries, incl. side streets and demonstrations.
- **In the tour area:** 25 entries from both feeds (filtered file `sperrungen_tourgebiet_2026-11-19.json`, see 06).
- **Hits for the tour:** around the Gneisenaustraße works, Solmsstraße, Zossener Straße, Mittenwalder Straße and Schleiermacherstraße are closed between Gneisenaustraße and Fürbringerstraße or cut off from Gneisenaustraße (dead end); Baerwaldstraße closed between Gneisenaustraße and Urbanstraße; Gneisenaustraße narrowed to one lane; all valid until 2026-12-31. Streets with 14 of 58 stops and 25 of 95 shipments, incl. both bulky items and one priority shipment. After geocoding (2026-11-20): Solmsstraße 7 and 12 and Zossener Straße 14 lie inside a closed section.
- Further full closures in the area: Johanniterstraße, Planufer, Geibelstraße; one-direction closure Möckernstraße (towards Kreuzbergstraße).
- **On the approach from the depot:** Dudenstraße (no left turn into Mehringdamm), Mehringdamm north (right lane closed).
- **Consequence:** real data is enough for the demo; the planned simulated closure in Bergmannstraße is no longer needed. Closures of side streets mean access from one side is blocked; stops are reached from the other side or on foot.

### 3.2 Traffic rules from OSM (checked 2026-11-19)
- **Useful:** one-way streets (e.g. Bergmannstraße, Zossener, Friesen-, Nostitzstraße, Marheinekeplatz); "access only" (motor_vehicle=destination, e.g. Bergmannstraße, Fidicinstraße, Chamissoplatz, Solmsstraße, Arndtstraße); no-through-traffic on sections (Mittenwalder, Baerwald-, Blücher-, Willibald-Alexis-, Schleiermacherstraße); bollards on the carriageway (e.g. Bergmannstraße, Arndtstraße, Willibald-Alexis-Straße); traffic-calmed areas (Graefe-, Dieffenbach-, Böckhstraße).
- **Time-based rules exist:** Schleiermacherstraße Mon–Fri 09:30–15:30 no motor vehicles and no stopping; Böckhstraße Apr–Sep Wednesdays 14–18 closed (not active in November).
- **Cross-check with VIZ:** Gneisenaustraße and Baerwaldstraße are also mapped as construction in OSM.
- **Gap:** Bergmannstraße delivery time 6–11 (Senate) is not in OSM → check on site and add as a labelled own rule, or leave out.

### 3.3 Loading zones and no-stopping zones from OSM (checked 2026-11-19, corrected 2026-11-20)
- 583 objects; 114 loading zones in the tour area, 86 of them with times (most common 06:00–22:00); many no-stopping sections.
- **On tour streets:** Bergmannstraße 10 delivery areas (**mapped as separate parking areas**, Mon–Sat 06–22 or Mon–Fri 09–22, two only until 13:00/15:00); Gneisenaustraße 5 (e.g. only 07–09); Urbanstraße 7; Yorckstraße 3; Zossener Straße 1 (only Mon–Sat 11–21, so no loading zone in the morning); Friesen-, Arndt-, Mittenwalder, Riemann-, Methfessel-, Körte-, Baerwald-, Grimmstraße, Hasenheide, Mehringdamm 1–2 each.
- **No own loading zone:** e.g. Solmsstraße, Nostitzstraße, Chamissoplatz, Fidicinstraße, Kopischstraße, Heimstraße, Dieffenbach-, Graefe-, Fichtestraße → find a parking point nearby.
- **Correction 2026-11-20:** a per-street count of street-way tags wrongly suggested "Bergmannstraße has no loading zone". The zones exist as separate `amenity=parking` areas with `restriction:conditional=loading_only @ (...)`. Always include these areas.
- **For the algorithm:** use a loading zone only if it is valid at the planned arrival time; avoid no-stopping sections; otherwise the nearest legal kerbside spot within walking range.
- OSM mapping is not legal proof; signs on site take precedence.

### 3.4 Christmas markets and festivals (checked 2026-11-19)
- The official Senate list still shows 2025; 2026 not yet published. In 2025 there was no market in Kreuzberg; the nearest was at Tempelhofer Hafen near the depot.
- **Decision:** do not download now; recheck on 2026-11-25. Large events with closures come through the VIZ feed anyway.

### 3.5 Demonstrations (checked 2026-11-19, page of the same day)
- Page saved as HTML; the table parses cleanly: 1,361 entries (date, from, to, topic, postcode, place, march route), up to 2034 (permanent rallies).
- **Rallies** have address and postcode → easy to map. **Marches** have no postcode, only the route as free text with abbreviations (AK/ZK/EK = opening/intermediate/closing rally), dashes and sometimes "(neu)"/"(alt)" → geolocate streets one by one and join them into a line; valid in the time window plus a buffer.
- **Tour day 2026-11-26:** 15 assemblies in Berlin; in the area only one rally at Tempelhofer Damm 99, 17:00–18:30 (after the shift, near the depot) → no impact.
- **Real example for the pitch:** on 2026-11-20, 08:00–10:30, a registered march ("Internationaler Jugendstreik gegen Wehrpflicht – Südzubringer") from Gneisenaustraße/Zossener Straße via Gneisenaustraße, Schleiermacherstraße or Bergmannstraße, Südstern and Hasenheide to Hermannplatz, right through the tour area at peak delivery time. Possible second scenario "same tour on 2026-11-20".

### 3.6 Weather (checked 2026-11-19, forecast for 2026-11-26)
- Hourly DWD forecast (MOSMIX) for station Berlin-Tempelhof, 2.1 km from the tour area. Fields include precipitation (mm/h), precipitation probability, condition (dry, rain, snow, sleet, fog …), temperature, dew point, gusts, visibility.
- **Tour day as of 2026-11-19:** 07–17 dry throughout, 0 mm, rain probability at most 8 %; −1 °C in the morning up to +2 °C; gusts up to 24 km/h; visibility at least 9 km → no surcharge by our rule, at most a note "frost in the morning".
- A week ahead is still uncertain; the app re-fetches the forecast the evening before. Warnings not yet fetched (only current ones exist); the app asks for them on the tour day.
- **Demo:** show the real weather (then without effect) and optionally the mechanism with a clearly labelled "what if it rains" scenario.

### 3.7 Road network and addresses (export of 2026-11-20)
- Complete drivable network of the area (2,361 ways), 42 barrier nodes (bollards, gates, etc.), 2,757 address points. All 58 tour stops located: 53 exact, 5 via the neighbouring house number because the synthetic number does not exist (see 02, open decision 4).

## 4. Important for the demo area
Bergmannkiez (traffic-calming model project): Bergmannstraße one-way and "access only", with delivery areas on the north side (in OSM as loading zones with times); delivery traffic 6–11 according to the Senate (not in OSM, check); Fidicinstraße one-way; through-traffic barriers around Chamissoplatz; no through traffic in Zossener and Friesenstraße.

## 5. Mandatory attributions (app and slides)
- VIZ: "Digitale Plattform Stadtverkehr Berlin / [dataset title]", licence dl-de-by-2.0.
- Weather: "Quelle: Deutscher Wetterdienst", CC BY 4.0.
- Maps/rules/loading zones/addresses: "© OpenStreetMap-Mitwirkende" (© OpenStreetMap contributors), ODbL.
- Routing/geocoding: openrouteservice.org by HeiGIT (per its terms).
- Christmas markets: Senate Department for Economics, CC BY.

## 6. One-page overview
`Data_sources_delivery_prototype.pdf` (English, as of 2026-11-19): one table with data, source, access, use, plus "not used" and attributions; suitable for slide B. File in the workspace bundle (06).
