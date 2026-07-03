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
      <Stack.Screen name="contact" options={{ title: 'Sélectionnez un client' }} />
      <Stack.Screen name="new-contact" options={{ title: 'Nouveau contact' }} />
      <Stack.Screen name="items" options={{ title: 'Désignations' }} />
      <Stack.Screen name="summary" options={{ title: 'Récapitulatif' }} />
    </Stack>
  );
}
