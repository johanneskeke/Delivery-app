from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Sans", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Sans-Bold", FD + "LiberationSans-Bold.ttf"))
registerFontFamily("Sans", normal="Sans", bold="Sans-Bold", italic="Sans", boldItalic="Sans-Bold")

ACCENT = colors.HexColor("#0F5257")
ZEBRA = colors.HexColor("#F3F5F6")
GRID = colors.HexColor("#C9D0D3")
MUTED = colors.HexColor("#5C6670")

title = ParagraphStyle("t", fontName="Sans-Bold", fontSize=18, leading=22, textColor=ACCENT)
sub = ParagraphStyle("s", fontName="Sans", fontSize=9.5, leading=12, textColor=MUTED)
cell = ParagraphStyle("c", fontName="Sans", fontSize=9.5, leading=12.5)
cellb = ParagraphStyle("cb", parent=cell, fontName="Sans-Bold")
head = ParagraphStyle("h", fontName="Sans-Bold", fontSize=9.5, leading=12, textColor=colors.white)
note = ParagraphStyle("n", fontName="Sans", fontSize=9, leading=12)
small = ParagraphStyle("sm", fontName="Sans", fontSize=7.5, leading=10, textColor=MUTED)

rows = [
    ("Roadworks &amp; closures (incl. marathons, state visits, large demos)",
     "Berlin Traffic Information Centre (VIZ), Berlin Open Data", "GeoJSON, free, no key",
     "Flag affected stops, move parking spot, route around closures"),
    ("One-way streets, no-through roads, time-based access rules",
     "OpenStreetMap via Overpass Turbo", "GeoJSON, free",
     "Approach direction and stop order"),
    ("Loading zones &amp; no-stopping zones",
     "OpenStreetMap (Kreuzberg data mapped with the district office)", "GeoJSON, free",
     "Pick a legal parking spot that is valid at arrival time"),
    ("Registered demonstrations", "Berlin Police, list of announced assemblies",
     "Web page (table), free", "Short-term closures for a few hours"),
    ("Christmas markets &amp; street festivals", "berlin.de, Senate Department for Economics",
     "CSV/JSON, free", "One-day closures (2026 list not yet published)"),
    ("Weather forecast &amp; warnings", "German Weather Service (DWD) via Bright Sky",
     "JSON, free, no key", "Time buffer, reorder stops, earlier start"),
    ("Geocoding &amp; travel times", "OpenRouteService (Heidelberg University)",
     "API, free key", "Place addresses on the map, build the schedule"),
    ("Navigation", "Google Maps", "Link handoff, no key",
     "Turn-by-turn guidance per stop, drive then walk"),
]

data = [[Paragraph(h, head) for h in ("Data", "Source", "Access", "Used for")]]
for d, s, a, u in rows:
    data.append([Paragraph(d, cellb), Paragraph(s, cell), Paragraph(a, cell), Paragraph(u, cell)])

W = landscape(A4)[0] - 30 * mm
t = Table(data, colWidths=[W * 0.27, W * 0.29, W * 0.16, W * 0.28], repeatRows=1)
style = [
    ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("LINEBELOW", (0, 1), (-1, -1), 0.4, GRID),
    ("BOX", (0, 0), (-1, -1), 0.6, GRID),
]
for i in range(1, len(data)):
    if i % 2 == 0:
        style.append(("BACKGROUND", (0, i), (-1, i), ZEBRA))
t.setStyle(TableStyle(style))

story = [
    Paragraph("Data sources", title),
    Spacer(1, 3),
    Paragraph("Delivery-planning prototype · Berlin-Kreuzberg · M10 Digital Product Development · as of 19 November 2026", sub),
    Spacer(1, 10),
    t,
    Spacer(1, 10),
    Paragraph("<b>Not used:</b> live traffic (Google Maps already covers it) and speed-camera data "
              "(illegal to use while driving in Germany).", note),
    Spacer(1, 8),
    Paragraph("Attribution: VIZ data – Digitale Plattform Stadtverkehr Berlin (dl-de-by-2.0) · "
              "Weather – Deutscher Wetterdienst (CC BY 4.0) · Map data – © OpenStreetMap contributors (ODbL) · "
              "Routing – openrouteservice.org by HeiGIT.", small),
]

doc = SimpleDocTemplate("Data_sources_delivery_prototype.pdf", pagesize=landscape(A4),
                        leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=12 * mm,
                        title="Data sources – delivery-planning prototype", author="M10 project team")
doc.build(story)
print("ok")
