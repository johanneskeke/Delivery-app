# 05 Slide ideas: data flow, data sources, decision logic, before/after, outlook
Last updated: 2026-11-20 · Ideas only, not yet agreed with the team.

## Core message
Our value is not the app but what we make of open data: we translate scattered data from the city, the weather service and OpenStreetMap into concrete decisions for every stop before the round starts. The app is only the surface.

Possible pitch line: "Google Maps knows how to get there. We know where you're allowed to stop and what's different today."

Link to the challenge: the MDS brief describes the gap as "a data discovery and translation layer (something between a raw API catalogue and a meaningful decision-support tool)". These slides show exactly that. This could also answer the open question about MDS's role: the prototype uses Berlin open data; MDS would be the way to do the same in other cities with their data.

Competitor framing (careful, consistent with pitch-deck-content): planners such as OptimoRoute already optimise order and time windows. Our hypothesis is the external, stop-specific data (closures, loading zones valid at arrival time, demos, weather) with a reason the driver can accept or reject. Not yet proven as a unique advantage.

## Slide A: Data flow
Left to right:
1. **Input:** tour list from the dispatcher (Excel/CSV)
2. **Open data:** City of Berlin, police, weather service, OpenStreetMap
3. **Our translation (the core, large and coloured):** locate addresses → match disruptions per stop → form halts (park once, several stops on foot) → order and schedule incl. weather surcharge → slot recommendation while loading
4. **Driver decision:** accept the proposal, reject single changes, or keep the original
5. **Output:** Google Maps per halt: one driving link to the parking point we chose; the walk to the doors is shown in our app (decided 2026-11-20, see 01 Step 5)

Message under the diagram: "The app is the surface. The value is created in step 3."
Design: steps 1, 2, 4, 5 grey; step 3 highlighted.
Optional outlook: feedback channel from the driver (e.g. "loading zone occupied") improves the data for the next round.

## Slide B: Which data, from where, for what
As tiles or table: logo · data · source · use in the app. (English one-pager `Data_sources_delivery_prototype.pdf` exists, see 03/06.)

| Source | Data | Used for |
|---|---|---|
| Verkehrsinformationszentrale (VIZ) Berlin | roadworks, closures, also marathon, sports events, state visits, large demos | detect affected stops, move parking point, avoid |
| OpenStreetMap (Kreuzberg data mapped with the district office) | one-way streets, through-traffic barriers, time-based rules, loading zones, no-stopping zones | approach, order, good stopping place |
| Berlin Police | registered demonstrations and marches | closures for a few hours |
| berlin.de (Senate Department for Economics) | Christmas markets, street festivals | closures for one day |
| Deutscher Wetterdienst (via Bright Sky) | hourly forecast, severe-weather warnings | time surcharge, order, earlier start |
| OpenRouteService (HeiGIT, Heidelberg University) | coordinates for addresses, travel times | locating and schedule |
| Google Maps | – (not a data source but the output) | navigation per halt |

## Slide E: How does the app decide? (decision logic)
Goal: show that proposals follow understandable rules and the driver keeps control.

**Pyramid or steps, bottom to top:**
1. **Hard rules, never broken:** closures, one-way streets, no-through-traffic, no-stopping zones, loading zones only at their times.
2. **First goal, promises to customers:** keep time windows and priority shipments.
3. **Second goal, efficiency:** shortest total time; short walks (up to 150 m, bulky items up to 30 m).
4. **Third goal, familiarity:** as little change to the original as necessary (default mode "only necessary changes"; alternative "replan completely").

**Next to it: the driver decides.** Every change comes with reason and source. Real example from the trial: "Halt in Fürbringerstraße · Solmsstraße 7 and 12 on foot (23 m / 107 m) · Reason: Solmsstraße closed between Fürbringerstraße and Gneisenaustraße (VIZ, until 31 Dec) · [Accept] [Reject]". The driver can reject single changes; the app recalculates. **(2026-11-20: not in the demo; the demo app replans completely and the system decides. Present "the driver decides" as outlook, slide D.)**

**Strip underneath, the six building blocks:** situation picture → impact → halts and parking point → order → schedule (with loop back) → proposal with reasons.

**Label as assumptions:** stop duration (2 min + 1 min per parcel, bulky +3, ID check +2) and weather surcharges.

