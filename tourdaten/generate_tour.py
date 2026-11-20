"""Synthetische Tourliste für einen Paketzusteller in Berlin-Kreuzberg (Bergmannkiez und Umgebung).

Alle Empfänger und Firmen sind erfunden. Adressen sind echte Straßen mit plausiblen Hausnummern.
Die Stopp-Reihenfolge ist die "Systemreihenfolge": nach PLZ, dann Straße alphabetisch, dann Hausnummer.
"""
import csv
import json
import random
import re

random.seed(2611)

# (Straße, Hausnr., Adresszusatz, PLZ, Empfänger, Art, Zeitfenster von, bis, Hinweis)
# Art: P = Privat, F = Firma/Geschäft
STOPS = [
    # 10961
    ("Baerwaldstraße", "18", "", "10961", "Jana Petersen", "P", "", "", ""),
    ("Baerwaldstraße", "49", "Seitenflügel 2. OG", "10961", "Mehmet Aydın", "P", "", "", ""),
    ("Bergmannstraße", "3", "", "10961", "Lisa Brandt", "P", "", "", ""),
    ("Bergmannstraße", "9", "", "10961", "Buchhandlung Seitenweg", "F", "10:00", "19:00", "Lieferung über Ladeneingang"),
    ("Bergmannstraße", "18", "Hinterhaus 3. OG", "10961", "Tobias Wendt", "P", "", "", ""),
    ("Bergmannstraße", "26", "", "10961", "Kiezladen Unverpackt", "F", "09:00", "18:00", ""),
    ("Bergmannstraße", "34", "", "10961", "Sophie Lange", "P", "", "", ""),
    ("Bergmannstraße", "52", "", "10961", "Physiotherapie Kiezhof", "F", "08:00", "13:00", "Praxis 1. OG, Aufzug"),
    ("Bergmannstraße", "61", "", "10961", "Daniel Roth", "P", "", "", ""),
    ("Blücherstraße", "22", "", "10961", "Kita Sonnenkäfer", "F", "08:00", "15:00", "Nicht während Mittagsruhe 12–14 Uhr klingeln"),
    ("Blücherstraße", "37", "Vorderhaus 4. OG", "10961", "Anna Kowalski", "P", "", "", ""),
    ("Gneisenaustraße", "43", "", "10961", "Felix Hartmann", "P", "", "", ""),
    ("Gneisenaustraße", "58", "", "10961", "Elif Demir", "P", "", "", ""),
    ("Gneisenaustraße", "66", "", "10961", "Architekturbüro Lindner & Vogt", "F", "09:00", "17:00", ""),
    ("Marheinekeplatz", "15", "Markthalle, Stand 12", "10961", "Feinkost am Markt", "F", "08:00", "10:00", "Kühlware zuerst, Lieferung über Seiteneingang"),
    ("Mehringdamm", "57", "", "10961", "Jonas Becker", "P", "", "", ""),
    ("Mittenwalder Straße", "6", "", "10961", "Marie Schulze", "P", "", "", ""),
    ("Mittenwalder Straße", "30", "", "10961", "Getränkekiosk Mittenwalder", "F", "07:00", "22:00", ""),
    ("Nostitzstraße", "15", "", "10961", "Paul Zimmermann", "P", "", "", ""),
    ("Nostitzstraße", "41", "Gartenhaus", "10961", "Hannah Krause", "P", "", "", ""),
    ("Riemannstraße", "9", "", "10961", "Lukas Neumann", "P", "", "", ""),
    ("Riemannstraße", "21", "", "10961", "Clara Fuchs", "P", "", "", ""),
    ("Solmsstraße", "7", "", "10961", "Yusuf Şahin", "P", "", "", ""),
    ("Solmsstraße", "12", "Hinterhaus 3. OG", "10961", "Lea Wagner", "P", "", "", ""),
    ("Solmsstraße", "30", "", "10961", "Moritz Schmitt", "P", "", "", ""),
    ("Zossener Straße", "14", "", "10961", "Fahrradwerkstatt Zossi", "F", "10:00", "18:00", "Zugang über Hofeinfahrt"),
    ("Zossener Straße", "22", "", "10961", "Katharina Weber", "P", "", "", ""),
    ("Zossener Straße", "37", "", "10961", "Nina Hoffmann", "P", "", "", ""),
    ("Zossener Straße", "48", "", "10961", "Kemal Yilmaz", "P", "", "", ""),
    # 10965
    ("Arndtstraße", "12", "", "10965", "Julia Meier", "P", "", "", ""),
    ("Arndtstraße", "29", "", "10965", "Simon Keller", "P", "", "", ""),
    ("Chamissoplatz", "4", "", "10965", "Laura Fischer", "P", "", "", ""),
    ("Chamissoplatz", "9", "Seitenflügel 1. OG", "10965", "Max Richter", "P", "", "", ""),
    ("Fidicinstraße", "10", "", "10965", "Martin Schulz", "P", "", "", ""),
    ("Fidicinstraße", "33", "", "10965", "Zahnarztpraxis Dr. Albers", "F", "08:00", "12:00", ""),
    ("Friesenstraße", "6", "", "10965", "Emma Wolf", "P", "", "", ""),
    ("Friesenstraße", "16", "", "10965", "Ben Schröder", "P", "", "", ""),
    ("Heimstraße", "3", "", "10965", "Mia Hofmann", "P", "", "", ""),
    ("Heimstraße", "17", "", "10965", "Tim Bauer", "P", "", "", ""),
    ("Katzbachstraße", "18", "", "10965", "Sarah König", "P", "", "", ""),
    ("Kopischstraße", "5", "", "10965", "Andreas Weber", "P", "", "", ""),
    ("Kreuzbergstraße", "30", "", "10965", "Studio Blau Grafikdesign", "F", "09:30", "18:00", ""),
    ("Kreuzbergstraße", "62", "", "10965", "Leon Schäfer", "P", "", "", ""),
    ("Methfesselstraße", "22", "", "10965", "Ida Lorenz", "P", "", "", ""),
    ("Willibald-Alexis-Straße", "8", "", "10965", "Noah Klein", "P", "", "", ""),
    ("Willibald-Alexis-Straße", "24", "", "10965", "Greta Busch", "P", "", "", ""),
    ("Yorckstraße", "84", "", "10965", "Copyshop Yorck", "F", "09:00", "19:00", ""),
    # 10967
    ("Böckhstraße", "25", "", "10967", "Finn Werner", "P", "", "", ""),
    ("Dieffenbachstraße", "36", "", "10967", "Apotheke am Graefekiez", "F", "08:30", "18:30", "Rezeptur, bitte nicht im Hof abstellen"),
    ("Dieffenbachstraße", "59", "", "10967", "Johanna Krüger", "P", "", "", ""),
    ("Fichtestraße", "30", "", "10967", "Elias Braun", "P", "", "", ""),
    ("Graefestraße", "11", "", "10967", "Amelie Vogel", "P", "", "", ""),
    ("Graefestraße", "74", "", "10967", "Restaurant Graefes", "F", "11:00", "15:00", ""),
    ("Grimmstraße", "4", "", "10967", "Oskar Günther", "P", "", "", ""),
    ("Hasenheide", "54", "", "10967", "Fitnessstudio Hasenheide", "F", "07:00", "22:00", ""),
    ("Körtestraße", "8", "", "10967", "Frieda Berger", "P", "", "", ""),
    ("Körtestraße", "20", "", "10967", "Henry Peters", "P", "", "", ""),
    ("Urbanstraße", "112", "", "10967", "Malte Jansen", "P", "", "", ""),
]

