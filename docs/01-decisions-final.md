# 01 Decisions (final)
Last updated: 2026-11-20 · Append only. Changing a decision = add a new dated entry and mark the old one as superseded.

## 0. Framework (2026-11-19)
- Platform: **Expo Go** app (React Native). City: **Berlin**, tour area Kreuzberg 61 (Bergmannkiez) to Graefekiez.
- Way of working: skeleton → discuss each step → decide → document → build (see 00).
- App flow (skeleton), five steps:
  1. Load tour plan: stops, parcels, time windows.
  2. Check external data: mark affected stops.
  3. Build route plan: halts (park once, several stops on foot), order, driver approval.
  4. Scan and load: shelf-slot recommendation per halt.
  5. Navigate per halt: Google Maps, drive first, then walk.
  - Cross-cutting (still open, see 02): data only on the phone or also on a server? Plan B if the network fails during the demo. → Plan B and data for the demo decided 2026-11-20 (Step 5, revised in "Demo build decisions"); server question only for the future (02 B10).

## Step 1: Tour plan (decided 2026-11-19)
- **Input data:** a **synthetic** tour list as a German carrier driver would get it (we have no real one). One row per shipment; **95 shipments on 58 stops**; system order sorted by postcode, then street alphabetically, then house number (deliberately not optimised); **5 deliberate address errors** to test the import. Details and files: 06.
- **No fake real documents:** the PDF delivery list uses the fictional carrier "Havelbote Paketlogistik GmbH", invented names, real streets, and is visibly marked as synthetic. A version imitating a real company with blacked-out names was declined.
- **Import:** Excel/CSV file is the main path; the same tour built into the app is plan B. Link/QR import only if time is left.
- **Columns:** no extra columns; the shelf slot is assigned by the app while loading.
- **Geocoding:** OpenRouteService (free key; the team creates the account). Coordinates of the demo addresses are also stored in advance. (Since 2026-11-20 all 58 coordinates exist from OSM, see 04. Since 2026-11-20 the demo needs no ORS key, see "Demo build decisions".)
- **Google Maps compatibility:** hand-off via Google Maps URLs with coordinates (parking points) or addresses (walking); no Google API key needed. Technical limits are listed in 02 (Step 5).

## Step 2: External data (decided and checked 2026-11-19)
- **Used:** roadworks/closures (VIZ Berlin, both feeds), traffic rules and loading/no-stopping zones (OpenStreetMap via Overpass Turbo), registered demonstrations (Berlin Police), weather forecast and warnings (DWD via Bright Sky), geocoding/routing (OpenRouteService). Christmas markets/street festivals (berlin.de): recheck on 2026-11-25. Sources, URLs, queries and check results: 03.
- **Deliberately not used:** live traffic (Google Maps already covers it during navigation); speed-camera data such as blitzer.de (using it while driving is prohibited in Germany, § 23 (1c) StVO, and it helps little in the Kiez).
- **Why weather:** bad weather makes everything slower → start earlier, change the order around time windows and priority shipments, inform customers.
- **No simulated closure needed:** real closures around Gneisenaustraße affect streets with 14 of 58 stops; after geocoding, 3 stops lie directly in a closed section (Solmsstraße 7 and 12, Zossener Straße 14).
- **"Affected" means:** an event at most about 50 m from the stop or its parking point, valid on the tour day during the shift. A full closure changes route/parking point; a lane closure or narrowing is only a note.
- **Weather surcharge per hour (assumption, labelled):** dry → none; light rain (up to about 2 mm/h) +10 %; heavy rain, snow or sleet +25 %; official ice/severe-weather warning +40 %. Applies to driving and walking times of halts in that hour. The forecast for 2026-11-26 (as of 2026-11-19) is dry → no surcharge; show the mechanism additionally as a clearly labelled "what if" rain scenario.
- **Forecast/warnings in the app:** forecast re-fetched the evening before; warnings fetched on the tour day.
- **Demonstrations:** rallies have address and postcode (easy to map); marches only have a free-text route → geolocate the streets and join them into a line; valid during the time window plus a buffer.
- **Pitch example:** a registered march on 2026-11-20, 08:00–10:30, through the tour area (details 03); possible second scenario "same tour on 2026-11-20".

## Step 3: Route plan (decided 2026-11-19)
Six building blocks; each records its decisions with reason and source ("knowledge"):
1. **Situation picture:** stops from the tour list (same address = one stop) with coordinates; all data in three formats: events (place + time), rules (one-way, access-only, time-based rules), stopping places (loading zones with times, no-stopping zones); weather per hour.
2. **Impact:** per stop: closed section? access from one side only? time-based rule? → note with reason and source.
3. **Halts and parking point:** bundle nearby stops; parking point = loading zone valid at arrival time > other legal stopping place; never in a closure or no-stopping zone.
4. **Order:** travel times from the real road network, closures avoided; time windows and priority as constraints.
5. **Schedule:** arrival = driving + parking + stop duration + walking, plus weather surcharge; on a conflict go back to 3 or 4.
6. **Proposal with reasons:** key figures original vs. proposal, list of decisions with reason and source; the driver decides.

