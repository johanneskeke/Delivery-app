import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { meta } from '@/data/bundle';

/**
 * What the driver did during the demo (kept on the phone so a reload does not lose it).
 * The plans themselves are not stored here: they come from the bundled data.
 * Later build steps add scanned parcels, notes and settings.
 */

export type NotHomeChoice = 'neighbour' | 'dropoff' | 'van';
export type StopStatus =
  | { kind: 'delivered' }
  | { kind: 'picked_up' }
  | { kind: 'not_home'; choice: NotHomeChoice };

type DemoState = {
  /** Generation time of the bundle the progress belongs to; a new bundle resets the progress. */
  bundleGeneratedAt: string;
  /** Index of the current halt in the route (0-based). */
  haltIndex: number;
  /** Whether the driver tapped "Arrived" at the current halt. */
  arrived: boolean;
  /** Status per stop number. */
  stops: Record<number, StopStatus>;

  arrive: () => void;
  setStop: (no: number, status: StopStatus | null) => void;
  goToHalt: (index: number) => void;
  reset: () => void;
};

const initial = () => ({ bundleGeneratedAt: meta.generated_at, haltIndex: 0, arrived: false, stops: {} });

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      ...initial(),
      arrive: () => set({ arrived: true }),
      setStop: (no, status) =>
        set((s) => {
          const stops = { ...s.stops };
          if (status) stops[no] = status;
          else delete stops[no];
          return { stops };
        }),
      goToHalt: (index) => set({ haltIndex: index, arrived: false }),
      reset: () => set(initial()),
    }),
    {
      name: 'm10-demo-state-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ bundleGeneratedAt, haltIndex, arrived, stops }) => ({ bundleGeneratedAt, haltIndex, arrived, stops }),
      // Progress from an older data bundle does not fit the new plans.
      merge: (persisted, current) => {
        const p = persisted as Partial<DemoState> | undefined;
        return p && p.bundleGeneratedAt === meta.generated_at ? { ...current, ...p } : current;
      },
    },
  ),
);
