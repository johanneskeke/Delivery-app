"""Four demo parcel labels with a Code128 barcode for the live scan in the app (decided 2026-11-20).

    cd tourdaten && ../.venv/bin/python build_scan_labels.py

Page 1: four A6 labels on one A4 page (cut marks; print at actual size, not "fit to page").
Page 2: overview for the team (what the app shows for each label).
The four shipment numbers come from the app data bundle (meta.json → demo_labels.to_scan, set in probelauf/export_app.py),
the label content from the synthetic tour list. Fictional carrier, visibly synthetic, as all demo materials.
Uses the built-in Helvetica font, so it runs on macOS without extra fonts.
"""
import json
import os

from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
DATA = os.path.join(BASE, "lieferplan-prototyp", "assets", "data")
OUT = os.path.join(HERE, "Demo-Scan-Etiketten_Tour_KRZ-61-07.pdf")

ACCENT = colors.HexColor("#0F5257")
MUTED = colors.HexColor("#5C6670")
PRIO = colors.HexColor("#B4441C")
LW, LH = A4[0] / 2, A4[1] / 2  # A6, four per A4

SENDERS = {  # invented senders, as on the other demo labels (tourdaten/build_labels.py)
    "SYN969042356": "Praxisbedarf Süd GmbH · Musterring 3 · 12345 Musterstadt",
    "SYN232967813": "Nordlicht Feinkost-Großhandel · Musterallee 7 · 12345 Musterstadt",
    "SYN842112630": "Radteile Direkt GmbH · Musterstraße 12 · 12345 Musterstadt",
}
DEFAULT_SENDER = "Kiezkiste Versand GmbH · Musterweg 1 · 12345 Musterstadt"


def load():
    meta = json.load(open(os.path.join(DATA, "meta.json"), encoding="utf-8"))
    plan = json.load(open(os.path.join(DATA, f"plan_{meta['start_mode']}.json"), encoding="utf-8"))
    rows = {r["Sendungsnummer"]: r for r in json.load(open(os.path.join(HERE, "tourliste.json"), encoding="utf-8"))["rows"]}
    seq = {h["id"]: h["seq"] for h in plan["halts"]}
    items = []
    for sid in meta["demo_labels"]["to_scan"]:
        slot = plan["slots"][sid]
        items.append((rows[sid], slot["slot"], seq[slot["halt_id"]]))
    return items


def draw_label(c, x, y, r):
    pad = 6 * mm
    w, h = LW - 2 * pad, LH - 2 * pad
    left, top = x + pad, y + LH - pad
    c.setStrokeColor(colors.black)
    c.setLineWidth(1.2)
    c.rect(left, y + pad, w, h)
    # head: logo, carrier, product
    c.setFillColor(ACCENT)
    c.roundRect(left + 4, top - 26, 20, 20, 4, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12.4)
    c.drawCentredString(left + 14, top - 20.6, "H")
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(left + 30, top - 14, "Havelbote")
    c.setFont("Helvetica", 6.5)
    c.setFillColor(MUTED)
    c.drawString(left + 30, top - 22, "Paketlogistik GmbH (fiktiv)")
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(colors.black)
    c.drawRightString(left + w - 6, top - 19, r["Produkt"].upper())
    c.setLineWidth(0.8)
    c.line(left, top - 32, left + w, top - 32)
    yy = top - 32
    if r["Service"]:
        c.setFillColor(PRIO if r["Service"].startswith("Prio") else colors.black)
        c.rect(left, yy - 16, w, 16, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(left + w / 2, yy - 11.5, r["Service"].upper())
        yy -= 16
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.5)
    c.drawString(left + 6, yy - 11, "Absender: " + SENDERS.get(r["Sendungsnummer"], DEFAULT_SENDER))
    # recipient
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 7)
    c.drawString(left + 6, yy - 25, "Empfänger")
    ty = yy - 39
    c.setFont("Helvetica-Bold", 12.5)
    for ln in [r["Empfänger"], r["Adresszusatz"], f"{r['Straße']} {r['Hausnr.']}"]:
        if ln:
            c.drawString(left + 6, ty, ln)
            ty -= 15
    c.setFont("Helvetica-Bold", 15)
    c.drawString(left + 6, ty - 2, f"{r['PLZ']} {r['Ort']}".strip())
    ty -= 20
    c.setLineWidth(0.6)
    c.line(left, ty, left + w, ty)
    c.setFont("Helvetica", 7.5)
    route = "Zustellbasis Tempelhof · Bezirk KRZ-61"
    if r.get("Zeitfenster von"):
        route += f" · Zustellung {r['Zeitfenster von'][:2]}–{r['Zeitfenster bis'][:2]} Uhr"
    c.drawString(left + 6, ty - 11, route)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(left + w - 6, ty - 11, f"{r['Gewicht kg']:.1f}".replace(".", ",") + " kg")
    c.line(left, ty - 17, left + w, ty - 17)
    # Code128 barcode with the shipment number (what the app scans), as on the other demo labels
    code = r["Sendungsnummer"]
    bc = createBarcodeDrawing("Code128", value=code, barWidth=1.15, barHeight=58, humanReadable=False, quiet=True,
                              lquiet=10 * 1.15, rquiet=10 * 1.15)
    bx = left + (w - bc.width) / 2
    by = ty - 17 - 8 - bc.height
    bc.drawOn(c, bx, by)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(left + w / 2, by - 13, " ".join([code[:3], code[3:6], code[6:9], code[9:]]))
    if r["Hinweis"]:
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(left + w / 2, by - 26, r["Hinweis"])
    # box for the slot, written by hand as drivers often do (optional)
    bw, bh = 34 * mm, 15 * mm
    fx, fy = left + w - bw - 6, y + pad + 14
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.8)
    c.rect(fx, fy, bw, bh)
    c.setFont("Helvetica", 6.5)
    c.setFillColor(MUTED)
    c.drawString(fx + 4, fy + bh - 9, "Fach (optional per Hand)")
    c.setFillColor(colors.black)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 5.8)
    c.drawCentredString(left + w / 2, y + pad + 5,
                        "Synthetische Testdaten · Studienprojekt M10 · fiktiver Paketdienst · keine echte Sendung")
    c.setFillColor(colors.black)


