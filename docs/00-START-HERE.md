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
| Open team topics | B1 MDS role, B8 demo mode (user tendency: plan completely right away, few decisions for the driver), B9 scope alignment; small: B3, B5, B7. None of them blocks the build. |
| Build | **next:** build plan, then build (new chat); old skeleton parked |
| Slides | ideas + a draft map for the before/after slide |

## 5. Next steps (short; details in 02)
1. **Build plan** (next chat): build order from 2026-11-20 to 2026-11-25, reuse of the parked skeleton, output format of the Python engine for the app, who does what. Then build after an explicit go; first build step: test the Maps Demo Key in the WebView on the iPhone.
2. Before building: create the Maps Demo Key (personal Gmail) and store it in `.env`; choose the project folder on the computer (not OneDrive). OpenRouteService key not needed for the demo.
3. Install Google Maps on the demo iPhone and test the links from the app.
4. On 2026-11-25: re-download VIZ closures and weather, recheck Christmas markets, rerun the engine at 08:30 for the demo and bundle the results, record the fallback video.
5. Team: settle B1, B8, B9.
6. Build slides A, B, E, C, D.

## 6. How to start a new chat
Paste something like:
> We are continuing the M10 delivery-planning prototype (Expo Go, Berlin-Kreuzberg). Read `claude/00-START-HERE.md` and the docs it links before answering. Today's topic: …

A new chat cannot see this chat's files. If code, data or PDFs are needed, **attach the workspace bundle** `M10_lieferplan_workspace_2026-11-20.zip` (see 06), or unpack it in the project folder on the computer and connect that folder in the Claude desktop app ("+" → "Add folder").

## 7. Glossary
- **Stop:** one delivery address; several recipients at the same address are one stop.
- **Halt:** one parking point from which 1–4 stops are served on foot.
- **Parking point:** a loading zone that is valid at the arrival time, otherwise a legal kerbside spot; never inside a closure or a no-stopping zone.
- **Modes:** "only necessary changes" (default, keeps the list order) and "replan completely".
- **Abbreviations:** VIZ = Verkehrsinformationszentrale Berlin (traffic information centre); OSM = OpenStreetMap; ORS = OpenRouteService (HeiGIT, Heidelberg); DWD = Deutscher Wetterdienst (German weather service); MDS = Mobility Data Space.
- **German terms in the data:** Paket = parcel; Päckchen = small parcel; Sperrgut = bulky item; Abholung (Retoure) = pickup/return; Identcheck = ID check; Alterssichtprüfung 18 = age check 18+; Wunschnachbar = preferred neighbour; Wunschablageort = preferred drop-off spot; Prio bis 12:00 = priority, deliver by 12:00; Ladezone = loading zone; Halteverbot = no stopping; Sperrung = closure; Zeitfenster = time window; Fach = shelf slot.
