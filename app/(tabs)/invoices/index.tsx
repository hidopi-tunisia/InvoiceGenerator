import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Modal } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Invoice } from '~/app/schema/invoice';
import {
  formatAmount,
  getDisplayStatus,
  getInvoiceCurrency,
  getStatusColor,
  getTotals,
} from '~/app/utils/invoice';
import Snackbar from '~/components/Snackbar';
import { useStore } from '~/store';

const InvoiceListItem = ({
  invoice,
  onDeleted,
}: {
  invoice: Invoice;
  onDeleted: (invoice: Invoice) => void;
}) => {
  const deleteInvoice = useStore((state) => state.deleteInvoice);
  const router = useRouter();
  const { total } = getTotals(invoice);
  const displayStatus = getDisplayStatus(invoice);

  const handleDelete = () => {
    Alert.alert('Confirmer suppression', `Supprimer la facture ${invoice.invoiceNumber} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteInvoice(invoice);
          onDeleted(invoice); // le parent affiche le snackbar d'annulation
        },
      },
    ]);
  };

  return (
    <Pressable
      //router.push(`/contacts/${contact.id}/edit`);
      onPress={() => router.push(`/invoices/${invoice.id}/detail`)}
      className="mb-3 rounded-xl bg-white p-5 shadow-sm shadow-black/5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">#{invoice.invoiceNumber}</Text>
          <Text className="mt-1 text-sm text-gray-600">{invoice.recipient.name}</Text>
        </View>

        <View className="items-end">
          <Text className="text-lg font-semibold text-gray-900">
            {formatAmount(total)} {getInvoiceCurrency(invoice)}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">
            {new Date(invoice.invoiceDate).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-3">
        <View className="flex-row items-center gap-2">
          <View className={`h-2 w-2 rounded-full ${getStatusColor(displayStatus)}`} />
          <Text className="text-sm capitalize text-gray-600">{displayStatus}</Text>
        </View>
        <Pressable
          onPress={handleDelete}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Supprimer la facture ${invoice.invoiceNumber}`}>
          <Feather name="trash-2" size={20} color="red" />
        </Pressable>
      </View>
    </Pressable>
  );
};

export default function InvoicesScreen() {
  const router = useRouter();
  const invoices = useStore((state) => state.invoices);
  const addInvoice = useStore((state) => state.addInvoice);
  const [deletedInvoice, setDeletedInvoice] = useState<Invoice | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');

  // Années réellement présentes dans les factures (+ année courante), décroissantes
  const availableYears = [
    ...new Set([
      new Date().getFullYear(),
      ...invoices.map((invoice) => new Date(invoice.invoiceDate).getFullYear()),
    ]),
  ].sort((a, b) => b - a);

  const filteredInvoices = invoices.filter((invoice) => {
    const year = new Date(invoice.invoiceDate).getFullYear();
    const matchesYear = year === selectedYear;
    if (filter === 'all') return matchesYear;

    // Statut dérivé : « en retard » vient de la date d'échéance, pas du champ stocké
    const displayStatus = getDisplayStatus(invoice);
    if (filter === 'paid') return matchesYear && displayStatus === 'payée';
    if (filter === 'unpaid') return matchesYear && displayStatus === 'en attente';
    return matchesYear && displayStatus === 'en retard';
  });

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">Factures</Text>
        <Pressable
          onPress={() => router.push('/invoices/generate')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Nouvelle facture">
          <Feather name="plus-circle" size={28} color="#4f46e5" />
        </Pressable>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-2">
        {['Toutes', 'Payées', 'Impayées', 'En retard'].map((label, index) => (
          <Pressable
            key={label}
            onPress={() => setFilter(['all', 'paid', 'unpaid', 'overdue'][index] as any)}
            className={`rounded-full px-4 py-2 ${
              filter === ['all', 'paid', 'unpaid', 'overdue'][index] ? 'bg-primary' : 'bg-gray-200'
            }`}>
            <Text
              className={`text-sm ${
                filter === ['all', 'paid', 'unpaid', 'overdue'][index]
                  ? 'text-white'
                  : 'text-gray-700'
              }`}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => setShowYearPicker(true)}
        accessibilityRole="button"
        accessibilityLabel={`Filtrer par année, actuellement ${selectedYear}`}
        className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-3 shadow-sm">
        <Text className="text-gray-600">Année : {selectedYear}</Text>
        <Feather name="calendar" size={20} color="#6b7280" />
      </Pressable>

      {/* Sélection d'année : simple liste (un spinner date complet était déroutant) */}
      <Modal
        animationType="fade"
        transparent
        visible={showYearPicker}
        onRequestClose={() => setShowYearPicker(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setShowYearPicker(false)}>
          <Pressable onPress={() => {}} className="max-h-96 w-4/5 rounded-2xl bg-white p-6">
            <Text className="mb-4 text-xl font-bold text-black">Choisissez une année</Text>
            {availableYears.map((year) => (
              <Pressable
                key={year}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearPicker(false);
                }}
                accessibilityRole="button"
                className={`mb-2 rounded-lg border p-4 ${
                  year === selectedYear ? 'border-primary bg-primary/10' : 'border-gray-300'
                }`}>
                <Text
                  className={`text-center text-base ${
                    year === selectedYear ? 'font-semibold text-primary' : 'text-gray-700'
                  }`}>
                  {year}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowYearPicker(false)} accessibilityRole="button">
              <Text className="mt-2 text-center text-primary">Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Animated.FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        itemLayoutAnimation={LinearTransition.duration(300)}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20">
            <Feather name="file-text" size={48} color="#9ca3af" />
            <Text className="mt-4 text-lg text-gray-500">Aucune facture trouvée</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <Animated.View layout={LinearTransition}>
            <InvoiceListItem invoice={item} onDeleted={setDeletedInvoice} />
          </Animated.View>
        )}
      />

      {/* Undo de suppression */}
      <Snackbar
        visible={!!deletedInvoice}
        message={`Facture ${deletedInvoice?.invoiceNumber ?? ''} supprimée`}
        actionLabel="Annuler"
        onAction={() => {
          if (deletedInvoice) addInvoice(deletedInvoice);
          setDeletedInvoice(null);
        }}
        onDismiss={() => setDeletedInvoice(null)}
      />
    </View>
  );
}
