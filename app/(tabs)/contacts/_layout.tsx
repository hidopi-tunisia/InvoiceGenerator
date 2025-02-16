import { Stack } from 'expo-router';

export default function ContactLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Contacts' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Modifier un contact' }} />
    </Stack>
  );
}
