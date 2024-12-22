import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../../components/Button';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView'; // Utilisation du composant personnalisé

import { useStore } from '~/store';

export default function InvoiceSummary() {
  const invoice = useStore((data) => data.newInvoice);
  const invoiceInfo = invoice?.invoiceInfo || {};
  const items = invoice.items || []; // Récupère les items depuis le store
  const subtotal = useStore((data) => data.getSubtotal());
  const total = useStore((data) => data.getTotal());

  // Calculs financiers
  // const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  // const tva = subtotal * 0.2; // 20% de TVA
  // const droitDeTimbre = 0.99; // Montant fixe
  // const total = subtotal + tva + droitDeTimbre;

  return (
    <KeyboardAwareScrollView>
      {/* Invoice Info */}
      {invoice.sender && (
        <View className="mb-4 rounded-lg bg-white p-4 ">
          <Text className="mb-2 text-lg font-semibold">Invoice Info</Text>

          <Text className="text-gray-700">Name: {invoice.sender.name}</Text>
          <Text className="text-gray-700">Address: {invoice.sender.address}</Text>
          <Text className="text-gray-700">N° TVA: {invoice.sender.tva}</Text>
        </View>
      )}

      {/* Recipient Info */}
      {invoice.recipient && (
        <View className="mb-4 rounded-lg bg-white p-4 ">
          <Text className="mb-2 text-lg font-semibold">Recipient Info</Text>
          <Text className="text-gray-700">Name: {invoice.recipient.name}</Text>
          <Text className="text-gray-700">Address: {invoice.recipient.address}</Text>
          <Text className="text-gray-700">N° TVA: {invoice.recipient.tva}</Text>
          <Text className="text-gray-700">Email: {invoice.recipient.email}</Text>
        </View>
      )}

      {/* Recipient Info */}
      {invoiceInfo && (
        <View className="mb-4 rounded-lg bg-white p-4 ">
          <Text className="mb-2 text-lg font-semibold">Invoice Details</Text>
          <Text className="text-gray-700">Invoice Number: {invoiceInfo.invoiceNumber}</Text>
          <Text className="text-gray-700">Date: {invoiceInfo.invoiceDate}</Text>
          <Text className="text-gray-700">Due Date: {invoiceInfo.invoiceDueDate}</Text>
        </View>
      )}

      {/* Items */}
      <View className="mb-4 rounded-lg bg-white p-4 ">
        <Text className="mb-2 text-lg font-semibold">Items</Text>
        {items.map((item, index) => (
          <View
            key={item.name}
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

      {/* Total */}
      <View className="mb-4 rounded-lg bg-white p-4 ">
        <Text className="mb-2 text-lg font-semibold">Total</Text>
        <View className="flex-row justify-between">
          <Text className="text-gray-700">Subtotal</Text>
          <Text className="font-semibold text-gray-700">{subtotal} TND</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-700">TVA (20%)</Text>
          {/* <Text className="font-semibold text-gray-700">{tva.toFixed(2)} TND</Text> */}
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-700">Droit de Timbre</Text>
          {/* <Text className="font-semibold text-gray-700">{droitDeTimbre.toFixed(2)} TND</Text> */}
        </View>
        <View className="mt-2 flex-row justify-between border-t border-gray-300 pt-2">
          <Text className="text-lg font-bold">Total</Text>
          <Text className="text-lg font-bold text-gray-800">{total} TND</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {/* <Button
        title="Edit Invoice"
        variant="secondary"
        className="mb-2"
        onPress={() => console.log('Edit Invoice')}
      /> */}
      <Button
        title="Confirm &-- Send"
        className="mt-auto"
        onPress={() => console.log('Confirmer et envoyer')}
      />
    </KeyboardAwareScrollView>
  );
}
