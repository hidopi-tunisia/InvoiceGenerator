import { Stack, router } from 'expo-router';
import { View, Text } from 'react-native';
import { customEvent } from 'vexo-analytics';
import { useStore } from '~/store';

import { Button } from '~/components/Button';

export default function Home() {
  // Reprendre les facture aprés fermeture de l'application
  const existingNewInvoice = useStore((data) => data.newInvoice);

  const onNewInvoice = () => {
    //throw new Error('testing');
    customEvent('Start_Fatoura_Jdida', {});
    router.push('/invoices/generate');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Accueil', headerShown: false }} />
      <View className="flex-1 items-center justify-center bg-indigo-50 p-6">
        {/* Message de bienvenue */}
        <View className="mb-8">
          <Text className="text-center text-3xl font-bold text-indigo-600">
            Bienvenue dans votre application de facturation !
          </Text>
          <Text className="mt-2 text-center text-lg text-gray-600">
            Générez facilement et rapidement vos factures professionnelles.
          </Text>
        </View>

        {/* Bouton mis en avant */}

        <Button
          title={existingNewInvoice ? 'Reprendre la facture' : 'Nouvelle Facture'}
          className="w-3/4 rounded-lg bg-indigo-500 py-4 shadow-lg"
          onPress={onNewInvoice}
        />

        {/* Footer minimal */}
        <View className="absolute bottom-8">
          <Text className="text-center text-sm text-gray-500">
            © 2025 Hidopi. Tous droits réservés.
          </Text>
        </View>
      </View>
    </>
  );
}
