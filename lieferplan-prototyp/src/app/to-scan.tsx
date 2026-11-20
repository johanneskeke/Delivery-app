import { FlatList, StyleSheet, Text, View } from 'react-native';

import { stillToScan } from '@/data/loading';
import { useDemoStore } from '@/store/demo-store';
import { colors } from '@/ui/kit';

/** Parcels still to scan (the demo labels not yet scanned), in route order. */
export default function ToScanScreen() {
  const scanned = useDemoStore((s) => s.scanned);
  const items = stillToScan(scanned);

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      ListEmptyComponent={<Text style={styles.empty}>All parcels are loaded.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.slot}>{item.slot}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.recipient}</Text>
            <Text style={styles.sub}>
              {item.address} · halt {item.halt} · {item.id}
            </Text>
          </View>
        </View>
      )}
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
  slot: { width: 52, fontSize: 18, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24 },
});