Rules:
- **A Goal:** keep time windows and priority shipments first, then the shortest total time. **Hard rules are never broken:** closures, one-way streets, no-through-traffic, no-stopping zones, loading-zone times.
- **B Amount of change:** two modes: "only necessary changes" (**default**, close to how the interviewed drivers work) and "replan completely". (2026-11-20: user tendency to plan completely right away for the demo; open, see 02 B8.) *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- **C Control:** the driver can reject individual changes; the app then recalculates. Rejection reasons are learning material for the user test. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- **D Halts (starting values):** walk up to 150 m, at most 4 stops per halt, bulky items (Sperrgut) at most 30 m.
- **E Stop duration (assumption, labelled):** 2 min per stop + 1 min per parcel; bulky item +3 min; ID check/age check +2 min.
- **F Technology:** decided at build time (own calculation or ORS optimisation); condition: closures are always avoided. (2026-11-20: for the prototype everything is precomputed, see "Demo build decisions".)
- **G Test cases:** closed Solmsstraße; Zossener Straße loading zone only from 11:00; delicatessen (Feinkost) time window 8–10; bulky item for the kiosk in Mittenwalder Straße; priority shipment for the architecture office in Gneisenaustraße. (Trial results per test case: 04.)

## Step 3b: Calculation and recalculation (decided 2026-11-20)
**When the app recalculates**
- In the morning before departure: load all data fresh and calculate (default).
- During the round via a button "Update situation": reload data, plan only the remaining halts, starting from the current position; loaded parcels keep their slot. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- Automatically in the background: future outlook (slide D), not in the prototype.
- Demo: inject a new event (e.g. the march of 2026-11-20 as a labelled scenario) → the app shows the changes with reasons → the driver confirms. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- (2026-11-20: in the prototype these results are precomputed by our engine and bundled, see "Demo build decisions".)

**How it calculates**
1. Form halts and choose the parking point (rule D; loading zone valid at arrival, otherwise legal kerbside; never closure or no-stopping). Several stops are only bundled if at least one parking point is valid for the whole shift (kerbside, or a loading zone covering 08:00–18:00); time-limited loading zones are still preferred when they are valid at arrival.
2. Travel times between parking points (in the app: OpenRouteService; whether ORS can avoid closures directly is checked at build time, otherwise we compute the detours ourselves).
3. Order: "only necessary changes" = list order stays, consecutive stops are bundled, late halts move to the best earlier position; "replan completely" = insert by urgency, then move/reverse sections while it improves.
4. Check the schedule (driving + parking search + walking + stop duration + weather); conflict → move the halt or take another parking point; unsolvable → warn the driver, never break a rule silently.
5. Show the changes as a list with reason and source; if the driver rejects one, redo 3–4 with that constraint.

## Step 4: Scan and load (decided 2026-11-20)
- **Order:** approve the route plan first, then scan. Reconciliation at the end: missing parcel → stop is dropped, app offers a recalculation in "only necessary changes" mode; unknown parcel → warning. (2026-11-20: in the prototype the missing-parcel recalculation is only a note, see "Demo build decisions".)
- **Stability:** a parcel once loaded is never moved to another slot, even after later route changes.
- **Vehicle (fixed for the demo):** van with 3 racks A–C × 4 slots; rack A at the sliding door; slot 1 at the bottom; floor area for bulky items; one slot for returns/pickups. **The labels A–C/1–4 are provisional** (the user is unsure about them) and can be changed later.
- **Slot rule:** same halt → same slot; consecutive halts in route order fill a slot as a block (about 8 parcels per slot); early halts near the door; parcels over 10 kg in slots 1–2; display with street names (like the labelled shelves of the driver in interview B).
- **Scan feedback:** large "→ A2" plus halt and street, sound/vibration; special messages "Not on the list", "Already scanned", "Bulky item → floor at the back". Pickups are not scanned.
- **Demo labels:** printable A6 labels for 13 shipments from the tour plus one shipment that is not on the tour (details 06).

## Step 5: Navigation (decided 2026-11-20)
**Scope principle (2026-11-20):** keep the app small. For now only what the demo and the user test need; everything else goes to the outlook (slide D: real-time data, in-app navigation, live re-optimisation).

