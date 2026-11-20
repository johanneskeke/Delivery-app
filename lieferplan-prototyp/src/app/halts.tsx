import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { route } from '@/data/bundle';
import { useDemoStore } from '@/store/demo-store';
import { colors } from '@/ui/kit';

/** "All halts": list of the route; tap a halt to jump there (demo and user test). */
export default function HaltsScreen() {
  const { haltIndex, stops, goToHalt } = useDemoStore();

  return (
    <FlatList
      data={route.halts}
      keyExtractor={(h) => h.id}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      renderItem={({ item: h, index }) => {
        const done = h.stops.every((s) => stops[s.no]);
        const current = index === haltIndex;
        return (
          <Pressable
            onPress={() => {
              goToHalt(index);
              router.back();
            }}
            style={({ pressed }) => [styles.row, current && styles.current, pressed && { opacity: 0.7 }]}>
            <Text style={styles.seq}>{h.seq}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.street}>
                {h.parking.street} <Text style={styles.time}>· {h.arrival}</Text>
              </Text>
              <Text style={styles.stops} numberOfLines={1}>
                {h.stops.map((s) => s.address).join(', ')}
              </Text>
              {h.reason ? (
                <Text style={styles.reason} numberOfLines={1}>
                  {h.reason.text}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.state, done && { color: colors.ok }]}>{done ? '✓' : current ? '●' : ''}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  current: { borderColor: colors.primary, borderWidth: 2 },
  seq: { width: 28, fontSize: 18, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  street: { fontSize: 16, fontWeight: '600', color: colors.text },
  time: { fontWeight: '400', color: colors.muted },
  stops: { fontSize: 13, color: colors.muted },
  reason: { fontSize: 13, color: colors.text },
  state: { width: 20, fontSize: 18, color: colors.primary, textAlign: 'center' },
});
