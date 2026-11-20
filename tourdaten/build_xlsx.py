import datetime as dt
import json

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

data = json.load(open("tourliste.json"))
rows, issues = data["rows"], data["issues"]
HEADER_FILL = PatternFill("solid", fgColor="F3F3F3")
BOLD = Font(bold=True)

wb = Workbook()

# --- Blatt 1: Sendungen (Importtabelle) ---
ws = wb.active
ws.title = "Sendungen"
cols = list(rows[0].keys())
ws.append(cols)
for r in rows:
    ws.append([r[c] if r[c] != "" else None for c in cols])
for cell in ws[1]:
    cell.fill = HEADER_FILL
    cell.font = BOLD
ws.freeze_panes = "A2"
widths = {"Stopp": 7, "Sendungsnummer": 15, "Empfänger": 28, "Straße": 22, "Hausnr.": 11, "Adresszusatz": 19,
          "PLZ": 7, "Ort": 8, "Produkt": 18, "Service": 21, "Zeitfenster von": 15, "Zeitfenster bis": 14,
          "Gewicht kg": 11, "Hinweis": 42}
for i, c in enumerate(cols, start=1):
    ws.column_dimensions[ws.cell(1, i).column_letter].width = widths[c]
gcol = cols.index("Gewicht kg") + 1
for row in ws.iter_rows(min_row=2, min_col=gcol, max_col=gcol):
    for cell in row:
        cell.number_format = "0.0"
n = len(rows) + 1

# --- Blatt 2: Tourkopf ---
tk = wb.create_sheet("Tourkopf")
head = [
    ("Tourdatum", dt.date(2026, 11, 26)),
    ("Tour", "KRZ-61-07"),
    ("Zustellbezirk", "Kreuzberg 61 (Bergmannkiez bis Graefekiez)"),
    ("Start und Ende (Depot)", "Zustellbasis Tempelhof, Eresburgstraße 24, 12103 Berlin"),
    ("Fahrzeug", "Kastenwagen, 3 Regale (A–C) mit je 4 Fächern"),
    ("Schichtbeginn", "07:30"),
    ("Geplante Abfahrt", "08:30"),
    ("Sendungen", f"=COUNTA(Sendungen!B2:B{n})"),
    ("Stopps", f"=MAX(Sendungen!A2:A{n})"),
    ("davon Abholungen (Retoure)", f'=COUNTIF(Sendungen!I2:I{n},"Abholung (Retoure)")'),
    ("Sendungen mit Zeitfenster", f"=COUNTA(Sendungen!K2:K{n})"),
    ("Gesamtgewicht kg", f"=SUM(Sendungen!M2:M{n})"),
    ("Herkunft", "Synthetische Testdaten für den M10-Prototyp. Alle Namen und Firmen erfunden, Straßen real. Kein echtes Dokument eines Paketdienstes."),
]
for k, v in head:
    tk.append([k, v])
for row in tk.iter_rows(min_col=1, max_col=1):
    for cell in row:
        cell.font = BOLD
tk["B1"].number_format = "DD.MM.YYYY"
tk["B12"].number_format = "0.0"
tk.column_dimensions["A"].width = 28
tk.column_dimensions["B"].width = 70
tk["B13"].alignment = Alignment(wrap_text=True, vertical="top")

# --- Blatt 3: Legende ---
lg = wb.create_sheet("Legende")
lg.append(["Spalten"])
lg["A1"].font = BOLD
lg.append(["Spalte", "Bedeutung"])
for c in lg[2]:
    c.fill = HEADER_FILL
    c.font = BOLD
legend = [
    ("Stopp", "Geplante Reihenfolge laut System. Gleiche Adresse = gleicher Stopp. Sortiert nach PLZ, dann Straße alphabetisch, dann Hausnummer: absichtlich nicht optimiert."),
    ("Sendungsnummer", "Inhalt des Barcodes auf dem Etikett. Präfix SYN = synthetisch."),
    ("Empfänger", "Person oder Firma. Mehrere Empfänger im selben Haus sind ein Stopp."),
    ("Straße, Hausnr., Adresszusatz, PLZ, Ort", "Lieferadresse, getrennt für bessere Treffer beim Umrechnen in Koordinaten. Adresszusatz z. B. Hinterhaus, Etage."),
    ("Produkt", "Paket, Päckchen, Sperrgut (über 20 kg oder sperrig) oder Abholung (Retoure): Paket beim Kunden abholen, nichts einzuladen."),
    ("Service", "Wunschablageort, Wunschnachbar, Alterssichtprüfung 18, Identcheck (Ausweis prüfen), Prio bis 12:00."),
    ("Zeitfenster von / bis", "Öffnungszeiten bei Firmen. Außerhalb davon ist niemand da."),
    ("Gewicht kg", "Gewicht der Sendung."),
    ("Hinweis", "Freitext: Ablageort, Nachbar, Zugang."),
]
for k, v in legend:
    lg.append([k, v])
lg.append([])
start = lg.max_row + 1
lg.append(["Absichtliche Datenfehler (zum Testen des Imports)"])
lg.cell(start, 1).font = BOLD
lg.append(["Sendungsnummer", "Fehler", "Stopp"])
for c in lg[start + 1]:
    c.fill = HEADER_FILL
    c.font = BOLD
for i in issues:
    lg.append([i["Sendungsnummer"], i["Fehler"], i["Stopp"]])
lg.column_dimensions["A"].width = 36
lg.column_dimensions["B"].width = 80
lg.column_dimensions["C"].width = 8
for row in lg.iter_rows(min_row=3, max_row=2 + len(legend), min_col=2, max_col=2):
    for cell in row:
        cell.alignment = Alignment(wrap_text=True, vertical="top")

wb.save("tourliste-kreuzberg.xlsx")
print("ok", ws.max_row, "Zeilen in Sendungen;", "Fehlerliste ab Zeile", start, "in Legende")
