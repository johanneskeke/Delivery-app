/**
 * Loading (decided 2026-11-20, "Scan and load details"): the slot per shipment is precomputed by the engine;
 * this only looks it up. Every loadable shipment except the four demo scan labels counts as already loaded (simulated).
 */
import { meta, route, shipmentById } from './bundle';
import type { Shipment } from './types';

const isPickup = (s: Shipment) => s.product.startsWith('Abholung');

const haltSeq = new Map(route.halts.map((h) => [h.id, h.seq]));
// Decided 2026-11-20: four parcels are scanned live in the demo; everything else counts as loaded (simulated).
const demoIds = new Set(meta.demo_labels.to_scan);

/** The 92 shipments that go into the van (pickups are collected on the way, not loaded). */
export const loadable: Shipment[] = route.halts
  .flatMap((h) => h.stops.flatMap((s) => s.shipment_ids))
  .map((id) => shipmentById(id))
  .filter((s): s is Shipment => !!s && !isPickup(s));

export const isPreloaded = (id: string) => !demoIds.has(id);

export function isLoaded(id: string, scanned: Record<string, true>) {
  return isPreloaded(id) || !!scanned[id];
}

export type ScanResult =
  | { kind: 'slot'; id: string; slot: string; halt: number; address: string; recipient: string; heavyKg: number | null }
  | { kind: 'floor'; id: string; halt: number; address: string; recipient: string }
  | { kind: 'already'; id: string; slot: string }
  | { kind: 'pickup'; id: string; address: string }
  | { kind: 'not_on_list'; id: string };

export function scanResult(raw: string, scanned: Record<string, true>): ScanResult {
  const id = raw.trim().toUpperCase();
  const s = shipmentById(id);
  if (!s) return { kind: 'not_on_list', id };
  const address = `${s.street} ${s.house_no}`;
  if (isPickup(s)) return { kind: 'pickup', id, address };
  const slot = route.slots[id];
  if (isLoaded(id, scanned)) return { kind: 'already', id, slot: slot.slot === 'FLOOR' ? 'Floor' : slot.slot };
  const halt = haltSeq.get(slot.halt_id) ?? 0;
  if (slot.slot === 'FLOOR') return { kind: 'floor', id, halt, address, recipient: s.recipient };
  return { kind: 'slot', id, slot: slot.slot, halt, address, recipient: s.recipient, heavyKg: s.weight_kg > 10 ? s.weight_kg : null };
}

/** Parcels still to scan, in route order, for the "still to scan" list. */
export function stillToScan(scanned: Record<string, true>) {
  return loadable
    .filter((s) => !isLoaded(s.id, scanned))
    .map((s) => {
      const slot = route.slots[s.id];
      return {
        id: s.id,
        recipient: s.recipient,
        address: `${s.street} ${s.house_no}`,
        slot: slot.slot === 'FLOOR' ? 'Floor' : slot.slot,
        halt: haltSeq.get(slot.halt_id) ?? 0,
      };
    });
}
