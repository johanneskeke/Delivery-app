import { router } from 'expo-router';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import type { Stop } from '@/domain/types';
import { drivingUrl, walkingUrl } from '@/services/navigation';
import { selectChosenPlan, useTourStore } from '@/store/tour-store';
import { Badge, Button, Card, colors, H1, H2, P, Row, Screen } from '@/ui/kit';
import { tagLabel, timeWindowLabel } from '@/ui/labels';

async function openMaps(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Google Maps ließ sich nicht öffnen', url);
  }
}

export default function DriveScreen() {
  const state = useTourStore();
  const { tour, currentHaltIndex, goToHalt, setStopStatus, impacts } = state;
  const plan = selectChosenPlan(state);
  if (!tour || !plan) return null;

  const stops = tour.stops;
  const delivered = stops.filter((s) => s.status === 'delivered').length;
  const failed = stops.filter((s) => s.status === 'failed').length;

  if (currentHaltIndex >= plan.halts.length) {
    return (
      <Screen footer={<Button title="Zur Übersicht" onPress={() => router.dismissAll()} />}>
        <H1>Tour abgeschlossen</H1>
        <Card>
          <P>{delivered} Stopps zugestellt</P>
          <P>{failed} Stopps nicht angetroffen</P>
        </Card>
        <Button title="Letzten Halt nochmal öffnen" variant="secondary" onPress={() => goToHalt(plan.halts.length - 1)} />
      </Screen>
    );
  }

  const halt = plan.halts[currentHaltIndex];
  const haltStops = halt.stopIds.map((id) => stops.find((s) => s.id === id)).filter((s): s is Stop => !!s);
  const haltDone = haltStops.every((s) => s.status !== 'open');
  const affected = new Set(impacts.map((i) => i.stopId));

  return (
    <Screen
      footer={
        <>
          <Button
            title={currentHaltIndex === plan.halts.length - 1 ? 'Tour beenden' : 'Nächster Halt'}
            disabled={!haltDone}
            onPress={() => goToHalt(currentHaltIndex + 1)}
          />
          {currentHaltIndex > 0 ? (
            <Button title="Vorheriger Halt" variant="secondary" onPress={() => goToHalt(currentHaltIndex - 1)} />
          ) : null}
        </>
      }>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>
          Halt {currentHaltIndex + 1} von {plan.halts.length}
        </H1>
        <Badge label={`${delivered + failed}/${stops.length} erledigt`} />
      </Row>

      <Card>
        <H2>Hinfahren</H2>
        {halt.notes.map((n) => (
          <Badge key={n} label={n} tone="warn" />
        ))}
        <P muted>
          {haltStops.length > 1
            ? `Hier parken und ${haltStops.length} Stopps zu Fuß beliefern.`
            : 'Hier parken und zu Fuß zur Haustür.'}
        </P>
        <Button title="Mit Google Maps hinfahren" onPress={() => openMaps(drivingUrl(halt.parking))} />
      </Card>

      {haltStops.map((stop, i) => {
        const pkgs = tour.packages.filter((p) => p.stopId === stop.id);
        const tw = timeWindowLabel(stop);
        return (
          <Card key={stop.id} style={stop.status !== 'open' ? styles.doneCard : undefined}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H2>
                {i + 1}. {stop.recipient}
              </H2>
              {stop.status === 'delivered' ? <Badge label="zugestellt" tone="ok" /> : null}
              {stop.status === 'failed' ? <Badge label="nicht angetroffen" tone="danger" /> : null}
            </Row>
            <P>{stop.address}</P>
            <Row>
              {affected.has(stop.id) ? <Badge label="an Sperrung" tone="danger" /> : null}
              {tw ? <Badge label={tw} tone="info" /> : null}
              {stop.tags.map((t) => (
                <Badge key={t} label={tagLabel[t]} />
              ))}
            </Row>
            {stop.note ? <P muted>{stop.note}</P> : null}
            <View style={styles.packages}>
              {pkgs.map((p) => (
                <Badge key={p.id} label={`${p.id} · ${p.slotId ? `Fach ${p.slotId}` : 'nicht geladen'}`} tone={p.slotId ? 'neutral' : 'warn'} />
              ))}
            </View>
            {stop.status === 'open' ? (
              <>
                <Button title="Zu Fuß hin (Google Maps)" variant="secondary" onPress={() => openMaps(walkingUrl([stop.address]))} />
                <Row style={{ flexWrap: 'nowrap' }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Zugestellt" onPress={() => setStopStatus(stop.id, 'delivered')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Nicht da" variant="secondary" onPress={() => setStopStatus(stop.id, 'failed')} />
                  </View>
                </Row>
              </>
            ) : (
              <Button title="Status zurücksetzen" variant="secondary" onPress={() => setStopStatus(stop.id, 'open')} />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  doneCard: { opacity: 0.6, borderColor: colors.border },
  packages: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
