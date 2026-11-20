# M10 delivery-planning prototype

Talk to the user in German. Project docs are in English.

## Start here
- Read `docs/00-START-HERE.md` first, then `docs/01` to `docs/06`.
  - 01 = all decisions (append only; to change one, add a dated entry and mark the old one as superseded)
  - 02 = open work, open decisions, to-dos
- During the build, the docs in `docs/` are the living version. Snapshots elsewhere:
  - OneDrive: `30_Uni/WiSe-2026-27/Digital-Product-Development/Prototyp/Dokumentation/` (sync at the end of a session via the Microsoft 365 connector, see "OneDrive" below)
  - claude.ai project "Uni & Masterarbeit": cannot be written from Claude Code; the user updates it later from a claude.ai chat
- Demo: Thu 2026-11-26, live on an iPhone.

## How we work
- Plan first, build later. Propose options with a recommendation; the user decides. Build only after an explicit go.
- Record every decision with its date in `docs/01-decisions-final.md` and update `docs/02-open-work-and-next-steps.md`.
- Scope: only what the demo and the user test need. Everything else goes to the outlook (slide D in `docs/05-slide-ideas.md`).
- Honesty: synthetic data stays labelled "synthetic" (fictional carrier "Havelbote Paketlogistik GmbH"); no imitation of real companies or real documents; label assumptions as assumptions; say what runs and what is planned.

## Key decisions (details in docs/01)
- Expo Go (SDK 58) on an iPhone; UI in English; tour data stay German.
- The app does not calculate. Everything it shows is precomputed by the Python engine in `probelauf/` and bundled with the app.
- Google Maps hand-off: one driving link per halt to the parking-point coordinates (no origin, no waypoints, `dir_action=navigate`). Walking is shown on a Google map inside the app (WebView + Maps JavaScript API + Maps Demo Key; fallback react-native-maps with Apple Maps), plus an optional walking link per halt with all doors as waypoints (no `dir_action`).
- Internet is allowed in the demo; fallback is a video recorded beforehand.

## Folders
- `docs/`: project docs 00 to 06
- `lieferplan-prototyp/`: parked Expo skeleton from 2026-11-19 (own git repo); it decides nothing, reuse only after the build plan
- `probelauf/`: Python planning engine and trial-run results
- `tourdaten/`: synthetic tour and the scripts that build it
- `data_*`: raw data downloads (VIZ, OSM, police, DWD)
- `scripts/`: data analysis and repair tools

## Secrets
- API keys (e.g. the Maps Demo Key) only in `lieferplan-prototyp/.env` (Expo reads env files from the app folder; client-side variables need the `EXPO_PUBLIC_` prefix). Never in chat, never in git. `.env` is listed in `lieferplan-prototyp/.gitignore` (added 2026-11-20; before that only `.env*.local` was ignored). If a repo is created at the top level, ignore `.env` there too.

## OneDrive
- OneDrive is not the working copy. Code and git stay in this folder (the user's OneDrive rules say no code there).
- Before any write to OneDrive (Microsoft 365 connector), load the skill `onedrive-ablage` and follow it. If that skill is not available in the session, do not write to OneDrive and tell the user.

## Findings from the bundle check (2026-11-20), for the build plan
- `probelauf/engine.py` (ANNAHMEN): `"abfahrt_depot": "08:00"` → set to `"08:30"` for the 2026-11-25 rerun (decision B6). The results in `probelauf/` are still from the 08:00 run.
- `probelauf/probelauf_routen.json` has, per variant (`vorher`, `nur_noetige`, `ganz_neu`), the halts with arrival, parking point (type, street, lat/lon) and stops (no., address, lat/lon, time), but no line geometry. The engine must also export the driving and walking paths for the in-app map.
- Parked skeleton, `src/services/navigation.ts`: `drivingUrl` already matches the decision. `walkingUrl` does not: it builds one link per stop with an origin and `dir_action=navigate`; the decision is one walking link per halt with all doors as waypoints, no origin, no `dir_action`.
- Parked skeleton: UI texts are German (e.g. "Nächster Halt", "Tour abgeschlossen"); the decision is English. It still contains the older small demo tour (12 stops), not the synthetic tour KRZ-61-07.
- `react-native-webview` is not yet a dependency (`npx expo install react-native-webview`).
- `karte.py` and the PDF scripts use the Liberation font path for Linux; adjust on macOS.
