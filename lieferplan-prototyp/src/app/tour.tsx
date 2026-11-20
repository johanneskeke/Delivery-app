import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMap } from '@/components/google-map';
import { route } from '@/data/bundle';
import { approachMap, stopCard, takeOut, walkMap, type StopCard } from '@/data/halt-view';
import type { Halt, LatLon } from '@/data/types';
import { driveLink, NAV_APP_NAME, walkLinks, type NavApp } from '@/services/navigation';
import { useDemoStore, type NotHomeChoice, type StopStatus } from '@/store/demo-store';
import { HeaderTextButton } from '@/ui/header-buttons';
import { Badge, Button, colors } from '@/ui/kit';

/**
 * The halt loop (decided 2026-11-20, "Halt loop details"):
 * approach (one line why, map, open navigation, "Arrived") → take out, walk, one card per stop → "Next halt".
 */

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';
const NAV_APP: NavApp = 'google'; // settings follow on Tue 2026-11-24
const toLatLng = (p: LatLon) => ({ lat: p[0], lng: p[1] });

const NOT_HOME_LABEL: Record<NotHomeChoice, string> = {
  neighbour: 'Given to a neighbour',
  dropoff: 'Left at the drop-off spot',
  van: 'Stays in the van, back to depot',
};

export default function TourScreen() {
  const { haltIndex, arrived, stops, arrive, setStop, goToHalt } = useDemoStore();
  const index = Math.min(haltIndex, route.halts.length - 1);
  const halt = route.halts[index];
  const isLast = index === route.halts.length - 1;
  const allDone = halt.stops.every((s) => stops[s.no]);

  const next = () => {
    if (isLast) router.replace('/done');
    else goToHalt(index + 1);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: `Halt ${halt.seq} of ${route.halts.length}`,
          headerRight: () => <HeaderTextButton title="All halts" onPress={() => router.push('/halts')} />,
        }}
      />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(index / route.halts.length) * 100}%` }]} />
      </View>

      {arrived ? (
        <Arrived halt={halt} stops={stops} setStop={setStop} />
      ) : (
        <Approach halt={halt} />
      )}

      <View style={styles.footer}>
        {arrived ? (
          <Button title={isLast ? 'Finish tour' : 'Next halt'} onPress={next} disabled={!allDone} />
        ) : (
          <>
            <Button title={`Open in ${NAV_APP_NAME[NAV_APP]}`} onPress={() => Linking.openURL(driveLink(NAV_APP, toLatLng(halt.parking.latlon)))} />
            <Button title="Arrived" variant="secondary" onPress={arrive} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Approach({ halt }: { halt: Halt }) {
  const map = useMemo(() => approachMap(halt), [halt]);
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Text style={styles.street}>{halt.parking.street}</Text>
        <Text style={styles.sub}>
          {halt.parking.kind === 'loading_zone' ? 'Loading zone' : 'Kerbside'} · {halt.stops.length}{' '}
          {halt.stops.length === 1 ? 'stop' : 'stops'} · arrival about {halt.arrival}
        </Text>
        {halt.reason ? (
          <Text style={styles.reason}>
            {halt.reason.text} <Text style={styles.source}>({halt.reason.source})</Text>
          </Text>
        ) : null}
        {halt.warnings.map((w, i) => (
          <Text key={i} style={styles.warning}>
            {w.text}
          </Text>
        ))}
      </View>
      <View style={styles.map}>
        {API_KEY ? (
          <GoogleMap key={`approach-${halt.id}`} apiKey={API_KEY} lines={map.lines} markers={map.markers} fitTo={map.fitTo} />
        ) : (
          <Text style={styles.warning}>No map key in .env.</Text>
        )}
      </View>
    </View>
  );
}

function Arrived({
  halt,
  stops,
  setStop,
}: {
  halt: Halt;
  stops: Record<number, StopStatus>;
  setStop: (no: number, s: StopStatus | null) => void;
}) {
  const map = useMemo(() => walkMap(halt), [halt]);
  const cards = useMemo(() => halt.stops.map(stopCard), [halt]);
  const walks = walkLinks(NAV_APP, halt.stops.map((s) => toLatLng(s.door)));

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.takeOut}>
        <Text style={styles.takeOutLabel}>Take out</Text>
        <Text style={styles.takeOutValue}>{takeOut(halt) || 'nothing (pickup only)'}</Text>
      </View>
      <View style={styles.mapSmall}>
        {API_KEY ? <GoogleMap key={`walk-${halt.id}`} apiKey={API_KEY} lines={map.lines} markers={map.markers} fitTo={map.fitTo} /> : null}
      </View>
      {walks.map((w) => (
        <Button key={w.url} title={w.label} variant="secondary" onPress={() => Linking.openURL(w.url)} />
      ))}
      {cards.map((c) => (
        <StopCardView key={c.no} card={c} status={stops[c.no]} setStop={setStop} />
      ))}
    </ScrollView>
  );
}

function StopCardView({
  card,
  status,
  setStop,
}: {
  card: StopCard;
  status: StopStatus | undefined;
  setStop: (no: number, s: StopStatus | null) => void;
}) {
  const notHome = () => {
    const pre = [
      card.preferredNeighbour ? `Preferred neighbour: ${card.preferredNeighbour}` : null,
      card.preferredDropoff ? `Preferred drop-off spot: ${card.preferredDropoff}` : null,
    ].filter(Boolean);
    Alert.alert('Not at home', pre.length ? pre.join('\n') : 'No preference in the tour list.', [
      { text: 'Neighbour', onPress: () => setStop(card.no, { kind: 'not_home', choice: 'neighbour' }) },
      { text: 'Drop-off spot', onPress: () => setStop(card.no, { kind: 'not_home', choice: 'dropoff' }) },
      { text: 'Stays in the van', onPress: () => setStop(card.no, { kind: 'not_home', choice: 'van' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const doneText =
    status?.kind === 'delivered'
      ? '✓ Delivered'
      : status?.kind === 'picked_up'
        ? '✓ Picked up → returns slot C4'
        : status?.kind === 'not_home'
          ? `Not at home · ${NOT_HOME_LABEL[status.choice]}`
          : null;

  const what = [
    card.parcels ? `${card.parcels} ${card.parcels === 1 ? 'parcel' : 'parcels'}` : null,
    card.pickups ? `${card.pickups} ${card.pickups === 1 ? 'pickup' : 'pickups'}` : null,
  ]
    .filter(Boolean)
    .join(' + ');

  return (
    <View style={[styles.card, status && styles.cardDone]}>
      <Text style={styles.cardTitle}>{card.address}</Text>
      <Text style={styles.cardSub}>
        {card.recipients} · {what}
      </Text>
      {card.badges.length ? (
        <View style={styles.badges}>
          {card.badges.map((b) => (
            <Badge key={b} label={b} tone={b === 'Priority' ? 'danger' : b.startsWith('Window') ? 'warn' : 'info'} />
          ))}
        </View>
      ) : null}
      {card.importNote ? <Text style={styles.importNote}>{card.importNote}</Text> : null}
      {card.notes.map((n) => (
        <Text key={n} style={styles.note}>
          “{n}”
        </Text>
      ))}
      {doneText ? (
        <View style={styles.doneRow}>
          <Text style={[styles.done, status?.kind === 'not_home' && { color: colors.warn }]}>{doneText}</Text>
          <Pressable hitSlop={10} onPress={() => setStop(card.no, null)}>
            <Text style={styles.undo}>Undo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button
              title={card.pickupOnly ? 'Picked up' : 'Delivered'}
              onPress={() => setStop(card.no, { kind: card.pickupOnly ? 'picked_up' : 'delivered' })}
            />
          </View>
          {card.pickupOnly ? null : (
            <Pressable hitSlop={10} onPress={notHome}>
              <Text style={styles.link}>Not at home ›</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  progressTrack: { height: 4, backgroundColor: colors.neutralBg },
  progressFill: { height: 4, backgroundColor: colors.primary },
  head: { padding: 16, gap: 4 },
  street: { fontSize: 26, fontWeight: '700', color: colors.text },
  sub: { fontSize: 15, color: colors.muted },
  reason: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 6 },
  source: { fontSize: 13, color: colors.muted, fontWeight: '400' },
  warning: { fontSize: 14, color: colors.warn, fontWeight: '600' },
  map: { flex: 1, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.neutralBg },
  mapSmall: { height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.neutralBg },
  footer: {
    padding: 16,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  scroll: { padding: 16, gap: 12, paddingBottom: 24 },
  takeOut: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: colors.primary },
  takeOutLabel: { fontSize: 13, fontWeight: '600', color: colors.muted },
  takeOutValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardDone: { opacity: 0.6 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 15, color: colors.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  importNote: { fontSize: 14, color: colors.warn, fontWeight: '600' },
  note: { fontSize: 14, color: colors.text, fontStyle: 'italic' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  doneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  done: { fontSize: 15, fontWeight: '700', color: colors.ok },
  undo: { color: colors.primary, fontSize: 14 },
});
