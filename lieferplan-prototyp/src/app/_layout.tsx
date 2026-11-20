import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useDemoStore } from '@/store/demo-store';
import { SettingsButton } from '@/ui/header-buttons';
import { colors } from '@/ui/kit';

const subscribeHydration = (onChange: () => void) => useDemoStore.persist.onFinishHydration(onChange);
const isHydrated = () => useDemoStore.persist.hasHydrated();

/** Wait until the saved demo progress is loaded from the phone, so nothing flashes "empty". */
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
        <Stack.Screen name="compare" options={{ title: 'Your route' }} />
        <Stack.Screen name="details" options={{ title: 'Details' }} />
        <Stack.Screen name="load" options={{ title: 'Load parcels' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
        <Stack.Screen name="map-test" options={{ title: 'Map test' }} />
      </Stack>
    </>
  );
}