def cut_marks(c):
    W, H = A4
    c.setStrokeColor(colors.HexColor("#BBBBBB"))
    c.setLineWidth(0.4)
    c.setDash(3, 3)
    c.line(W / 2, 0, W / 2, H)
    c.line(0, H / 2, W, H / 2)
    c.setDash()


def overview(c, items):
    W, H = A4
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(ACCENT)
    c.drawString(18 * mm, H - 20 * mm, "Demo scan: four parcels (overview for the team)")
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    c.drawString(18 * mm, H - 27 * mm, "Cut out the labels, stick them on empty cartons, print at actual size. The app counts all other")
    c.drawString(18 * mm, H - 32 * mm, "parcels as already loaded (simulated): 88 of 92 at the start, 92 of 92 after these four scans.")
    c.drawString(18 * mm, H - 37 * mm, "The scans reset on every app start. Tour KRZ-61-07, demo 26 Nov 2026. Synthetic data.")
    y = H - 50 * mm
    c.setFillColor(colors.black)
    for i, (r, slot, halt) in enumerate(items, 1):
        shows = "→ Floor at the back (bulky)" if slot == "FLOOR" else f"→ {slot}"
        if r["Gewicht kg"] > 10 and slot != "FLOOR":
            shows += f" + \"{r['Gewicht kg']} kg → bottom slot\""
        c.setFont("Helvetica-Bold", 10)
        c.drawString(18 * mm, y, f"{i}. {r['Sendungsnummer']} · {r['Empfänger']}, {r['Straße']} {r['Hausnr.']}")
        c.setFont("Helvetica", 9.5)
        c.drawString(24 * mm, y - 5 * mm, f"App shows: {shows} · halt {halt}" + (f" · {r['Service']}" if r["Service"] else ""))
        y -= 14 * mm
    c.setFont("Helvetica", 8.5)
    c.setFillColor(MUTED)
    c.drawString(18 * mm, y - 2 * mm, "Slots depend on the data run; after the 2026-11-25 rerun, build this PDF again.")


def main():
    items = load()
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Demo scan labels, tour KRZ-61-07, synthetic")
    positions = [(0, LH), (LW, LH), (0, 0), (LW, 0)]
    for (r, _, _), (x, y) in zip(items, positions):
        draw_label(c, x, y, r)
    cut_marks(c)
    c.showPage()
    overview(c, items)
    c.showPage()
    c.save()
    print(OUT)
    for r, slot, halt in items:
        print(f"  {r['Sendungsnummer']}  {r['Empfänger']:32s} → {slot} (halt {halt})")


if __name__ == "__main__":
    main()
