# M10 delivery-planning prototype: workspace bundle (2026-11-20, evening state)

Everything produced in the planning chats up to the evening of 2026-11-20 (Step 5 Navigation and the demo build decisions included). Start with `CLAUDE.md`, then `docs/00-START-HERE.md`. During the build, `docs/` is the living version of the project documentation; the claude.ai project "Uni & Masterarbeit" and the OneDrive copy are snapshots.

## Contents
| Folder | What |
|---|---|
| `CLAUDE.md` | instructions for Claude Code: how we work, key decisions, folders, secrets, OneDrive |
| `docs/` | English project docs 00–06 (state: evening of 2026-11-20) |
| `tourdaten/` | synthetic tour (CSV/JSON/XLSX), PDF delivery list, demo labels PDF, data-sources one-pager PDF, filtered closures JSON, generator and PDF scripts |
| `probelauf/` | trial run of the routing logic: engine.py, planer.py, bericht.py, karte.py, results (MD, JSON), before/after map PNG, English decision list |
| `data_*` | raw data downloads (VIZ feeds, OSM exports, police demonstrations, DWD weather) |
| `scripts/` | analysis and repair scripts for the raw data |
| `lieferplan-prototyp/` | parked Expo SDK 58 code skeleton (without node_modules; run `npm install`) |

## Run the trial
```
pip install shapely pyproj networkx matplotlib
python3 probelauf/bericht.py   # key figures + decision list + routes JSON
python3 probelauf/karte.py     # before/after map PNG
```
Paths are resolved relative to this folder. The map and PDFs use the Liberation fonts (`/usr/share/fonts/truetype/liberation/`); change the font path on other systems.

## Rebuild tour files and PDFs
Run inside `tourdaten/`: `generate_tour.py` (seed 2611) → `build_xlsx.py`, `build_pdf.py`, `build_labels.py`, `build_datasources_pdf.py` (needs reportlab, openpyxl).

All tour data is synthetic (fictional carrier "Havelbote Paketlogistik GmbH", invented names, real streets). Open data attributions: VIZ Berlin (dl-de-by-2.0), DWD (CC BY 4.0), © OpenStreetMap contributors (ODbL), openrouteservice.org by HeiGIT.
