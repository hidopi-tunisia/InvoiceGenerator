import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { BusinessEntity } from '../../schema/invoice';

import { useStore } from '~/store';

function ContactListItem({ contact }: { contact: BusinessEntity }) {
  const startNewInvoice = useStore((state) => state.startNewInvoice);
  const addRecipientInfo = useStore((state) => state.addRecipientInfo);
  const deleteContact = useStore((state) => state.deleteContact);
  const router = useRouter();

  const handleNewInvoice = () => {
    startNewInvoice();
    addRecipientInfo(contact);
    router.push('/invoices/generate');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const menuActions = [
    {
      title: 'Modifier',
      systemIcon: 'pencil',
      destructive: false,
    },
    {
      title: 'Supprimer',
      systemIcon: 'trash',
      destructive: true,
    },
  ];

  return (
    <ContextMenu
      actions={menuActions}
      onPress={(e) => {
        const index = e.nativeEvent.index;
        if (index === 0) {
          console.log('Modifier', contact);
          router.push(`/contacts/${contact.id}/edit`);
        } else if (index === 1) {
          Alert.alert('Confirmer', `Supprimer ${contact.name} ?`, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Confirmer', onPress: () => deleteContact(contact) },
          ]);
        }
      }}
      previewBackgroundColor="transparent"
      dropdownMenuMode={false}>
      <View className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-4 shadow-sm shadow-black/10">
        {/* Avatar avec initiales */}
        <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
          <Text className="text-lg font-semibold text-indigo-600">{getInitials(contact.name)}</Text>
        </View>

        {/* Informations du contact */}
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">{contact.name}</Text>
          <Text className="text-sm text-gray-600">{contact.address}</Text>
        </View>

        {/* Bouton "Nouvelle facture" */}
        <View className="rounded-lg bg-emerald-500 px-4 py-2 shadow-sm shadow-black/10">
          <FontAwesome6 name="file-invoice" size={18} color="#fff" onPress={handleNewInvoice} />
        </View>
      </View>
    </ContextMenu>
  );
}

export default function ContactsScreen() {
  const contacts = useStore((state) => state.contacts);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

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
          <View className="p-2">
            <Feather name="x" size={20} color="#6b7280" onPress={() => setSearchQuery('')} />
          </View>
        )}
      </View>

      {filteredContacts.length === 0 ? (
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
            <View className="mt-6 rounded-lg bg-indigo-500 px-6 py-3">
              <Text
                className="text-sm font-semibold text-white"
                onPress={() => router.push('/invoices/generate/new-contact')}>
                Créer un contact
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Animated.FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          itemLayoutAnimation={LinearTransition}
          renderItem={({ item }) => <ContactListItem contact={item} />}
        />
      )}
    </View>
  );
}
