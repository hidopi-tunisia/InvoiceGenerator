import AntDesign from '@expo/vector-icons/AntDesign'; // Import de l'icône
import { LegendList } from '@legendapp/list';
import { Redirect, router } from 'expo-router';
import React, { useCallback } from 'react';
import { Text, Pressable, View } from 'react-native';

import { BusinessEntity } from '~/app/schema/invoice';
import { useStore } from '~/store';

// Fonction pour générer une couleur basée sur le nom (hash simplifié)
const getAvatarColor = (name: string) => {
  const colors = ['bg-indigo-500', 'bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-yellow-500'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function ContactsScreen() {
  const contacts = useStore((state) => state.contacts);
  const addRecipientInfo = useStore((state) => state.addRecipientInfo);

  // Mémoisation de la fonction pour éviter des recréations inutiles
  const onContactPress = useCallback(
    (contact: BusinessEntity) => {
      addRecipientInfo(contact);
      router.push('/invoices/generate/items');
    },
    [addRecipientInfo]
  );

  // Fonction pour extraire les initiales du contact
  const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map((n) => n[0]).join('');
    return initials.toUpperCase();
  };

  // Redirection si aucun contact n'existe
  if (contacts.length === 0) {
    return <Redirect href="/invoices/generate/new-contact" />;
  }

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Liste des contacts */}
      <LegendList
        data={contacts}
        estimatedItemSize={80} // Ajusté pour la nouvelle taille des éléments
        renderItem={({ item: contact }) => (
          <Pressable
            onPress={() => onContactPress(contact)}
            className="mb-3 flex-row items-center rounded-lg bg-white p-4 shadow-sm shadow-black/10">
            {/* Avatar avec les initiales */}
            <View
              className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${getAvatarColor(contact.name)} shadow-md`}>
              <Text className="text-lg font-semibold text-white">{getInitials(contact.name)}</Text>
            </View>
            {/* Informations du contact */}
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">{contact.name}</Text>
              <Text className="text-sm text-gray-600">{contact.address}</Text>
            </View>
          </Pressable>
        )}
      />

      {/* Bouton flottant avec icône + */}
      <Pressable
        onPress={() => router.push('/invoices/generate/new-contact')}
        className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-indigo-500 shadow-lg shadow-black/30">
        <AntDesign name="plus" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}
