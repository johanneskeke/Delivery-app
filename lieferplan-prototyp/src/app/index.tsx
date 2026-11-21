import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bundleProblems, meta, route, tour } from '@/data/bundle';
import { DRIVER_FIRST_NAME } from '@/data/driver';
import { formatDate, greeting, roundToQuarter } from '@/lib/format';
import { HeaderTextButton } from '@/ui/header-buttons';
import { Badge, colors, SimulatedNotice } from '@/ui/kit';

/**
 * Start (decided 2026-11-21, "Start and loading screen design"): greeting and the driver's tours as cards.
 * Insights (back office) top left, settings top right.
 */
export default function StartScreen() {
  const h = tour.header;
  const problems = bundleProblems();
  const district = h.district.split(' (')[0];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ headerLeft: () => <HeaderTextButton title="Insights" onPress={() => router.push('/insights')} /> }} />
      {problems.length ? <SimulatedNotice text={`Data bundle problem: ${problems.join('; ')}`} /> : null}

      <View style={styles.hello}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.name}>{DRIVER_FIRST_NAME}</Text>
      </View>

      <Text style={styles.section}>Your tours</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start the tour of ${formatDate(h.date)}`}
        onPress={() => router.push('/load')}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View style={styles.cardTop}>
          <Text style={styles.when}>Today · {formatDate(h.date).replace(/ \d{4}$/, '')}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.time}>
          {meta.departure} – about {roundToQuarter(route.kpis.back_at_depot)}
        </Text>
        <Text style={styles.meta}>
          {district} · {tour.stops.length} stops · {route.kpis.halts} halts
        </Text>
        <View style={styles.cardBottom}>
          <Badge label="Route ready" tone="ok" />
          <Text style={styles.tourId}>Tour {h.tour_id}</Text>
        </View>
      </Pressable>

      <View style={{ flex: 1 }} />
      <Text style={styles.synthetic}>Synthetic tour · fictional carrier · real open data</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  hello: { marginBottom: 12 },
  greeting: { fontSize: 16, color: colors.muted },
  name: { fontSize: 32, fontWeight: '700', color: colors.text },
  section: { fontSize: 14, fontWeight: '600', color: colors.muted, textTransform: 'none' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    gap: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  when: { fontSize: 15, fontWeight: '600', color: colors.primary },
  chevron: { fontSize: 26, color: colors.muted, lineHeight: 26 },
  time: { fontSize: 24, fontWeight: '700', color: colors.text },
  meta: { fontSize: 15, color: colors.muted },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  tourId: { fontSize: 12, color: colors.muted },
  synthetic: { textAlign: 'center', fontSize: 12, color: colors.muted },
});
