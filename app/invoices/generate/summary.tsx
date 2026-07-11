import { Redirect, router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { BusinessEntity } from '~/app/schema/invoice';
import { formatAmount, getInvoiceCurrency, getTotals } from '~/app/utils/invoice';
import { Button } from '~/components/Button';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import { useStore } from '~/store';
import { syncInvoiceById } from '~/store/invoices-sync';

/** Compose l'adresse complète depuis les champs structurés (rétro-compatible). */
const formatSenderAddress = (sender: BusinessEntity): string => {
  const line2 = [sender.zipCode, sender.city].filter(Boolean).join(' ');
  return [sender.address, line2].filter(Boolean).join(', ');
};

export default function InvoiceSummary() {
  // Récupération de la facture en cours
  const invoice = useStore((data) => data.newInvoice);
  const items = invoice?.items || [];
  // Calcul des totaux (TVA incluse) à l'aide d'une fonction utilitaire
  const { subtotal, discountRate, discountAmount, taxRate, tax, total } = getTotals(invoice || {});
  const currency = getInvoiceCurrency(invoice || undefined);
  // Récupération de la fonction de sauvegarde de la facture
  const saveInvoice = useStore((data) => data.saveInvoice);

  // Fonction appelée lors de la confirmation de la facture
  const handleGenerateInvoice = () => {
    const invoiceId = invoice?.id;
    saveInvoice();
    if (invoiceId) syncInvoiceById(invoiceId); // fire-and-forget vers le backend
    // replace : la facture est sauvegardée, le retour arrière ne doit pas revenir au récap
    router.replace(`/invoices/${invoiceId}/success`);
  };

  // Si aucune facture n'est trouvée, on redirige vers l'accueil
  if (!invoice) {
    return <Redirect href="/" />;
  }

  return (
    <KeyboardAwareScrollView>
      <View className="flex-1 gap-1">
        {/* Header de la facture */}
        <View className="mb-6 rounded-b-lg bg-primary p-4 shadow-lg">
          <Text className="mb-2 text-2xl font-bold text-white">
            # {invoice.invoiceNumber || 'N/A'}
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-sm text-gray-100">Date :</Text>
              <Text className="text-lg font-semibold text-white">
                {invoice.invoiceDate
                  ? new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')
                  : 'N/A'}
              </Text>
            </View>
            {invoice.invoiceDueDate && (
              <View>
                <Text className="text-sm text-gray-100">Échéance :</Text>
                <Text className="text-lg font-semibold text-white">
                  {new Date(invoice.invoiceDueDate).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Informations de l'expéditeur */}
        {invoice.sender && (
          <View>
            <Text className="mb-2 text-lg font-semibold text-slate-500">Émetteur</Text>
            <View className="mb-4 gap-1 rounded-lg bg-white p-4">
              <Text className="text-gray-700">Nom : {invoice.sender.name}</Text>
              <Text className="text-gray-700">Adresse : {formatSenderAddress(invoice.sender)}</Text>
              <Text className="text-gray-700">N° TVA : {invoice.sender.tva}</Text>
              {invoice.sender.siret ? (
                <Text className="text-gray-700">Siret : {invoice.sender.siret}</Text>
              ) : null}
              {invoice.sender.mf ? (
                <Text className="text-gray-700">MF : {invoice.sender.mf}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Informations du destinataire */}
        {invoice.recipient && (
          <View>
            <Text className="mb-2 text-lg font-semibold text-slate-500">Destinataire</Text>
            <View className="mb-4 gap-1 rounded-lg bg-white p-4">
              <Text className="text-gray-700">Nom : {invoice.recipient.name}</Text>
              <Text className="text-gray-700">Adresse : {invoice.recipient.address}</Text>
              <Text className="text-gray-700">N° TVA : {invoice.recipient.tva}</Text>
              <Text className="text-gray-700">Email : {invoice.recipient.email}</Text>
            </View>
          </View>
        )}

        {/* Liste des articles (désignations) */}
        <View>
          <Text className="mb-2 text-lg font-semibold text-slate-500">Désignations</Text>
          <View className="mb-4 gap-1 rounded-lg bg-white p-4">
            {items.map((item, index) => (
              <View
                key={item.name + index}
                className="mb-2 flex-row items-center justify-between border-b border-gray-200 pb-2">
                <View>
                  <Text className="font-medium text-gray-700">{item.name}</Text>
                  <Text className="text-gray-500">
                    {item.quantity} x {formatAmount(item.price)} {currency}
                  </Text>
                </View>
                <Text className="font-semibold text-gray-700">
                  {formatAmount(item.quantity * item.price)} {currency}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section Totaux */}
        <View>
          <View className="mb-4 gap-1 rounded-lg bg-white p-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-700">Sous-total</Text>
              <Text className="font-semibold text-gray-700">
                {formatAmount(subtotal)} {currency}
              </Text>
            </View>
            {discountAmount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-gray-700">Remise ({discountRate} %)</Text>
                <Text className="font-semibold text-green-600">
                  − {formatAmount(discountAmount)} {currency}
                </Text>
              </View>
            )}
            {taxRate > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-gray-700">TVA ({taxRate}%)</Text>
                <Text className="font-semibold text-gray-700">
                  {formatAmount(tax)} {currency}
                </Text>
              </View>
            )}
            <View className="mt-2 flex-row justify-between border-t border-gray-300 pt-2">
              <Text className="text-lg font-bold">Total</Text>
              <Text className="text-lg font-bold text-gray-800">
                {formatAmount(total)} {currency}
              </Text>
            </View>
          </View>
        </View>

        {/* Bouton d'action pour générer la facture */}
        <Button title="Confirmer et générer" className="mt-auto" onPress={handleGenerateInvoice} />
      </View>
    </KeyboardAwareScrollView>
  );
}
