import { router } from 'expo-router';

import { Button, H2, P, Screen } from '@/ui/kit';

/** Placeholder until the build step "Scan and load" (Mon 2026-11-23). */
export default function LoadScreen() {
  return (
    <Screen>
      <H2>Loading comes in the next build steps</H2>
      <P muted>Scan and load is planned for Mon 23 Nov, the halt loop for Sun 22 Nov.</P>
      <Button title="Map test (Google map in WebView)" variant="secondary" onPress={() => router.push('/map-test')} />
    </Screen>
  );
}
