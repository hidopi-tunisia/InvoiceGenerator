import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { useStore } from '~/store';
export default function GenerateInvoiceLayout() {
  const startNewInvoice = useStore((data) => data.startNewInvoice);
  const newInvoice = useStore((data) => data.newInvoice);

  useEffect(() => {
    if (!newInvoice) {
      startNewInvoice();
    }
  }, []);
  if (!newInvoice) {
    return <ActivityIndicator />;
  }
  return (
    <Stack>
      {/* Rennommer les titres des pages */}
      <Stack.Screen name="index" options={{ title: 'Facture' }} />
      <Stack.Screen name="recipient" options={{ title: 'Recipient' }} />
      {/* <Stack.Screen name="invoice-info" options={{ title: 'Invoice' }} /> */}
      <Stack.Screen name="items" options={{ title: 'Designations' }} />
      <Stack.Screen name="summary" options={{ title: 'Recap' }} />
      <Stack.Screen name="success" options={{ title: 'Success', headerShown: false }} />
    </Stack>
  );
}
