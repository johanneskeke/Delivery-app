# 02 Open work and next steps
Last updated: 2026-11-20 · Living document: update after every working session. Demo: Thu 2026-11-26.

## A. Step 5 Navigation and demo build: decided 2026-11-20 (details in 01)
**Short version:** one Google Maps driving link per halt to the parking-point coordinates; walking shown on a Google map inside our app (WebView + Maps Demo Key; fallback Apple Maps) plus an optional walking link per halt with all doors; confirm per delivery; next halt via a button; no extra functions for deviations or a missing Google Maps app; "Update situation" (Step 3b) stays. Everything the app shows is precomputed by our engine. Internet is allowed in the demo; fallback is a video recorded beforehand. In-app turn-by-turn (Navigation SDK) is outlook (slide D). UI in English; slide numbers at 08:30 departure.

**Scope principle (2026-11-20):** keep the app small. Only what the demo and the user test need; everything else goes to the outlook (slide D).

**Facts about Google Maps URLs (checked 2026-11-19/20):**
- Universal "Maps URLs" (`https://www.google.com/maps/dir/?api=1&...`), no API key needed.
- `travelmode=driving` or `walking`; one travel mode per link, so driving and walking need separate links.
- `dir_action=navigate` starts turn-by-turn navigation directly if no origin is given (current location) or the origin is near the current location; with a distant origin only a route preview. Navigation is not available on all Google Maps products.
- Waypoints: up to 9 in the app; only 3 in mobile browsers. Multiple destinations work for driving and walking (all modes except transit and flights).
- Destinations can be coordinates (use them for parking points) or addresses (walking to the door).
- If the Google Maps app is not installed, the URL opens Google Maps in the browser (Android and iOS).

**To check when building:**
- ~~First step: Maps Demo Key works inside the WebView on the iPhone~~ **Done 2026-11-20:** works in Expo Go on the iPhone; no fallback needed (01, "Build step 1 result").
- ~~On the demo iPhone: driving link starts navigation; walking link with waypoints shows all doors (no `dir_action`).~~ **Done 2026-11-20:** both links work from the map test (user check).
- Door coordinates for walking links where the synthetic house number does not exist (B4); import shows "house number not found, nearest number used".
- Export the precomputed paths (driving and walking lines) from the engine so the in-app map can draw them.

## Next topic
**Build (decided 2026-11-20, 01 "Build plan" P1–P6):** engine export `export_app.py` (data format v1) and check script done 2026-11-20 (see 04, 06); the app reads the bundle since 2026-11-20 (start screen, import check, data and sources; English). **Driver app redesign decided 2026-11-20 (01):** replan completely directly, minimal screens, detail view (Map, Why), notes for later drivers, settings with navigation-app choice, no "Update situation". Built 2026-11-20 (one day early): start ("Start tour", gear icon), comparison (your list 58 stops / 10 conflicts vs new route 34 halts / 0 conflicts, "Load parcels"), detail view behind "Details" (tab Map: old route grey with ✕ conflicts, new route blue with halt numbers, closures red, switch Old/New/Both; tab Why: changes grouped with reason and source, import check, data and assumptions), settings page with "About the data" and "Reset demo"; export start mode replan_full; slot rule changed so that every parcel over 10 kg sits in slot 1–2 (check script 0 errors, 0 warnings). Halt loop built 2026-11-20 (two days early) and checked on the iPhone: approach with one-line reason (engine field `reason` per halt; time windows only when tight or when the list order was late/early), arrived with take-out, walk link and stop cards, delivered / not at home / picked up with undo, all-halts list, end screen with drive back to depot; progress survives a reload. Scan and load built 2026-11-20 (camera stays open, result cards, vibration, type-number fallback, dark overlay with a scan strip). After the first iPhone tests (01 "Changes after the first iPhone tests"): Insights button for the back office, four Code128 demo parcels (88 of 92, scans reset on app start, PDF `tourdaten/Demo-Scan-Etiketten_Tour_KRZ-61-07.pdf`), shorter approach screen, delivered and picked up separately, "Deliver all (demo)". Printed Code128 labels scanned successfully on the iPhone (2026-11-20). Settings and notes built 2026-11-20 (01 "Settings and notes details"): navigation app Google Maps / Apple Maps (unified URLs, iOS 18.4+) / Waze, auto-navigation, language and walking distance shown as planned, notes per stop with Edit/Delete, example note at Chamissoplatz 9, "Driver notes" in Insights → Why. Apple Maps walking with several doors is not documented by Apple, but works on the user's iPhone (test 2026-11-20): Apple Maps (and Waze, which walks with Apple Maps) get one walking link per halt, like Google Maps. Since 2026-11-20 every app start begins at halt 1 (only notes and settings are saved). Team topics open in parallel: B1 (MDS role), B9 (scope alignment); B8 decided by the user for the demo (team to be informed); slide E sentence on rejecting changes must be adjusted.

