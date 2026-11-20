import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text } from 'react-native';

import { colors } from '@/ui/kit';

/** Gear icon top right: opens the settings. */
export function SettingsButton() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Settings" hitSlop={12} onPress={() => router.push('/settings')}>
      <SymbolView name="gearshape" size={22} tintColor={colors.primary} fallback={<Text style={{ color: colors.primary }}>Settings</Text>} />
    </Pressable>
  );
}

/** Small, unobtrusive text button for the header. */
export function HeaderTextButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={12} onPress={onPress}>
      <Text style={{ color: colors.primary, fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}
