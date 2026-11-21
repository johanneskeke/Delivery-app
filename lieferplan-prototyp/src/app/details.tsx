import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMap, type LatLon, type MapLine, type MapMarker, type MapStatus } from '@/components/google-map';
import { importData, listPlan, mapData, meta, route, stopByNo } from '@/data/bundle';
import type { Plan } from '@/data/types';
import { EXAMPLE_NOTES } from '@/data/example-notes';
import { formatDate, formatDateTime } from '@/lib/format';
import { useDemoStore } from '@/store/demo-store';
import { colors } from '@/ui/kit';

/**
 * Detail view behind the small "Details" button (redesign 2026-11-20):
 * tab "Map" = old list vs. new route on a Google map; tab "Why" = every change with reason and source.
 * Everything is precomputed; this screen only looks things up.
 */

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

// ---------------------------------------------------------------- map content (static, built once)

const routePath = (p: Plan): LatLon[] => [...p.halts.flatMap((h) => h.drive_path), ...p.return_path];

const MAP_LINES: MapLine[] = [
  { id: 'old', path: routePath(listPlan), kind: 'old_route', group: 'old' },
  { id: 'new', path: routePath(route), kind: 'new_route', group: 'new' },
  ...mapData.closures
    .filter((c) => c.kind !== 'note')
    .flatMap((c, i) =>
      c.lines.map((line, j) => ({
        id: `closure-${i}-${j}`,
        path: line,
        kind: c.kind === 'full' ? ('closure' as const) : ('narrowing' as const),
        title: `<b>${c.kind === 'full' ? 'Closed' : 'Closed in one direction'}</b>: ${c.street}<br>${c.section}<br>Source: ${c.source}`,
      })),
    ),
];

const MAP_MARKERS: MapMarker[] = [
  {
    id: 'start',
    position: mapData.start_point.latlon,
    kind: 'start',
    label: 'S',
    title: `<b>Start</b>: ${mapData.start_point.name}<br>${mapData.start_point.note}`,
  },
  ...listPlan.halts
    .filter((h) => h.conflicts.length)
    .map((h) => ({
      id: `conflict-${h.id}`,
      position: h.parking.latlon,
      kind: 'conflict' as const,
      label: '✕',
      title: `<b>${h.stops.map((s) => s.address).join(', ')}</b><br>${h.conflicts.map((c) => `${c.text} (${c.source})`).join('<br>')}`,
      group: 'old',
    })),
  ...route.halts.map((h) => ({
    id: `halt-${h.id}`,
    position: h.parking.latlon,
    kind: 'halt' as const,
    label: String(h.seq),
    title: `<b>Halt ${h.seq}</b>, arrival ${h.arrival}<br>Park: ${h.parking.street}<br>${h.stops.map((s) => s.address).join('<br>')}`,
    group: 'new',
  })),
];

const FIT_TO: LatLon[] = [...route.halts.map((h) => h.parking.latlon), ...listPlan.halts.map((h) => h.parking.latlon)];

// ---------------------------------------------------------------- "Why" content (static, built once)

type Row = { title: string; detail?: string; source?: string };
type Section = { key: string; title: string; rows: Row[] };

const changeRows = (kinds: string[]): Row[] =>
  route.changes
    .filter((c) => kinds.includes(c.kind))
    .map((c) => ({ title: c.title, detail: c.detail, source: [c.source.name, c.source.ref].filter(Boolean).join(' · ') }));

const newEta = new Map(route.halts.flatMap((h) => h.stops.map((s) => [s.no, s.eta] as const)));

const timeRows: Row[] = [
  ...changeRows(['order_replanned', 'halt_moved_earlier']),
  ...listPlan.halts.flatMap((h) =>
    h.conflicts
      .filter((c) => c.kind === 'late' || c.kind === 'too_early')
      .map((c) => {
        const s = h.stops[0];
        const who = stopByNo(s.no)?.recipient;
        return {
          title: `${s.address}${who ? ` (${who})` : ''}`,
          detail: `List order: ${c.text}. New route: at the door ${newEta.get(s.no) ?? '–'}${
            s.window?.until ? `, window until ${s.window.until}` : ''
          }${s.window?.from ? `, opens ${s.window.from}` : ''}.`,
          source: c.source,
        };
      }),
  ),
];

const walkRows: Row[] = route.halts.flatMap((h) =>
  h.warnings.map((w) => ({ title: `Halt ${h.seq}: ${h.stops.map((s) => s.address).join(', ')}`, detail: w.text, source: w.source })),
);

// Must stay above SECTIONS: SECTIONS is built when the file loads and uses these names.
const DATA_LABEL: Record<string, string> = {
  closures_viz: 'Closures, VIZ Berlin (editorial feed)',
  closures_landesmeldestelle: 'Closures, VIZ Berlin (Landesmeldestelle)',
  loading_zones_osm: 'Loading and no-stopping zones, OpenStreetMap',
  road_network_osm: 'Road network and addresses, OpenStreetMap',
  weather_dwd: 'Weather forecast, Deutscher Wetterdienst',
  demonstrations_police: 'Demonstrations, Berlin Police',
};

