import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { meta } from '@/data/bundle';
import type { ProposedMode } from '@/data/types';

/**
 * What the driver did during the demo (kept on the phone so a reload does not lose it).
 * The plans themselves are not stored here: they come from the bundled data.
 * Later build steps add delivery status, accepted/rejected changes and scanned parcels.
 */
type DemoState = {
  /** Plan the app shows; starts with meta.start_mode (open decision B8). */
  mode: ProposedMode;
  /** Generation time of the bundle the progress belongs to; a new bundle resets the progress. */
  bundleGeneratedAt: string;
  setMode: (mode: ProposedMode) => void;
  reset: () => void;
};

const initial = () => ({ mode: meta.start_mode, bundleGeneratedAt: meta.generated_at });

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      ...initial(),
      setMode: (mode) => set({ mode }),
      reset: () => set(initial()),
    }),
    {
      name: 'm10-demo-state-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ mode, bundleGeneratedAt }) => ({ mode, bundleGeneratedAt }),
      // Progress from an older data bundle does not fit the new plans.
      merge: (persisted, current) => {
        const p = persisted as Partial<DemoState> | undefined;
        return p && p.bundleGeneratedAt === meta.generated_at ? { ...current, ...p } : current;
      },
    },
  ),
);
