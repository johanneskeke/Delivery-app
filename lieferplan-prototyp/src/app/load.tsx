import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/progress-ring';
import { demoParcels, isLoaded, loadable } from '@/data/loading';
import { useDemoStore } from '@/store/demo-store';
import { Button, colors } from '@/ui/kit';

/**
 * Loading (decided 2026-11-21, "Start and loading screen design"): progress ring, the four demo parcels as cards
 * (green with slot after the scan), "Scan parcel" and "Start route".
 */
export default function LoadScreen() {
  const scanned = useDemoStore((s) => s.scanned);
  const loaded = loadable.filter((s) => isLoaded(s.id, scanned)).length;
  const total = loadable.length;
  const missing = total - loaded;
  const parcels = demoParcels(scanned);

  const startRoute = () => {
    if (!missing) return router.push('/tour');
    Alert.alert(`${missing} ${missing === 1 ? 'parcel' : 'parcels'} not scanned`, 'Start anyway?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => router.push('/tour') },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <ProgressRing value={loaded} total={total} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title}>
              {missing ? `${missing} ${missing === 1 ? 'parcel' : 'parcels'} to scan` : 'All parcels loaded'}
            </Text>
            <Text style={styles.sub}>The rest is already loaded (simulated)</Text>
          </View>
        </View>

        {parcels.map((p) => (
          <View key={p.id} style={[styles.card, p.scanned && styles.cardDone]}>
            <Text style={[styles.icon, p.scanned && { color: colors.ok }]}>{p.scanned ? '✓' : '▢'}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.name, p.scanned && { color: colors.ok }]}>{p.recipient}</Text>
              <Text style={[styles.address, p.scanned && { color: colors.ok }]}>
                {p.address}
                {p.bulky ? ' · bulky' : ''}
              </Text>
            </View>
            {p.scanned ? <Text style={styles.slot}>{p.slot}</Text> : <Text style={styles.todo}>to scan</Text>}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Scan parcel" variant={missing ? 'primary' : 'secondary'} onPress={() => router.push('/scan')} />
        <Button title="Start route" variant={missing ? 'secondary' : 'primary'} onPress={startRoute} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 10 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { fontSize: 14, color: colors.muted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardDone: { backgroundColor: colors.okBg, borderColor: colors.okBg },
  icon: { width: 22, fontSize: 18, color: colors.muted, textAlign: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  address: { fontSize: 13, color: colors.muted },
  slot: { fontSize: 20, fontWeight: '700', color: colors.ok },
  todo: { fontSize: 13, color: colors.muted },
  footer: {
    padding: 16,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});
