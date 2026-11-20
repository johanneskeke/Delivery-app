import { router, type Href } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { selectChosenPlan, useTourStore } from '@/store/tour-store';
import { Badge, Button, Card, colors, H1, P, Row, Screen } from '@/ui/kit';

type Step = { href: Href; title: string; detail: string; done: boolean; enabled: boolean };

export default function HomeScreen() {
  const state = useTourStore();
  const { tour, checkedAt, disruptions, impacts, chosenPlan } = state;
  const plan = selectChosenPlan(state);

  const loaded = tour?.packages.filter((p) => p.slotId).length ?? 0;
  const total = tour?.packages.length ?? 0;
  const finished = tour?.stops.filter((s) => s.status !== 'open').length ?? 0;
  const affected = new Set(impacts.map((i) => i.stopId)).size;

  const steps: Step[] = [
    {
      href: '/stops',
      title: '1 · Stopps laden',
      detail: tour ? `${tour.stops.length} Stopps, ${total} Pakete · ${tour.source}` : 'Noch keine Tour geladen',
      done: !!tour,
      enabled: true,
    },
    {
      href: '/check',
      title: '2 · Externe Daten prüfen',
      detail: checkedAt ? `${disruptions.length} Störungen, ${affected} Stopps betroffen` : 'Sperrungen und Baustellen abgleichen',
      done: !!checkedAt,
      enabled: !!tour,
    },
    {
      href: '/route',
      title: '3 · Route ansehen',
      detail: plan ? `${plan.kind === 'proposed' ? 'Vorschlag' : 'Original'} gewählt · ${plan.halts.length} Halte` : 'Vorschlag annehmen oder Original behalten',
      done: !!chosenPlan,
      enabled: !!checkedAt,
    },
    {
      href: '/load',
      title: '4 · Pakete scannen und einräumen',
      detail: `${loaded} von ${total} Paketen im Fahrzeug`,
      done: total > 0 && loaded === total,
      enabled: !!chosenPlan,
    },
    {
      href: '/drive',
      title: '5 · Losfahren',
      detail: `${finished} von ${tour?.stops.length ?? 0} Stopps erledigt`,
      done: !!tour && finished === tour.stops.length,
      enabled: !!chosenPlan,
    },
  ];

  const confirmReset = () =>
    Alert.alert('Alles zurücksetzen?', 'Tour, Prüfung, Route und Beladung werden gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Zurücksetzen', style: 'destructive', onPress: state.reset },
    ]);

  return (
    <Screen
      footer={
        // Build step 1 (2026-11-20): temporary entry to the map test, fixed at the bottom so it never scrolls away.
        <Button title="Map test (Google map in WebView)" onPress={() => router.push('/map-test')} />
      }>
      <H1>{tour ? tour.name : 'Neue Tour'}</H1>
      {tour ? <P muted>{new Date(tour.date).toLocaleDateString('de-DE')}</P> : null}

      {steps.map((step) => (
        <Pressable
          key={step.title}
          disabled={!step.enabled}
          onPress={() => router.push(step.href)}
          style={({ pressed }) => [{ opacity: step.enabled ? (pressed ? 0.7 : 1) : 0.45 }]}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              {step.done ? <Badge label="erledigt" tone="ok" /> : null}
            </Row>
            <P muted>{step.detail}</P>
          </Card>
        </Pressable>
      ))}

      {tour ? (
        <View style={{ marginTop: 8 }}>
          <Button title="Alles zurücksetzen" variant="danger" onPress={confirmReset} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
});
