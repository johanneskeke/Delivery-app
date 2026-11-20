import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDefaultSlots, createDemoTour } from '../domain/demo-tour';
import type {
  Disruption,
  PlanKind,
  RoutePlan,
  StopImpact,
  StopStatus,
  Tour,
  VehicleSlot,
} from '../domain/types';
import { bboxAround, findImpacts, getDisruptionProviders } from '../services/disruptions';
import { buildOriginalPlan, buildProposedPlan } from '../services/routing';

type TourState = {
  tour?: Tour;
  slots: VehicleSlot[];

  // Schritt "Daten prüfen"
  disruptions: Disruption[];
  impacts: StopImpact[];
  dataErrors: string[];
  checkedAt?: string;
  checking: boolean;

  // Schritt "Route"
  original?: RoutePlan;
  proposed?: RoutePlan;
  /** Vom Fahrer gewählter Plan. Erst danach geht es ans Beladen. */
  chosenPlan?: PlanKind;

  // Schritt "Fahren"
  currentHaltIndex: number;

  loadDemoTour: () => void;
  runDataCheck: () => Promise<void>;
  buildPlans: () => void;
  choosePlan: (kind: PlanKind) => void;
  loadPackage: (packageId: string, slotId: string) => void;
  unloadPackage: (packageId: string) => void;
  setStopStatus: (stopId: string, status: StopStatus) => void;
  goToHalt: (index: number) => void;
  reset: () => void;
};

const emptyState = {
  tour: undefined,
  disruptions: [],
  impacts: [],
  dataErrors: [],
  checkedAt: undefined,
  checking: false,
  original: undefined,
  proposed: undefined,
  chosenPlan: undefined,
  currentHaltIndex: 0,
};

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      ...emptyState,
      slots: createDefaultSlots(),

      loadDemoTour: () => set({ ...emptyState, tour: createDemoTour() }),

      runDataCheck: async () => {
        const tour = get().tour;
        if (!tour) return;
        set({ checking: true });
        const positions = [tour.depot.position, ...tour.stops.flatMap((s) => (s.position ? [s.position] : []))];
        const ctx = { area: bboxAround(positions), date: tour.date };

        const results = await Promise.allSettled(getDisruptionProviders().map((p) => p.fetch(ctx)));
        const disruptions: Disruption[] = [];
        const dataErrors: string[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') disruptions.push(...r.value);
          else dataErrors.push(`${getDisruptionProviders()[i].label}: ${String(r.reason)}`);
        });

        set({
          disruptions,
          dataErrors,
          impacts: findImpacts(tour.stops, disruptions),
          checkedAt: new Date().toISOString(),
          checking: false,
          // Neue Daten machen alte Pläne ungültig.
          original: undefined,
          proposed: undefined,
          chosenPlan: undefined,
          currentHaltIndex: 0,
        });
      },

      buildPlans: () => {
        const { tour, disruptions, impacts } = get();
        if (!tour) return;
        set({
          original: buildOriginalPlan(tour, impacts),
          proposed: buildProposedPlan(tour, disruptions),
          chosenPlan: undefined,
          currentHaltIndex: 0,
        });
      },

      choosePlan: (kind) => set({ chosenPlan: kind, currentHaltIndex: 0 }),

      loadPackage: (packageId, slotId) =>
        set((s) => ({
          tour: s.tour && {
            ...s.tour,
            packages: s.tour.packages.map((p) =>
              p.id === packageId ? { ...p, slotId, loadedAt: new Date().toISOString() } : p,
            ),
          },
        })),

      unloadPackage: (packageId) =>
        set((s) => ({
          tour: s.tour && {
            ...s.tour,
            packages: s.tour.packages.map((p) =>
              p.id === packageId ? { ...p, slotId: undefined, loadedAt: undefined } : p,
            ),
          },
        })),

      setStopStatus: (stopId, status) =>
        set((s) => ({
          tour: s.tour && {
            ...s.tour,
            stops: s.tour.stops.map((st) => (st.id === stopId ? { ...st, status } : st)),
          },
        })),

      goToHalt: (index) => set({ currentHaltIndex: index }),

      reset: () => set({ ...emptyState, slots: createDefaultSlots() }),
    }),
    {
      name: 'lieferplan-prototyp',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ checking: _checking, ...rest }) => rest,
    },
  ),
);

/** Der vom Fahrer gewählte Plan, falls schon entschieden. */
export function selectChosenPlan(s: Pick<TourState, 'chosenPlan' | 'original' | 'proposed'>): RoutePlan | undefined {
  if (s.chosenPlan === 'original') return s.original;
  if (s.chosenPlan === 'proposed') return s.proposed;
  return undefined;
}
