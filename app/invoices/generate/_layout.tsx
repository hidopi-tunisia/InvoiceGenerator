import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { useStore } from '~/store';

//console.log(process.env.VEXO_API_KEY);
//if (!__DEV__) {
//console.log('====================================');
//console.log(process.env.VEXO_API_KEY, '2');
//console.log('====================================');
//vexo(process.env.VEXO_API_KEY || ''); // Remplacer 'YOUR_VEXO_ANALYTICS_API_KEY' par votre clé d'API Vexo Analytics
//vexo(process.env.VEXO_API_KEY as string);
//}

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
      <Stack.Screen name="index" options={{ title: 'Sender' }} />
      <Stack.Screen name="recipient" options={{ title: 'Recipient' }} />
      <Stack.Screen name="invoice-info" options={{ title: 'Invoice' }} />
      <Stack.Screen name="items" options={{ title: 'Designations' }} />
      <Stack.Screen name="summary" options={{ title: 'Recap' }} />
      <Stack.Screen name="success" options={{ title: 'Success', headerShown: false }} />
    </Stack>
  );
}
