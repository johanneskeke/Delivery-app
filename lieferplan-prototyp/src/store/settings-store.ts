import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { NavApp } from '@/services/navigation';

/**
 * Driver settings (decided 2026-11-20, "Settings and notes details").
 * Saved on the phone; "Reset demo" does not touch them.
 */
type SettingsState = {
  navApp: NavApp;
  /** Open the navigation app straight away after "Next halt". */
  autoNavigate: boolean;
  setNavApp: (app: NavApp) => void;
  setAutoNavigate: (on: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      navApp: 'google',
      autoNavigate: false,
      setNavApp: (navApp) => set({ navApp }),
      setAutoNavigate: (autoNavigate) => set({ autoNavigate }),
    }),
    {
      name: 'm10-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ navApp, autoNavigate }) => ({ navApp, autoNavigate }),
    },
  ),
);
