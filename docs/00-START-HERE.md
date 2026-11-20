# M10 Delivery-Planning Prototype: START HERE
Last updated: 2026-11-20 · Final presentation with live demo: **Thu 2026-11-26**

Read this file first in every new chat. It says what the project is, how we work, where everything is and what comes next.

## 1. What the project is
- **Course:** Master Management in Technology, module **M10 Digital Product Development**, team project with a partner challenge from **MDS (Mobility Data Space)**. The module brief asks for a solution "inc. MDS"; the team decided on 2026-10-20 not to use MDS (see 02, open decision on MDS's role in the pitch).
- **Idea:** an app for urban delivery drivers.
  1. Load the day's stop list.
  2. Check every stop against open data (closures, traffic rules, loading zones, demonstrations, weather).
  3. Build a route plan from **halts** (park once, walk to several stops); the driver approves or rejects each change.
  4. Scan and load the parcels; the app recommends a shelf slot.
  5. Hand off each halt to Google Maps: drive to the parking point, then walk to the door.
- **Core message:** our value is not the app but the translation of scattered open data into concrete per-stop decisions before the round. The app is only the surface. MDS's own words for the gap: "a data discovery and translation layer (something between a raw API catalogue and a meaningful decision-support tool)".
- **Prototype:** Expo Go (React Native) on an iPhone, UI in English. Area: Berlin-Kreuzberg, "Kreuzberg 61" (Bergmannkiez) to Graefekiez. **Synthetic tour, real open data.** Everything the app shows is precomputed by our Python engine; the app does not calculate.

## 2. How we work (agreements)
- **Plan first, build later.** Order: skeleton → discuss each step → decide → document → build. Do not start building without an explicit go from the user. (An early code skeleton was built too early on 2026-11-19 and is parked; it decides nothing.)
- Claude proposes options with a recommendation; the user/team decides. Every decision goes into **01** with its date.
- **Keep the app small (2026-11-20):** for now only what the demo and the user test need; everything else (real-time data, in-app navigation, deviation handling) goes to the outlook (slide D).
- **Honesty rules:** invented data is always labelled "synthetic"; no imitation of real companies or real documents (a "realistic redacted DHL document" was declined; we use the fictional carrier "Havelbote Paketlogistik GmbH"); assumptions are labelled as assumptions in the app and in the pitch; say what runs and what is planned.
- Conversation can be in German; **project docs are in English.**
- **OneDrive rule (user preference):** before creating, saving, uploading, moving or renaming anything in the user's OneDrive, load the skill `onedrive-ablage` and follow it. The code project should not live in OneDrive (node_modules). A snapshot of these docs is kept in OneDrive under `30_Uni/WiSe-2026-27/Digital-Product-Development/Prototyp/Dokumentation/`; the living version is this project; sync the snapshot once at the end of a session (with OK).
- **Secrets:** API keys (e.g. the Maps Demo Key) never go into the chat or into git; they go into a `.env` file in the project folder on the user's computer.
- **Data downloads:** the chat workspace cannot reach most websites. Claude gives the exact link/query and what to click (restricted to the tour area); the user downloads and uploads the file; Claude checks whether it is usable for the algorithm and records the result ("turning data into knowledge").

## 3. Document map
| Doc | Status | Content |
|---|---|---|
| 00-START-HERE | living | overview, agreements, status, how to continue |
| 01-decisions-final | **final** (append only) | all decisions: framework, Steps 1, 2, 3, 3b, 4, 5, demo build decisions |
| 02-open-work-and-next-steps | **living** (update often) | Step 5 summary, open decisions, to-dos with dates, build phase, slides |
| 03-data-sources | final reference (update on re-download) | sources, URLs, Overpass queries, check results, licences |
| 04-routing-logic-and-trial-run | spec final, results as of 2026-11-20 | algorithm in detail, trial-run numbers, full decision list |
| 05-slide-ideas | draft, not yet agreed with the team | slides A, B, E, C, D, how to present the numbers |
| 06-demo-materials-and-files | living | synthetic tour, PDFs, labels, artifacts, workspace bundle, parked code |
| pitch-deck-content | team content from 2026-11-12 (separate chat) | full pitch-deck board: problem, interviews, competitors, MVP scope, etc. |

## 4. Status board (2026-11-20)
| Step | Status |
|---|---|
| 1 Tour plan (input) | decided |
| 2 External data | decided, all sources downloaded and checked |
| 3 Route-plan logic | decided |
| 3b Calculation and recalculation | decided; trial run with real data done (see 04) |
| 4 Scan and load | decided (shelf labels A–C/1–4 provisional) |
| 5 Navigation (Google Maps hand-off) | decided 2026-11-20: one driving link per halt, walk on a Google map in the app (see 01) |
| Demo build | decided 2026-11-20: everything precomputed; internet allowed, video as fallback; Google map in the app via WebView + Maps Demo Key; UI in English; five non-existent house numbers kept as import notes; slide numbers at 08:30 |
| Open team topics | B1 MDS role, B9 scope alignment; small: B3, B5, B7. B8 decided by the user 2026-11-20 (replan completely, the system decides); team to be informed, slide E to adjust. |
| Build | **built 2026-11-20 and checked on the iPhone** (build plan and driver app redesign in 01): start with Insights (back office), loading with four live Code128 scans, halt loop (one-line why, take out, delivered / picked up / not at home), end screen, settings (Google Maps / Apple Maps / Waze), driver notes. Engine export and check script in `probelauf/`. One git repository for the whole workspace, pushed to the user's GitHub repository. |
| Slides | ideas + a draft map for the before/after slide |

## 5. Next steps (short; details in 02)
1. Polish and buffer until 2026-11-24 (only if something comes up in tests; scope principle).
2. On 2026-11-25 (01 "Build plan" P6): re-download VIZ closures, weather, police page, Christmas markets; run `probelauf/export_app.py` and `check_app_data.py` (departure 08:30); rebuild `tourdaten/build_scan_labels.py` if slots changed; full run on the iPhone; record the fallback video; update the numbers in 04 and 05.
3. Team: settle B1 and B9; adjust slide E (no rejecting single changes in the demo); slide D additions (real-time checks, the driver decides, shared driver notes, settings).
4. Build slides A, B, E, C, D.

## 6. How to start a new chat
Paste something like:
> We are continuing the M10 delivery-planning prototype (Expo Go, Berlin-Kreuzberg). Read `CLAUDE.md` and `docs/00-START-HERE.md` and the docs it links before answering. Today's topic: …

Since 2026-11-20 the work happens in Claude Code (desktop app) in the project folder on the computer (`M10_lieferplan_workspace`, one git repository). A chat on claude.ai cannot see these files; there, attach the docs or the files needed.

## 7. Glossary
- **Stop:** one delivery address; several recipients at the same address are one stop.
- **Halt:** one parking point from which 1–4 stops are served on foot.
- **Parking point:** a loading zone that is valid at the arrival time, otherwise a legal kerbside spot; never inside a closure or a no-stopping zone.
- **Modes:** "only necessary changes" (default, keeps the list order) and "replan completely".
- **Abbreviations:** VIZ = Verkehrsinformationszentrale Berlin (traffic information centre); OSM = OpenStreetMap; ORS = OpenRouteService (HeiGIT, Heidelberg); DWD = Deutscher Wetterdienst (German weather service); MDS = Mobility Data Space.
- **German terms in the data:** Paket = parcel; Päckchen = small parcel; Sperrgut = bulky item; Abholung (Retoure) = pickup/return; Identcheck = ID check; Alterssichtprüfung 18 = age check 18+; Wunschnachbar = preferred neighbour; Wunschablageort = preferred drop-off spot; Prio bis 12:00 = priority, deliver by 12:00; Ladezone = loading zone; Halteverbot = no stopping; Sperrung = closure; Zeitfenster = time window; Fach = shelf slot.