## Slide C: Route before/after
- **Draft exists:** `Probelauf_Karte_vorher_nachher.png` (three panels: before / only necessary changes / replan completely; same map section; closures in red; conflicts marked with red crosses; halts as circles (kerbside) or squares (loading zone)). Generated from a real run of our logic with the synthetic tour, not drawn by hand.
- **Key figures (trial 2026-11-20, departure 08:00; to be replaced after the 2026-11-25 rerun):** before 58 halts, 10 conflicts (3 halts in closures, 2 in no-stopping zones, 4 time windows/priority missed, 1 too early) → only necessary changes 45 halts, 0 conflicts → replan completely 34 halts, 0 conflicts, driving 68 instead of 225 min.
- **Present conflicts and differences, not absolute clock times** (they depend on assumptions; the before plan has no local knowledge).
- **Numbered markers with decisions and reasons** (from the real run): 1 Solmsstraße 7/12 closed → park in Fürbringerstraße, walk; 2 Zossener Straße 14 bulky item inside the closure → park on Gneisenaustraße, 32 m; 3 Feinkost window 8–10 → 09:05 instead of 10:59 via loading zone Marheinekeplatz; 4 kiosk Mittenwalder Straße bulky item → parking point at 16 m; 5 nearby stops bundled → 45/34 halts instead of 58; 6 weather dry → no surcharge (optional labelled "what if it rains").
- Show data status (date/time of download) and "synthetic tour" on the slide; attributions in the footer.
- **Optional second scenario:** the same tour on 2026-11-20 with the registered march 08:00–10:30 from Gneisenaustraße via Südstern and Hasenheide to Hermannplatz.

## Slide D: Outlook (not built yet)
- **Live mode:** the route is recalculated during the round whenever new data arrives (new closure, spontaneous demo, customer absent, new pickup). (2026-11-20, user:) our system also checks in real time along a route that Google Maps or Waze has changed and decides again, e.g. after an accident. Real example: the registered march of 2026-11-20 through the tour area (not built as a demo scenario).
- **The driver decides (2026-11-20):** accept or reject single changes with reason; the demo app replans completely without asking.
- **Driver notes shared between drivers (2026-11-20):** notes like door codes or access tips reach the next driver on the same stop (demo: stored only on the phone).
- **Driver settings (2026-11-20):** language switch, own walking-distance limit (needs live recalculation); the navigation-app choice (Google Maps, Apple Maps, Waze) already works in the demo.
- **Navigation inside our app (added 2026-11-20):** turn-by-turn without switching apps (e.g. Google Navigation SDK), combined with real-time data and updates. Two ways to decide: the driver decides every change, or our system makes optimised real-time decisions. Frame the second as a mode the driver can switch on (today's principle: the driver decides). Why not in the prototype: needs its own app build instead of Expo Go, the React Native package is still beta, needs a Google Cloud project with billing; and Google's routing cannot take our closures either, so the parking-point decision stays our job.
- **Handling deviations during the round (added 2026-11-20):** "loading zone occupied" → next valid parking point from our data; detect "parked elsewhere" and recalculate the walks; driver chooses the next halt freely and the app warns about time windows and priority deadlines.
- **Use opportunities:** if the route changes and the driver passes a later stop, the app suggests "take this stop now, then continue". Google Maps only navigates to the next destination and does not know the rest of the round.
- **Real-time data:** VIZ traffic messages continuously instead of once in the morning; driver feedback (loading zone occupied, road closed) improves the data for everyone.
- **Learning from rejections:** reasons for rejected proposals improve the rules.
- **More cities:** via MDS and the respective city's data.
- **Dispatcher view:** check all vehicles' rounds in advance.
- **Integration with carriers' scanner apps** instead of Excel import.
Clearly label as future. The in-app navigation item is also noted in OneDrive (Folien-Uebersicht, slide 11 "Next Steps").

## Suggested order in the deck
A data flow → B data sources → E decision logic → C before/after (right before or within the live demo) → D outlook (with next steps).

## Before building the slides
- **Logos:** only as source credits. Logos of authorities (Land Berlin, police, DWD) and the OpenStreetMap brand have their own usage rules; check first. Fallback: names in one typeface plus licence note.
- **Mandatory attributions** in the slide footer: see 03, section 5.
- **Stay honest:** label what runs and what is planned.

## Alignment with the existing deck (pitch-deck-content)
- On 2026-10-20 the team removed weather, parking and live data from the first MVP test and decided not to use MDS. These ideas extend the scope again: align with the team.
- Fits deck slide 5 (USP draft already mentions "roadworks, closures and stopping conditions"), slide 6 (solution), slide 7 (MVP demo: before/after, decision logic), slide 8 (feasibility: real Berlin closure data now checked) and slide 11 (next steps: outlook).
- The decision logic (slide E) picks up the deck's HMW questions: reason immediately understandable, priorities and time windows respected, control stays with the driver.
