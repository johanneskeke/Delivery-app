import type { Disruption, Halt, LatLng, Stop } from '../domain/types';
import { centroid, distanceM } from '../lib/geo';
import { distanceToDisruptionM } from './disruptions';

export type HaltOptions = {
  /** Maximaler Fußweg vom Parkpunkt zu einem Stopp (Luftlinie). */
  maxWalkM: number;
  /** Maximale Anzahl Stopps pro Halt. */
  maxStopsPerHalt: number;
  /** Parkpunkte näher als dieser Abstand an einer Sperrung gelten als blockiert. */
  closureBufferM: number;
};

export const defaultHaltOptions: HaltOptions = { maxWalkM: 150, maxStopsPerHalt: 4, closureBufferM: 40 };

type Cluster = { stops: Stop[]; center: LatLng };

const positionOf = (s: Stop) => s.position as LatLng;

function fits(stops: Stop[], opts: HaltOptions): Cluster | null {
  if (stops.length > opts.maxStopsPerHalt) return null;
  const center = centroid(stops.map(positionOf));
  return stops.every((s) => distanceM(center, positionOf(s)) <= opts.maxWalkM) ? { stops, center } : null;
}

/**
 * Fasst nahe beieinanderliegende Stopps zu Halten zusammen (agglomeratives Clustering):
 * Es werden immer die zwei nächstgelegenen Gruppen verschmolzen, solange jeder Stopp
 * vom gemeinsamen Mittelpunkt aus zu Fuß erreichbar bleibt.
 */
export function clusterStops(stops: Stop[], opts: HaltOptions = defaultHaltOptions): Cluster[] {
  let clusters: Cluster[] = stops
    .filter((s) => s.position)
    .map((s) => ({ stops: [s], center: positionOf(s) }));

  for (;;) {
    let best: { i: number; j: number; merged: Cluster; d: number } | null = null;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = distanceM(clusters[i].center, clusters[j].center);
        if (d > 2 * opts.maxWalkM || (best && d >= best.d)) continue;
        const merged = fits([...clusters[i].stops, ...clusters[j].stops], opts);
        if (merged) best = { i, j, merged, d };
      }
    }
    if (!best) break;
    const { i, j, merged } = best;
    clusters = clusters.filter((_, k) => k !== i && k !== j);
    clusters.push(merged);
  }
  return clusters;
}

/** Kürzeste Laufreihenfolge ab dem Parkpunkt (nächster Nachbar, reicht für ≤ 4 Stopps). */
function walkingOrder(parking: LatLng, stops: Stop[]): Stop[] {
  const rest = [...stops];
  const ordered: Stop[] = [];
  let here = parking;
  while (rest.length) {
    rest.sort((a, b) => distanceM(here, positionOf(a)) - distanceM(here, positionOf(b)));
    const next = rest.shift() as Stop;
    ordered.push(next);
    here = positionOf(next);
  }
  return ordered;
}

function nearestClosureDistance(p: LatLng, closures: Disruption[]): number {
  return closures.reduce((min, d) => Math.min(min, distanceToDisruptionM(p, d)), Infinity);
}

/** Punkt in `distM` Metern Entfernung in Richtung `bearingDeg` (lokal eben gerechnet). */
function offset(p: LatLng, distM: number, bearingDeg: number): LatLng {
  const rad = (bearingDeg * Math.PI) / 180;
  return {
    lat: p.lat + (distM * Math.cos(rad)) / 111_320,
    lng: p.lng + (distM * Math.sin(rad)) / (111_320 * Math.cos((p.lat * Math.PI) / 180)),
  };
}

/**
 * Liegt der Parkpunkt in einer Sperrung, wird ein Ersatzpunkt außerhalb gesucht,
 * von dem aus alle Stopps des Halts noch zu Fuß erreichbar sind.
 *
 * Grenze des Gerüsts: Der Ersatzpunkt ist ein Punkt auf der Karte, kein geprüfter
 * Parkplatz. Mit Straßendaten (Schritt 3) wird er auf eine befahrbare Straße gelegt.
 */
function resolveParking(cluster: Cluster, closures: Disruption[], opts: HaltOptions) {
  const notes: string[] = [];
  if (nearestClosureDistance(cluster.center, closures) > opts.closureBufferM) {
    return { parking: cluster.center, notes };
  }
  let best: { p: LatLng; maxWalk: number } | null = null;
  for (const dist of [60, 90, 120, 150, 200]) {
    for (let bearing = 0; bearing < 360; bearing += 30) {
      const p = offset(cluster.center, dist, bearing);
      if (nearestClosureDistance(p, closures) <= opts.closureBufferM) continue;
      const maxWalk = Math.max(...cluster.stops.map((s) => distanceM(p, positionOf(s))));
      if (!best || maxWalk < best.maxWalk) best = { p, maxWalk };
    }
  }
  if (best) {
    notes.push(`Parkpunkt wegen Sperrung verlegt, längster Fußweg ca. ${Math.round(best.maxWalk)} m`);
    return { parking: best.p, notes };
  }
  notes.push('Parkpunkt liegt in einer Sperrung, vor Ort Ausweichstelle suchen');
  return { parking: cluster.center, notes };
}

/** Baut aus den Stopps Halte mit Parkpunkt, sperrungsbewusst. */
export function buildHalts(
  stops: Stop[],
  disruptions: Disruption[],
  opts: HaltOptions = defaultHaltOptions,
): Halt[] {
  const closures = disruptions.filter((d) => d.geometry && (d.kind === 'closure' || d.kind === 'roadworks'));
  return clusterStops(stops, opts).map((cluster, i) => {
    const { parking, notes } = resolveParking(cluster, closures, opts);
    return {
      id: `h${i + 1}`,
      parking,
      stopIds: walkingOrder(parking, cluster.stops).map((s) => s.id),
      notes,
    };
  });
}