**Q1 Hand-off per halt (not legs with several halts, not one link per delivery)**
- One Google Maps link per halt, **driving only**, to the parking-point coordinates chosen by our planning: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=driving&dir_action=navigate`.
- No origin (Google uses the current location and starts turn-by-turn directly; a distant origin only gives a route preview). No waypoints.
- Example: Solmsstraße 7 and 12 → link to the kerbside parking point in Fürbringerstraße, outside the closure, not to the door. Google only drives; the parking-point decision stays with us ("Google Maps knows how to get there. We know where you're allowed to stop.").
- Count: 45 driving links in the default mode, 34 when replanning completely.
- Why not one link per delivery: one link has one travel mode (drive + walk is impossible in one link); several stops share one parking point; driving + walking links per stop would mean up to 116 switches instead of 45.

**Q2 Walking**
- Walking is shown in our app: map with parking point and doors (react-native-maps; runs in Expo Go without extra setup). The map also shows what Google does not know (e.g. the Solmsstraße closure, why the van parks in Fürbringerstraße). (Revised 2026-11-20: Google map via WebView and Maps Demo Key, react-native-maps only as fallback; see "Demo build decisions".)
- Optional button per halt "Walk in Google Maps": one walking link with all doors of the halt (`travelmode=walking`, doors as waypoints + destination). Rule D (≤4 stops) means ≤3 waypoints, so it also works in mobile browsers. No `dir_action` (Google shows the overview with all doors first).
- The door-to-door order of that link is orientation only; the schedule still assumes there-and-back per stop.
- Doors as coordinates from our address lookup where needed (e.g. Chamissoplatz 9 does not exist; see 02 B4), otherwise address text.

**Q3 Loop in the app and confirmation**
- Halt card (parking point, reason, stops, slots) → [Drive] opens Google Maps → driver returns to the app, which still shows the current halt → one card per stop (recipient, slot, walking distance, services and notes) → [Delivered] / [Not at home …] → after the last stop of the halt the next halt card appears with [Drive].
- Google Maps is **not** opened automatically after confirming: the driver first sees where and why to park and which slot is next. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- "Not at home" in the demo: three choices: neighbour, drop-off spot, "stays in slot, back to depot"; preferred neighbour (Wunschnachbar) and preferred drop-off spot (Wunschablageort) from the tour list are pre-filled.

**Q4 Deviations from the plan**
- No extra functions in the prototype. Google reroutes by itself; the destination stays the parking point; our notes (e.g. closure) are on the halt card before departure.
- Only exception: the "Update situation" button from Step 3b stays (demo moment with the march scenario). *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- Moved to the future (slide D): "loading zone occupied" with an alternative parking point, "parked elsewhere?" GPS check, free choice of the next halt with time-window warnings.

**Q5 Google Maps app not installed**
- No extra function: always the same https Maps URL. Android and iOS open the Google Maps app if installed, otherwise Google Maps in the browser (driving links have no waypoints, walking links ≤3, so both work; navigation in the browser is probably only a route preview). No app check, no Apple Maps fallback. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- The demo runs on an **iPhone**; the user installs the Google Maps app; one driving and one walking link are tested before 2026-11-26.

**Q6 Plan B for the demo (and the user test)** (stage 1 revised 2026-11-20: internet is allowed; see "Demo build decisions")
1. No network needed for data during the demo: closures, weather, loading zones, the computed plan and the march scenario behind "Update situation" are bundled in the app as a snapshot of 2026-11-25; the data date is visible in the app. Network only for loading the app in Expo Go and for Google Maps.
2. iPhone on mobile data instead of university Wi-Fi; laptop on the iPhone hotspot; load the app before the pitch and keep it open. In the room Google navigates from the presentation room to the parking point, which is enough to show the hand-off and return.
3. Last resort: screen recording of the full flow on the iPhone on 2026-11-25 after the rerun (plan, loading, halt, hand-off, return, confirm, "Update situation").

**Google Navigation SDK (in-app turn-by-turn) → not for the prototype, outlook only**
- Reasons (checked 2026-11-20): needs a development build instead of Expo Go; the React Native package `@googlemaps/react-native-navigation-sdk` is beta (< 1.0), needs the new architecture, iOS 17+/Android SDK 24+, tested with React Native 0.87 (parked skeleton: 0.88); Google Cloud project with billing and API key (1,000 destinations per month free); Google Maps Platform EEA terms apply since 2025-07-08 ("functionality varies by region"); drivers must accept Google's terms dialog; Google's routing cannot take our closures either (avoid options only ferries and tolls).
- Recorded in OneDrive under slide 11 "Next Steps" (`30_Uni/WiSe-2026-27/Digital-Product-Development/Folien-Uebersicht_Abschlusspraesentation.md`) and in 05 (slide D).
- Future vision (user, 2026-11-20): everything in one app with real-time data and updates; either the driver decides everything, or our system makes optimised real-time decisions. On the slide framed as a mode the driver can switch on (today's principle: the driver decides, rule C).

## Demo build decisions (2026-11-20)
**Calculation (02 B11): everything precomputed, nothing live**
- The Python planning engine from the trial run computes everything the app shows: the plan(s), the "Update situation" scenario with the march of 2026-11-20, the shelf slot per shipment, and for each proposed change the result "what if the driver rejects it". The results are bundled in the app. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- The app reads the import, shows plan and reasons, scans parcels, recommends slots and hands off to Google Maps. It does not calculate itself.
- Consequences: only one rejection at a time works (a second one shows "recalculation not available in the prototype"); the scan reconciliation from Step 4 (missing parcel → recalculation) is only a note; **no OpenRouteService key is needed for the demo** (coordinates of all 58 stops exist). *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- Slide wording: "The planning logic runs as our engine (computed offline); the app shows its result."

**Internet in the demo (revises Step 5 Q6 stage 1)**
- The app may use the internet during the demo (map in the app, Google Maps). Fallback: the user records the full flow as a video beforehand.
- The data are still bundled in the app because everything is precomputed. iPhone on mobile data / hotspot remains a tip, not a requirement.

**In-app map (revises Step 5 Q2)**
- Google map inside the app via a WebView with the Google Maps JavaScript API and a **Maps Demo Key** (checked 2026-11-20: free, no credit card; personal Google account required, Workspace accounts excluded; daily limit, the map pauses when it is reached, no charges; supports map rendering, markers and info windows, styling, drawing shapes and polylines; no Directions service, which we do not need because we draw our precomputed paths).
- Shows parking point, doors, walking lines, closures in red and the next halt. Pitch line: "This is how it will look later, all inside our app; today turn-by-turn still jumps to the Google Maps app."
- Why not a native Google map on the iPhone: Google Maps on iOS with react-native-maps needs a Maps SDK for iOS key via config plugin and a rebuilt app, i.e. not Expo Go (in Expo Go the iPhone would show Apple Maps).
- Key in `.env`, never in git; technically readable inside the app, acceptable for a demo key with a daily limit. The user creates the key with a personal Gmail account.
- First build step: test the key inside the WebView. Fallback: react-native-maps (Apple Maps on the iPhone in Expo Go) with the same content.

**UI language (02 B2)**
- The app UI is **English**, without a language switch. Reasons: international team; pitch deck and slide texts are in English, so the audience can follow the demo.
- The data stay as they are: German streets, recipients, products and notes from the tour list (e.g. "Zugang über Hofeinfahrt"); this is what a Berlin driver really gets.
- A language switch is a future item (slide D: "localisable"). Caveat: for a German-speaking driver in the user test, an English UI is a small hurdle.

**Five non-existent house numbers (02 B4)**
- Bergmannstraße 34 and 61, Chamissoplatz 9, Methfesselstraße 22, Willibald-Alexis-Straße 24 are **not corrected**. The engine already uses the nearest existing house number; the app shows this as an import note (e.g. "Chamissoplatz 9 not found, Chamissoplatz 8 used"). *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- Together with the 5 deliberate address errors this forms the import check. No files are rebuilt (tour list, PDF delivery list, Excel in OneDrive, sheet artifact stay); none of the 14 demo labels is affected. Walking links use coordinates for these doors.
- Documented honestly: these five cases were not planned; they are kept as test cases.

**Departure time for the slide numbers (02 B6)**
- **08:30**, as in the tour header that the app shows. Trial numbers at 08:30: before 58 halts, 10 conflicts; only necessary changes 45 halts, 191 min driving, 0 conflicts; replan completely 34 halts, 82 min driving, 0 conflicts. The 2026-11-25 rerun is run at 08:30 and gives the final slide numbers.

## Build plan (decided 2026-11-20)
**P1 Build order (a showable version after every step)**
| Day | Part |
|---|---|
| Fri 2026-11-20 | Setup (tools, venv, npm) and map test in the WebView (done, see "Build step 1 result") |
| Sat 2026-11-21 | Engine export `export_app.py` (data format v1); the app reads the bundle instead of the old demo tour; start screen in English with tour header, data date, "synthetic" label, import notes |
| Sun 2026-11-22 | Halt loop: halt card → [Drive] → in-app map with walk and closures → stop cards → [Delivered] / [Not at home] → next halt |
| Mon 2026-11-23 | Plan screen: key figures before/after, change list with reason and source, [Accept]/[Reject] with precomputed "what if rejected" |
| Tue 2026-11-24 | Scan and load (camera, "→ A2", "Not on the list", "Already scanned", bulky item) and "Update situation" with the march scenario |
| Wed 2026-11-25 | Data refresh, rerun at 08:30, polish, fallback video (P6) |
Cut first if time runs short: the "what if rain" scenario and a real file picker for the import. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*

**P2 Reuse of the parked skeleton**
- Keep: Expo config, Expo Router, TypeScript, UI building blocks (`ui/kit.tsx`, texts in English), zustand + AsyncStorage store (progress survives a reload; plus a "Reset demo" button), camera logic from `scan.tsx`, `drivingUrl`.
- Remove (the app does not calculate): `services/disruptions`, `halts`, `routing`, `loading`, the old 12-stop demo tour, the calculation tests.
- New: map component (WebView), types and loader for the data bundle, plan and change screens, halt loop, "Update situation", data sources / attributions screen.

**P3 Data format engine → app (v1)**
- JSON files in `lieferplan-prototyp/assets/data/`, written by the engine, with a `schema_version`: `meta.json` (generated at, departure, data dates per source, synthetic flag, attributions, start mode), `tour.json` (header, shipments, stops), `import.json` (import notes incl. the five house numbers not found), `map.json` (closures with lines, depot), `plan_before.json`, `plan_only_necessary.json`, `plan_replan_full.json` (key figures, halts with parking point, stops, warnings, driving path and walking lines, slots per shipment, changes with reason, source, `rejectable` and `if_rejected`), `alt/<change_id>.json` (plan after one rejection), `scenario_march.json` (event, trigger halt, changes, remaining halts; slots unchanged). *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- Both modes are always precomputed; a switch in `meta.json` sets the start mode, so B8 does not block the build.
- Changes that protect a hard rule (e.g. parking point outside a closure) are `rejectable: false` with the reason; the app shows "not possible" instead of a recalculation. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- Driving paths along the road network; walking lines as straight lines (as the engine calculates, straight line × 1.25), stated openly.
- The march scenario is labelled in the app as the real march of 2026-11-20 replayed on the tour day. *(Superseded for the demo 2026-11-20, see "Driver app redesign".)*
- Google Maps links are built by the app from the coordinates (display, not planning).

**P4 git**
- One repository for the whole workspace folder (about 17 MB incl. raw data). The two commits of the parked skeleton are kept as a `git bundle` file; the inner `.git` is removed.
- Never in git: `.env`, `node_modules`, `.venv`, `.expo`, `__pycache__`. A private GitHub remote only if the user decides so.

**P5 Who does what (proposal accepted by the user; team still to confirm)**
- Claude: engine export, app build, check script for the data bundle.
- User: iPhone tests after every build step, Maps key, Google Maps on the iPhone, fallback video.
- Team member 1: print labels at actual size, prepare cartons, user-test script (driver and observer roles).
- Team member 2: slides A, B, E, C, D, attributions, logo rules.
- Team: decide B1, B8, B9 by Tue 2026-11-24 at the latest (B8 only sets the start switch).

**P6 Wed 2026-11-25**
1. Morning: user downloads both VIZ feeds, the weather forecast for 2026-11-26, the police page and the Christmas markets list; Claude checks and stores them.
2. Set `abfahrt_depot` to 08:30, run engine and export, run the check script (no route through closures, all 58 stops, format valid). Data frozen at about 14:00.
3. Bundle into the app, full run on the iPhone, fix issues.
4. Fallback video by about 18:00 (plan, loading, halt, hand-off, return, confirm, "Update situation").
5. Update numbers in 04 and 05, commit, sync OneDrive.
- Demo day: only fetch the DWD warnings; a warning is a note in the app, not a recalculation.

## Build step 1 result (2026-11-20)
- **Map test passed:** the Google map inside the app (WebView + Maps JavaScript API + Maps Demo Key from `lieferplan-prototyp/.env`) loads in Expo Go on the user's iPhone. It shows one real halt (Solmsstraße 7 + 12, parking point Fürbringerstraße) with doors, straight walking lines and the VIZ closures (closed red, narrowing orange). The react-native-maps / Apple Maps fallback is not needed. The driving link starts navigation directly and the walking link shows both doors (user check on the iPhone).
- Implemented: `src/components/google-map.tsx` (draws only precomputed data; reports key rejection via `gm_authFailure`), temporary screen `src/app/map-test.tsx`, `walkingUrl` corrected to the decision (one link per halt, doors as waypoints, no origin, no `dir_action`).

## Driver app redesign (decided 2026-11-20, user)
Principle: the app is used by the driver while working, so it shows as little as possible: one main action per screen, details only on demand. The value of our data work stays visible through one-line reasons and a detail view.

**Plan and control (supersedes Step 3 rules B and C for the demo, 02 B8)**
- The app uses **"replan completely"** directly; the system decides. No "only necessary changes" in the app, no "keep my list", no accepting or rejecting single changes, so no precomputed "what if rejected" (supersedes that part of "Demo build decisions" and P3).
- "The driver decides" (rule C) becomes an outlook item (slide D). Slide E must not claim that the driver can reject single changes in the demo (team to adjust).
- The engine still computes all three plans; the app uses `plan_replan_full.json` and `plan_before.json` for the comparison (`meta.json` start_mode = replan_full).

**Screens**
1. **Start:** only "Start tour" with tour number and date; gear icon top right for settings.
2. **Comparison:** "Your list: 58 stops, 10 conflicts" vs "New route: 34 halts, 0 conflicts" and the button to continue. A small, unobtrusive button in a corner opens the **detail view** with two tabs: **Map** (Google map in the app: old route grey with the conflicts marked, new route blue, closures red; switch Old / New / Both; key figures) and **Why** (all changes with reason and source, grouped: closures and no-stopping zones, time windows and priority, loading zones, stops bundled; plus the import check, data dates and assumptions).
3. **Loading:** progress bar on top, big "Scan parcel" button, after a scan a big "→ A2" with street. **Pre-selection:** all parcels count as "already loaded (simulated)" except the 13 demo labels of the tour, so the bar starts at 82 of 95; in the demo 2–3 labels are scanned plus the 14th label that is not on the tour ("Not on the list"). "Start route" also works before everything is scanned (short confirmation).
4. **Halt loop:** (a) approach: small map with the way to the parking point, **one line why** (e.g. "Park in Fürbringerstraße – Solmsstraße closed (VIZ)"), big button "Open in <navigation app>"; (b) after "Arrived": which slots to take out (e.g. "A2 × 3"), map with the walks, "Walk in <app>", per stop "Delivered", "Not at home" as a small link; (c) "Next halt" shows the next approach screen (navigation opens automatically only if switched on in the settings).
5. **End:** "All parcels delivered" with one line of summary.

**Import notes (revises "Five non-existent house numbers" display):** no separate list for the driver. A house number not found is shown on the card of that stop (e.g. "Chamissoplatz 9 not found – door at No. 8"); the five deliberate import errors that were corrected automatically appear only in the detail view (Why tab, "Import check").

**Notes for later drivers (new)**
- On every stop card a small "Add note": free text, saved, shown next time on the same stop as "Note from a driver".
- One pre-filled note from an "earlier driver" (labelled synthetic) shows reading and writing in the demo.
- Stored only on this iPhone in the demo; sharing between drivers needs a server (slide D). Notes are learning material for the user test.

**Settings (new, gear icon)**
- **Navigation app: Google Maps / Apple Maps / Waze, working.** Buttons are labelled with the chosen app ("Open in Google Maps", "Open in Apple Maps", "Open in Waze"). Driving: all three by URL to the parking point. Walking: Google Maps one link with all doors; Apple Maps one destination per link (one button per door, unless a test shows that several stops work); Waze has no walking mode, so walking then uses Apple Maps and the button says so. Supersedes Step 5 Q5 ("no Apple Maps fallback"). To be tested on the user's iPhone (Apple Maps and Waze installed).
- **Open navigation automatically after "Next halt"**, on/off (default off), working.
- **Language** English / Deutsch: Deutsch shown as "planned" (B2).
- **Max. walking distance per halt** 150 m: shown, "planned" (plans are precomputed).
- **Reset demo** and **About the data** move here.

**"Update situation" (supersedes Step 3b demo, Step 5 Q4 exception, P1 Tue and the march scenario in P3)**
- Not built. Everything is computed before the tour. Real-time reaction is outlook (slide D): during the round our system checks new data in real time, also along a changed route from Google Maps or Waze, and decides again (e.g. after an accident). The march of 2026-11-20 can serve as the real example on the slide.

**Build order (supersedes P1 from Sat 2026-11-21)**
| Day | Part |
|---|---|
| Sat 2026-11-21 | Start, comparison, detail view (Map, Why); start mode replan_full |
| Sun 2026-11-22 | Halt loop with one-line reasons, slots, walks, delivered / not at home, end screen; navigation-app links |
| Mon 2026-11-23 | Scan and load with pre-selection |
| Tue 2026-11-24 | Settings, notes, polish, buffer |
| Wed 2026-11-25 | as in P6 (without the march scenario) |
If time runs short, the settings keep only the navigation app; language and walking distance become a line in the outlook.

## Halt loop details (decided 2026-11-20, user)
Refines screen 4 of "Driver app redesign".
- **Approach screen** (before every halt): thin progress bar "Halt n of 34", parking street and number of stops, **one line why**, small map (way from the last halt or the start point to the parking point, P, doors, closures), big "Open in <navigation app>", smaller "Arrived". The one-line reason is **precomputed by the engine** (one field per halt); priority when several apply: closure / no-stopping zone > time window or priority > loading zone > stops bundled; no special reason → only the street.
- **After "Arrived":** "Take out" summarises the slots of the whole halt (e.g. "A2 × 3 · floor × 1 (bulky)"); map parking point → doors; "Walk in <app>"; one compact card per stop: address, recipient(s), number of parcels, badges only when they apply (ID check, 18+, priority, bulky, pickup), the note from the tour list, the import note if any (e.g. "Chamissoplatz 9 not found – door at No. 8"), from Tue the driver note.
- **Delivered per stop** (not per halt): a halt has 1–4 stops and "Not at home" concerns one stop. "Next halt" appears when every stop of the halt is done.
- **"Not at home":** small choice sheet with three options (neighbour / drop-off spot / stays in the van, back to depot); preferred neighbour and preferred drop-off spot from the tour list are pre-filled (as in Step 5 Q3).
- **Pickups:** "Picked up" instead of "Delivered", hint "→ returns slot C4".
- **"All halts"** (small button top right): list of halts, tap to jump. For the demo (go straight to e.g. the Solmsstraße closure or the Feinkost time window) and the user test.
- **"Next halt"** opens the approach screen of the next halt; navigation opens automatically only with the setting (Tue).
- **End:** "All parcels delivered", one summary line (delivered, not at home), button "Drive back to depot".
- Technical: the navigation button goes through one small switch (Google Maps until the settings exist on Tue); progress (current halt, status per stop) survives an app reload, "Reset demo" clears it.

## Scan and load details (decided 2026-11-20, user)
Refines screen 3 of "Driver app redesign".
- **Correction of the pre-selection count:** the 3 pickups are not loaded, so 92 shipments are loaded (incl. 2 bulky items). Without the 13 demo labels of the tour the progress bar starts at **79 of 92** (not "82 of 95"). *(Superseded 2026-11-20: four parcels, 88 of 92, see "Changes after the first iPhone tests".)*
- **Screen:** progress bar "n of 92 loaded", small link "n still to scan" (list of the missing parcels with recipient and slot, so the presenter knows which cartons are left), big "Scan parcel", "Start route" (asks "n parcels not scanned. Start anyway?" if parcels are missing).
- **Camera stays open** after "Scan parcel" (full screen, Code128); each scan shows a large result card for about 2 s, then the next parcel can be scanned; "Done" closes it.
- **Result cards:** normal → huge "→ A2" plus halt, address, recipient; over 10 kg → also "<kg> kg → bottom slot"; bulky → "→ Floor at the back"; already scanned → grey "Already scanned → A2", counter unchanged; not on the tour (demo label 14) → red "Not on the list", "Put it aside and report it at the depot".
- **Feedback: vibration only** (short pattern on success, double on error; expo-haptics, included in Expo Go). No sound.
- **"Type number"** link inside the camera as a fallback (bad light, camera problems).
- The camera logic for Code128 is taken from the parked skeleton (git history, scan.tsx). "Reset demo" also resets the scans.

## Changes after the first iPhone tests (decided 2026-11-20, user)
- **Insights for the back office:** the comparison old list vs. new route is not shown to the driver any more. A small "Insights" button top left on the start screen opens it; "Details" there opens the map (old/new) and the Why tab, as before. "Start tour" goes straight to loading. (Supersedes the place of screen 2 in "Driver app redesign".)
- **Four parcels scanned live** (supersedes the pre-selection in "Scan and load details"): dentist Fidicinstraße 33 (priority), Feinkost Marheinekeplatz 15 (18.5 kg → bottom slot), bicycle workshop Zossener Straße 14 (bulky → floor), Felix Hartmann Gneisenaustraße 43 (normal). All other parcels count as already loaded (simulated): the bar starts at **88 of 92**, four scans make 92 of 92. The scans are **not saved** and reset on every app start; the halt progress is still saved. The four IDs are set in `probelauf/export_app.py` (DEMO_SCAN) and exported to `meta.json`.
- **Demo scan labels:** `tourdaten/build_scan_labels.py` builds `Demo-Scan-Etiketten_Tour_KRZ-61-07.pdf` (four A6 parcel labels on one A4 page with a **Code128** barcode like the other demo labels, fictional carrier, visibly synthetic; page 2 overview for the team). Rebuild after the 2026-11-25 rerun. (Same day: a first version with QR codes was replaced by Code128 at the user's request; the scanner reads Code128 only.)
- **Shorter approach screen:** street, number of stops, one short line why (e.g. "Solmsstraße closed – park here", "Priority until 12:00 · Gneisenaustraße 66", "Loading zone, 06:00–22:00"), warning if any. No arrival time and no source on this screen; both are in Insights.
- **Delivered and Picked up separately:** at the three stops with a pickup (they all also get parcels) the driver confirms both; "Not at home" completes the stop.
- **"Deliver all (demo)":** small link at the top of "All halts"; marks every stop as done and opens the end screen. The driver can still click through as far as wanted.

## Settings and notes details (decided 2026-11-20, user)
Refines "Settings" and "Notes for later drivers" in "Driver app redesign".
- **Settings screen (gear icon):** Navigation: app Google Maps / Apple Maps / Waze, "Open navigation automatically after Next halt" (default off); Driver: language English (Deutsch "planned"), max. walking distance per halt 150 m ("planned"); Data: "About the data" (Insights → Why), "Reset demo". Settings are saved on the phone and are not cleared by "Reset demo".
- **Walking with Apple Maps / Waze:** an Apple Maps link is assumed to take one destination; this is checked on the user's iPhone during the build. If several do not work, Apple Maps and Waze show a small "Walk ›" link per stop card (to that door); Waze has no walking mode, so these links open Apple Maps. Google Maps keeps one walking link per halt with all doors. *(Superseded 2026-11-20 after the test on the user's iPhone: Apple Maps shows a walking route over both doors with `waypoint` parameters, so Apple Maps also gets one walking link per halt with all doors (`https://maps.apple.com/directions?destination=<last door>&mode=walking&waypoint=<door>…`); with Waze chosen, walking uses this Apple Maps link. No per-door links.)*
- **Auto-navigation:** when on, "Next halt" opens the navigation app straight away; the approach screen of the next halt is behind it when the driver returns.
- **Notes:** "Add note" on every stop card (text field in the card, Save); shown as "Note from a driver" with Edit and Delete. One pre-filled example at **Chamissoplatz 9** (halt 1; the house number that does not exist), in German as a Berlin driver would write it: "Nr. 9 gibt es nicht – Eingang ist Nr. 8, Seitenflügel, 2. OG.", labelled "earlier driver · synthetic example".
- **Reset demo** deletes own notes; the example note stays, so every demo starts the same.
- **Insights → Why** gets a group "Driver notes" (driver knowledge flowing back to the back office).

