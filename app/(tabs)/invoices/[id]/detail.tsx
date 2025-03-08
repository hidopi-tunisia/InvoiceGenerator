import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { Invoice } from '~/app/schema/invoice';
import { getTotals } from '~/app/utils/invoice';
import { generateInvoicePdf } from '~/app/utils/pdf';
import { customEvent } from 'vexo-analytics';
import { useStore } from '~/store';
//import { formatNumberWithSpaces } from '~/app/utils/numbers';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const invoice = useStore((state) => state.invoices.find((inv) => inv.id === id));
  const deleteInvoice = useStore((state) => state.deleteInvoice);
  const updateInvoice = useStore((state) => state.updateInvoice);

  const [isLoading, setIsLoading] = useState(true);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const animation = useRef(null);

  // Calcul des totaux avec la taxe du profil
  const { subtotal, total } = getTotals({
    items: invoice ? invoice.items : [],
    //taxRate: useStore.getState().profile.taxRate || 0
  });

  useEffect(() => {
    const generatePdf = async () => {
      if (!invoice) return;

      setIsLoading(true);
      try {
        const uri = await generateInvoicePdf(invoice, subtotal, total);
        if (uri) setPdfUri(uri);
        customEvent('Facture_PDF_Generee', { invoiceNumber: invoice.invoiceNumber });
      } catch (error) {
        console.error('Erreur génération PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generatePdf();
  }, [invoice]);

  const handleShare = async () => {
    if (!pdfUri) {
      Alert.alert('Info', 'Génération du PDF en cours...');
      return;
    }

    try {
      await shareAsync(pdfUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Facture ${invoice?.invoiceNumber}`,
      });
    } catch (error) {
      Alert.alert('Erreur', 'Échec du partage');
    }
  };

  const handleMarkAsPaid = () => {
    if (!invoice) return;

    updateInvoice({
      ...invoice,
      status: 'payée',
      //total, // Persist le total calculé
    });
    Alert.alert('Succès', 'Facture marquée comme payée');
  };

  const handleDelete = () => {
    Alert.alert('Confirmer suppression', `Supprimer définitivement ${invoice?.invoiceNumber} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        onPress: () => {
          if (invoice) {
            deleteInvoice(invoice);
            router.back();
          }
        },
      },
    ]);
  };

  if (!invoice) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-500">Facture introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 bg-gray-50 p-4">
        {/* Header */}
        <View className="mb-6 flex-row items-center justify-between">
          <View className="flex-row gap-4">
            <Pressable onPress={handleShare} disabled={isLoading}>
              <Feather name="share-2" size={24} color={isLoading ? '#9ca3af' : '#4f46e5'} />
            </Pressable>

            <Pressable onPress={handleDelete}>
              <Feather name="trash-2" size={24} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        {/* Carte Statut */}
        <View className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold">Statut :</Text>
            <View className={`rounded-full px-3 py-1 ${getStatusColor(invoice.status)}`}>
              <Text className="text-sm font-medium capitalize text-white">
                {invoice.status || 'en attente'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Informations */}
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-2 text-lg font-bold">#{invoice.invoiceNumber}</Text>

          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Date d'émission :</Text>
              <Text>{new Date(invoice.invoiceDate).toLocaleDateString()}</Text>
            </View>

            {invoice.invoiceDueDate && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Date d'échéance :</Text>
                <Text>{new Date(invoice.invoiceDueDate).toLocaleDateString()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Section Client */}
        {invoice.recipient && (
          <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            <Text className="mb-2 text-lg font-bold">Client</Text>
            <View className="space-y-1">
              <Text>{invoice.recipient.name}</Text>
              <Text className="text-gray-600">{invoice.recipient.address}</Text>
              {invoice.recipient.tva && (
                <Text className="text-gray-600">TVA: {invoice.recipient.tva}</Text>
              )}
            </View>
          </View>
        )}

        {/* Articles */}
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-3 text-lg font-bold">Désignations</Text>
          <View className="space-y-3">
            {invoice.items.map((item, index) => (
              <View key={index} className="flex-row justify-between">
                <Text className="flex-1">{item.name}</Text>
                <Text className="font-medium">
                  {item.quantity} x {item.price} TND
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Total */}
        <View className="rounded-lg bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold">Total :</Text>
            <Text className="text-lg font-bold text-indigo-600">{total} TND</Text>
          </View>
        </View>

        {/* Bouton Paiement */}
        {invoice.status !== 'payée' && (
          <Pressable
            onPress={handleMarkAsPaid}
            className="mt-6 items-center rounded-lg bg-green-500 p-4 active:bg-green-600"
            disabled={isLoading}>
            <Text className="text-lg font-medium text-white">
              {isLoading ? 'Traitement...' : 'Marquer comme payée'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

// Helpers
const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'payée':
      return 'bg-green-500';
    case 'en retard':
      return 'bg-red-500';
    default:
      return 'bg-yellow-500';
  }
};
