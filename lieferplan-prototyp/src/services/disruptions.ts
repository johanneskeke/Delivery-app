import type { Disruption, LatLng, Stop, StopImpact } from '../domain/types';
import { distanceM, distanceToLineM } from '../lib/geo';

export type BBox = { south: number; west: number; north: number; east: number };

export type DataCheckContext = {
  area: BBox;
  /** Tag der Tour als ISO-Datum. */
  date: string;
};

/**
 * Eine externe Datenquelle für Störungen.
 * Neue Quellen (Baustellen, Sperrungen, Wetter, Verkehr) implementieren diese Schnittstelle
 * und werden in `getDisruptionProviders()` eingetragen.
 */
export interface DisruptionProvider {
  id: string;
  /** Wird in der App als Herkunft angezeigt. */
  label: string;
  fetch(ctx: DataCheckContext): Promise<Disruption[]>;
}

/** Simulierte Sperrung im Bergmannkiez, damit der Ablauf ohne echte Daten durchspielbar ist. */
export const demoProvider: DisruptionProvider = {
  id: 'demo',
  label: 'Demo-Daten (simuliert)',
  async fetch({ date }) {
    return [
      {
        id: 'demo-closure-bergmann',
        source: 'Demo-Daten (simuliert)',
        simulated: true,
        kind: 'closure',
        title: 'Vollsperrung Bergmannstraße',
        description: 'Leitungsarbeiten zwischen Zossener Straße und Marheinekeplatz, keine Zufahrt.',
        validFrom: `${date}T07:00:00+01:00`,
        validTo: `${date}T16:00:00+01:00`,
        geometry: {
          type: 'LineString',
          coordinates: [
            { lat: 52.48928, lng: 13.3936 },
            { lat: 52.48905, lng: 13.3965 },
          ],
        },
      },
    ];
  },
};

/**
 * Alle aktiven Datenquellen. Schritt 2 ergänzt hier echte Quellen
 * (z. B. Baustellen-/Sperrungsdaten der Stadt, Wetter).
 */
export function getDisruptionProviders(): DisruptionProvider[] {
  return [demoProvider];
}

export function bboxAround(points: LatLng[], marginM = 500): BBox {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const dLat = marginM / 111_320;
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const dLng = marginM / (111_320 * Math.cos((midLat * Math.PI) / 180));
  return {
    south: Math.min(...lats) - dLat,
    north: Math.max(...lats) + dLat,
    west: Math.min(...lngs) - dLng,
    east: Math.max(...lngs) + dLng,
  };
}

/** Abstand eines Punkts zur Geometrie einer Störung, Infinity ohne Geometrie. */
export function distanceToDisruptionM(p: LatLng, d: Disruption): number {
  if (!d.geometry) return Infinity;
  return d.geometry.type === 'Point'
    ? distanceM(p, d.geometry.coordinates)
    : distanceToLineM(p, d.geometry.coordinates);
}

/** Welche Stopps liegen im Wirkbereich einer Störung? */
export function findImpacts(stops: Stop[], disruptions: Disruption[], radiusM = 60): StopImpact[] {
  const impacts: StopImpact[] = [];
  for (const stop of stops) {
    if (!stop.position) continue;
    for (const d of disruptions) {
      const dist = distanceToDisruptionM(stop.position, d);
      if (dist <= radiusM) impacts.push({ stopId: stop.id, disruptionId: d.id, distanceM: Math.round(dist) });
    }
  }
  return impacts;
}

export const disruptionKindLabel: Record<Disruption['kind'], string> = {
  closure: 'Sperrung',
  roadworks: 'Baustelle',
  event: 'Veranstaltung',
  weather: 'Wetter',
  other: 'Sonstiges',
};
