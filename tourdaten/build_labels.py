"""Druckbare Paketetiketten (A6, 4 pro A4-Seite) für die Live-Demo. Synthetische Daten, fiktiver Paketdienst."""
import json

from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfgen import canvas

FONT_DIR = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Sans", FONT_DIR + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Bold", FONT_DIR + "LiberationSans-Bold.ttf"))
registerFontFamily("Sans", normal="Sans", bold="Sans-Bold", italic="Sans", boldItalic="Sans-Bold")

ACCENT = colors.HexColor("#0F5257")
MUTED = colors.HexColor("#5C6670")
PRIO = colors.HexColor("#B4441C")

rows = {r["Sendungsnummer"]: r for r in json.load(open("tourliste.json"))["rows"]}

# Auswahl: (Sendungsnummer, Absender, Zweck in der Demo)
SENDERS = {
    "shop": "Kiezkiste Versand GmbH · Musterweg 1 · 12345 Musterstadt",
    "feinkost": "Nordlicht Feinkost-Großhandel · Musterallee 7 · 12345 Musterstadt",
    "praxis": "Praxisbedarf Süd GmbH · Musterring 3 · 12345 Musterstadt",
    "rad": "Radteile Direkt GmbH · Musterstraße 12 · 12345 Musterstadt",
    "buch": "Buchgroßhandel Mustermann · Musterplatz 2 · 12345 Musterstadt",
}
PICK = [
    ("SYN969042356", "praxis", "Prio bis 12 Uhr, Zeitfenster 8–12 → früher Halt, Fach vorn an der Tür"),
    ("SYN712828580", "shop", "Prio bis 12 Uhr; Baustelle Gneisenaustraße mit Fahrbahnverengung (VIZ) → nur Hinweis, keine Umleitung"),
    ("SYN280283719", "feinkost", "Zeitfenster 8–10 Uhr, Kühlware → einer der ersten Halte"),
    ("SYN232967813", "feinkost", "gleicher Halt wie die Feinkost-Kühlware, aber 18,5 kg → gleiches Fach, unten"),
    ("SYN464094408", "shop", "Solmsstraße zwischen Fürbringer- und Gneisenaustraße gesperrt (VIZ) → Zufahrt von der anderen Seite; Identcheck +2 Min."),
    ("SYN430548958", "shop", "ebenfalls Solmsstraße; 11,3 kg → unteres Fach; Adressfehler „12 HH 3.OG“ im Import"),
    ("SYN842112630", "rad", "Sperrgut 27,9 kg → Bodenfläche, nicht ins Regal; Zossener Str. teils gesperrt (VIZ), Ladezone erst ab 11 Uhr (OSM)"),
    ("SYN361715290", "rad", "gleicher Halt wie das Sperrgut → zeigt Regal-Fach neben Bodenfläche"),
    ("SYN312151680", "shop", "Sperrgut 29 kg; Mittenwalder Str. teils gesperrt und von der Gneisenaustraße abgehängt (VIZ) → Parkpunkt höchstens 30 m entfernt finden"),
    ("SYN682681796", "shop", "Mehrfamilienhaus Gneisenaustraße 43, Empfänger 1 → gleicher Halt, gleiches Fach"),
    ("SYN841192679", "shop", "Mehrfamilienhaus Gneisenaustraße 43, Empfänger 2 → landet im selben Fach wie Empfänger 1"),
    ("SYN851425814", "buch", "Bergmannstraße: Ladezonen mit Uhrzeiten (OSM) → App wählt eine, die zur Ankunft gilt; Laden erst ab 10 Uhr"),
    ("SYN676975510", "shop", "Graefekiez, voraussichtlich spät in der Route → Regal weiter hinten; 13,4 kg → unteres Fach"),
]
FOREIGN = {  # Paket, das nicht auf der Tour steht
    "Sendungsnummer": "SYN583920471", "Empfänger": "Mira Kessler", "Straße": "Seestraße", "Hausnr.": "10",
    "Adresszusatz": "", "PLZ": "13353", "Ort": "Berlin", "Produkt": "Paket", "Service": "",
    "Gewicht kg": 3.2, "Hinweis": "",
}
assert FOREIGN["Sendungsnummer"] not in rows

