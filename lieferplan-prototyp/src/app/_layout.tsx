import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTourStore } from '@/store/tour-store';
import { colors } from '@/ui/kit';

/** Wartet, bis der gespeicherte Stand vom Gerät geladen ist, damit nichts kurz "leer" aufblitzt. */
function useHydrated() {
  const [hydrated, setHydrated] = useState(useTourStore.persist.hasHydrated());
  useEffect(() => {
    const unsubscribe = useTourStore.persist.onFinishHydration(() => setHydrated(true));
    // Falls das Laden schon fertig war, bevor wir uns angemeldet haben.
    if (useTourStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);
  return hydrated;
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
          headerBackTitle: 'Zurück',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ title: 'Tour vorbereiten' }} />
        <Stack.Screen name="stops" options={{ title: '1 · Stopps' }} />
        <Stack.Screen name="check" options={{ title: '2 · Daten prüfen' }} />
        <Stack.Screen name="route" options={{ title: '3 · Route' }} />
        <Stack.Screen name="load" options={{ title: '4 · Beladen' }} />
        <Stack.Screen name="scan" options={{ title: 'Paket scannen', presentation: 'modal' }} />
        <Stack.Screen name="drive" options={{ title: '5 · Fahren' }} />
        <Stack.Screen name="map-test" options={{ title: 'Map test' }} />
      </Stack>
    </>
  );
}
