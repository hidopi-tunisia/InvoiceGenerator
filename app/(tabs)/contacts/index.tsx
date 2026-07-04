import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { BusinessEntity } from '~/app/schema/invoice';
import Snackbar from '~/components/Snackbar';
import { useStore } from '~/store';
import { pushContactDeletion } from '~/store/contacts-sync';

function ContactListItem({
  contact,
  onDeleted,
}: {
  contact: BusinessEntity;
  onDeleted: (contact: BusinessEntity) => void;
}) {
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
          router.push(`/contacts/${contact.id}/edit`);
        } else if (index === 1) {
          Alert.alert('Confirmer', `Supprimer ${contact.name} ?`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: () => {
                deleteContact(contact);
                onDeleted(contact); // le parent affiche le snackbar d'annulation
              },
            },
          ]);
        }
      }}
      previewBackgroundColor="transparent"
      dropdownMenuMode={false}>
      <View className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-4 shadow-sm shadow-black/10">
        {/* Avatar avec initiales */}
        <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-lg font-semibold text-primary">{getInitials(contact.name)}</Text>
        </View>

        {/* Informations du contact */}
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">{contact.name}</Text>
          <Text className="text-sm text-gray-600">{contact.address}</Text>
        </View>

        {/* Bouton "Nouvelle facture" */}
        <Pressable
          onPress={handleNewInvoice}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Créer une facture pour ${contact.name}`}
          className="rounded-lg bg-emerald-500 px-4 py-2 shadow-sm shadow-black/10">
          <FontAwesome6 name="file-invoice" size={18} color="#fff" />
        </Pressable>
      </View>
    </ContextMenu>
  );
}

export default function ContactsScreen() {
  const contacts = useStore((state) => state.contacts);
  const addContact = useStore((state) => state.addContact);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletedContact, setDeletedContact] = useState<BusinessEntity | null>(null);

  // Confirmations : /contacts/new revient avec ?added=<nom>, l'édition avec
  // ?updated=<nom>. Le param est consommé avec '' (une valeur `undefined`
  // serait sérialisée en chaîne littérale "undefined" et re-déclencherait l'effet).
  const { added, updated } = useLocalSearchParams<{ added?: string; updated?: string }>();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  useEffect(() => {
    if (added) {
      setConfirmation(`Contact ${added} ajouté`);
      router.setParams({ added: '' });
    } else if (updated) {
      setConfirmation(`Contact ${updated} modifié`);
      router.setParams({ updated: '' });
    }
  }, [added, updated, router]);

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
          <Pressable
            onPress={() => setSearchQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
            className="p-2">
            <Feather name="x" size={20} color="#6b7280" />
          </Pressable>
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
            <Pressable
              onPress={() => router.push('/contacts/new')}
              accessibilityRole="button"
              className="mt-6 rounded-lg bg-primary px-6 py-3">
              <Text className="text-sm font-semibold text-white">Créer un contact</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Animated.FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          itemLayoutAnimation={LinearTransition}
          renderItem={({ item }) => (
            <ContactListItem contact={item} onDeleted={setDeletedContact} />
          )}
        />
      )}

      {/* Bouton flottant : nouveau contact (hors wizard) */}
      <Pressable
        onPress={() => router.push('/contacts/new')}
        accessibilityRole="button"
        accessibilityLabel="Ajouter un nouveau contact"
        className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-black/30">
        <Feather name="plus" size={26} color="#fff" />
      </Pressable>

      {/* Confirmation d'ajout/modification (masquée si un undo est affiché) */}
      <Snackbar
        visible={!!confirmation && !deletedContact}
        message={confirmation ?? ''}
        onDismiss={() => setConfirmation(null)}
        duration={3000}
      />

      {/* Undo de suppression — la suppression distante ne part qu'à la fermeture
          du snackbar : un undo n'envoie donc jamais de DELETE au serveur */}
      <Snackbar
        visible={!!deletedContact}
        message={`Contact ${deletedContact?.name ?? ''} supprimé`}
        actionLabel="Annuler"
        onAction={() => {
          if (deletedContact) addContact(deletedContact);
          setDeletedContact(null);
        }}
        onDismiss={() => {
          if (deletedContact) pushContactDeletion(deletedContact);
          setDeletedContact(null);
        }}
      />
    </View>
  );
}
