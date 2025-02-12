import { Feather } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';

import { BusinessEntity } from '../schema/invoice';

import { useStore } from '~/store';

function ContactListItem({ contact }: { contact: BusinessEntity }) {
  const startNewInvoice = useStore((state) => state.startNewInvoice);
  const addRecipientInfo = useStore((state) => state.addRecipientInfo);
  const router = useRouter();

  const OnNewInvoicePressesd = () => {
    startNewInvoice();
    addRecipientInfo(contact);
    router.push('/invoices/generate');
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map((n) => n[0]).join('');
    return initials.toUpperCase();
  };

  return (
    <View className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-4 shadow-sm shadow-black/10">
      {/* Avatar avec initiales */}
      <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
        <Text className="text-lg font-semibold text-indigo-600">{getInitials(contact.name)}</Text>
      </View>
      {/* Informations du contact */}
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-800">{contact.name}</Text>
        <Text className="text-sm text-gray-600">{contact.address}</Text>
      </View>
      {/* Bouton "Nouvelle facture" */}
      <Pressable
        onPress={OnNewInvoicePressesd}
        className="flex-row items-center rounded-lg bg-emerald-500 px-4 py-2 shadow-sm shadow-black/10">
        <Feather name="file-plus" size={16} color="#fff" />
        <Text className="ml-2 text-sm font-medium text-white">Nouvelle facture</Text>
      </Pressable>
    </View>
  );
}

export default function ContactsScreen() {
  const contacts = useStore((state) => state.contacts);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Filtre les contacts en fonction de la recherche
  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-white p-6">
      {/* Barre de recherche */}
      <View className="mb-6 flex-row items-center rounded-lg bg-gray-100 px-4 py-2 shadow-sm shadow-black/10">
        <Feather name="search" size={20} color="#6b7280" />
        <TextInput
          placeholder="Rechercher un contact..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="ml-2 flex-1 text-base text-gray-800"
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} className="p-2">
            <Feather name="x" size={20} color="#6b7280" />
          </Pressable>
        )}
      </View>

      {filteredContacts.length === 0 ? ( // Vérifie si la liste est vide
        <View className="items-center p-8">
          <Feather name="user-plus" size={48} color="#6b7280" />
          <Text className="mt-4 text-2xl font-bold text-gray-700">
            {searchQuery ? 'Aucun résultat' : 'Pas de contact encore'}
          </Text>
          <Text className="mt-2 px-8 text-center text-base text-gray-500">
            {searchQuery
              ? 'Aucun contact ne correspond à votre recherche.'
              : 'Les contacts vont apparaître lorsque vous créerez des factures.'}
          </Text>
          {!searchQuery && (
            <Pressable
              onPress={() => router.push('/invoices/generate/new-contact')}
              className="mt-6 rounded-lg bg-indigo-500 px-6 py-3">
              <Text className="text-sm font-semibold text-white">Créer un contact</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <LegendList
          data={filteredContacts}
          estimatedItemSize={50} // Taille estimée pour meilleure fluidité
          renderItem={({ item }) => <ContactListItem contact={item} />}
        />
      )}
    </View>
  );
}
