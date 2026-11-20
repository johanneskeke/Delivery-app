import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { haltIndexOfStop } from '@/services/loading';
import { selectChosenPlan, useTourStore } from '@/store/tour-store';
import { Badge, Button, Card, colors, H2, P, Row, Screen } from '@/ui/kit';

export default function LoadScreen() {
  const state = useTourStore();
  const { tour, slots, unloadPackage } = state;
  const plan = selectChosenPlan(state);
  if (!tour || !plan) return null;

  const loaded = tour.packages.filter((p) => p.slotId);
  const stopOf = (stopId: string) => tour.stops.find((s) => s.id === stopId);

  // Regale als Spalten (A, B, C), Fächer als Zeilen.
  const racks = [...new Set(slots.map((s) => s.id[0]))];

  const confirmUnload = (packageId: string) =>
    Alert.alert('Paket aus Fach nehmen?', packageId, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Herausnehmen', style: 'destructive', onPress: () => unloadPackage(packageId) },
    ]);

  // Pakete nach Halt-Reihenfolge sortiert, so wie sie unterwegs gebraucht werden.
  const packagesInRouteOrder = [...tour.packages].sort(
    (a, b) => haltIndexOfStop(plan, a.stopId) - haltIndexOfStop(plan, b.stopId),
  );

  return (
    <Screen
      footer={
        <>
          <Button title="Pakete scannen" onPress={() => router.push('/scan')} />
          <Button
            title={loaded.length === tour.packages.length ? 'Weiter: Losfahren' : 'Losfahren (nicht alles geladen)'}
            variant="secondary"
            onPress={() => router.push('/drive')}
          />
        </>
      }>
      <Card>
        <H2>
          {loaded.length} von {tour.packages.length} Paketen im Fahrzeug
        </H2>
        <P muted>Fach A1 ist an der Schiebetür. Frühe Halte vorne, späte hinten.</P>
      </Card>

      <View style={styles.grid}>
        {racks.map((rack) => (
          <View key={rack} style={styles.rack}>
            <Text style={styles.rackTitle}>Regal {rack}</Text>
            {slots
              .filter((s) => s.id.startsWith(rack))
              .map((slot) => {
                const inSlot = loaded.filter((p) => p.slotId === slot.id);
                const halts = [...new Set(inSlot.map((p) => haltIndexOfStop(plan, p.stopId) + 1))].sort((a, b) => a - b);
                return (
                  <View key={slot.id} style={[styles.slot, inSlot.length > 0 && styles.slotUsed]}>
                    <Text style={styles.slotLabel}>{slot.label}</Text>
                    <Text style={styles.slotInfo}>{inSlot.length ? `${inSlot.length} Pkt. · H ${halts.join(', ')}` : 'leer'}</Text>
                  </View>
                );
              })}
          </View>
        ))}
      </View>

      <H2>Pakete in Routenreihenfolge</H2>
      {packagesInRouteOrder.map((p) => {
        const stop = stopOf(p.stopId);
        return (
          <Pressable key={p.id} disabled={!p.slotId} onLongPress={() => confirmUnload(p.id)}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.pkgId}>{p.id}</Text>
                {p.slotId ? <Badge label={`Fach ${p.slotId}`} tone="ok" /> : <Badge label="nicht geladen" tone="warn" />}
              </Row>
              <P muted>
                Halt {haltIndexOfStop(plan, p.stopId) + 1} · {stop?.recipient}
              </P>
            </Card>
          </Pressable>
        );
      })}
      <P muted>Lange drücken, um ein Paket wieder aus dem Fach zu nehmen.</P>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  rack: { flex: 1, gap: 6 },
  rackTitle: { fontWeight: '600', color: colors.muted, textAlign: 'center' },
  slot: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 8,
    minHeight: 54,
  },
  slotUsed: { backgroundColor: colors.infoBg, borderColor: colors.info },
  slotLabel: { fontWeight: '700', color: colors.text },
  slotInfo: { fontSize: 12, color: colors.muted },
  pkgId: { fontSize: 16, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
});