## Fresh start on every app start (decided 2026-11-20, user)
- On every app start (or reload) the route starts at **halt 1** with no stop confirmed and the four demo parcels unscanned. Only the driver's own notes and the settings are saved on the phone. (Supersedes "progress survives an app reload" in "Halt loop details" and "the halt progress is still saved" in "Changes after the first iPhone tests".)

## Other decisions made in this chat
- **2026-11-19:** the data-flow and data-source slides are presentation ideas (see 05), not yet agreed with the team.
- **2026-11-20:** the decision-logic slide (E) is added to the slide ideas.
- **2026-11-20:** OpenRouteService account via openrouteservice.org (HeiGIT account with a free standard key); OptimoRoute (my.optimoroute.com) is a commercial planner and is not used for the prototype.
- **2026-11-20:** trial run of the algorithm offline before building (Python scripts, OSM road network); results in 04.
- **2026-11-20:** Step 5 Navigation decided (see above); scope principle "only what the demo and the user test need".
- **2026-11-20:** demo build decisions: everything precomputed; internet allowed with a video as fallback; Google map in the app via WebView and Maps Demo Key; UI in English; the five non-existent house numbers stay as import notes; slide numbers at 08:30 departure.
- **2026-11-20:** build plan P1–P6 (order, reuse of the skeleton, data format v1, one git repository, roles, plan for 2026-11-25); map test passed on the iPhone.
- **2026-11-20:** driver app redesign: replan completely directly, minimal screens with one-line reasons and a detail view, notes for later drivers, settings with a working navigation-app choice, no "Update situation" in the demo.
- **2026-11-20:** halt loop details: delivered per stop, not-at-home sheet, all-halts list to jump, end screen with drive back to depot, one-line reason precomputed by the engine.
- **2026-11-20:** scan and load details: camera stays open, vibration only, type-number fallback, still-to-scan list; pre-selection corrected to 79 of 92.
- **2026-11-20:** after the first iPhone tests: Insights button for the back office, four Code128 demo parcels (88 of 92, scans reset on app start), shorter approach screen, delivered and picked up separately, Deliver all (demo).
- **2026-11-20:** settings and notes details: navigation app choice with per-door walk links for Apple Maps/Waze, auto-navigation off by default, example note at Chamissoplatz 9, reset keeps the example, driver notes in Insights.
- **2026-11-20:** every app start begins at halt 1; only notes and settings are saved.
