import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useDemoStore } from '@/store/demo-store';
import { useSettingsStore } from '@/store/settings-store';
import { SettingsButton } from '@/ui/header-buttons';
import { colors } from '@/ui/kit';

const subscribeHydration = (onChange: () => void) => {
  const a = useDemoStore.persist.onFinishHydration(onChange);
  const b = useSettingsStore.persist.onFinishHydration(onChange);
  return () => {
    a();
    b();
  };
};
const isHydrated = () => useDemoStore.persist.hasHydrated() && useSettingsStore.persist.hasHydrated();

/** Wait until the saved demo progress and settings are loaded from the phone, so nothing flashes "empty". */
function useHydrated() {
  return useSyncExternalStore(subscribeHydration, isHydrated, isHydrated);
}

export default function RootLayout() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          // Solid header: on iOS the header can be translucent, then the content starts behind it.
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ title: '', headerRight: () => <SettingsButton /> }} />
        <Stack.Screen name="insights" options={{ title: 'Insights' }} />
        <Stack.Screen name="details" options={{ title: 'Details' }} />
        <Stack.Screen name="load" options={{ title: 'Load parcels' }} />
        <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="tour" options={{ title: 'Route' }} />
        <Stack.Screen name="halts" options={{ title: 'All halts', presentation: 'modal' }} />
        <Stack.Screen name="done" options={{ title: 'Done', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
        <Stack.Screen name="map-test" options={{ title: 'Map test' }} />
      </Stack>
    </>
  );
}
