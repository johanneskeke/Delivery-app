import { useEffect, useMemo, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

/**
 * Google map inside the app: WebView + Maps JavaScript API (Maps Demo Key from .env).
 * The app only draws what the engine precomputed; it calls no Google routing service.
 */

export type LatLon = [number, number];

export type MapMarker = {
  id: string;
  position: LatLon;
  kind: 'parking' | 'door' | 'conflict' | 'start' | 'halt';
  label: string; // short text inside the marker, e.g. "P", "23", "✕"
  title: string; // shown in the info window (simple HTML)
  /** Optional group; groups can be switched on and off with `visibleGroups`. */
  group?: string;
};

export type MapLine = {
  id: string;
  path: LatLon[];
  kind: 'drive' | 'walk' | 'closure' | 'narrowing' | 'old_route' | 'new_route';
  title?: string;
  group?: string;
};

export type MapStatus = 'loading' | 'ready' | 'auth_failure' | 'load_error';

type Props = {
  apiKey: string;
  markers: MapMarker[];
  lines: MapLine[];
  /** Points the initial view must contain. */
  fitTo: LatLon[];
  /** Groups to show; objects without a group are always shown. Changing it does not reload the map. */
  visibleGroups?: string[];
  onStatus?: (status: MapStatus, detail?: string) => void;
};

// A fixed https origin, so the Maps JS API sees a normal web page and not about:blank.
const BASE_URL = 'https://m10-prototype.local/';

export function GoogleMap({ apiKey, markers, lines, fitTo, visibleGroups, onStatus }: Props) {
  // WebView's type parameter defaults to undefined, which makes its props "never"; object fixes that.
  const ref = useRef<WebView<object>>(null);
  // The first visible groups go into the page; later changes are sent without reloading the map.
  const [initialGroups] = useState(visibleGroups);
  const html = useMemo(
    () => buildHtml(apiKey, { markers, lines, fitTo, visibleGroups: initialGroups ?? null }),
    [apiKey, markers, lines, fitTo, initialGroups],
  );

  useEffect(() => {
    if (!visibleGroups) return;
    ref.current?.injectJavaScript(`window.setGroups(${JSON.stringify(visibleGroups)}); true;`);
  }, [visibleGroups]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { status: MapStatus; detail?: string };
      onStatus?.(msg.status, msg.detail);
    } catch {
      // ignore messages that are not ours
    }
  };

  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html, baseUrl: BASE_URL }}
      onMessage={onMessage}
      onError={(e) => onStatus?.('load_error', e.nativeEvent.description)}
      javaScriptEnabled
      style={{ flex: 1 }}
    />
  );
}

function buildHtml(
  apiKey: string,
  data: { markers: MapMarker[]; lines: MapLine[]; fitTo: LatLon[]; visibleGroups: string[] | null },
) {
  // JSON goes into a <script> block; escape "<" so a string can never close the tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, sans-serif; }
  .iw { font-size: 14px; max-width: 220px; }
</style>
</head><body>
<div id="map"></div>
<script>
  const DATA = ${json};
  const post = (status, detail) =>
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ status, detail }));
  // Google calls this when the key is rejected (wrong key, API not enabled, referrer blocked, quota).
  window.gm_authFailure = () => post('auth_failure', 'Google rejected the Maps key');

  // Group visibility; may be called before the map is ready.
  let groups = DATA.visibleGroups;
  const grouped = [];
  let map = null;
  const applyGroups = () => {
    if (!map) return;
    for (const [g, obj] of grouped) obj.setMap(!groups || groups.includes(g) ? map : null);
  };
  window.setGroups = (g) => { groups = g; applyGroups(); };

  const STYLE = {
    drive:     { strokeColor: '#1F5FD1', strokeOpacity: 0.9, strokeWeight: 5 },
    new_route: { strokeColor: '#1F5FD1', strokeOpacity: 0.85, strokeWeight: 4, zIndex: 3 },
    old_route: { strokeColor: '#667085', strokeOpacity: 0.55, strokeWeight: 4, zIndex: 2 },
    walk:      { strokeOpacity: 0, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: '#14161A', scale: 3 }, offset: '0', repeat: '12px' }] },
    closure:   { strokeColor: '#D92D20', strokeOpacity: 0.85, strokeWeight: 7, zIndex: 4 },
    narrowing: { strokeColor: '#F79009', strokeOpacity: 0.85, strokeWeight: 6, zIndex: 4 },
  };
  const MARKER = {
    parking:  { shape: 'square', fill: '#1F5FD1', size: 11, font: '14px', z: 10 },
    door:     { shape: 'circle', fill: '#14161A', size: 11, font: '12px', z: 5 },
    conflict: { shape: 'circle', fill: '#D92D20', size: 10, font: '12px', z: 8 },
    start:    { shape: 'square', fill: '#1E7F4F', size: 11, font: '13px', z: 9 },
    halt:     { shape: 'circle', fill: '#1F5FD1', size: 9, font: '10px', z: 6 },
  };
  const ll = (p) => ({ lat: p[0], lng: p[1] });

  function initMap() {
    try {
      map = new google.maps.Map(document.getElementById('map'), {
        center: ll(DATA.fitTo[0]), zoom: 15,
        disableDefaultUI: true, zoomControl: true, clickableIcons: false,
        gestureHandling: 'greedy',
      });
      const iw = new google.maps.InfoWindow();
      const open = (html, pos, anchor) => { iw.setContent('<div class="iw">' + html + '</div>'); anchor ? iw.open({ map, anchor }) : (iw.setPosition(pos), iw.open({ map })); };

      for (const l of DATA.lines) {
        const line = new google.maps.Polyline({ path: l.path.map(ll), map, ...STYLE[l.kind] });
        if (l.title) line.addListener('click', (e) => open(l.title, e.latLng));
        if (l.group) grouped.push([l.group, line]);
      }
      for (const m of DATA.markers) {
        const s = MARKER[m.kind];
        const marker = new google.maps.Marker({
          position: ll(m.position), map, title: m.title,
          label: { text: m.label, color: '#FFFFFF', fontWeight: '700', fontSize: s.font },
          icon: {
            path: s.shape === 'square' ? 'M -11,-11 11,-11 11,11 -11,11 z' : google.maps.SymbolPath.CIRCLE,
            scale: s.shape === 'square' ? s.size / 11 : s.size,
            fillColor: s.fill, fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: 2,
          },
          zIndex: s.z,
        });
        marker.addListener('click', () => open(m.title, null, marker));
        if (m.group) grouped.push([m.group, marker]);
      }
      applyGroups();
      const b = new google.maps.LatLngBounds();
      DATA.fitTo.forEach((p) => b.extend(ll(p)));
      map.fitBounds(b, 40);
      google.maps.event.addListenerOnce(map, 'idle', () => {
        if (map.getZoom() > 18) map.setZoom(18);
        post('ready');
      });
    } catch (err) {
      post('load_error', String(err));
    }
  }
  window.initMap = initMap;
</script>
<script async
  src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=initMap&v=weekly"
  onerror="post('load_error', 'Maps script could not be loaded (network?)')"></script>
</body></html>`;
}
