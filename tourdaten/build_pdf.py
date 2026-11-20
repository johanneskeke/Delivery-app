"""Zustellliste als PDF: fiktiver Paketdienst, Daten aus tourliste.json (synthetisch)."""
import json

from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, KeepTogether, PageBreak

FONT_DIR = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Sans", FONT_DIR + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Bold", FONT_DIR + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Narrow", FONT_DIR + "LiberationSansNarrow-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Narrow-Bold", FONT_DIR + "LiberationSansNarrow-Bold.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Sans", normal="Sans", bold="Sans-Bold", italic="Sans", boldItalic="Sans-Bold")
registerFontFamily("Narrow", normal="Narrow", bold="Narrow-Bold", italic="Narrow", boldItalic="Narrow-Bold")

ACCENT = colors.HexColor("#0F5257")
ACCENT_LIGHT = colors.HexColor("#E3EEEF")
ZEBRA = colors.HexColor("#F3F5F6")
GRID = colors.HexColor("#C9D0D3")
MUTED = colors.HexColor("#5C6670")
PRIO = colors.HexColor("#B4441C")

COMPANY = "Havelbote Paketlogistik GmbH"
TOUR = "KRZ-61-07"
DATE = "26.11.2026"
DEPOT = "Zustellbasis Tempelhof · Eresburgstraße 24 · 12103 Berlin"
DISCLAIMER = ("Synthetische Beispieldaten für ein Studienprojekt (M10 Digital Product Development), angelehnt an ein "
              "Interview mit einem Paketzusteller. Havelbote Paketlogistik GmbH ist ein fiktives Unternehmen, alle "
              "Empfänger sind erfunden.")

PAGE = landscape(A4)
MARGIN = 14 * mm

data = json.load(open("tourliste.json"))
rows = data["rows"]

st_cell = ParagraphStyle("cell", fontName="Narrow", fontSize=7.6, leading=9.2, textColor=colors.black)
st_cell_b = ParagraphStyle("cellb", parent=st_cell, fontName="Narrow-Bold")
st_cell_muted = ParagraphStyle("cellm", parent=st_cell, textColor=MUTED, fontSize=7, leading=8.4)
st_head = ParagraphStyle("head", fontName="Narrow-Bold", fontSize=7.6, leading=9, textColor=colors.white)
st_small = ParagraphStyle("small", fontName="Sans", fontSize=7.5, leading=9.5, textColor=MUTED)
st_label = ParagraphStyle("label", fontName="Sans", fontSize=7, leading=8.5, textColor=MUTED)
st_value = ParagraphStyle("value", fontName="Sans-Bold", fontSize=9.5, leading=11.5)
st_h2 = ParagraphStyle("h2", fontName="Sans-Bold", fontSize=10, leading=13, textColor=ACCENT, spaceBefore=4, spaceAfter=4)
st_body = ParagraphStyle("body", fontName="Sans", fontSize=8, leading=10.5)


def esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def logo(size=26) -> Drawing:
    d = Drawing(size, size)
    d.add(Rect(0, 0, size, size, rx=5, ry=5, fillColor=ACCENT, strokeColor=None))
    d.add(String(size / 2, size * 0.27, "H", fontName="Sans-Bold", fontSize=size * 0.62,
                 fillColor=colors.white, textAnchor="middle"))
    return d


def checkbox(size=8) -> Drawing:
    d = Drawing(size + 2, size + 2)
    d.add(Rect(1, 1, size, size, fillColor=colors.white, strokeColor=colors.black, strokeWidth=0.6))
    return d


def barcode(value: str, bar_w=0.72, bar_h=15):
    return createBarcodeDrawing("Code128", value=value, barWidth=bar_w, barHeight=bar_h, humanReadable=False,
                                quiet=True, lquiet=6 * bar_w, rquiet=6 * bar_w)


