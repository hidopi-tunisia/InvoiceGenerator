import { Stack, Link } from 'expo-router';
import { View, Text } from 'react-native';

import { Button } from '~/components/Button';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Accueil' }} />
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
        <Link href={{ pathname: '/invoices/generate' }} asChild>
          <Button
            title="Nouvelle Facture"
            className="w-3/4 rounded-lg bg-indigo-500 py-4 shadow-lg"
          />
        </Link>

        {/* Footer minimal */}
        <View className="absolute bottom-8">
          <Text className="text-center text-sm text-gray-500">
            © 2024 Hidopi. Tous droits réservés.
          </Text>
        </View>
      </View>
    </>
  );
}
