import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Invoice } from '~/app/schema/invoice';
import { getTotals } from '~/app/utils/invoice';
import { useStore } from '~/store';

export const formatNumberWithSpaces = (number: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(number)
    .replace(/ /g, ' '); // Remplace les espaces insécables par des espaces normaux
};

const InvoiceListItem = ({ invoice }: { invoice: Invoice }) => {
  const deleteInvoice = useStore((state) => state.deleteInvoice);
  const router = useRouter();
  const { total } = getTotals(invoice);

  const handleDelete = () => {
    Alert.alert('Confirmer suppression', `Supprimer la facture ${invoice.invoiceNumber} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', onPress: () => deleteInvoice(invoice) },
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
            {formatNumberWithSpaces(total)} TND
          </Text>
          <Text className="mt-1 text-sm text-gray-500">
            {new Date(invoice.invoiceDate).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-3">
        <View className="flex-row items-center gap-2">
          <View className={`h-2 w-2 rounded-full ${getStatusColor(invoice.status)}`} />
          <Text className="text-sm capitalize text-gray-600">{invoice.status || 'en attente'}</Text>
        </View>
        <Feather name="trash-2" size={20} color="red" onPress={handleDelete} />
      </View>
    </Pressable>
  );
};

export default function InvoicesScreen() {
  const router = useRouter();
  const invoices = useStore((state) => state.invoices);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');

  const filteredInvoices = invoices.filter((invoice) => {
    const year = new Date(invoice.invoiceDate).getFullYear();
    const matchesYear = year === selectedYear;

    if (filter === 'paid') return matchesYear && invoice.status === 'payée';
    if (filter === 'unpaid') return matchesYear && invoice.status === 'en attente';
    if (filter === 'overdue') {
      const dueDate = new Date(invoice.invoiceDueDate || '');
      return matchesYear && invoice.status === 'en retard' && dueDate < new Date();
    }
    return matchesYear;
  });

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">Factures</Text>
        <Feather
          name="plus-circle"
          size={28}
          color="#4f46e5"
          onPress={() => router.push('/invoices/generate')}
        />
      </View>

      <View className="mb-4 flex-row flex-wrap gap-2">
        {['Toutes', 'Payées', 'Impayées', 'En retard'].map((label, index) => (
          <Pressable
            key={label}
            onPress={() => setFilter(['all', 'paid', 'unpaid', 'overdue'][index] as any)}
            className={`rounded-full px-4 py-2 ${
              filter === ['all', 'paid', 'unpaid', 'overdue'][index]
                ? 'bg-indigo-500'
                : 'bg-gray-200'
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
        onPress={() => setShowDatePicker(true)}
        className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-3 shadow-sm">
        <Text className="text-gray-600">Année : {selectedYear}</Text>
        <Feather name="calendar" size={20} color="#6b7280" />
      </Pressable>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedYear, 0)}
          mode="date"
          display="spinner"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setSelectedYear(date.getFullYear());
          }}
        />
      )}

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
            <InvoiceListItem invoice={item} />
          </Animated.View>
        )}
      />
    </View>
  );
}

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'payée':
      return 'bg-green-500';
    case 'impayée':
      return 'bg-yellow-500';
    case 'en retard':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};
