import type { Package, RoutePlan, VehicleSlot } from '../domain/types';

export type SlotRecommendation = {
  slotId: string;
  /** Begründung für den Fahrer, z. B. "2 Pakete für denselben Halt liegen schon hier". */
  reason: string;
  haltIndex: number;
};

/** Index des Halts (0-basiert), zu dem ein Stopp im Plan gehört, sonst -1. */
export function haltIndexOfStop(plan: RoutePlan, stopId: string): number {
  return plan.halts.findIndex((h) => h.stopIds.includes(stopId));
}

/**
 * Empfiehlt ein Fach für ein gescanntes Paket.
 *
 * 1. Liegt schon ein Paket für denselben Halt im Fahrzeug → gleiches Fach.
 * 2. Sonst: Fach eines direkt benachbarten Halts (davor/danach), damit Pakete
 *    für nahe Stationen zusammenliegen.
 * 3. Sonst: Fach nach Position in der Route verteilen. Frühe Halte kommen in die
 *    Fächer an der Tür (kleine `order`), späte nach hinten.
 */
export function recommendSlot(
  pkg: Package,
  plan: RoutePlan,
  packages: Package[],
  slots: VehicleSlot[],
): SlotRecommendation | null {
  const haltIndex = haltIndexOfStop(plan, pkg.stopId);
  if (haltIndex < 0 || slots.length === 0) return null;

  const loaded = packages.filter((p) => p.slotId && p.id !== pkg.id);
  const haltOf = (p: Package) => haltIndexOfStop(plan, p.stopId);

  const sameHalt = loaded.filter((p) => haltOf(p) === haltIndex);
  if (sameHalt.length) {
    const slotId = mostCommon(sameHalt.map((p) => p.slotId as string));
    const n = sameHalt.filter((p) => p.slotId === slotId).length;
    return { slotId, haltIndex, reason: `${n} ${n === 1 ? 'Paket' : 'Pakete'} für denselben Halt liegen schon hier` };
  }

  for (const neighbour of [haltIndex - 1, haltIndex + 1]) {
    const near = loaded.filter((p) => haltOf(p) === neighbour);
    if (near.length) {
      return {
        slotId: mostCommon(near.map((p) => p.slotId as string)),
        haltIndex,
        reason: `Pakete für den benachbarten Halt ${neighbour + 1} liegen hier`,
      };
    }
  }

  const sorted = [...slots].sort((a, b) => a.order - b.order);
  const idx = Math.min(sorted.length - 1, Math.floor((haltIndex / plan.halts.length) * sorted.length));
  return { slotId: sorted[idx].id, haltIndex, reason: `Halt ${haltIndex + 1} von ${plan.halts.length}, Fach nach Reihenfolge` };
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
