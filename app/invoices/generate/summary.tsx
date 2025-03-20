import { Redirect, router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { getTotals } from '~/app/utils/invoice';
import { useStore } from '~/store';

export default function InvoiceSummary() {
  // Récupération de la facture en cours
  const invoice = useStore((data) => data.newInvoice);
  const items = invoice?.items || [];
  // Calcul du sous-total et du total à l'aide d'une fonction utilitaire
  const { subtotal, total } = getTotals(invoice || {});
  // Récupération de la fonction de sauvegarde de la facture
  const saveInvoice = useStore((data) => data.saveInvoice);

  // Fonction appelée lors de la confirmation de la facture
  const handleGenerateInvoice = () => {
    saveInvoice();
    router.push(`/invoices/${invoice?.id}/success`);
  };

  // Si aucune facture n'est trouvée, on redirige vers l'accueil
  if (!invoice) {
    return <Redirect href="/" />;
  }

  return (
    <KeyboardAwareScrollView>
      <View className="flex-1 gap-1">
        {/* Header de la facture */}
        <View className="mb-6 rounded-b-lg bg-blue-600 p-4 shadow-lg">
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
                <Text className="text-sm text-gray-100">Due Date :</Text>
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
            <Text className="mb-2 text-lg font-semibold text-slate-500">Sender</Text>
            <View className="mb-4 gap-1 rounded-lg bg-white p-4">
              <Text className="text-gray-700">Name: {invoice.sender.name}</Text>
              <Text className="text-gray-700">Address: {invoice.sender.address}</Text>
              <Text className="text-gray-700">N° TVA: {invoice.sender.tva}</Text>
            </View>
          </View>
        )}

        {/* Informations du destinataire */}
        {invoice.recipient && (
          <View>
            <Text className="mb-2 text-lg font-semibold text-slate-500">Recipient</Text>
            <View className="mb-4 gap-1 rounded-lg bg-white p-4">
              <Text className="text-gray-700">Name: {invoice.recipient.name}</Text>
              <Text className="text-gray-700">Address: {invoice.recipient.address}</Text>
              <Text className="text-gray-700">N° TVA: {invoice.recipient.tva}</Text>
              <Text className="text-gray-700">Email: {invoice.recipient.email}</Text>
            </View>
          </View>
        )}

        {/* Liste des articles (désignations) */}
        <View>
          <Text className="mb-2 text-lg font-semibold text-slate-500">Designations</Text>
          <View className="mb-4 gap-1 rounded-lg bg-white p-4">
            {items.map((item, index) => (
              <View
                key={item.name + index}
                className="mb-2 flex-row items-center justify-between border-b border-gray-200 pb-2">
                <View>
                  <Text className="font-medium text-gray-700">{item.name}</Text>
                  <Text className="text-gray-500">
                    {item.quantity} x {item.price.toFixed(2)} TND
                  </Text>
                </View>
                <Text className="font-semibold text-gray-700">
                  {(item.quantity * item.price).toFixed(2)} TND
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section Totaux */}
        <View>
          <View className="mb-4 gap-1 rounded-lg bg-white p-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-700">Subtotal</Text>
              <Text className="font-semibold text-gray-700">{subtotal.toFixed(2)} TND</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-700">TVA (20%)</Text>
              {/* Si tu souhaites afficher la TVA calculée, tu peux décommenter la ligne ci-dessous */}
              {/* <Text className="font-semibold text-gray-700">{tva.toFixed(2)} TND</Text> */}
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-700">Droit de Timbre</Text>
              {/* Ajoute ici le montant fixe de droit de timbre si nécessaire */}
            </View>
            <View className="mt-2 flex-row justify-between border-t border-gray-300 pt-2">
              <Text className="text-lg font-bold">Total</Text>
              <Text className="text-lg font-bold text-gray-800">{total.toFixed(2)} TND</Text>
            </View>
          </View>
        </View>

        {/* Bouton d'action pour générer la facture */}
        <Button title="Confirmer et générer" className="mt-auto" onPress={handleGenerateInvoice} />
      </View>
    </KeyboardAwareScrollView>
  );
}