## B. Open decisions (team/user)
| # | Question | Context / proposal |
|---|---|---|
| 1 | Role of MDS in the pitch | Team decided on 2026-10-20 not to use MDS; the module brief requires "inc. MDS". Proposal: the prototype uses Berlin open data; MDS is the way to do the same in other cities with their data (see 05). |
| 2 | UI language of the demo app | **Decided 2026-11-20:** English, no language switch; data stay German (01). |
| 3 | Shelf labels A–C / 1–4 | Kept provisionally; user is unsure. |
| 4 | Five synthetic house numbers do not exist in OSM | **Decided 2026-11-20:** not corrected; shown as an import note "not found, nearest number used" (e.g. Chamissoplatz 9 → 8); walking links use coordinates; no files rebuilt (01). |
| 5 | Baerwaldstraße 18 only reachable with about 205 m on foot | Car ban (OSM motor_vehicle=no) plus VIZ closure. Over the 150 m limit; the app warns. Is a warning enough, or a special rule? |
| 6 | Departure time for the slide numbers | **Decided 2026-11-20:** 08:30 as in the tour header; 2026-11-25 rerun at 08:30 (01). |
| 7 | Bergmannstraße delivery time 6–11 (Senate rule) | Not in OSM. Check on site and add as a labelled own rule, or leave out. |
| 8 | Which mode to show in the demo | **Decided 2026-11-20 (user, 01 "Driver app redesign"):** the app uses "replan completely" directly; the system decides; no accept/reject of single changes; "the driver decides" is outlook. Team to be informed. Earlier text: Proposal 2026-11-20: start in "only necessary changes", switch to "replan completely" with one tap; loading and the halt loop only in the default mode. **User tendency 2026-11-20:** plan completely right away; the driver should not have to make many decisions; how much the driver confirms in the interface is a detail for later. Not decided yet. Note: this differs from 01 Step 3 rule B (default "only necessary changes", close to the interviewed drivers) and rule C (reject single changes) → align with the team. Whichever mode is chosen, slots and halt cards are precomputed for that mode (04 only has the full decision list for the default mode; the engine can produce it for "replan completely"). |
| 9 | Scope vs. the deck decision of 2026-10-20 | The team removed weather, parking and live data from the first MVP test and planned a simulated closure. This chat brings back real data, parking (loading zones) and weather. Needs team alignment (see pitch-deck-content, sections 1, 7). |
| 10 | Data only on the phone, or also a server? | **For the demo decided 2026-11-20** (01): precomputed results bundled in the app, no server. A server only matters for the future (real-time data). |
| 11 | Technology for the route calculation (rule F) | **Decided 2026-11-20** (01, "Demo build decisions"): everything precomputed by the Python engine, nothing live in the app. One rejection at a time; missing-parcel recalculation only a note. |

