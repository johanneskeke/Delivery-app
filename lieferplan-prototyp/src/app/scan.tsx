import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isLoaded, loadable, scanResult, type ScanResult } from '@/data/loading';
import { useDemoStore } from '@/store/demo-store';
import { Button, colors } from '@/ui/kit';

/**
 * Scanner (decided 2026-11-20, "Scan and load details"): the camera stays open; every scan shows a large result
 * card for about 2 s; vibration only; "Type number" as a fallback. Camera logic taken from the parked skeleton.
 */

const SHOW_MS = 2200;
const SAME_CODE_PAUSE_MS = 3000; // the camera reports the same barcode many times per second
const STRIP_HEIGHT = 170; // the bright strip to aim at; everything else is darkened
const SHADE = 'rgba(0,0,0,0.88)';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const scanned = useDemoStore((s) => s.scanned);
  const markScanned = useDemoStore((s) => s.markScanned);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const loaded = loadable.filter((s) => isLoaded(s.id, scanned)).length;

  const handle = (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    const now = Date.now();
    if (last.current && last.current.code === code && now - last.current.at < SAME_CODE_PAUSE_MS) return;
    last.current = { code, at: now };

    const r = scanResult(code, scanned);
    if (r.kind === 'slot' || r.kind === 'floor') {
      markScanned(r.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (r.kind === 'not_on_list') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setResult(r);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setResult(null), SHOW_MS);
  };

  const onBarcodeScanned = (e: BarcodeScanningResult) => {
    if (!result) handle(e.data);
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      ) : (
        <View style={styles.permission}>
          <Text style={styles.permissionText}>To scan the parcel labels, the app needs the camera.</Text>
          <Button title="Allow camera" onPress={requestPermission} />
        </View>
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        {/* dark area above the strip, with Done and the counter below the status bar */}
        <View style={[styles.shade, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topBar}>
            <Pressable hitSlop={12} onPress={() => router.back()}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
            <Text style={styles.counter}>
              {loaded} of {loadable.length} loaded
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.aim}>Hold the barcode inside the strip</Text>
        </View>

        {/* the strip: camera visible, white corners as an aiming aid */}
        <View style={styles.stripRow} pointerEvents="none">
          <View style={styles.stripSide} />
          <View style={styles.strip}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <View style={styles.stripSide} />
        </View>

        {/* dark area below: result card and the typing fallback */}
        <View style={[styles.shade, styles.below, { paddingBottom: insets.bottom + 12 }]}>
          {result ? <ResultCard r={result} /> : <View style={{ flex: 1 }} />}
          <View style={styles.bottom}>
            {typing ? (
              <View style={styles.typeRow}>
                <TextInput
                  value={typed}
                  onChangeText={setTyped}
                  placeholder="SYN…"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    last.current = null; // typing the same number again should work
                    handle(typed);
                    setTyped('');
                  }}
                />
                <Pressable hitSlop={10} onPress={() => setTyping(false)}>
                  <Text style={styles.typeLink}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable hitSlop={10} onPress={() => setTyping(true)}>
                <Text style={styles.typeLink}>Type number</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function ResultCard({ r }: { r: ScanResult }) {
  switch (r.kind) {
    case 'slot':
      return (
        <View style={[styles.card, { borderColor: colors.ok }]}>
          <Text style={styles.big}>→ {r.slot}</Text>
          <Text style={styles.line}>
            Halt {r.halt} · {r.address}
          </Text>
          <Text style={styles.sub}>{r.recipient}</Text>
          {r.heavyKg ? <Text style={styles.heavy}>{r.heavyKg} kg → bottom slot</Text> : null}
        </View>
      );
    case 'floor':
      return (
        <View style={[styles.card, { borderColor: colors.ok }]}>
          <Text style={styles.bigSmall}>→ Floor at the back</Text>
          <Text style={styles.line}>
            Bulky item · Halt {r.halt} · {r.address}
          </Text>
          <Text style={styles.sub}>{r.recipient}</Text>
        </View>
      );
    case 'already':
      return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.neutralBg }]}>
          <Text style={[styles.bigSmall, { color: colors.muted }]}>Already scanned → {r.slot}</Text>
          <Text style={styles.sub}>{r.id}</Text>
        </View>
      );
    case 'pickup':
      return (
        <View style={[styles.card, { borderColor: colors.warn }]}>
          <Text style={[styles.bigSmall, { color: colors.warn }]}>Pickup, not loaded</Text>
          <Text style={styles.sub}>Collect it at {r.address}; it goes into the returns slot.</Text>
        </View>
      );
    case 'not_on_list':
      return (
        <View style={[styles.card, { borderColor: colors.danger, backgroundColor: colors.dangerBg }]}>
          <Text style={[styles.bigSmall, { color: colors.danger }]}>Not on the list</Text>
          <Text style={styles.line}>Put it aside and report it at the depot.</Text>
          <Text style={styles.sub}>{r.id}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permission: { flex: 1, padding: 24, gap: 16, justifyContent: 'center', backgroundColor: colors.bg },
  permissionText: { fontSize: 16, color: colors.text, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  shade: { flex: 1, backgroundColor: SHADE, paddingHorizontal: 16 },
  below: { flex: 1.4, paddingTop: 12, justifyContent: 'space-between' },
  aim: { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', marginBottom: 10 },
  stripRow: { height: STRIP_HEIGHT, flexDirection: 'row' },
  stripSide: { width: 20, backgroundColor: SHADE },
  strip: { flex: 1 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  done: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  counter: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 3,
    padding: 20,
    gap: 6,
    alignItems: 'center',
  },
  big: { fontSize: 72, fontWeight: '800', color: colors.text },
  bigSmall: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center' },
  line: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  heavy: { fontSize: 16, fontWeight: '700', color: colors.warn },
  bottom: { paddingTop: 12, alignItems: 'center' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 18,
    color: colors.text,
  },
  typeLink: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
