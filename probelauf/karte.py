"""Karte vorher / nur nötige Änderungen / ganz neu planen (Entwurf für Folie C)."""
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.font_manager import FontProperties

import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from engine import A, fmt  # noqa: E402
from planer import run  # noqa: E402

SURFACE = "#fcfcfb"
TEXT1, TEXT2 = "#0b0b0b", "#52514e"
STREET = "#dddcd8"
ROUTE = "#2a78d6"
CRIT = "#d03b3b"
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONTB = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
F, FB = FontProperties(fname=FONT), FontProperties(fname=FONTB)

res = run()
netz = res["netz"]
xy = lambda n: netz.G.nodes[n]["xy"]  # noqa: E731

allx, ally = [s["pt"].x for s in res["stops"]], [s["pt"].y for s in res["stops"]]
for key in ("v0", "v1", "v2"):
    cur = res["start"]
    for p in res[key]["plan"] + [None]:
        nxt = p["park"]["node"] if p else res["start"]
        for n in netz.path(cur, nxt):
            allx.append(xy(n)[0]); ally.append(xy(n)[1])
        cur = nxt
x0, x1 = min(allx) - 120, max(allx) + 120
y0, y1 = min(ally) - 120, max(ally) + 120
panel_w = 5.9
panel_h = panel_w * (y1 - y0) / (x1 - x0)
H = panel_h + 2.1
fig, axes = plt.subplots(1, 3, figsize=(18, H), facecolor=SURFACE)
fig.subplots_adjust(left=0.01, right=0.99, top=1 - 1.25 / H, bottom=0.85 / H, wspace=0.03)

konf_nr = {s["nr"] for s, _, _ in res["v0_konf"]} | {s["nr"] for s, _ in res["v0"]["spaet"]} | \
          {s["nr"] for s, _ in res["v0"]["frueh"]}

panels = [
    ("Vorher: Liste, wie sie kommt", res["v0"], len(konf_nr)),
    ("Nur nötige Änderungen (Standard)", res["v1"], 0),
    ("Ganz neu planen", res["v2"], 0),
]

for ax, (title, r, nk) in zip(axes, panels):
    ax.set_facecolor(SURFACE)
    for ln, name, hw, ka, kb, cl in netz.edges:
        xs, ys = ln.xy
        ax.plot(xs, ys, color=STREET, lw=0.6 if hw in ("residential", "living_street", "unclassified") else 1.1,
                zorder=1, solid_capstyle="round")
    for c in netz.full:
        geoms = getattr(c["geom"], "geoms", [c["geom"]])
        for g in geoms:
            xs, ys = g.xy
            ax.plot(xs, ys, color=CRIT, lw=2.6, zorder=2, solid_capstyle="round")
    cur = res["start"]
    for p in r["plan"]:
        path = netz.path(cur, p["park"]["node"])
        ax.plot([xy(n)[0] for n in path], [xy(n)[1] for n in path], color=ROUTE, lw=1.6, alpha=0.75, zorder=3,
                solid_capstyle="round", solid_joinstyle="round")
        for s, _ in p["stopps"]:
            ax.plot([p["park"]["pt"].x, s["pt"].x], [p["park"]["pt"].y, s["pt"].y], color=TEXT2, lw=0.7,
                    ls=(0, (1.5, 1.5)), zorder=4)
        cur = p["park"]["node"]
    back = netz.path(cur, res["start"])
    ax.plot([xy(n)[0] for n in back], [xy(n)[1] for n in back], color=ROUTE, lw=1.6, alpha=0.75, zorder=3)
    for p in r["plan"]:
        mk = "s" if p["park"]["typ"] == "Ladezone" else "o"
        ax.scatter(p["park"]["pt"].x, p["park"]["pt"].y, s=44, marker=mk, color=ROUTE, edgecolor=SURFACE,
                   linewidth=1.6, zorder=5)
    for s in res["stops"]:
        ax.scatter(s["pt"].x, s["pt"].y, s=10, color=TEXT1, zorder=6, linewidth=0)
    if r is res["v0"]:
        for s in res["stops"]:
            if s["nr"] in konf_nr:
                ax.scatter(s["pt"].x, s["pt"].y, s=90, marker="X", color=CRIT, edgecolor=SURFACE, linewidth=1.4, zorder=7)
    sx, sy = xy(res["start"])
    ax.scatter(sx, sy, s=120, marker="D", color=TEXT1, edgecolor=SURFACE, linewidth=1.6, zorder=8)
    ax.annotate("Start/Ende\n(vom Depot)", (sx, sy), xytext=(-8, 0), textcoords="offset points", fontproperties=F,
                fontsize=8, color=TEXT2, va="center", ha="right",
                bbox=dict(boxstyle="round,pad=0.2", fc=SURFACE, ec="none", alpha=0.9), zorder=9)
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(title, fontproperties=FB, fontsize=13, color=TEXT1, loc="left", pad=26)
    sub = (f"{r['halte']} Halte · {r['fahrt']:.0f} Min. Fahrt · {r['fuss']:.0f} Min. zu Fuß · "
           f"{'%d Konflikte' % nk if nk else 'keine Konflikte'} · zurück {fmt(r['ende'])}")
    ax.text(0, 1.015, sub, transform=ax.transAxes, fontproperties=F, fontsize=9.5, color=TEXT2)

