/**
 * Datenmodell des Prototyps.
 *
 * Ablauf: Tour (Stopps + Pakete) → externe Daten (Störungen) → Routenplan (Halte)
 * → Beladen (Pakete in Fächer) → Fahren (Halt anfahren, zu Fuß zu den Stopps).
 */

export type LatLng = { lat: number; lng: number };

export type StopTag = 'priority' | 'cooled' | 'fragile' | 'heavy';

export type StopStatus = 'open' | 'delivered' | 'failed';

/** Eine Lieferadresse. Mehrere Pakete können zum selben Stopp gehören. */
export type Stop = {
  id: string;
  /** Position in der ursprünglichen Liste (Reihenfolge, wie die Tour geliefert wurde). */
  originalIndex: number;
  recipient: string;
  address: string;
  /** Gesetzt nach Geocoding. Ohne Position kann der Stopp nicht geplant werden. */
  position?: LatLng;
  /** Lieferzeitfenster als "HH:MM". */
  timeWindow?: { from: string; to: string };
  tags: StopTag[];
  note?: string;
  status: StopStatus;
};

/** Ein Paket. `id` ist der Inhalt des Barcodes bzw. QR-Codes. */
export type Package = {
  id: string;
  stopId: string;
  /** Fach im Fahrzeug, z. B. "A2". Gesetzt beim Beladen. */
  slotId?: string;
  loadedAt?: string;
};

export type Depot = { name: string; address: string; position: LatLng };

export type Tour = {
  id: string;
  name: string;
  /** ISO-Datum der Tour, z. B. "2026-11-26". */
  date: string;
  /** Woher die Stopps kommen, z. B. "Demo-Tour" oder "CSV-Import". */
  source: string;
  depot: Depot;
  stops: Stop[];
  packages: Package[];
};

export type DisruptionKind = 'closure' | 'roadworks' | 'event' | 'weather' | 'other';

export type DisruptionGeometry =
  | { type: 'Point'; coordinates: LatLng }
  | { type: 'LineString'; coordinates: LatLng[] };

/** Eine Störung aus einer externen Datenquelle (Sperrung, Baustelle, Wetter …). */
export type Disruption = {
  id: string;
  /** Name der Datenquelle, wird in der App angezeigt (Herkunft der Daten). */
  source: string;
  /** true = simulierte Daten. Muss in der App sichtbar gekennzeichnet sein. */
  simulated: boolean;
  kind: DisruptionKind;
  title: string;
  description?: string;
  /** ISO-Zeitpunkte. */
  validFrom?: string;
  validTo?: string;
  /** Fehlt bei flächigen Störungen wie Wetter. */
  geometry?: DisruptionGeometry;
};

/** Ein Stopp, der von einer Störung betroffen ist. */
export type StopImpact = {
  stopId: string;
  disruptionId: string;
  distanceM: number;
};

/**
 * Ein Halt: hier parkt der Fahrer und läuft zu Fuß zu einem oder mehreren Stopps.
 */
export type Halt = {
  id: string;
  parking: LatLng;
  /** Stopps in Laufreihenfolge. */
  stopIds: string[];
  /** Hinweise für den Fahrer, z. B. "Parkpunkt verlegt wegen Sperrung". */
  notes: string[];
};

export type PlanKind = 'original' | 'proposed';

export type RoutePlan = {
  kind: PlanKind;
  createdAt: string;
  /** Halte in Fahrreihenfolge. */
  halts: Halt[];
  /** Wie die Reihenfolge berechnet wurde, wird in der App angezeigt. */
  method: string;
  /** Fahrstrecke in Metern (Luftlinie, bis echtes Routing angebunden ist). */
  driveDistanceM: number;
  /** Summe der Fußwege in Metern (hin und zurück, Luftlinie). */
  walkDistanceM: number;
};

/** Ein Fach im Fahrzeug. `order` 0 = am nächsten an der Tür. */
export type VehicleSlot = { id: string; label: string; order: number };