## C. To-dos with dates
| When | What | Who |
|---|---|---|
| ~~before building~~ | ~~Create the **Maps Demo Key** with a personal Google account (Gmail; Workspace accounts are not eligible); store it in `.env` in the project folder, never in chat or git.~~ **Done 2026-11-20.** | user |
| ~~before building~~ | ~~Choose the project folder on the computer (not in OneDrive because of node_modules).~~ **Done 2026-11-20:** `~/Documents/Projekte/Uni/M10_lieferplan_workspace`. | user |
| optional | OpenRouteService account (openrouteservice.org, HeiGIT, free standard token) is **not needed for the demo** since everything is precomputed (B11); only if the app calculates live later. Not my.optimoroute.com (commercial planner). | user/team |
| ~~before demo~~ | ~~Install the Google Maps app on the demo iPhone; test one driving link and one walking link (with waypoints) from the app.~~ **Done 2026-11-20.** | user |
| 2026-11-25 | Re-download both VIZ feeds and the weather forecast for 2026-11-26; recheck the Christmas markets list (2026 list was not yet published on 2026-11-19); rerun the trial **at 08:30 departure**; update slide numbers. | user downloads, Claude checks |
| 2026-11-25 | Fetch DWD weather warnings for the tour day (only current warnings are available). | Claude |
| 2026-11-25 | Run the engine for the demo: all three plans (the app uses replan completely, B8), slots per shipment, paths for the map, change list for the Why tab, import notes for the five house numbers; bundle the results into the app; show the data date in the app. | team/Claude |
| 2026-11-25 | Record the full flow on the iPhone as a video (start, comparison, detail view, loading with scans, halt, hand-off, return, delivered, next halt, end) as fallback for the demo. | user |
| demo day | Internet allowed; tip: iPhone on mobile data or as hotspot instead of university Wi-Fi; load the app before the pitch and keep it open. | team |
| before demo | Print the demo labels (actual size, not "fit to page"), stick them on empty cartons. | team |
| before slides | Check logo usage rules (Land Berlin, Police, DWD, OpenStreetMap brand); fallback: names in one typeface plus licence note. | team |
| before slides | Add mandatory attributions (see 03; for the in-app map also Google's attribution as shown by the map). | team |
| end of session | Sync the OneDrive snapshot (`Prototyp/Dokumentation/`) once with the current docs. **Done 2026-11-20** (00, 01, 02, 04, 05, 06 updated; 03 unchanged). | Claude (with OK) |

## D. Build phase (started 2026-11-20)
- **Status 2026-11-20:** Xcode command line tools installed (git, Python 3.9.6); `.venv` at the top level with shapely, pyproj, networkx, matplotlib, openpyxl (reportlab needs Python 3.10+, only for rebuilding PDFs); `npm install` done, `react-native-webview` added; `.env` with the Maps Demo Key (not in git), `.env.example` as template; map test passed on the iPhone. Build plan P1–P6 decided (01). Workspace is one git repository, pushed to a GitHub repository of the user (`main`). Engine export v1 + check script done (0 errors; warnings: 'what if rejected' not yet computed, 2 heavy parcels in an upper slot in "replan completely"). Replan-completely numbers at 08:30 on the Mac: 78 min driving, back 16:59 (04). App reads the bundle (`src/data/`), new screens: start (`index`), `import`, `about`; old calculation services, the 12-stop demo tour and the old screens removed (in git history, commit b598de4; camera logic of `scan.tsx` to be taken from there on Tue); new store `src/store/demo-store.ts` (start mode from `meta.json`, progress reset when a new bundle arrives); tests now check links and the bundle; ESLint (`eslint-config-expo`) set up by `npx expo lint`. Map test still reachable from the start screen.
- **Parked skeleton** (2026-11-19, see 06): Expo SDK 58, Expo Router, TypeScript, zustand + AsyncStorage, expo-camera (Code128 barcodes), expo-location; screens for the five steps; built before the planning, so it decides nothing. Can be reused after the plan is final.
- Inputs ready for building: synthetic tour (CSV/JSON/XLSX), coordinates for all 58 stops, filtered closures, road network, loading zones, weather, trial-run routes as JSON (`probelauf_routen.json`), decision list.
- App does not calculate: it shows precomputed results (01, "Demo build decisions"). UI in English.
- Screens since the redesign (01 "Driver app redesign"): start → comparison (+ detail view) → loading → halt loop → end; settings behind a gear icon. Earlier: Step 5 in the app (01): halt card → [Drive] (Google Maps link) → stop cards with [Delivered]/[Not at home] → next halt; Google map inside the app via WebView + Maps Demo Key (fallback react-native-maps / Apple Maps); optional walking link per halt.
- Build order, reuse, data format, git, roles and the 2026-11-25 plan: decided (01, "Build plan"). B8 only sets the start mode; both modes are precomputed.
- Scope principle: only what the demo and the user test need.

## E. Slides (ideas only, see 05)
- A data flow · B data sources (English one-pager PDF exists) · E decision logic · C before/after (draft map exists) · D outlook.
- Slide D now also has: in-app navigation (Google Navigation SDK) with real-time data and live re-optimisation (driver decides, or the system optimises as a switchable mode); deviation handling (loading zone occupied, parked elsewhere, free choice of the next halt); localisation (language switch). The SDK note is also in OneDrive (Folien-Uebersicht, slide 11 "Next Steps").
- In the demo the Google map inside the app is the bridge to slide D: "this is how it will look later".
- After the redesign (2026-11-20): slide E must not say the driver can reject single changes in the demo ("the driver decides" → outlook). Slide D gets: real-time checks during the round, also along a route changed by Google Maps or Waze (e.g. accident), with the march of 2026-11-20 as a real example; driver notes shared between drivers; driver settings (language, walking distance).
- Slide numbers at 08:30 departure (B6).
- To do: agree with the team; replace numbers after the 2026-11-25 rerun; build in the team deck.

## F. Known limits of the trial run (state honestly)
- Travel times from the OSM road network with assumed speeds, not from ORS; no turn restrictions.
- The "before" plan has no local knowledge (real drivers re-sort their list), so minutes are estimates; conflicts are the strong argument.
- 5 addresses use neighbouring house numbers (kept as import notes, B4).
- OSM mapping is not legal proof; signs on site take precedence.
