import { Stack } from 'expo-router';

export default function GenerateInvoiceLayout() {
  return (
    <Stack>
      {/* Rennommer les titres des pages */}
      <Stack.Screen name="index" options={{ title: 'Sender' }} />
      <Stack.Screen name="recipient" options={{ title: 'Recipient' }} />
      <Stack.Screen name="invoice-info" options={{ title: 'Invoice' }} />
      <Stack.Screen name="items" options={{ title: 'Designations' }} />
      <Stack.Screen name="summary" options={{ title: 'Recap' }} />
    </Stack>
  );
}
