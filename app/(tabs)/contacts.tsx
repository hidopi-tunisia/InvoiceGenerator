import { LegendList } from '@legendapp/list';
import { router } from 'expo-router';
import React from 'react';
import { View, Text } from 'react-native';

import { Button } from '~/components/Button';
import { useStore } from '~/store';

export default function ContactsScreen() {
  const contacts = useStore((state) => state.contacts);

  return (
    <View className="flex-1 bg-white p-6">
      {contacts.length === 0 ? ( // ✅ Vérifie si la liste est vide
        <View className="items-center p-8">
          <Text className="text-2xl font-bold text-gray-700">Pas de contact encore</Text>
          <Text className="mt-2 px-8 text-center text-base text-gray-500">
            Les contacts vont apparaître lorsque vous créerez des factures.
          </Text>
        </View>
      ) : (
        <LegendList
          data={contacts}
          estimatedItemSize={50} // Taille estimée pour meilleure fluidité
          renderItem={({ item: contact }) => (
            <View className="mb-4 rounded-lg bg-gray-100 p-4 shadow-sm">
              <Text className="text-lg font-semibold text-gray-800">{contact.name}</Text>
              <Text className="text-sm text-gray-600">{contact.address}</Text>
            </View>
          )}
        />
      )}

      {/* Bouton pour revenir à l'accueil */}
      <Button title="Revenir à l'accueil" className="mt-6" onPress={() => router.push('/')} />
    </View>
  );
}
