import { router } from 'expo-router';
import { Alert } from 'react-native';

import { useDemoStore } from '@/store/demo-store';
import { Button, Card, H2, P, Screen } from '@/ui/kit';

/** Settings (gear icon). Navigation app, auto-navigation, language and walking distance follow on Tue 2026-11-24. */
export default function SettingsScreen() {
  const reset = useDemoStore((s) => s.reset);

  const confirmReset = () =>
    Alert.alert('Reset the demo?', 'Your progress on this phone is cleared. The plan data stay as they are.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: reset },
    ]);

  return (
    <Screen>
      <Card>
        <H2>About the data</H2>
        <P muted>Sources, data dates, assumptions and all reasons behind the route.</P>
        <Button title="Open" variant="secondary" onPress={() => router.push({ pathname: '/details', params: { tab: 'why' } })} />
      </Card>
      <Card>
        <H2>Demo</H2>
        <Button title="Reset demo" variant="danger" onPress={confirmReset} />
      </Card>
      <P muted>More settings (navigation app, language, walking distance) follow in a later build step.</P>
    </Screen>
  );
}
