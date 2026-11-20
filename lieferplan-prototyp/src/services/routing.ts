import type { Disruption, Halt, LatLng, RoutePlan, Stop, StopImpact, Tour } from '../domain/types';
import { distanceM, pathLengthM } from '../lib/geo';
import { buildHalts, defaultHaltOptions, type HaltOptions } from './halts';

type StopIndex = Record<string, Stop>;

export const indexStops = (stops: Stop[]): StopIndex => Object.fromEntries(stops.map((s) => [s.id, s]));

/**
 * Dringlichkeit eines Halts: frühestes Zeitfenster-Ende seiner Stopps.
 * Prio-Stopps ohne Zeitfenster zählen als "bis 12:00". null = nicht dringend.
 */
function urgencyKey(halt: Halt, stops: StopIndex): string | null {
  const keys = halt.stopIds
    .map((id) => stops[id])
    .map((s) => s.timeWindow?.to ?? (s.tags.includes('priority') ? '12:00' : null))
    .filter((k): k is string => k !== null)
    .sort();
  return keys[0] ?? null;
}

function tourLength(depot: LatLng, halts: Halt[]): number {
  return pathLengthM([depot, ...halts.map((h) => h.parking), depot]);
}

/** Verbessert eine Reihenfolge mit 2-opt; die ersten `fixed` Halte bleiben stehen. */
function twoOpt(depot: LatLng, halts: Halt[], fixed: number): Halt[] {
  let best = [...halts];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = fixed; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        if (tourLength(depot, candidate) + 1 < tourLength(depot, best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

/**
 * Reihenfolge der Halte, lokal und ohne Netz berechnet:
 * erst dringende Halte nach Zeitfenster, danach nächster Nachbar plus 2-opt, alles per Luftlinie.
 * Schritt 3 ersetzt das durch echtes Straßen-Routing mit Sperrungen.
 */
export function orderHalts(depot: LatLng, halts: Halt[], stops: StopIndex): Halt[] {
  const urgent = halts
    .map((h) => ({ h, key: urgencyKey(h, stops) }))
    .filter((x) => x.key !== null)
    .sort((a, b) => (a.key as string).localeCompare(b.key as string))
    .map((x) => x.h);
  const rest = halts.filter((h) => !urgent.includes(h));

  const ordered = [...urgent];
  let here = ordered.length ? ordered[ordered.length - 1].parking : depot;
  while (rest.length) {
    rest.sort((a, b) => distanceM(here, a.parking) - distanceM(here, b.parking));
    const next = rest.shift() as Halt;
    ordered.push(next);
    here = next.parking;
  }
  return twoOpt(depot, ordered, urgent.length);
}

function walkLength(halts: Halt[], stops: StopIndex): number {
  return halts.reduce((sum, h) => {
    const points = h.stopIds.map((id) => stops[id].position as LatLng);
    return sum + pathLengthM([h.parking, ...points, h.parking]);
  }, 0);
}

function finishPlan(kind: RoutePlan['kind'], method: string, depot: LatLng, halts: Halt[], stops: StopIndex): RoutePlan {
  const numbered = halts.map((h, i) => ({ ...h, id: `h${i + 1}` }));
  return {
    kind,
    method,
    createdAt: new Date().toISOString(),
    halts: numbered,
    driveDistanceM: Math.round(tourLength(depot, numbered)),
    walkDistanceM: Math.round(walkLength(numbered, stops)),
  };
}

/** Plan so, wie die Tour geliefert wurde: jeder Stopp einzeln, in Originalreihenfolge. */
export function buildOriginalPlan(tour: Tour, impacts: StopImpact[]): RoutePlan {
  const stops = indexStops(tour.stops);
  const halts: Halt[] = [...tour.stops]
    .filter((s) => s.position)
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map((s) => ({
      id: s.id,
      parking: s.position as LatLng,
      stopIds: [s.id],
      notes: impacts.some((i) => i.stopId === s.id) ? ['Liegt an einer Störung, im Originalplan nicht berücksichtigt'] : [],
    }));
  return finishPlan('original', 'Reihenfolge laut Tourliste', tour.depot.position, halts, stops);
}

/** Vorschlag: Stopps zu Halten bündeln, Sperrungen umgehen, Reihenfolge optimieren. */
export function buildProposedPlan(
  tour: Tour,
  disruptions: Disruption[],
  opts: HaltOptions = defaultHaltOptions,
): RoutePlan {
  const stops = indexStops(tour.stops);
  const halts = buildHalts(tour.stops, disruptions, opts);
  const ordered = orderHalts(tour.depot.position, halts, stops);
  return finishPlan(
    'proposed',
    'Halte gebündelt, Zeitfenster zuerst, Luftlinie (vorläufig)',
    tour.depot.position,
    ordered,
    stops,
  );
}
