import { router } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mapData, route } from '@/data/bundle';
import { stopCard, stopDone } from '@/data/halt-view';
import { driveLink, NAV_APP_NAME, type NavApp } from '@/services/navigation';
import { useDemoStore } from '@/store/demo-store';
import { Button, colors } from '@/ui/kit';

const NAV_APP: NavApp = 'google'; // settings follow on Tue 2026-11-24

/** End of the tour: one summary line and the way back to the depot. */
export default function DoneScreen() {
  const stops = useDemoStore((s) => s.stops);
  const all = route.halts.flatMap((h) => h.stops);
  const delivered = all.filter((s) => stops[s.no]?.delivered).length;
  const pickedUp = all.filter((s) => stops[s.no]?.pickedUp).length;
  const notHome = all.filter((s) => stops[s.no]?.notHome).length;
  const open = all.filter((s) => !stopDone(stopCard(s), stops[s.no])).length;

  const summary = [
    `${delivered} stops delivered`,
    pickedUp ? `${pickedUp} pickups` : null,
    notHome ? `${notHome} not at home` : null,
    open ? `${open} not confirmed` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.center}>
        <Text style={styles.check}>✓</Text>
        <Text style={styles.title}>All parcels delivered</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>
      <View style={{ gap: 8 }}>
        <Button
          title={`Drive back to depot (${NAV_APP_NAME[NAV_APP]})`}
          onPress={() => Linking.openURL(driveLink(NAV_APP, `${mapData.depot.name}, ${mapData.depot.address}`))}
        />
        <Button title="Back to start" variant="secondary" onPress={() => router.dismissTo('/')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  check: { fontSize: 56, color: colors.ok },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  summary: { fontSize: 16, color: colors.muted, textAlign: 'center' },
});
