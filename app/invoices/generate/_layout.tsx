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
      {/* Indicateur de progression : l'utilisateur sait où il en est (règle multi-step-progress) */}
      <Stack.Screen name="index" options={{ title: 'Facture · Étape 1/4' }} />
      <Stack.Screen name="contact" options={{ title: 'Client · Étape 2/4' }} />
      <Stack.Screen name="new-contact" options={{ title: 'Nouveau client · Étape 2/4' }} />
      <Stack.Screen name="items" options={{ title: 'Désignations · Étape 3/4' }} />
      <Stack.Screen name="summary" options={{ title: 'Récapitulatif · Étape 4/4' }} />
    </Stack>
  );
}
