import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { customEvent } from 'vexo-analytics';

import {
  formatAmount,
  formatDate,
  getDisplayStatus,
  getInvoiceCurrency,
  getStatusColor,
  getTotals,
} from '~/app/utils/invoice';
import { downloadRemoteInvoicePdf, generateInvoicePdf } from '~/app/utils/pdf';
import { useStore } from '~/store';
import { pushInvoiceDeletion, pushInvoiceStatus } from '~/store/invoices-sync';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const invoice = useStore((state) => state.invoices.find((inv) => inv.id === id));
  const deleteInvoice = useStore((state) => state.deleteInvoice);
  const updateInvoice = useStore((state) => state.updateInvoice);

  const [isLoading, setIsLoading] = useState(true);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  // Totaux avec la TVA de la facture (fallback : taux du profil)
  const { subtotal, taxRate, tax, total } = getTotals(invoice ?? {});
  const currency = getInvoiceCurrency(invoice);
  const displayStatus = getDisplayStatus(invoice ?? {});

  const generatePdf = useCallback(async () => {
    if (!invoice) return;

    setIsLoading(true);
    try {
      // PDF serveur (source de vérité si le plan le génère), sinon local
      const uri = invoice.remotePdfUrl
        ? await downloadRemoteInvoicePdf(invoice.remotePdfUrl, invoice.invoiceNumber).catch(() =>
            generateInvoicePdf(invoice)
          )
        : await generateInvoicePdf(invoice);
      setPdfUri(uri);
      customEvent('Facture_PDF_Generee', { invoiceNumber: invoice.invoiceNumber });
    } catch {
      setPdfUri(null);
      Alert.alert('Erreur', 'Impossible de générer le PDF. Touchez Partager pour réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [invoice]);

  useEffect(() => {
    generatePdf();
  }, [generatePdf]);

  const handleShare = async () => {
    if (!pdfUri) {
      if (isLoading) {
        Alert.alert('Info', 'Génération du PDF en cours...');
      } else {
        generatePdf(); // échec précédent : on retente
      }
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
      console.error('Erreur partage:', error);
    }
  };

  const handleMarkAsPaid = () => {
    if (!invoice) return;

    updateInvoice({ id: invoice.id, status: 'payée' });
    pushInvoiceStatus(invoice.id); // fire-and-forget : PATCH /invoices/:id/status
    Alert.alert('Succès', 'Facture marquée comme payée');
  };

  const handleDelete = () => {
    Alert.alert('Confirmer suppression', `Supprimer définitivement ${invoice?.invoiceNumber} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          if (invoice) {
            deleteInvoice(invoice);
            // Pas d'undo depuis le détail (on quitte l'écran) : suppression
            // distante immédiate, best-effort.
            pushInvoiceDeletion(invoice);
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
          <View className="flex-row gap-6">
            <Pressable
              onPress={handleShare}
              disabled={isLoading}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Partager la facture en PDF"
              accessibilityState={{ disabled: isLoading }}>
              <Feather name="share-2" size={24} color={isLoading ? '#9ca3af' : '#4f46e5'} />
            </Pressable>

            <Pressable
              onPress={handleDelete}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Supprimer la facture">
              <Feather name="trash-2" size={24} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        {/* Carte Statut */}
        <View className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold">Statut :</Text>
            <View className={`rounded-full px-3 py-1 ${getStatusColor(displayStatus)}`}>
              <Text className="text-sm font-medium capitalize text-white">{displayStatus}</Text>
            </View>
          </View>
        </View>

        {/* Section Informations */}
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-2 text-lg font-bold">#{invoice.invoiceNumber}</Text>

          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Date d'émission :</Text>
              <Text>{formatDate(invoice.invoiceDate)}</Text>
            </View>

            {invoice.invoiceDueDate && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Date d'échéance :</Text>
                <Text>{formatDate(invoice.invoiceDueDate)}</Text>
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
                  {item.quantity} x {formatAmount(item.price)} {currency}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totaux */}
        <View className="rounded-lg bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-600">Sous-total :</Text>
            <Text className="text-gray-600">
              {formatAmount(subtotal)} {currency}
            </Text>
          </View>
          {taxRate > 0 && (
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-600">TVA ({taxRate}%) :</Text>
              <Text className="text-gray-600">
                {formatAmount(tax)} {currency}
              </Text>
            </View>
          )}
          <View className="mt-2 flex-row items-center justify-between border-t border-gray-100 pt-2">
            <Text className="text-lg font-bold">Total :</Text>
            <Text className="text-lg font-bold text-primary">
              {formatAmount(total)} {currency}
            </Text>
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
