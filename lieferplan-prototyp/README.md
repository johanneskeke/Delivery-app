# Lieferplan-Prototyp (M10 Digital Product Development)

Prototyp für Lieferfahrer: Die App prüft die Stoppliste vor der Tour gegen externe Daten
(Sperrungen, Baustellen), schlägt eine angepasste Route vor, hilft beim Einräumen der Pakete
und übergibt jede Etappe an Google Maps: hinfahren, parken und zu Fuß zur Haustür.

## Starten

Voraussetzungen: Node.js 22 (ab 22.13) oder neuer, und auf dem Handy die App **Expo Go** in der
aktuellen Version aus dem App Store oder Play Store. Das Projekt nutzt **Expo SDK 58**.

```bash
npm install
npx expo start
```

Dann den QR-Code im Terminal scannen (iPhone: mit der Kamera-App, Android: in Expo Go).
Handy und Rechner müssen im selben WLAN sein. Klappt das nicht (z. B. im Uni-WLAN):

```bash
npx expo start --tunnel
```

Meldet Expo Go, dass das Projekt nicht zur Version passt, Expo Go im Store aktualisieren.

Tests für die Planungslogik (laufen ohne Handy): `npm test`. Typprüfung: `npm run typecheck`.

## Ablauf in der App

1. **Stopps laden:** zunächst eine Demo-Tour in Berlin-Kreuzberg (12 Stopps, 17 Pakete).
2. **Daten prüfen:** Störungen aus allen Datenquellen abrufen und betroffene Stopps markieren.
3. **Route:** Originalreihenfolge und Vorschlag vergleichen. Der Vorschlag bündelt nahe Stopps
   zu Halten (einmal parken, mehrere Stopps zu Fuß), legt Parkpunkte aus Sperrungen heraus und
   zieht Zeitfenster und Prio-Stopps nach vorn. Der Fahrer entscheidet.
4. **Beladen:** Pakete scannen (Barcode/QR), die App empfiehlt ein Fach: dasselbe Fach wie
   andere Pakete für denselben oder den benachbarten Halt, sonst nach Position in der Route.
5. **Fahren:** pro Halt „Mit Google Maps hinfahren“, dann je Stopp „Zu Fuß hin“, abhaken, weiter.

Zum Testen ohne Etiketten gibt es im Scanner „Test: nächstes Paket ohne Etikett“ und ein
Eingabefeld für den Code (z. B. `PKT-1001`).

## Aufbau

```
src/
  app/                 Screens (Expo Router, eine Datei = ein Screen)
    index.tsx          Übersicht mit den 5 Schritten
    stops.tsx          1 Stopps
    check.tsx          2 Externe Daten prüfen
    route.tsx          3 Route vergleichen und wählen
    load.tsx           4 Beladen, Fachübersicht
    scan.tsx           Kamera-Scanner mit Fach-Empfehlung
    drive.tsx          5 Fahren mit Google-Maps-Übergabe
  domain/
    types.ts           Datenmodell (Stopp, Paket, Störung, Halt, Routenplan, Fach)
    demo-tour.ts       Demo-Tour und Fahrzeug-Fächer
  services/
    disruptions.ts     Schnittstelle für Datenquellen + Demo-Quelle, Betroffenheit von Stopps
    halts.ts           Stopps zu Halten bündeln, Parkpunkte außerhalb von Sperrungen
    routing.ts         Reihenfolge der Halte, Original- und Vorschlagsplan
    loading.ts         Fach-Empfehlung beim Beladen
    navigation.ts      Google-Maps-Links (Fahren/Laufen)
  store/tour-store.ts  App-Zustand, wird auf dem Handy gespeichert
  lib/geo.ts           Entfernungen, Geometrie
  ui/                  Bausteine (Karten, Buttons, Badges) und Texte
tests/core.test.ts     Tests der Planungslogik
```

## Stand und nächste Schritte

Das Gerüst läuft komplett durch, rechnet aber noch mit Luftlinie und einer simulierten
Sperrung (in der App als „simuliert“ gekennzeichnet).

| Schritt | Inhalt | Stand |
|---|---|---|
| 1 | Gerüst, Ablauf, Demo-Tour, Scanner, Google-Maps-Übergabe | fertig |
| 2 | Echte Stopps: CSV/Excel-Import, Adressen per Geocoding in Koordinaten | offen |
| 3 | Echte Störungsdaten der Stadt (Baustellen, Sperrungen), dazu Wetter | offen |
| 4 | Echtes Straßen-Routing, das Sperrungen umfährt; Parkpunkte auf echte Straßen | offen |
| 5 | Karte mit Route, Halten und Sperrungen | offen |
| 6 | Druckbare QR-Etiketten für die Demo-Pakete | offen |
| 7 | Probelauf und Feinschliff für die Live-Demo | offen |

Neue Datenquellen implementieren `DisruptionProvider` in `src/services/disruptions.ts` und
werden in `getDisruptionProviders()` eingetragen.