# Mehrere Empfänger im selben Haus (eigene Sendungen, gleicher Stopp)
EXTRA_RECIPIENTS = {
    ("Gneisenaustraße", "43"): ["Ronja Albrecht", "Familie Özdemir"],
    ("Solmsstraße", "30"): ["Pia Seidel"],
    ("Chamissoplatz", "4"): ["Konstantin Haas"],
}

NEIGHBOURS = ["Fam. Krüger, EG links", "Hr. Nowak, 1. OG", "Fr. Lehmann, EG rechts", "Späti nebenan", "Fam. Arslan, 2. OG"]
DROP_PLACES = ["Garage", "Terrasse", "Mülltonnenhäuschen", "Briefkastenanlage Hof", "Vor der Wohnungstür"]


def weight(product: str) -> float:
    if product == "Sperrgut":
        return round(random.uniform(22, 31.5), 1)
    if product == "Päckchen":
        return round(random.uniform(0.2, 2.0), 1)
    return round(random.choice([random.uniform(0.5, 5), random.uniform(0.5, 5), random.uniform(5, 20)]), 1)


def tracking_number(used: set) -> str:
    while True:
        n = f"SYN{random.randint(100000000, 999999999)}"
        if n not in used:
            used.add(n)
            return n


def build():
    used: set = set()
    rows = []
    for street, nr, zusatz, plz, recipient, kind, tw_from, tw_to, note in STOPS:
        recipients = [recipient] + EXTRA_RECIPIENTS.get((street, nr), [])
        for r_idx, rec in enumerate(recipients):
            # Firmen bekommen öfter mehrere Pakete
            if kind == "F":
                n_parcels = random.choice([1, 2, 2, 3, 4])
            else:
                n_parcels = random.choice([1, 1, 1, 1, 2])
            for _ in range(n_parcels):
                product = "Päckchen" if random.random() < 0.15 else "Paket"
                service, hint = "", note if r_idx == 0 else ""
                if kind == "P":
                    roll = random.random()
                    if roll < 0.08:
                        service, hint = "Wunschablageort", f"Ablage: {random.choice(DROP_PLACES)}"
                    elif roll < 0.15:
                        service, hint = "Wunschnachbar", f"Nachbar: {random.choice(NEIGHBOURS)}"
                    elif roll < 0.19:
                        service = "Alterssichtprüfung 18"
                    elif roll < 0.22:
                        service = "Identcheck"
                rows.append({
                    "Stopp": 0,
                    "Sendungsnummer": tracking_number(used),
                    "Empfänger": rec,
                    "Straße": street,
                    "Hausnr.": nr,
                    "Adresszusatz": zusatz,
                    "PLZ": plz,
                    "Ort": "Berlin",
                    "Produkt": product,
                    "Service": service,
                    "Zeitfenster von": tw_from,
                    "Zeitfenster bis": tw_to,
                    "Gewicht kg": 0.0,
                    "Hinweis": hint,
                })

    # Gezielte Sonderfälle
    def first(street, nr):
        return next(r for r in rows if r["Straße"] == street and r["Hausnr."] == nr)

    for street, nr in [("Zossener Straße", "14"), ("Mittenwalder Straße", "30")]:
        first(street, nr)["Produkt"] = "Sperrgut"
    for street, nr in [("Fidicinstraße", "33"), ("Dieffenbachstraße", "36"), ("Bergmannstraße", "52"), ("Gneisenaustraße", "66")]:
        r = first(street, nr)
        r["Service"] = "Prio bis 12:00" if not r["Service"] else r["Service"]
    # Abholungen (Retouren): nichts einzuladen, aber ein Stopp
    for street, nr, rec in [("Riemannstraße", "21", "Clara Fuchs"), ("Graefestraße", "11", "Amelie Vogel"), ("Arndtstraße", "29", "Simon Keller")]:
        rows.append({
            "Stopp": 0, "Sendungsnummer": tracking_number(used), "Empfänger": rec, "Straße": street, "Hausnr.": nr,
            "Adresszusatz": "", "PLZ": "10961" if street == "Riemannstraße" else ("10967" if street == "Graefestraße" else "10965"),
            "Ort": "Berlin", "Produkt": "Abholung (Retoure)", "Service": "", "Zeitfenster von": "", "Zeitfenster bis": "",
            "Gewicht kg": 0.0, "Hinweis": "Retourenlabel liegt beim Kunden",
        })

    for r in rows:
        r["Gewicht kg"] = 0.0 if r["Produkt"].startswith("Abholung") else weight(r["Produkt"])

    # Systemreihenfolge: PLZ, Straße alphabetisch, Hausnummer
    def key(r):
        return (r["PLZ"], r["Straße"], int(re.match(r"\d+", r["Hausnr."]).group()), r["Empfänger"])

    rows.sort(key=key)
    stop_no, last_addr = 0, None
    for r in rows:
        addr = (r["Straße"], r["Hausnr."], r["PLZ"])
        if addr != last_addr:
            stop_no += 1
            last_addr = addr
        r["Stopp"] = stop_no

    # Absichtliche Datenfehler, wie sie in echten Listen vorkommen (nach der Nummerierung, damit Stopps stimmen)
    issues = []

    def mutate(street, nr, field, value, why):
        r = next(r for r in rows if r["Straße"] == street and r["Hausnr."] == nr)
        r[field] = value
        issues.append({"Sendungsnummer": r["Sendungsnummer"], "Stopp": r["Stopp"], "Fehler": why})

    mutate("Zossener Straße", "37", "Straße", "Zossner Str.", "Tippfehler im Straßennamen")
    mutate("Bergmannstraße", "61", "PLZ", "", "PLZ fehlt")
    mutate("Bergmannstraße", "61", "Straße", "Bergmannstr.", "Straße abgekürzt")
    mutate("Körtestraße", "8", "PLZ", "10961", "falsche PLZ (richtig: 10967)")
    sm = next(r for r in rows if r["Straße"] == "Solmsstraße" and r["Hausnr."] == "12")
    sm["Hausnr."], sm["Adresszusatz"] = "12 HH 3.OG", ""
    issues.append({"Sendungsnummer": sm["Sendungsnummer"], "Stopp": sm["Stopp"], "Fehler": "Adresszusatz in der Hausnummer"})

    return rows, issues


if __name__ == "__main__":
    rows, issues = build()
    fields = list(rows[0].keys())
    with open("tourliste.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, delimiter=";")
        w.writeheader()
        w.writerows(rows)
    json.dump({"rows": rows, "issues": issues}, open("tourliste.json", "w"), ensure_ascii=False, indent=1)
    stops = len({r["Stopp"] for r in rows})
    by_product = {}
    for r in rows:
        by_product[r["Produkt"]] = by_product.get(r["Produkt"], 0) + 1
    services = {}
    for r in rows:
        if r["Service"]:
            services[r["Service"]] = services.get(r["Service"], 0) + 1
    print(f"{len(rows)} Sendungen, {stops} Stopps")
    print("Produkte:", by_product)
    print("Services:", services)
    print("Mit Zeitfenster:", sum(1 for r in rows if r["Zeitfenster von"]), "Sendungen")
    print("Fehler:", issues)
    print("Gesamtgewicht:", round(sum(r["Gewicht kg"] for r in rows), 1), "kg")
