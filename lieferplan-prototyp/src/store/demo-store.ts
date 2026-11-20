import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { meta } from '@/data/bundle';

/**
 * What the driver did during the demo (kept on the phone so a reload does not lose it).
 * The plans themselves are not stored here: they come from the bundled data.
 * Later build steps add scanned parcels, delivery status, notes and settings.
 */
type DemoState = {
  /** Generation time of the bundle the progress belongs to; a new bundle resets the progress. */
  bundleGeneratedAt: string;
  reset: () => void;
};

const initial = () => ({ bundleGeneratedAt: meta.generated_at });

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      ...initial(),
      reset: () => set(initial()),
    }),
    {
      name: 'm10-demo-state-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ bundleGeneratedAt }) => ({ bundleGeneratedAt }),
      // Progress from an older data bundle does not fit the new plans.
      merge: (persisted, current) => {
        const p = persisted as Partial<DemoState> | undefined;
        return p && p.bundleGeneratedAt === meta.generated_at ? { ...current, ...p } : current;
      },
    },
  ),
);