const SECTIONS: Section[] = [
  { key: 'closures', title: 'Closures and no-stopping zones', rows: [...changeRows(['parking_moved']), ...walkRows] },
  { key: 'time', title: 'Time windows and priority', rows: timeRows },
  { key: 'loading', title: 'Loading zones', rows: changeRows(['loading_zone', 'loading_zone_not_valid']) },
  { key: 'bundle', title: 'Stops bundled', rows: changeRows(['bundle']) },
  {
    key: 'import',
    title: 'Import check',
    rows: importData.notes.map((n) => ({
      title: n.text,
      detail: `Stop ${n.stop_no} · in the list: ${n.original}`,
      source: n.source,
    })),
  },
  {
    key: 'data',
    title: 'Data and assumptions',
    rows: [
      { title: `Plan computed ${formatDateTime(meta.generated_at)}`, detail: `${meta.engine}. Tour day ${formatDate(meta.tour_date)}, departure ${meta.departure}.` },
      ...Object.entries(meta.data_as_of).map(([k, d]) => ({ title: `${DATA_LABEL[k] ?? k}`, detail: `as of ${formatDate(d)}` })),
      { title: `Weather: ${meta.weather.summary}`, detail: `Surcharge ${meta.weather.surcharge}${meta.weather.note ? ` · ${meta.weather.note}` : ''}`, source: meta.weather.source },
      ...meta.assumptions.map((a) => ({ title: a, detail: 'Assumption' })),
      ...meta.attributions.map((a) => ({ title: a, detail: 'Attribution' })),
      { title: meta.synthetic_label },
    ],
  },
];

// ---------------------------------------------------------------- screen

type Tab = 'map' | 'why';
// Only "Old" and "New" (decided 2026-11-21); the map starts with the new route.
type Show = 'old' | 'new';
const GROUPS: Record<Show, string[]> = { old: ['old'], new: ['new'] };
const LEGEND: Record<Show, string> = {
  old: 'Grey: your list · ✕ conflict · Red: closed',
  new: 'Blue: new route · numbers: halts · Red: closed',
};

export default function DetailsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'why' ? 'why' : 'map');

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.segment}>
        <SegmentButton label="Map" active={tab === 'map'} onPress={() => setTab('map')} />
        <SegmentButton label="Why" active={tab === 'why'} onPress={() => setTab('why')} />
      </View>
      {tab === 'map' ? <MapTab /> : <WhyTab />}
    </SafeAreaView>
  );
}

function MapTab() {
  const [show, setShow] = useState<Show>('new');
  const [status, setStatus] = useState<MapStatus>('loading');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {API_KEY ? (
          <GoogleMap
            apiKey={API_KEY}
            markers={MAP_MARKERS}
            lines={MAP_LINES}
            fitTo={FIT_TO}
            visibleGroups={GROUPS[show]}
            onStatus={(s) => setStatus(s)}
          />
        ) : (
          <Text style={styles.error}>No map key in .env (EXPO_PUBLIC_GOOGLE_MAPS_KEY).</Text>
        )}
        {status === 'auth_failure' || status === 'load_error' ? (
          <Text style={styles.error}>The map could not be loaded ({status}).</Text>
        ) : null}
      </View>
      <View style={styles.mapFooter}>
        <View style={styles.segment}>
          <SegmentButton label="Old" active={show === 'old'} onPress={() => setShow('old')} />
          <SegmentButton label="New" active={show === 'new'} onPress={() => setShow('new')} />
        </View>
        <Text style={styles.legend}>{LEGEND[show]}</Text>
      </View>
    </View>
  );
}

function WhyTab() {
  const [open, setOpen] = useState<string | null>(null);
  // Driver notes (2026-11-20): driver knowledge flowing back to the back office; stored on this phone in the demo.
  const own = useDemoStore((s) => s.notes);
  const noteRows: Row[] = [
    ...Object.entries(EXAMPLE_NOTES).map(([no, n]) => ({
      title: n.text,
      detail: `${stopByNo(Number(no))?.address ?? `Stop ${no}`} · earlier driver · synthetic example`,
    })),
    ...Object.entries(own).map(([no, n]) => ({
      title: n.text,
      detail: `${stopByNo(Number(no))?.address ?? `Stop ${no}`} · driver, ${n.at}`,
    })),
  ];
  const sections: Section[] = [...SECTIONS.slice(0, 4), { key: 'notes', title: 'Driver notes', rows: noteRows }, ...SECTIONS.slice(4)];
  return (
    <ScrollView contentContainerStyle={styles.why}>
      <Text style={styles.intro}>
        Every change in the new route, with reason and source. Computed before the tour by our planning engine.
      </Text>
      {sections.filter((s) => s.rows.length).map((s) => {
        const isOpen = open === s.key;
        return (
          <View key={s.key} style={styles.section}>
            <Pressable style={styles.sectionHead} onPress={() => setOpen(isOpen ? null : s.key)}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.count}>
                {s.rows.length} {isOpen ? '▴' : '▾'}
              </Text>
            </Pressable>
            {isOpen
              ? s.rows.map((r, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={styles.rowTitle}>{r.title}</Text>
                    {r.detail ? <Text style={styles.rowDetail}>{r.detail}</Text> : null}
                    {r.source ? <Text style={styles.rowSource}>Source: {r.source}</Text> : null}
                  </View>
                ))
              : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  segment: { flexDirection: 'row', backgroundColor: colors.neutralBg, borderRadius: 9, padding: 2, margin: 12 },
  segBtn: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.card },
  segText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segTextActive: { color: colors.text },
  mapFooter: { backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingBottom: 8 },
  legend: { fontSize: 12, color: colors.muted, textAlign: 'center', paddingHorizontal: 12, marginTop: 4 },
  error: { position: 'absolute', top: 12, left: 12, right: 12, color: colors.danger, fontWeight: '600' },
  why: { padding: 12, paddingTop: 0, gap: 10, paddingBottom: 32 },
  intro: { fontSize: 14, color: colors.muted },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  count: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  row: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 2 },
  rowTitle: { fontSize: 15, color: colors.text, fontWeight: '500' },
  rowDetail: { fontSize: 14, color: colors.muted },
  rowSource: { fontSize: 12, color: colors.muted },
});
