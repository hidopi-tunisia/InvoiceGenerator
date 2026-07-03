import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Configuration', headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'Configuration du profil' }} />
    </Stack>
  );
}