fig.text(0.01, 1 - 0.32 / H, "Probelauf Tour KRZ-61-07, Do 26.11.2026: dieselben 58 Stopps, drei Pläne",
         fontproperties=FB, fontsize=16, color=TEXT1)
fig.text(0.01, 1 - 0.62 / H, "Konflikte vorher: 3 Halte in Sperrungen, 2 im Halteverbot, 4 Zeitfenster/Prio verpasst, "
         "1 vor Öffnung da. Mit Plan: keine.", fontproperties=F, fontsize=10.5, color=TEXT2)

handles = [
    Line2D([], [], color=ROUTE, lw=2, label="Fahrweg"),
    Line2D([], [], color=TEXT2, lw=1, ls=(0, (1.5, 1.5)), label="Fußweg zum Stopp"),
    Line2D([], [], marker="o", ls="", color=ROUTE, markeredgecolor=SURFACE, markersize=8, label="Halt am Straßenrand"),
    Line2D([], [], marker="s", ls="", color=ROUTE, markeredgecolor=SURFACE, markersize=8, label="Halt in Ladezone"),
    Line2D([], [], marker="o", ls="", color=TEXT1, markersize=4, label="Stopp (Lieferadresse)"),
    Line2D([], [], color=CRIT, lw=3, label="Sperrung (VIZ)"),
    Line2D([], [], marker="X", ls="", color=CRIT, markeredgecolor=SURFACE, markersize=10, label="Konflikt im Vorher-Plan"),
]
fig.legend(handles=handles, loc="lower left", bbox_to_anchor=(0.01, 0.3 / H), ncol=7, frameon=False,
           prop=F, fontsize=9.5, labelcolor=TEXT1, handlelength=2.2, columnspacing=1.6)
fig.text(0.01, 0.08 / H,
         "Grobe Rechnung: Fahrzeiten aus dem OpenStreetMap-Straßennetz mit Annahmen (Tempo, 1 bzw. 3 Min. Parkplatzsuche, "
         "Stoppdauer 2 Min. + 1 Min./Sendung), nicht aus OpenRouteService. Vorher-Plan ohne Ortskenntnis des Fahrers. "
         "Daten: © OpenStreetMap-Mitwirkende (ODbL); Digitale Plattform Stadtverkehr Berlin / VIZ (dl-de-by-2.0).",
         fontproperties=F, fontsize=7.8, color=TEXT2)
out = os.path.join(HERE, "Probelauf_Karte_vorher_nachher.png")
fig.savefig(out, dpi=200, facecolor=SURFACE)
print(out)
