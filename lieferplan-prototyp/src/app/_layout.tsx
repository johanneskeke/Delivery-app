import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useDemoStore } from '@/store/demo-store';
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
      <Stack screenOptions={{ headerBackTitle: 'Back', contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" options={{ title: 'Today’s tour' }} />
        <Stack.Screen name="import" options={{ title: 'Import check' }} />
        <Stack.Screen name="about" options={{ title: 'Data and sources' }} />
        <Stack.Screen name="map-test" options={{ title: 'Map test' }} />
      </Stack>
    </>
  );
}
