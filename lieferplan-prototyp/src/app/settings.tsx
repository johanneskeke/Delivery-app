import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { NAV_APP_NAME, NAV_APPS } from '@/services/navigation';
import { useDemoStore } from '@/store/demo-store';
import { useSettingsStore } from '@/store/settings-store';
import { Badge, Button, Card, colors, H2, P, Screen } from '@/ui/kit';

/** Settings (gear icon), decided 2026-11-20 ("Settings and notes details"). */
export default function SettingsScreen() {
  const reset = useDemoStore((s) => s.reset);
  const { navApp, autoNavigate, setNavApp, setAutoNavigate } = useSettingsStore();

  const confirmReset = () =>
    Alert.alert(
      'Reset the demo?',
      'Progress, scans and your own notes on this phone are cleared. Settings and the plan data stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: reset },
      ],
    );

  return (
    <Screen>
      <Card>
        <H2>Navigation</H2>
        <View style={styles.segment}>
          {NAV_APPS.map((app) => (
            <Pressable
              key={app}
              accessibilityRole="button"
              accessibilityState={{ selected: app === navApp }}
              onPress={() => setNavApp(app)}
              style={[styles.segBtn, app === navApp && styles.segBtnActive]}>
              <Text style={[styles.segText, app === navApp && styles.segTextActive]}>{NAV_APP_NAME[app]}</Text>
            </Pressable>
          ))}
        </View>
        {navApp === 'waze' ? <P muted>Waze has no walking directions; walking opens Apple Maps.</P> : null}
        <View style={styles.row}>
          <Text style={styles.label}>Open navigation automatically after “Next halt”</Text>
          <Switch value={autoNavigate} onValueChange={setAutoNavigate} />
        </View>
      </Card>

      <Card>
        <H2>Driver</H2>
        <View style={styles.row}>
          <Text style={styles.label}>Language</Text>
          <Text style={styles.value}>English</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, styles.disabled]}>Deutsch</Text>
          <Badge label="planned" />
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, styles.disabled]}>Max. walking distance per halt: 150 m</Text>
          <Badge label="planned" />
        </View>
        <P muted>The route is computed before the tour; changing the walking distance needs a new calculation.</P>
      </Card>

      <Card>
        <H2>Data</H2>
        <Button title="About the data" variant="secondary" onPress={() => router.push({ pathname: '/details', params: { tab: 'why' } })} />
        <Button title="Reset demo" variant="danger" onPress={confirmReset} />
      </Card>

      <Pressable hitSlop={10} onPress={() => router.push('/map-test')} style={{ alignSelf: 'center' }}>
        <Text style={styles.dev}>Map test (developer)</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.neutralBg, borderRadius: 9, padding: 2 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.card },
  segText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segTextActive: { color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 36 },
  label: { flex: 1, fontSize: 15, color: colors.text },
  value: { fontSize: 15, color: colors.muted },
  disabled: { color: colors.muted },
  dev: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline', paddingVertical: 8 },
});