# ---------- Kopfbereich ----------
def header_block():
    stops = len({r["Stopp"] for r in rows})
    pickups = sum(1 for r in rows if r["Produkt"].startswith("Abholung"))
    with_tw = sum(1 for r in rows if r["Zeitfenster von"])
    prio = sum(1 for r in rows if r["Service"] == "Prio bis 12:00")
    weight = sum(r["Gewicht kg"] for r in rows)

    company = Table(
        [[logo(30), [Paragraph(COMPANY, ParagraphStyle("co", fontName="Sans-Bold", fontSize=13, leading=16)),
                     Paragraph(DEPOT, st_small)]]],
        colWidths=[38, 330], style=[("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0)],
    )
    title = Table(
        [[Paragraph("<font name='Sans-Bold' size='15'>Zustellliste</font>",
                    ParagraphStyle("t", alignment=TA_RIGHT, leading=18))],
         [Paragraph(f"Tour <b>{TOUR}</b> · {DATE}", ParagraphStyle("t2", parent=st_body, alignment=TA_RIGHT))],
         [barcode(TOUR, bar_w=0.8, bar_h=16)]],
        colWidths=[200],
        style=[("ALIGN", (0, 0), (-1, -1), "RIGHT"), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
               ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)],
    )
    top = Table([[company, title]], colWidths=[PAGE[0] - 2 * MARGIN - 200, 200],
                style=[("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                       ("RIGHTPADDING", (0, 0), (-1, -1), 0)])

    def kv(label, value):
        return [Paragraph(label, st_label), Paragraph(value, st_value)]

    info = Table(
        [[kv("Tourdatum", DATE), kv("Zustellbezirk", "Kreuzberg 61 (Bergmann- bis Graefekiez)"),
          kv("Fahrzeug", "Nr. 0417 · Regale A–C"), kv("Schichtbeginn / Abfahrt", "07:30 / 08:30"),
          kv("Fahrer/in", "_______________________")]],
        colWidths=[90, 200, 175, 120, 185],
        style=[("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 6),
               ("BACKGROUND", (0, 0), (-1, -1), ACCENT_LIGHT), ("TOPPADDING", (0, 0), (-1, -1), 5),
               ("BOTTOMPADDING", (0, 0), (-1, -1), 6)],
    )
    w_str = f"{weight:.1f}".replace(".", ",") + " kg"
    kpis = Table(
        [[kv("Sendungen", str(len(rows))), kv("Stopps", str(stops)), kv("Abholungen (Retoure)", str(pickups)),
          kv("mit Zeitfenster", str(with_tw)), kv("Prio bis 12:00", str(prio)), kv("Gesamtgewicht", w_str)]],
        colWidths=[90, 80, 120, 110, 100, 270],
        style=[("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 6),
               ("LINEBELOW", (0, 0), (-1, -1), 0.6, GRID), ("TOPPADDING", (0, 0), (-1, -1), 4),
               ("BOTTOMPADDING", (0, 0), (-1, -1), 5)],
    )
    note = Paragraph(
        "Reihenfolge laut Tourenplanung. Zeitfenster und Prio-Sendungen beachten. Nicht zustellbare Sendungen "
        "mit Grund in der Spalte „Zugestellt“ vermerken und bei Tourende in der Zustellbasis abgeben.", st_small)
    return [top, Spacer(1, 6), info, kpis, Spacer(1, 4), note, Spacer(1, 6)]


# ---------- Sendungstabelle ----------
COLS = [("Stopp", 30), ("Sendung", 118), ("Empfänger", 104), ("Lieferadresse", 145), ("Produkt / Service", 98),
        ("Zeitfenster", 50), ("kg", 28), ("Hinweis", 135), ("Zugestellt", 62)]


def address(r):
    line1 = f"{esc(r['Straße'])} {esc(r['Hausnr.'])}".strip()
    line2 = f"{esc(r['PLZ'])} {esc(r['Ort'])}".strip()
    extra = f"<br/><font color='#5C6670'>{esc(r['Adresszusatz'])}</font>" if r["Adresszusatz"] else ""
    return Paragraph(f"{line1}{extra}<br/>{line2}", st_cell)


def product(r):
    p = esc(r["Produkt"])
    if r["Produkt"] in ("Sperrgut",) or r["Produkt"].startswith("Abholung"):
        p = f"<b>{p}</b>"
    s = r["Service"]
    if s == "Prio bis 12:00":
        s = f"<font color='#B4441C'><b>{esc(s)}</b></font>"
    elif s:
        s = f"<b>{esc(s)}</b>"
    return Paragraph(p + (f"<br/>{s}" if s else ""), st_cell)


def table_block():
    head = [Paragraph(h, st_head) for h, _ in COLS]
    body, styles = [], []
    for i, r in enumerate(rows, start=1):
        tw = f"{r['Zeitfenster von']}–{r['Zeitfenster bis']}" if r["Zeitfenster von"] else ""
        kg = "–" if r["Produkt"].startswith("Abholung") else f"{r['Gewicht kg']:.1f}".replace(".", ",")
        body.append([
            Paragraph(f"<b>{r['Stopp']}</b>", ParagraphStyle("s", parent=st_cell, fontSize=9, leading=10)),
            [barcode(r["Sendungsnummer"]), Spacer(1, 1.5), Paragraph(r["Sendungsnummer"], st_cell_muted)],
            Paragraph(esc(r["Empfänger"]), st_cell_b),
            address(r),
            product(r),
            Paragraph(f"<b>{tw}</b>" if tw else "", st_cell),
            Paragraph(kg, ParagraphStyle("kg", parent=st_cell, alignment=TA_RIGHT)),
            Paragraph(esc(r["Hinweis"]), st_cell),
            checkbox(),
        ])
        if r["Stopp"] % 2 == 0:
            styles.append(("BACKGROUND", (0, i), (-1, i), ZEBRA))
        # Linie zwischen Stopps kräftiger als innerhalb eines Stopps
        if i < len(rows) and rows[i]["Stopp"] != r["Stopp"]:
            styles.append(("LINEBELOW", (0, i), (-1, i), 0.7, GRID))
        else:
            styles.append(("LINEBELOW", (0, i), (-1, i), 0.25, GRID))

    t = Table([head] + body, colWidths=[w for _, w in COLS], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.6, GRID),
    ] + styles))
    return [t]


# ---------- Schlussseite ----------
def closing_block():
    legend = [
        ("Sperrgut", "Über 20 kg oder sperrig, mit Sackkarre zustellen."),
        ("Abholung (Retoure)", "Paket beim Kunden abholen, Retourenlabel liegt dort vor. Nichts einzuladen."),
        ("Wunschablageort", "Ablage am angegebenen Ort, Foto als Nachweis."),
        ("Wunschnachbar", "Zustellung an den angegebenen Nachbarn, falls Empfänger nicht da."),
        ("Alterssichtprüfung 18", "Nur an volljährige Personen, Alter im Zweifel per Ausweis prüfen."),
        ("Identcheck", "Nur an den Empfänger persönlich, Ausweis prüfen und Nummer erfassen."),
        ("Prio bis 12:00", "Zustellung bis 12:00 Uhr."),
        ("Zeitfenster", "Öffnungszeiten des Empfängers. Außerhalb ist niemand vor Ort."),
    ]
    lt = Table([[Paragraph(f"<b>{esc(k)}</b>", st_body), Paragraph(esc(v), st_body)] for k, v in legend],
               colWidths=[120, 420], hAlign="LEFT",
               style=[("LINEBELOW", (0, 0), (-1, -1), 0.25, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                      ("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 3),
                      ("BOTTOMPADDING", (0, 0), (-1, -1), 3)])

    def line(label):
        return [Paragraph(label, st_label), Paragraph("_" * 34, st_body)]

    sig = Table(
        [[Paragraph("<b>Übernahme in der Zustellbasis</b>", st_body), Paragraph("<b>Tourabschluss</b>", st_body)],
         [line("Sendungen vollständig übernommen, Uhrzeit"), line("Zurück in der Zustellbasis, Uhrzeit")],
         [line("Unterschrift Fahrer/in"), line("Rückläufer (Stück) / Abholungen (Stück)")],
         [line("Unterschrift Disposition"), line("Unterschrift Fahrer/in")]],
        colWidths=[370, 370], hAlign="LEFT",
        style=[("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
               ("TOPPADDING", (0, 0), (-1, -1), 6)])
    return [PageBreak(), Paragraph("Legende Produkte und Services", st_h2), lt, Spacer(1, 24), sig]


# ---------- Seitenrahmen mit "Seite x von y" ----------
class NumberedCanvas(rl_canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved = []

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved)
        for state in self._saved:
            self.__dict__.update(state)
            self._footer(total)
            super().showPage()
        super().save()

    def _footer(self, total):
        w, _ = PAGE
        y = 9 * mm
        self.setStrokeColor(GRID)
        self.setLineWidth(0.5)
        self.line(MARGIN, y + 9, w - MARGIN, y + 9)
        self.setFont("Sans", 7)
        self.setFillColor(MUTED)
        self.drawString(MARGIN, y, f"{COMPANY} · Tour {TOUR} · {DATE} · Druck 26.11.2026, 06:52")
        self.drawRightString(w - MARGIN, y, f"Seite {self._pageNumber} von {total}")
        self.setFont("Sans", 6.5)
        self.drawString(MARGIN, y - 9, DISCLAIMER)
        if self._pageNumber > 1:
            self.setFont("Sans-Bold", 8)
            self.setFillColor(ACCENT)
            self.drawString(MARGIN, PAGE[1] - 9 * mm, f"Zustellliste · Tour {TOUR} · {DATE}")
            self.setFont("Sans", 8)
            self.setFillColor(MUTED)
            self.drawRightString(w - MARGIN, PAGE[1] - 9 * mm, COMPANY)


def build(path="Zustellliste_Tour_KRZ-61-07.pdf"):
    doc = SimpleDocTemplate(path, pagesize=PAGE, leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=13 * mm, bottomMargin=19 * mm,
                            title=f"Zustellliste Tour {TOUR} ({DATE}), synthetische Beispieldaten",
                            author="Studienprojekt M10 (synthetische Daten)",
                            subject="Fiktive Zustellliste eines erfundenen Paketdienstes")
    story = header_block() + table_block() + closing_block()
    doc.build(story, canvasmaker=NumberedCanvas)
    print("ok", path)


if __name__ == "__main__":
    build()
