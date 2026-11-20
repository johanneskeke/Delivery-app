import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { meta } from '@/data/bundle';

/**
 * What the driver did during the demo (kept on the phone so a reload does not lose it).
 * The plans themselves are not stored here: they come from the bundled data.
 * Later build steps add notes and settings.
 */

export type NotHomeChoice = 'neighbour' | 'dropoff' | 'van';
/** Per stop: parcels delivered and/or pickup collected (both possible at one stop), or not at home. */
export type StopStatus = { delivered?: true; pickedUp?: true; notHome?: NotHomeChoice };

type DemoState = {
  /** Generation time of the bundle the progress belongs to; a new bundle resets the progress. */
  bundleGeneratedAt: string;
  /** Index of the current halt in the route (0-based). */
  haltIndex: number;
  /** Whether the driver tapped "Arrived" at the current halt. */
  arrived: boolean;
  /** Status per stop number. */
  stops: Record<number, StopStatus>;
  /** Demo labels scanned into the van; not saved, so every app start begins with the four labels unscanned. */
  scanned: Record<string, true>;

  arrive: () => void;
  /** Merge into the status of a stop; null clears it (undo). */
  setStop: (no: number, patch: StopStatus | null) => void;
  /** Demo shortcut: mark the given stops as done (from "All halts"). */
  completeAll: (statuses: Record<number, StopStatus>) => void;
  goToHalt: (index: number) => void;
  markScanned: (id: string) => void;
  reset: () => void;
};

const initial = () => ({ bundleGeneratedAt: meta.generated_at, haltIndex: 0, arrived: false, stops: {}, scanned: {} });

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      ...initial(),
      arrive: () => set({ arrived: true }),
      setStop: (no, patch) =>
        set((s) => {
          const stops = { ...s.stops };
          if (patch) stops[no] = { ...stops[no], ...patch };
          else delete stops[no];
          return { stops };
        }),
      completeAll: (statuses) => set((s) => ({ stops: { ...s.stops, ...statuses } })),
      goToHalt: (index) => set({ haltIndex: index, arrived: false }),
      markScanned: (id) => set((s) => ({ scanned: { ...s.scanned, [id]: true } })),
      reset: () => set(initial()),
    }),
    {
      name: 'm10-demo-state-v2',
      storage: createJSONStorage(() => AsyncStorage),
      // `scanned` is left out on purpose: the scans reset on every app start (demo, decided 2026-11-20).
      partialize: ({ bundleGeneratedAt, haltIndex, arrived, stops }) => ({ bundleGeneratedAt, haltIndex, arrived, stops }),
      // Progress from an older data bundle does not fit the new plans.
      merge: (persisted, current) => {
        const p = persisted as Partial<DemoState> | undefined;
        return p && p.bundleGeneratedAt === meta.generated_at ? { ...current, ...p } : current;
      },
    },
  ),
);
