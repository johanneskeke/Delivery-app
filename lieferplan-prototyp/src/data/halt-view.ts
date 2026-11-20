/**
 * Looks up what the halt screens show. No planning here: slots, order, parking points and reasons are precomputed;
 * this only groups and labels them.
 */
import type { LatLon, MapLine, MapMarker } from '@/components/google-map';

import { importData, mapData, route, shipmentById } from './bundle';
import type { Halt, PlanStop, Shipment } from './types';

const isPickup = (s: Shipment) => s.product.startsWith('Abholung');

export function shipmentsOf(stop: PlanStop): Shipment[] {
  return stop.shipment_ids.map((id) => shipmentById(id)).filter((s): s is Shipment => !!s);
}

/** "A2 × 3 · Floor × 1 (bulky)": what to take out of the van at this halt (pickups are collected, not taken out). */
export function takeOut(halt: Halt): string {
  const counts = new Map<string, number>();
  for (const stop of halt.stops) {
    for (const s of shipmentsOf(stop)) {
      if (isPickup(s)) continue;
      const slot = route.slots[s.id]?.slot ?? '?';
      counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort(([a], [b]) => (a === 'FLOOR' ? 1 : b === 'FLOOR' ? -1 : a.localeCompare(b)))
    .map(([slot, n]) => (slot === 'FLOOR' ? `Floor × ${n} (bulky)` : `${slot} × ${n}`))
    .join(' · ');
}

export type StopCard = {
  no: number;
  address: string;
  door: LatLon;
  recipients: string;
  parcels: number;
  pickups: number;
  pickupOnly: boolean;
  badges: string[];
  notes: string[];
  importNote: string | null;
  preferredNeighbour: string | null;
  preferredDropoff: string | null;
};

function windowBadge(stop: PlanStop): string | null {
  const w = stop.window;
  if (!w || (!w.from && !w.until)) return null;
  if (w.from && w.until) return `Window ${w.from}–${w.until}`;
  return w.until ? `Until ${w.until}` : `Opens ${w.from}`;
}

export function stopCard(stop: PlanStop): StopCard {
  const ships = shipmentsOf(stop);
  const pickups = ships.filter(isPickup).length;
  const f = stop.flags;
  const badges = [
    f.priority ? 'Priority' : null,
    f.id_check ? 'ID check' : null,
    f.age_check ? '18+' : null,
    f.bulky ? 'Bulky' : null,
    pickups ? 'Pickup' : null,
    windowBadge(stop),
  ].filter((b): b is string => !!b);
  const noteFor = (service: string) => ships.find((s) => s.service === service)?.note || (ships.some((s) => s.service === service) ? 'see tour list' : null);
  const imp = importData.notes.find((n) => n.stop_no === stop.no && n.kind === 'house_no_not_found');
  return {
    no: stop.no,
    address: stop.address,
    door: stop.door,
    recipients: [...new Set(ships.map((s) => s.recipient))].join(', '),
    parcels: ships.length - pickups,
    pickups,
    pickupOnly: ships.length > 0 && pickups === ships.length,
    badges,
    notes: [...new Set(ships.map((s) => s.note).filter(Boolean))],
    importNote: imp ? imp.text : null,
    preferredNeighbour: noteFor('Wunschnachbar'),
    preferredDropoff: noteFor('Wunschablageort'),
  };
}

// ---------------------------------------------------------------- done or not

type Status = { delivered?: true; pickedUp?: true; notHome?: string } | undefined;

/** A stop is done when its parcels are delivered (or not at home) and its pickup is collected (or not at home). */
export function stopDone(card: StopCard, st: Status): boolean {
  if (!st) return false;
  if (st.notHome) return true;
  return (card.parcels === 0 || !!st.delivered) && (card.pickups === 0 || !!st.pickedUp);
}

export const haltDone = (h: Halt, stops: Record<number, Status>) => h.stops.every((s) => stopDone(stopCard(s), stops[s.no]));

/** Status that completes a stop (demo shortcut "Deliver all"). */
export function completeStatus(stop: PlanStop): { delivered?: true; pickedUp?: true } {
  const c = stopCard(stop);
  return { ...(c.parcels ? { delivered: true as const } : {}), ...(c.pickups ? { pickedUp: true as const } : {}) };
}

// ---------------------------------------------------------------- map content per halt

const near = (a: LatLon, b: LatLon, m: number) => {
  const dy = (a[0] - b[0]) * 111_320;
  const dx = (a[1] - b[1]) * 111_320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dx, dy) < m;
};

function closuresNear(points: LatLon[], radiusM: number): MapLine[] {
  return mapData.closures
    .filter((c) => c.kind !== 'note')
    .flatMap((c, i) =>
      c.lines
        .filter((line) => line.some((p) => points.some((q) => near(p, q, radiusM))))
        .map((line, j) => ({
          id: `closure-${i}-${j}`,
          path: line,
          kind: c.kind === 'full' ? ('closure' as const) : ('narrowing' as const),
          title: `<b>${c.kind === 'full' ? 'Closed' : 'Closed in one direction'}</b>: ${c.street}<br>${c.section}<br>Source: ${c.source}`,
        })),
    );
}

const parkingMarker = (h: Halt): MapMarker => ({
  id: 'parking',
  position: h.parking.latlon,
  kind: 'parking',
  label: 'P',
  title: `<b>Park here</b><br>${h.parking.street} (${h.parking.kind === 'loading_zone' ? `loading zone, ${h.parking.valid}` : 'kerbside'})`,
});

const doorMarkers = (h: Halt): MapMarker[] =>
  h.stops.map((s) => ({
    id: `door-${s.no}`,
    position: s.door,
    kind: 'door',
    label: String(s.no),
    title: `<b>${s.address}</b><br>at the door ${s.eta}`,
  }));

/** Approach: the way from the last halt (or the start point) to the parking point. */
export function approachMap(h: Halt) {
  const lines: MapLine[] = [
    ...closuresNear([...h.drive_path, h.parking.latlon], 250),
    { id: 'drive', path: h.drive_path, kind: 'drive' },
  ];
  const markers = [parkingMarker(h), ...doorMarkers(h)];
  const fitTo: LatLon[] = [...h.drive_path, ...h.stops.map((s) => s.door)];
  return { lines, markers, fitTo };
}

/** After arriving: parking point, doors and straight walking lines (as the engine calculates). */
export function walkMap(h: Halt) {
  const lines: MapLine[] = [
    ...closuresNear([h.parking.latlon, ...h.stops.map((s) => s.door)], 200),
    ...h.stops.map((s) => ({ id: `walk-${s.no}`, path: [h.parking.latlon, s.door], kind: 'walk' as const })),
  ];
  const markers = [parkingMarker(h), ...doorMarkers(h)];
  const fitTo: LatLon[] = [h.parking.latlon, ...h.stops.map((s) => s.door)];
  return { lines, markers, fitTo };
}
