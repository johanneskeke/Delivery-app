import { router } from 'expo-router';

import { Button, H2, P, Screen } from '@/ui/kit';

/** Placeholder until the build step "Scan and load" (Mon 2026-11-23); already leads into the halt loop. */
export default function LoadScreen() {
  return (
    <Screen footer={<Button title="Start route" onPress={() => router.push('/tour')} />}>
      <H2>Scanning comes in the next build step</H2>
      <P muted>Scan and load (progress bar, “→ A2”) is planned for Mon 23 Nov.</P>
    </Screen>
  );
}
