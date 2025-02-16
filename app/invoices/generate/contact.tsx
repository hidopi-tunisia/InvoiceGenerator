import { Feather } from '@expo/vector-icons'; // Ajout pour la barre de recherche
import AntDesign from '@expo/vector-icons/AntDesign';
import { Redirect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text, Pressable, View, TextInput } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { BusinessEntity } from '~/app/schema/invoice';
import { useStore } from '~/store';

const getAvatarColor = (name: string) => {
  const colors = ['bg-indigo-500', 'bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-yellow-500'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function ContactsScreen() {
  const contacts = useStore((state) => state.contacts);
  const addRecipientInfo = useStore((state) => state.addRecipientInfo);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrage des contacts
  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onContactPress = useCallback(
    (contact: BusinessEntity) => {
      addRecipientInfo(contact);
      router.push('/invoices/generate/items');
    },
    [addRecipientInfo]
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  if (contacts.length === 0) {
    return <Redirect href="/invoices/generate/new-contact" />;
  }

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Barre de recherche */}
      <View className="mb-4 flex-row items-center rounded-lg bg-white px-4 py-2 shadow-sm shadow-black/10">
        <Feather name="search" size={20} color="#6b7280" />
        <TextInput
          placeholder="Rechercher un contact..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="ml-2 flex-1 text-base text-gray-900"
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} className="p-2">
            <Feather name="x" size={20} color="#6b7280" />
          </Pressable>
        )}
      </View>

      {/* Liste des contacts */}
      {filteredContacts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-gray-500">
            {searchQuery ? 'Aucun contact trouvé' : 'Commencez par créer un premier contact'}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredContacts}
          itemLayoutAnimation={LinearTransition}
          renderItem={({ item: contact }) => (
            <Pressable
              onPress={() => onContactPress(contact)}
              className="mb-3 flex-row items-center rounded-lg bg-white p-4 shadow-sm shadow-black/10">
              <View
                className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${getAvatarColor(contact.name)} shadow-md`}>
                <Text className="text-lg font-semibold text-white">
                  {getInitials(contact.name)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">{contact.name}</Text>
                <Text className="text-sm text-gray-600">{contact.address}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Bouton flottant */}
      <Pressable
        onPress={() => router.push('/invoices/generate/new-contact')}
        className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-indigo-500 shadow-lg shadow-black/30">
        <AntDesign name="plus" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}
