import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPlan, meta, route, tour } from '@/data/bundle';
import { formatDuration, minutesBetween, roundToQuarter } from '@/lib/format';
import { HeaderTextButton } from '@/ui/header-buttons';
import { colors } from '@/ui/kit';

/**
 * Insights for the back office: old list vs. new route, reachable from the start screen only.
 * Each block shows the working time span (departure – back at the depot, rounded to the quarter hour); the saving
 * below is an estimate from our assumptions (decided 2026-11-21). "Details" opens the map and the reasons (Why).
 */
export default function InsightsScreen() {
  const old = listPlan.kpis;
  const now = route.kpis;
  const oldEnd = roundToQuarter(old.back_at_depot);
  const newEnd = roundToQuarter(now.back_at_depot);
  const saved = minutesBetween(newEnd, oldEnd);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ headerRight: () => <HeaderTextButton title="Details" onPress={() => router.push('/details')} /> }} />

      <View style={styles.blocks}>
        <Block title="Your list" main={`${tour.stops.length} stops`} conflicts={old.conflicts} span={`${meta.departure} – ${oldEnd}`} tone="old" />
        <Block title="New route" main={`${now.halts} halts`} conflicts={now.conflicts} span={`${meta.departure} – ${newEnd}`} tone="new" />
      </View>

      {saved > 0 ? (
        <View style={styles.saved}>
          <Text style={styles.savedLabel}>Time saved</Text>
          <Text style={styles.savedValue}>about {formatDuration(saved)}</Text>
          <Text style={styles.savedNote}>Estimate based on our assumptions (driving speeds, stop times)</Text>
        </View>
      ) : null}

      <Text style={styles.hint}>Planned with today’s closures, loading zones and time windows.</Text>
    </SafeAreaView>
  );
}

function Block({ title, main, conflicts, span, tone }: { title: string; main: string; conflicts: number; span: string; tone: 'old' | 'new' }) {
  const isNew = tone === 'new';
  return (
    <View style={[styles.block, isNew && styles.blockNew]}>
      <Text style={[styles.blockTitle, isNew && { color: colors.primary }]}>{title}</Text>
      <Text style={styles.main}>{main}</Text>
      <Text style={[styles.conflicts, { color: conflicts ? colors.danger : colors.ok }]}>
        {conflicts} {conflicts === 1 ? 'conflict' : 'conflicts'}
      </Text>
      <Text style={styles.span}>{span}</Text>
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
  span: { fontSize: 16, fontWeight: '600', color: colors.text },
  saved: { backgroundColor: colors.okBg, borderRadius: 14, padding: 16, gap: 2, alignItems: 'center' },
  savedLabel: { fontSize: 14, fontWeight: '600', color: colors.ok },
  savedValue: { fontSize: 24, fontWeight: '700', color: colors.ok },
  savedNote: { fontSize: 12, color: colors.ok, textAlign: 'center' },
  hint: { fontSize: 15, color: colors.muted, textAlign: 'center' },
});
