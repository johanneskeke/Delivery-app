import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isLoaded, loadable } from '@/data/loading';
import { useDemoStore } from '@/store/demo-store';
import { Button, colors } from '@/ui/kit';

/** Loading (decided 2026-11-20, "Scan and load details"): progress, one big scan button, start route. */
export default function LoadScreen() {
  const scanned = useDemoStore((s) => s.scanned);
  const loaded = loadable.filter((s) => isLoaded(s.id, scanned)).length;
  const total = loadable.length;
  const missing = total - loaded;

  const startRoute = () => {
    if (!missing) return router.push('/tour');
    Alert.alert(`${missing} ${missing === 1 ? 'parcel' : 'parcels'} not scanned`, 'Start anyway?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => router.push('/tour') },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.top}>
        <Text style={styles.count}>
          {loaded} of {total} loaded
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(loaded / total) * 100}%` }]} />
        </View>
        {missing ? (
          <Pressable hitSlop={10} onPress={() => router.push('/to-scan')}>
            <Text style={styles.link}>{missing} still to scan ›</Text>
          </Pressable>
        ) : (
          <Text style={[styles.link, { color: colors.ok }]}>All parcels loaded</Text>
        )}
      </View>

      <View style={styles.center}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [styles.scan, pressed && { opacity: 0.85 }]}>
          <Text style={styles.scanText}>Scan parcel</Text>
        </Pressable>
        <Text style={styles.note}>Parcels without a printed demo label count as already loaded (simulated).</Text>
      </View>

      <Button title="Start route" variant={missing ? 'secondary' : 'primary'} onPress={startRoute} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 16 },
  top: { gap: 8, marginTop: 8 },
  count: { fontSize: 22, fontWeight: '700', color: colors.text },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.neutralBg, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  scan: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: { color: colors.primaryText, fontSize: 24, fontWeight: '700' },
  note: { fontSize: 12, color: colors.muted, textAlign: 'center', paddingHorizontal: 24 },
});
