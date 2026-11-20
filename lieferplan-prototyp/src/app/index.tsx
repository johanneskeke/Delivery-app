import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { bundleProblems, importData, meta, MODE_LABEL, plans, tour } from '@/data/bundle';
import { formatDate, formatDateTime, formatShortDate } from '@/lib/format';
import { useDemoStore } from '@/store/demo-store';
import { Badge, Button, Card, colors, H1, H2, P, Row, Screen, SimulatedNotice } from '@/ui/kit';

const h = tour.header;
const count = (pred: (p: string) => boolean) => tour.shipments.filter((s) => pred(s.product)).length;
const pickups = count((p) => p.startsWith('Abholung'));
const bulky = count((p) => p === 'Sperrgut');
const deliberate = importData.notes.filter((n) => n.deliberate_test_error).length;
const notFound = importData.notes.filter((n) => n.kind === 'house_no_not_found').length;

export default function StartScreen() {
  const { mode, reset } = useDemoStore();
  const before = plans.before.kpis;
  const proposed = plans[mode].kpis;
  const problems = bundleProblems();

  const confirmReset = () =>
    Alert.alert('Reset the demo?', 'Your progress on this phone is cleared. The plan data stay as they are.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: reset },
    ]);

  return (
    <Screen
      footer={
        // Temporary entry to the map test (build step 1); the halt loop replaces it.
        <Button title="Map test (Google map in WebView)" variant="secondary" onPress={() => router.push('/map-test')} />
      }>
      <SimulatedNotice text={`${meta.synthetic_label}. Not a real carrier document.`} />
      {problems.length ? <SimulatedNotice text={`Data bundle problem: ${problems.join('; ')}`} /> : null}

      <View>
        <H1>Tour {h.tour_id}</H1>
        <P muted>{formatDate(h.date)} · {h.district}</P>
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Tour list</H2>
          <Badge label="imported" tone="ok" />
        </Row>
        <P>
          {tour.shipments.length} shipments on {tour.stops.length} stops · {pickups} pickups · {bulky} bulky items
        </P>
        <P muted>
          Shift start {h.shift_start} · departure {meta.departure} · {h.carrier}
        </P>
        <P muted>Depot: {h.depot}</P>
      </Card>

      <Pressable onPress={() => router.push('/import')} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <H2>Import check</H2>
            <Badge label={`${importData.notes.length} notes`} tone="warn" />
          </Row>
          <P>
            {deliberate} addresses corrected, {notFound} house numbers not found (nearest number used).
          </P>
          <Text style={styles.link}>Show all notes ›</Text>
        </Card>
      </Pressable>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Checked against open data</H2>
          <Badge label="precomputed" tone="info" />
        </Row>
        <P>
          Closures {formatShortDate(meta.data_as_of.closures_viz)} · loading zones{' '}
          {formatShortDate(meta.data_as_of.loading_zones_osm)} · road network{' '}
          {formatShortDate(meta.data_as_of.road_network_osm)} · weather {formatShortDate(meta.data_as_of.weather_dwd)}
        </P>
        <P>
          Weather on the tour day: {meta.weather.summary}
          {meta.weather.note ? ` · ${meta.weather.note}` : ''} · surcharge {meta.weather.surcharge}
        </P>
        <P muted>Plan computed {formatDateTime(meta.generated_at)} by our planning engine (offline).</P>
      </Card>

      <Card>
        <H2>Route plan</H2>
        <View style={styles.kpis}>
          <Kpi label={MODE_LABEL.before} halts={before.halts} conflicts={before.conflicts} back={before.back_at_depot} />
          <Text style={styles.arrow}>→</Text>
          <Kpi label={MODE_LABEL[mode]} halts={proposed.halts} conflicts={proposed.conflicts} back={proposed.back_at_depot} good />
        </View>
        <P muted>Plan screen with reasons and Accept/Reject: next build step.</P>
      </Card>

      <View style={{ gap: 8 }}>
        <Button title="Data and sources" variant="secondary" onPress={() => router.push('/about')} />
        <Button title="Reset demo" variant="danger" onPress={confirmReset} />
      </View>
    </Screen>
  );
}

function Kpi({ label, halts, conflicts, back, good }: { label: string; halts: number; conflicts: number; back: string; good?: boolean }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{halts} halts</Text>
      <Text style={[styles.kpiValue, { color: conflicts ? colors.danger : good ? colors.ok : colors.text }]}>
        {conflicts} conflicts
      </Text>
      <Text style={styles.kpiSmall}>back at depot {back}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  kpis: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpi: { flex: 1, gap: 2 },
  kpiLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  kpiValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  kpiSmall: { fontSize: 13, color: colors.muted },
  arrow: { fontSize: 22, color: colors.muted },
});
