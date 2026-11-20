import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { meta } from '@/data/bundle';
import type { DriverNote } from '@/data/example-notes';

/**
 * What the driver did during the demo. Only the notes survive an app start; route progress and scans start fresh.
 * The plans themselves are not stored here: they come from the bundled data.
 * Settings live in settings-store.ts (not cleared by Reset demo).
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
  /** Notes the driver wrote, per stop number (the example note lives in data/example-notes.ts). */
  notes: Record<number, DriverNote>;
  /** Demo labels scanned into the van; not saved, so every app start begins with the four labels unscanned. */
  scanned: Record<string, true>;

  arrive: () => void;
  /** Merge into the status of a stop; null clears it (undo). */
  setStop: (no: number, patch: StopStatus | null) => void;
  /** Demo shortcut: mark the given stops as done (from "All halts"). */
  completeAll: (statuses: Record<number, StopStatus>) => void;
  goToHalt: (index: number) => void;
  markScanned: (id: string) => void;
  /** Save a note for a stop; null deletes it. */
  setNote: (no: number, text: string | null) => void;
  reset: () => void;
};

const initial = () => ({ bundleGeneratedAt: meta.generated_at, haltIndex: 0, arrived: false, stops: {}, scanned: {}, notes: {} });

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
      setNote: (no, text) =>
        set((s) => {
          const notes = { ...s.notes };
          if (text && text.trim()) notes[no] = { text: text.trim(), at: new Date().toISOString().slice(0, 10) };
          else delete notes[no];
          return { notes };
        }),
      reset: () => set(initial()),
    }),
    {
      name: 'm10-demo-state-v2',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the notes are saved (decided 2026-11-20): every app start begins at halt 1 with nothing scanned or delivered.
      partialize: ({ bundleGeneratedAt, notes }) => ({ bundleGeneratedAt, notes }),
      // Progress from an older data bundle does not fit the new plans.
      merge: (persisted, current) => {
        const p = persisted as Partial<DemoState> | undefined;
        return p && p.bundleGeneratedAt === meta.generated_at ? { ...current, ...p } : current;
      },
    },
  ),
);
