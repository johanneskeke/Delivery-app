import { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMap, type LatLon, type MapLine, type MapMarker, type MapStatus } from '@/components/google-map';
import spike from '@/dev/map-test-data.json';
import { appleUrl, drivingUrl, walkingUrl } from '@/services/navigation';
import { Button, colors, Row } from '@/ui/kit';

/**
 * Build step 1 (2026-11-20): does the Maps Demo Key work inside the WebView on the iPhone?
 * Shows one real halt (Solmsstraße 7/12, parking in Fürbringerstraße) with the VIZ closures around it.
 * Temporary dev screen; the halt loop replaces it.
 */

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

const STATUS_TEXT: Record<MapStatus, string> = {
  loading: 'Loading Google map …',
  ready: 'Google map loaded: the key works in the WebView.',
  auth_failure: 'Google rejected the key. Check the key, the Maps JavaScript API and key restrictions.',
  load_error: 'The map script did not load.',
};

export default function MapTestScreen() {
  const [status, setStatus] = useState<MapStatus>('loading');
  const [detail, setDetail] = useState<string | undefined>();

  const { markers, lines, fitTo } = useMemo(() => {
    const h = spike.halt;
    const parking = h.parking.latlon as LatLon;
    const markers: MapMarker[] = [
      {
        id: 'parking',
        position: parking,
        kind: 'parking',
        label: 'P',
        title: `<b>Park here</b><br>${h.parking.street} (${h.parking.kind === 'kerbside' ? 'kerbside' : 'loading zone'})<br>arrival ${h.arrival}`,
      },
      ...h.stops.map((s) => ({
        id: `door-${s.no}`,
        position: s.latlon as LatLon,
        kind: 'door' as const,
        label: String(s.no),
        title: `<b>Stop ${s.no}</b><br>${s.address}<br>at the door ${s.eta}`,
      })),
    ];
    const lines: MapLine[] = [
      ...spike.closures.map((c, i) => ({
        id: `closure-${i}`,
        path: c.path as LatLon[],
        kind: c.full ? ('closure' as const) : ('narrowing' as const),
        title: `<b>${c.full ? 'Closed' : 'Note'}</b>: ${c.street}<br>until ${c.until.slice(0, 10)}<br>Source: ${c.source}`,
      })),
      // Walking lines are straight lines, as in the engine's calculation (straight line × 1.25).
      ...h.stops.map((s) => ({ id: `walk-${s.no}`, path: [parking, s.latlon as LatLon], kind: 'walk' as const })),
    ];
    const fitTo: LatLon[] = [parking, ...h.stops.map((s) => s.latlon as LatLon)];
    return { markers, lines, fitTo };
  }, []);

  const parking = { lat: spike.halt.parking.latlon[0], lng: spike.halt.parking.latlon[1] };
  const doors = spike.halt.stops.map((s) => ({ lat: s.latlon[0], lng: s.latlon[1] }));

  const tone = status === 'ready' ? colors.ok : status === 'loading' ? colors.muted : colors.danger;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.banner}>
        {API_KEY ? (
          <>
            <Text style={[styles.status, { color: tone }]}>{STATUS_TEXT[status]}</Text>
            {detail ? <Text style={styles.small}>{detail}</Text> : null}
          </>
        ) : (
          <Text style={[styles.status, { color: colors.danger }]}>
            No key: add EXPO_PUBLIC_GOOGLE_MAPS_KEY to lieferplan-prototyp/.env and restart Expo.
          </Text>
        )}
        <Text style={styles.small}>
          Synthetic tour · halt Solmsstraße 7 + 12 · closures: VIZ Berlin (2026-11-19, dl-de-by-2.0)
        </Text>
      </View>

      <View style={styles.map}>
        {API_KEY ? (
          <GoogleMap
            apiKey={API_KEY}
            markers={markers}
            lines={lines}
            fitTo={fitTo}
            onStatus={(s, d) => {
              setStatus(s);
              setDetail(d);
            }}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Row style={{ flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}>
            <Button title="Drive" onPress={() => Linking.openURL(drivingUrl(parking))} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Walk in Google Maps" variant="secondary" onPress={() => Linking.openURL(walkingUrl(doors))} />
          </View>
        </Row>
        {/* Test 2026-11-20: does Apple Maps take several doors in one walking link? (not documented for walking) */}
        <Button
          title="Test: Apple Maps walking, both doors"
          variant="secondary"
          onPress={() => Linking.openURL(appleUrl(doors[doors.length - 1], 'walking', doors.slice(0, -1)))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  banner: { padding: 12, gap: 4, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border },
  status: { fontSize: 15, fontWeight: '600' },
  small: { fontSize: 12, color: colors.muted },
  map: { flex: 1 },
  footer: { padding: 12, gap: 8, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border },
});
