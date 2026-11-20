import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bundleProblems, meta, tour } from '@/data/bundle';
import { formatDate } from '@/lib/format';
import { HeaderTextButton } from '@/ui/header-buttons';
import { Button, colors, SimulatedNotice } from '@/ui/kit';

/** Start: only the tour and one button. Insights (back office) top left, settings top right. */
export default function StartScreen() {
  const h = tour.header;
  const problems = bundleProblems();

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ headerLeft: () => <HeaderTextButton title="Insights" onPress={() => router.push('/insights')} /> }} />
      {problems.length ? <SimulatedNotice text={`Data bundle problem: ${problems.join('; ')}`} /> : null}
      <View style={styles.center}>
        <Text style={styles.date}>{formatDate(h.date)}</Text>
        <Text style={styles.tour}>Tour {h.tour_id}</Text>
        <Text style={styles.sub}>Departure {meta.departure}</Text>
      </View>
      <View style={styles.bottom}>
        <Button title="Start tour" onPress={() => router.push('/load')} />
        <Text style={styles.synthetic}>Synthetic tour · fictional carrier · real open data</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  date: { fontSize: 17, color: colors.muted, fontWeight: '600' },
  tour: { fontSize: 32, fontWeight: '700', color: colors.text },
  sub: { fontSize: 17, color: colors.muted },
  bottom: { gap: 12 },
  synthetic: { textAlign: 'center', fontSize: 12, color: colors.muted },
});
