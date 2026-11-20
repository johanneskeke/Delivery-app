# Probelauf Schritt 3b – Ergebnis

Netz: /tmp/bundle/M10_lieferplan_workspace/data_netz/netz.geojson. Tourtag Do 26.11.2026, Wetter laut DWD trocken (kein Aufschlag).

| Variante | Halte | Fahrzeit | Fußweg | Warten | Verspätung | zurück im Depot |
|---|---|---|---|---|---|---|
| Vorher: Liste, wie sie kommt | 58 | 225 Min. | 43 Min. | 0 Min. | 780 Min. (4 Stopps) | 19:39 |
| Nur nötige Änderungen | 45 | 200 Min. | 91 Min. | 12 Min. | 0 Min. (0 Stopps) | 18:51 |
| Ganz neu planen | 34 | 68 Min. | 104 Min. | 0 Min. | 0 Min. (0 Stopps) | 16:19 |

## Konflikte im Vorher-Plan
- 1 Baerwaldstraße 18: nächster Halteplatz an der Straße liegt im Halteverbot (OpenStreetMap)
- 23 Solmsstraße 7: Halteplatz vor der Tür liegt in einer Sperrung (VIZ: Solmsstraße zwischen Fürbringerstraße und Gneisenaustraße)
- 24 Solmsstraße 12: Halteplatz vor der Tür liegt in einer Sperrung (VIZ: Solmsstraße zwischen Fürbringerstraße und Gneisenaustraße)
- 26 Zossener Straße 14: Halteplatz vor der Tür liegt in einer Sperrung (VIZ: Zossener Straße zwischen Gneisenaustraße und Fürbringerstraße)
- 37 Friesenstraße 16: nächster Halteplatz an der Straße liegt im Halteverbot (OpenStreetMap)
- 15 Marheinekeplatz 15: 59 Min. zu spät (Zeitfenster/Prio)
- 35 Fidicinstraße 33: 178 Min. zu spät (Zeitfenster/Prio)
- 49 Dieffenbachstraße 36: 343 Min. zu spät (Zeitfenster/Prio)
- 53 Graefestraße 74: 200 Min. zu spät (Zeitfenster/Prio)
- 4 Bergmannstraße 9: 59 Min. vor Beginn des Zeitfensters da (Empfänger noch nicht erreichbar)

