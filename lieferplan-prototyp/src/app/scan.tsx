import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Package } from '@/domain/types';
import { recommendSlot, type SlotRecommendation } from '@/services/loading';
import { selectChosenPlan, useTourStore } from '@/store/tour-store';
import { Badge, Button, colors, H2, P, Row } from '@/ui/kit';

type Pending =
  | { kind: 'unknown'; code: string }
  | { kind: 'package'; pkg: Package; recommendation: SlotRecommendation | null; selected: string };

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const state = useTourStore();
  const { tour, slots, loadPackage } = state;
  const plan = selectChosenPlan(state);
  const [pending, setPending] = useState<Pending | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);

  if (!tour || !plan) return null;

  const loadedCount = tour.packages.filter((p) => p.slotId).length;

  const handleCode = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const pkg = tour.packages.find((p) => p.id === code);
    if (!pkg) {
      setPending({ kind: 'unknown', code });
      return;
    }
    const recommendation = recommendSlot(pkg, plan, tour.packages, slots);
    setPending({ kind: 'package', pkg, recommendation, selected: pkg.slotId ?? recommendation?.slotId ?? slots[0].id });
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => handleCode(result.data);

  const confirm = () => {
    if (pending?.kind !== 'package') return;
    loadPackage(pending.pkg.id, pending.selected);
    setLastLoaded(`${pending.pkg.id} → Fach ${pending.selected}`);
    setPending(null);
  };

  /** Zum Testen ohne Etiketten: nimmt das nächste noch nicht geladene Paket. */
  const simulateNext = () => {
    const next = tour.packages.find((p) => !p.slotId);
    if (next) handleCode(next.id);
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'datamatrix', 'ean13', 'code39'] }}
          // Während ein Ergebnis angezeigt wird, nicht weiter scannen.
          onBarcodeScanned={pending ? undefined : onBarcodeScanned}
        />
      ) : (
        <View style={styles.permission}>
          <P>Für das Scannen braucht die App Zugriff auf die Kamera.</P>
          <Button title="Kamera erlauben" onPress={requestPermission} />
        </View>
      )}

      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.counter}>
            {loadedCount} / {tour.packages.length} geladen
          </Text>
          {lastLoaded ? <Badge label={lastLoaded} tone="ok" /> : null}
        </Row>

        {pending?.kind === 'unknown' ? (
          <>
            <Badge label="Gehört nicht zu dieser Tour" tone="danger" />
            <P>Code: {pending.code}</P>
            <Button title="Weiter scannen" variant="secondary" onPress={() => setPending(null)} />
          </>
        ) : null}

        {pending?.kind === 'package' ? (
          <PackagePanel
            pending={pending}
            stopName={tour.stops.find((s) => s.id === pending.pkg.stopId)?.recipient ?? ''}
            slotIds={slots.map((s) => s.id)}
            onSelect={(selected) => setPending({ ...pending, selected })}
            onConfirm={confirm}
            onCancel={() => setPending(null)}
          />
        ) : null}

        {!pending ? (
          <>
            <P muted>Barcode oder QR-Code ins Bild halten.</P>
            <Row style={{ flexWrap: 'nowrap' }}>
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Code eintippen, z. B. PKT-1001"
                autoCapitalize="characters"
                style={styles.input}
                onSubmitEditing={() => {
                  handleCode(manualCode);
                  setManualCode('');
                }}
              />
            </Row>
            <Button title="Test: nächstes Paket ohne Etikett" variant="secondary" onPress={simulateNext} />
          </>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function PackagePanel(props: {
  pending: Extract<Pending, { kind: 'package' }>;
  stopName: string;
  slotIds: string[];
  onSelect: (slotId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { pending, stopName, slotIds, onSelect, onConfirm, onCancel } = props;
  const rec = pending.recommendation;
  return (
    <>
      <H2>{pending.pkg.id}</H2>
      <P>
        {rec ? `Halt ${rec.haltIndex + 1} · ` : ''}
        {stopName}
      </P>
      {pending.pkg.slotId ? <Badge label={`Liegt schon in Fach ${pending.pkg.slotId}`} tone="warn" /> : null}
      {rec ? (
        <P muted>
          Empfehlung: Fach {rec.slotId} ({rec.reason})
        </P>
      ) : null}
      <View style={styles.chips}>
        {slotIds.map((id) => (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            style={[styles.chip, id === rec?.slotId && styles.chipRecommended, id === pending.selected && styles.chipSelected]}>
            <Text style={[styles.chipText, id === pending.selected && styles.chipTextSelected]}>{id}</Text>
          </Pressable>
        ))}
      </View>
      <Button title={`In Fach ${pending.selected} legen`} onPress={onConfirm} />
      <Button title="Abbrechen" variant="secondary" onPress={onCancel} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permission: { flex: 1, padding: 24, gap: 12, justifyContent: 'center', backgroundColor: colors.bg },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
  },
  counter: { fontSize: 15, fontWeight: '600', color: colors.text },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 16,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minWidth: 52,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipRecommended: { borderColor: colors.ok, borderWidth: 2 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', color: colors.text },
  chipTextSelected: { color: colors.primaryText },
});
