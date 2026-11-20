import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPlan, route, tour } from '@/data/bundle';
import { HeaderTextButton } from '@/ui/header-buttons';
import { colors } from '@/ui/kit';

/**
 * Insights for the back office (2026-11-20): old list vs. new route, reachable from the start screen only.
 * "Details" opens the map and the reasons (Why).
 */
export default function InsightsScreen() {
  const old = listPlan.kpis;
  const now = route.kpis;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ headerRight: () => <HeaderTextButton title="Details" onPress={() => router.push('/details')} /> }} />

      <View style={styles.blocks}>
        <Block
          title="Your list"
          main={`${tour.stops.length} stops`}
          conflicts={old.conflicts}
          drive={old.drive_min}
          tone="old"
        />
        <Block title="New route" main={`${now.halts} halts`} conflicts={now.conflicts} drive={now.drive_min} tone="new" />
      </View>
      <Text style={styles.hint}>Planned with today’s closures, loading zones and time windows.</Text>

    </SafeAreaView>
  );
}

function Block({ title, main, conflicts, drive, tone }: { title: string; main: string; conflicts: number; drive: number; tone: 'old' | 'new' }) {
  const isNew = tone === 'new';
  return (
    <View style={[styles.block, isNew && styles.blockNew]}>
      <Text style={[styles.blockTitle, isNew && { color: colors.primary }]}>{title}</Text>
      <Text style={styles.main}>{main}</Text>
      <Text style={[styles.conflicts, { color: conflicts ? colors.danger : colors.ok }]}>
        {conflicts} {conflicts === 1 ? 'conflict' : 'conflicts'}
      </Text>
      <Text style={styles.drive}>{drive} min driving</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 16 },
  blocks: { flexDirection: 'row', gap: 12, marginTop: 12 },
  block: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockNew: { borderColor: colors.primary, borderWidth: 2 },
  blockTitle: { fontSize: 15, fontWeight: '600', color: colors.muted },
  main: { fontSize: 26, fontWeight: '700', color: colors.text },
  conflicts: { fontSize: 17, fontWeight: '700' },
  drive: { fontSize: 15, color: colors.muted },
  hint: { fontSize: 15, color: colors.muted, textAlign: 'center' },
});