## Entscheidungen „nur nötige Änderungen“ (mit Grund und Quelle)
| Art | Stopp(s) | Was und warum | Quelle |
|---|---|---|---|
| Halt vorgezogen | 49 Dieffenbachstraße 36 | Prio bis 12:00: Ankunft vorher 17:43, jetzt 08:30 | Tourliste |
| Halte bündeln | 34 Fidicinstraße 10, 35 Fidicinstraße 33 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 44 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Halt vorgezogen | 34 Fidicinstraße 10, 35 Fidicinstraße 33 | Prio bis 12:00: Ankunft vorher 14:46, jetzt 08:49 | Tourliste |
| Parken in Ladezone | 15 Marheinekeplatz 15 | Parkfläche bei Marheinekeplatz, gültig 06:00–15:00, Ankunft 09:04 | OpenStreetMap (parking:*:restriction) |
| Halt vorgezogen | 15 Marheinekeplatz 15 | Zeitfenster bis 10:00: Ankunft vorher 10:59, jetzt 09:05 | Tourliste |
| Fußweg über Grenze | 1 Baerwaldstraße 18 | Fußweg 205 m, Grenze 150 m; Parkpunkt Gneisenaustraße (näher geht nicht) | Regel D |
| Parkpunkt verlegt | 1 Baerwaldstraße 18 | nächster Halteplatz an der Straße liegt im Halteverbot; neu: Straßenrand Gneisenaustraße | OpenStreetMap |
| Parken in Ladezone | 2 Baerwaldstraße 49 | Parkfläche bei Blücherstraße, gültig 06:00–20:00, Ankunft 09:26 | OpenStreetMap (parking:*:restriction) |
| Halte bündeln | 3 Bergmannstraße 3, 4 Bergmannstraße 9 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 109 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Parken in Ladezone | 3 Bergmannstraße 3, 4 Bergmannstraße 9 | Parkfläche bei Bergmannstraße, gültig 09:00–22:00, Ankunft 09:44 | OpenStreetMap (parking:*:restriction) |
| Parken in Ladezone | 5 Bergmannstraße 18 | Parkfläche bei Bergmannstraße, gültig 06:00–22:00, Ankunft 10:09 | OpenStreetMap (parking:*:restriction) |
| Parken in Ladezone | 6 Bergmannstraße 26 | Friesenstraße, gültig 06:00–20:00, Ankunft 10:16 | OpenStreetMap (parking:*:restriction) |
| Ladezone zur Ankunft nicht gültig | 7 Bergmannstraße 34 | Schleiermacherstraße gilt 11:00–23:00, Ankunft 10:24 → stattdessen Straßenrand Bergmannstraße | OpenStreetMap |
| Adresse bereinigt | 9 Bergmannstraße 61 | Straße korrigiert: Bergmannstr. → Bergmannstraße | Import (Schritt 1) |
| Halte bündeln | 52 Graefestraße 11, 53 Graefestraße 74 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 146 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Parken in Ladezone | 52 Graefestraße 11, 53 Graefestraße 74 | Parkfläche bei Graefestraße, gültig ganztägig, Ankunft 10:53 | OpenStreetMap (parking:*:restriction) |
| Halt vorgezogen | 52 Graefestraße 11, 53 Graefestraße 74 | Zeitfenster bis 15:00: Ankunft vorher 18:12, jetzt 10:54 | Tourliste |
| Parken in Ladezone | 12 Gneisenaustraße 43 | Gneisenaustraße, gültig 09:00–19:00, Ankunft 11:34 | OpenStreetMap (parking:*:restriction) |
| Hinweis | 12 Gneisenaustraße 43 | Gneisenaustraße: Leitungsarbeiten, Fahrbahnverengung und -verschwenkung | VIZ Berlin |
| Parken in Ladezone | 13 Gneisenaustraße 58 | Gneisenaustraße, gültig 10:00–18:00, Ankunft 11:45 | OpenStreetMap (parking:*:restriction) |
| Hinweis | 13 Gneisenaustraße 58 | Gneisenaustraße: Leitungsarbeiten, Fahrbahnverengung und -verschwenkung | VIZ Berlin |
| Hinweis | 14 Gneisenaustraße 66 | Gneisenaustraße: Leitungsarbeiten, Fahrbahnverengung und -verschwenkung | VIZ Berlin |
| Parken in Ladezone | 16 Mehringdamm 57 | Mehringdamm, gültig 08:00–16:00, Ankunft 12:09 | OpenStreetMap (parking:*:restriction) |
| Parken in Ladezone | 17 Mittenwalder Straße 6 | Mittenwalder Straße, gültig 06:00–22:00, Ankunft 12:20 | OpenStreetMap (parking:*:restriction) |
| Halte bündeln | 19 Nostitzstraße 15, 20 Nostitzstraße 41 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 91 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Halte bündeln | 21 Riemannstraße 9, 22 Riemannstraße 21 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 122 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Halte bündeln | 23 Solmsstraße 7, 24 Solmsstraße 12 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 107 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Parkpunkt verlegt | 23 Solmsstraße 7 | Halteplatz vor der Tür liegt in einer Sperrung; neu: Straßenrand Fürbringerstraße | VIZ: Solmsstraße zwischen Fürbringerstraße und Gneisenaustraße |
| Parkpunkt verlegt | 24 Solmsstraße 12 | Halteplatz vor der Tür liegt in einer Sperrung; neu: Straßenrand Fürbringerstraße | VIZ: Solmsstraße zwischen Fürbringerstraße und Gneisenaustraße |
| Adresse bereinigt | 24 Solmsstraße 12 | Hausnummer bereinigt: 12 HH 3.OG → 12 | Import (Schritt 1) |
| Parken in Ladezone | 25 Solmsstraße 30 | Parkfläche bei Bergmannstraße, gültig 06:00–22:00, Ankunft 13:47 | OpenStreetMap (parking:*:restriction) |
| Fußweg über Grenze | 26 Zossener Straße 14 | Fußweg 32 m, Grenze 30 m; Parkpunkt Gneisenaustraße (näher geht nicht) | Regel D |
| Parkpunkt verlegt | 26 Zossener Straße 14 | Halteplatz vor der Tür liegt in einer Sperrung; neu: Straßenrand Gneisenaustraße | VIZ: Zossener Straße zwischen Gneisenaustraße und Fürbringerstraße |
| Halte bündeln | 27 Zossener Straße 22, 28 Zossener Straße 37 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 104 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Parken in Ladezone | 27 Zossener Straße 22, 28 Zossener Straße 37 | Riemannstraße, gültig 08:00–15:00, Ankunft 14:07 | OpenStreetMap (parking:*:restriction) |
| Adresse bereinigt | 28 Zossener Straße 37 | Straße korrigiert: Zossner Str. → Zossener Straße | Import (Schritt 1) |
| Halte bündeln | 30 Arndtstraße 12, 31 Arndtstraße 29, 32 Chamissoplatz 4, 33 Chamissoplatz 9 | ein Parkpunkt für 4 Stopps, längster Fußweg ca. 142 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Parken in Ladezone | 36 Friesenstraße 6 | Friesenstraße, gültig 08:00–19:00, Ankunft 15:06 | OpenStreetMap (parking:*:restriction) |
| Parkpunkt verlegt | 37 Friesenstraße 16 | nächster Halteplatz an der Straße liegt im Halteverbot; neu: Straßenrand Jüterboger Straße | OpenStreetMap |
| Halte bündeln | 38 Heimstraße 3, 39 Heimstraße 17 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 87 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Ladezone zur Ankunft nicht gültig | 42 Kreuzbergstraße 30 | Parkfläche bei Kreuzbergstraße gilt 08:00–15:00, Ankunft 16:06 → stattdessen Straßenrand Kreuzbergstraße | OpenStreetMap |
| Parken in Ladezone | 43 Kreuzbergstraße 62 | Parkfläche bei Kreuzbergstraße, gültig 11:00–17:00, Ankunft 16:16 | OpenStreetMap (parking:*:restriction) |
| Halte bündeln | 45 Willibald-Alexis-Straße 8, 46 Willibald-Alexis-Straße 24 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 133 m | Regel D (bis 150 m, höchstens 4 Stopps) |
| Parken in Ladezone | 47 Yorckstraße 84 | Yorckstraße, gültig 07:00–17:00, Ankunft 16:57 | OpenStreetMap (parking:*:restriction) |
| Parken in Ladezone | 48 Böckhstraße 25 | Kottbusser Damm, gültig ganztägig, Ankunft 17:14 | OpenStreetMap (parking:*:restriction) |
| Parken in Ladezone | 54 Grimmstraße 4 | Grimmstraße, gültig ganztägig, Ankunft 17:44 | OpenStreetMap (parking:*:restriction) |
| Parken in Ladezone | 55 Hasenheide 54 | Hasenheide, gültig 06:00–22:00, Ankunft 17:57 | OpenStreetMap (parking:*:restriction) |
| Halte bündeln | 56 Körtestraße 8, 57 Körtestraße 20 | ein Parkpunkt für 2 Stopps, längster Fußweg ca. 116 m | Regel D (bis 150 m, höchstens 4 Stopps) |

## Annahmen
- tempo_kmh: {'primary': 22, 'primary_link': 22, 'secondary': 22, 'secondary_link': 22, 'tertiary': 20, 'tertiary_link': 20, 'unclassified': 16, 'residential': 16, 'living_street': 7}
- gehen_kmh: 4.5
- umwegfaktor_fussweg: 1.25
- suche_ladezone_min: 1.0
- suche_sonstiger_halteplatz_min: 3.0
- vor_ort_umplanen_min: 3.0
- abfahrt_depot: 08:00
- depot_bis_tourgebiet_min: 12.0
- halt_max_fussweg_m: 150
- halt_max_stopps: 4
- sperrgut_max_fussweg_m: 30
- stoppdauer: 2 Min. + 1 Min. je Sendung, Sperrgut +3, Ident/Alterssicht +2
- fussweg_muster: je Stopp hin und zurück zum Fahrzeug
- abbiegeverbote: nicht berücksichtigt