LW, LH = 105 * mm, 148.5 * mm  # A6, 4 pro A4


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def logo(size=20):
    d = Drawing(size, size)
    d.add(Rect(0, 0, size, size, rx=4, ry=4, fillColor=ACCENT, strokeColor=None))
    d.add(String(size / 2, size * 0.27, "H", fontName="Sans-Bold", fontSize=size * 0.62, fillColor=colors.white, textAnchor="middle"))
    return d


def draw_label(c, x, y, r, sender):
    pad = 6 * mm
    w, h = LW - 2 * pad, LH - 2 * pad
    left, top = x + pad, y + LH - pad
    # Rahmen
    c.setStrokeColor(colors.black); c.setLineWidth(1.2)
    c.rect(left, y + pad, w, h)
    # Kopf: Logo, Firma, Produkt
    logo().drawOn(c, left + 4, top - 26)
    c.setFont("Sans-Bold", 10); c.setFillColor(colors.black)
    c.drawString(left + 30, top - 14, "Havelbote")
    c.setFont("Sans", 6.5); c.setFillColor(MUTED)
    c.drawString(left + 30, top - 22, "Paketlogistik GmbH")
    product = r["Produkt"].upper()
    c.setFont("Sans-Bold", 16); c.setFillColor(colors.black)
    c.drawRightString(left + w - 6, top - 19, product)
    c.setStrokeColor(colors.black); c.setLineWidth(0.8)
    c.line(left, top - 32, left + w, top - 32)
    # Service-Band
    yy = top - 32
    if r["Service"]:
        band_col = PRIO if r["Service"].startswith("Prio") else colors.black
        c.setFillColor(band_col); c.rect(left, yy - 16, w, 16, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont("Sans-Bold", 10)
        c.drawCentredString(left + w / 2, yy - 11.5, r["Service"].upper())
        yy -= 16
    # Absender
    c.setFillColor(MUTED); c.setFont("Sans", 6.5)
    c.drawString(left + 6, yy - 11, "Absender: " + sender)
    # Empfänger
    lines = [r["Empfänger"]]
    if r["Adresszusatz"]:
        lines.append(r["Adresszusatz"])
    lines.append(f"{r['Straße']} {r['Hausnr.']}")
    c.setFillColor(colors.black); c.setFont("Sans", 7)
    c.drawString(left + 6, yy - 26, "Empfänger")
    ty = yy - 40
    c.setFont("Sans-Bold", 12.5)
    for ln in lines:
        c.drawString(left + 6, ty, ln); ty -= 15
    c.setFont("Sans-Bold", 16)
    plz_ort = f"{r['PLZ']} {r['Ort']}".strip() if r["PLZ"] else r["Ort"]
    c.drawString(left + 6, ty - 3, plz_ort)
    ty -= 22
    # Routing-Zeile
    c.setStrokeColor(colors.black); c.setLineWidth(0.6)
    c.line(left, ty, left + w, ty)
    c.setFont("Sans", 7.5)
    route = "Zustellbasis Tempelhof · Bezirk KRZ-61"
    if r.get("Zeitfenster von"):
        route += f" · Zustellung {r['Zeitfenster von'][:2]}–{r['Zeitfenster bis'][:2]} Uhr"
    c.drawString(left + 6, ty - 11, route)
    weight = f"{r['Gewicht kg']:.1f}".replace(".", ",") + " kg"
    c.setFont("Sans-Bold", 9); c.drawRightString(left + w - 6, ty - 11, weight)
    c.line(left, ty - 17, left + w, ty - 17)
    # Barcode
    code = r["Sendungsnummer"]
    bc = createBarcodeDrawing("Code128", value=code, barWidth=1.15, barHeight=58, humanReadable=False, quiet=True,
                              lquiet=10 * 1.15, rquiet=10 * 1.15)
    bx = left + (w - bc.width) / 2
    by = ty - 17 - 8 - bc.height
    bc.drawOn(c, bx, by)
    c.setFont("Sans-Bold", 11); c.drawCentredString(left + w / 2, by - 13, " ".join([code[:3], code[3:6], code[6:9], code[9:]]))
    # Hinweis
    if r["Hinweis"]:
        c.setFont("Sans", 7.5)
        c.drawCentredString(left + w / 2, by - 26, r["Hinweis"])
    # Feld für das Fach (optional per Hand, wie bei Fahrern üblich)
    bw, bh = 34 * mm, 15 * mm
    fx, fy = left + w - bw - 6, y + pad + 14
    c.setStrokeColor(colors.black); c.setLineWidth(0.8); c.rect(fx, fy, bw, bh)
    c.setFont("Sans", 6.5); c.setFillColor(MUTED)
    c.drawString(fx + 4, fy + bh - 9, "Fach (optional per Hand)")
    # Fuß
    c.setFillColor(MUTED); c.setFont("Sans", 5.8)
    c.drawCentredString(left + w / 2, y + pad + 5, "Synthetische Testdaten · Studienprojekt M10 · fiktiver Paketdienst · keine echte Sendung")
    c.setFillColor(colors.black)


def cut_marks(c):
    W, H = A4
    c.setStrokeColor(colors.HexColor("#BBBBBB")); c.setLineWidth(0.4); c.setDash(3, 3)
    c.line(W / 2, 0, W / 2, H); c.line(0, H / 2, W, H / 2)
    c.setDash()


def legend_page(c, items):
    W, H = A4
    c.setFont("Sans-Bold", 14); c.setFillColor(ACCENT)
    c.drawString(18 * mm, H - 20 * mm, "Demo-Pakete: Übersicht für das Team")
    c.setFont("Sans", 8.5); c.setFillColor(MUTED)
    c.drawString(18 * mm, H - 26 * mm, "Etiketten ausschneiden und auf leere Kartons kleben. Jedes Paket zeigt eine Entscheidung der App. Tour KRZ-61-07, Demo-Tag 26.11.2026.")
    st = ParagraphStyle("t", fontName="Sans", fontSize=7.6, leading=9.4)
    stb = ParagraphStyle("tb", parent=st, fontName="Sans-Bold")
    data = [[Paragraph("<b>Nr.</b>", st), Paragraph("<b>Sendung</b>", st), Paragraph("<b>Empfänger, Adresse</b>", st), Paragraph("<b>Was die App zeigen soll</b>", st)]]
    for i, (r, why) in enumerate(items, 1):
        addr = f"{esc(r['Empfänger'])}<br/>{esc(r['Straße'])} {esc(r['Hausnr.'])}, {esc(r['PLZ'])}"
        data.append([Paragraph(str(i), stb), Paragraph(r["Sendungsnummer"], st), Paragraph(addr, st), Paragraph(esc(why), st)])
    t = Table(data, colWidths=[10 * mm, 28 * mm, 52 * mm, 84 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E3EEEF")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#C9D0D3")),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    tw, th = t.wrapOn(c, W - 36 * mm, H)
    t.drawOn(c, 18 * mm, H - 32 * mm - th)
    c.setFont("Sans", 7.5); c.setFillColor(MUTED)
    c.drawString(18 * mm, 14 * mm, "Fahrzeug: Regale A–C (A an der Schiebetür), Fächer 1–4 (1 unten), Bodenfläche für Sperrgut, ein Fach für Retouren. Abholungen haben kein Etikett. Fach-Feld auf dem Etikett: optional per Hand.")
    c.drawString(18 * mm, 10 * mm, "Synthetische Testdaten, fiktiver Paketdienst „Havelbote Paketlogistik GmbH“. Absender mit „Musterstadt“ sind erfunden.")


def build(path="Demo-Paketetiketten_Tour_KRZ-61-07.pdf"):
    items = [(rows[sid], why) for sid, _, why in PICK] + [(FOREIGN, "nicht auf dieser Tour (Wedding) → Meldung „Gehört nicht zur Tour“")]
    senders = [SENDERS[s] for _, s, _ in PICK] + [SENDERS["shop"]]
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle("Demo-Paketetiketten Tour KRZ-61-07 (synthetisch)")
    c.setAuthor("Studienprojekt M10 (synthetische Daten)")
    legend_page(c, items)
    c.showPage()
    W, H = A4
    slots = [(0, H / 2), (W / 2, H / 2), (0, 0), (W / 2, 0)]
    for i, ((r, _), snd) in enumerate(zip(items, senders)):
        if i and i % 4 == 0:
            cut_marks(c); c.showPage()
        x, y = slots[i % 4]
        draw_label(c, x, y, r, snd)
    cut_marks(c); c.showPage()
    c.save()
    print("ok", path, len(items), "Etiketten")


if __name__ == "__main__":
    build()
