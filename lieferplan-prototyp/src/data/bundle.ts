/**
 * The precomputed data bundle (assets/data/, written by probelauf/export_app.py).
 * Bundled with the app, so the demo needs no network for its data.
 */
import importJson from '../../assets/data/import.json';
import mapJson from '../../assets/data/map.json';
import metaJson from '../../assets/data/meta.json';
import beforeJson from '../../assets/data/plan_before.json';
import necessaryJson from '../../assets/data/plan_only_necessary.json';
import fullJson from '../../assets/data/plan_replan_full.json';
import tourJson from '../../assets/data/tour.json';
import type { ImportData, MapData, Meta, Plan, PlanMode, Shipment, Tour, TourStop } from './types';

export const SUPPORTED_SCHEMA = 1;

export const meta = metaJson as unknown as Meta;
export const tour = tourJson as unknown as Tour;
export const importData = importJson as unknown as ImportData;
export const mapData = mapJson as unknown as MapData;

export const plans: Record<PlanMode, Plan> = {
  before: beforeJson as unknown as Plan,
  only_necessary: necessaryJson as unknown as Plan,
  replan_full: fullJson as unknown as Plan,
};

const shipmentsById = new Map<string, Shipment>(tour.shipments.map((s) => [s.id, s]));
const stopsByNo = new Map<number, TourStop>(tour.stops.map((s) => [s.no, s]));

export const shipmentById = (id: string) => shipmentsById.get(id);
export const stopByNo = (no: number) => stopsByNo.get(no);

/** Problems with the bundle itself (wrong format version); shown on the start screen instead of failing silently. */
export function bundleProblems(): string[] {
  const out: string[] = [];
  const all = { meta, tour, importData, mapData, ...plans } as Record<string, { schema_version: number }>;
  for (const [name, d] of Object.entries(all)) {
    if (d.schema_version !== SUPPORTED_SCHEMA) out.push(`${name}: format ${d.schema_version}, app expects ${SUPPORTED_SCHEMA}`);
  }
  return out;
}

export const MODE_LABEL: Record<PlanMode, string> = {
  before: 'List as it comes',
  only_necessary: 'Only necessary changes',
  replan_full: 'Replan completely',
};
