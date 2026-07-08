import { Feather } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import {
  formatAmount,
  formatDate,
  getDisplayStatus,
  getInvoiceCurrency,
  getStatusColor,
  getTotals,
} from '~/app/utils/invoice';
import { Button } from '~/components/Button';
import { useStore } from '~/store';
import { pushContactDeletion } from '~/store/contacts-sync';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

// Ligne d'info (icône + valeur), masquée si la valeur est absente
function InfoRow({
  icon,
  value,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  value?: string;
  onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 border-b border-gray-100 py-3.5"
      accessibilityRole={onPress ? 'button' : undefined}>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-50">
        <Feather name={icon} size={16} color="#6b7280" />
      </View>
      <Text className={`flex-1 text-base ${onPress ? 'text-primary' : 'text-gray-700'}`}>
        {value}
      </Text>
      {onPress && <Feather name="chevron-right" size={14} color="#d1d5db" />}
    </Pressable>
  );
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contact = useStore((state) => state.contacts.find((c) => c.id === id));
  const invoices = useStore((state) => state.invoices);
  const startNewInvoice = useStore((state) => state.startNewInvoice);
  const addRecipientInfo = useStore((state) => state.addRecipientInfo);
  const deleteContact = useStore((state) => state.deleteContact);

  if (!contact) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-gray-500">Contact introuvable.</Text>
      </View>
    );
  }

  // Factures de ce contact : match remoteId, sinon id local, sinon email
  const contactInvoices = invoices.filter((inv) => {
    const r = inv.recipient;
    if (!r) return false;
    if (contact.remoteId && r.remoteId) return r.remoteId === contact.remoteId;
    if (r.id === contact.id) return true;
    return !!contact.email && r.email?.toLowerCase() === contact.email.toLowerCase();
  });

  const onNewInvoice = () => {
    startNewInvoice();
    addRecipientInfo(contact);
    router.push('/invoices/generate/items');
  };

  const onDelete = () => {
    Alert.alert('Supprimer le contact', `Supprimer ${contact.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteContact(contact);
          pushContactDeletion(contact);
          router.back();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Contact',
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/contacts/${contact.id}/edit`)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Modifier le contact">
              <Text className="font-medium text-primary">Modifier</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* En-tête : avatar + nom */}
        <View className="mb-6 items-center pt-2">
          {/* Bague primaire autour de l'avatar */}
          <View className="mb-4 rounded-full border-2 border-primary/20 p-1 shadow-sm shadow-black/5">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Text className="text-2xl font-bold text-primary">{getInitials(contact.name)}</Text>
            </View>
          </View>
          <Text className="text-center text-xl font-bold text-gray-900">{contact.name}</Text>
        </View>

        {/* Infos : les lignes gèrent leur propre espacement + séparateur */}
        <View className="mb-4 rounded-xl bg-white px-4 shadow-sm shadow-black/5">
          <InfoRow icon="map-pin" value={contact.address} />
          <InfoRow
            icon="mail"
            value={contact.email}
            onPress={contact.email ? () => Linking.openURL(`mailto:${contact.email}`) : undefined}
          />
          <InfoRow icon="file-text" value={contact.tva ? `TVA ${contact.tva}` : undefined} />
          <InfoRow icon="hash" value={contact.siret ? `SIRET ${contact.siret}` : undefined} />
        </View>

        {/* Actions */}
        <Button title="+ Nouvelle facture" onPress={onNewInvoice} />
        <Pressable
          onPress={onDelete}
          className="mt-3 items-center rounded-xl border border-red-200 bg-red-50 py-3.5"
          accessibilityRole="button">
          <Text className="text-sm font-medium text-red-500">Supprimer le contact</Text>
        </Pressable>

        {/* Séparateur + en-tête section historique */}
        <View className="mb-3 mt-8 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-gray-200" />
          <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Factures ({contactInvoices.length})
          </Text>
          <View className="h-px flex-1 bg-gray-200" />
        </View>

        {contactInvoices.length === 0 ? (
          <View className="items-center py-6">
            <Feather name="file-text" size={32} color="#d1d5db" />
            <Text className="mt-2 text-sm text-gray-400">Aucune facture pour ce contact.</Text>
          </View>
        ) : (
          contactInvoices.map((invoice) => {
            const status = getDisplayStatus(invoice);
            const { total } = getTotals(invoice);
            return (
              <Pressable
                key={invoice.id}
                onPress={() => router.push(`/invoices/${invoice.id}/detail`)}
                className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm shadow-black/5 active:opacity-75">
                <View className="flex-1 pr-3">
                  <Text className="font-semibold text-gray-900">#{invoice.invoiceNumber}</Text>
                  <Text className="mt-0.5 text-sm text-gray-500">
                    {formatDate(invoice.invoiceDate)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-gray-900">
                    {formatAmount(total)} {getInvoiceCurrency(invoice)}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <View className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
                    <Text className="text-xs capitalize text-gray-500">{status}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
