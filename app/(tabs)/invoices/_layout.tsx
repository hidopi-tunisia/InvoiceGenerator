import { Stack } from 'expo-router';

export default function InvoiceLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Factures'}} />
      <Stack.Screen name="[id]/detail" options={{ title: 'Détail' }} />
    </Stack>
  );
}
