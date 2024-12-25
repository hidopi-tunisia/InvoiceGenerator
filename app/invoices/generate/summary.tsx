import React from 'react';
import { Text, View } from 'react-native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { generateInvoicePdf } from '../../utils/pdf' ;

import { Button } from '../../../components/Button';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView'; // Utilisation du composant personnalisé

import { useStore } from '~/store';
import { Invoice } from '~/app/schema/invoice';

export default function InvoiceSummary() {
  const invoice = useStore((data) => data.newInvoice);
  const invoiceInfo = invoice?.invoiceInfo || {};
  const items = invoice.items || []; // Récupère les items depuis le store
  const subtotal = useStore((data) => data.getSubtotal());
  const total = useStore((data) => data.getTotal());

  const handleGeneratePdf = () =>
  {
    //TODO do better than this :(
    generateInvoicePdf( invoice as Invoice, subtotal,total);
  };

  // Calculs financiers
  // const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  // const tva = subtotal * 0.2; // 20% de TVA
  // const droitDeTimbre = 0.99; // Montant fixe
  // const total = subtotal + tva + droitDeTimbre;

  return (
    <KeyboardAwareScrollView>
      <View className='flex-1 gap-1'>
      {/* Header avec Invoice Info */}
      <View className="mb-6 rounded-b-lg bg-indigo-500 p-4 shadow-lg">
        <Text className="mb-2 text-2xl font-bold text-white">
           # {invoiceInfo.invoiceNumber || 'N/A'}
        </Text>
        <View className="flex-row justify-between">
          <View>
            <Text className="text-sm text-gray-100">Date :</Text>
            <Text className="text-lg font-semibold text-white">
              {invoiceInfo.invoiceDate || 'N/A'}
            </Text>
          </View>
          <View>
            <Text className="text-sm text-gray-100">Due Date :</Text>
            <Text className="text-lg font-semibold text-white">
              {invoiceInfo.invoiceDueDate || 'N/A'}
            </Text>
          </View>
        </View>
      </View>
      {/* Invoice Info */}
      {invoice.sender && (
        <View>
          <Text className="mb-2 text-lg font-semibold color-slate-500 ">Sender</Text>
          <View className="mb-4 gap-1 rounded-lg bg-white p-4 ">
            <Text className="text-gray-700">Name: {invoice.sender.name}</Text>
            <Text className="text-gray-700">Address: {invoice.sender.address}</Text>
            <Text className="text-gray-700">N° TVA: {invoice.sender.tva}</Text>
          </View>
        </View>
      )}

      {/* Recipient Info */}
      {invoice.recipient && (
        <View>
          <Text className="mb-2 text-lg font-semibold color-slate-500 ">Recipient</Text>
          <View className="mb-4 gap-1 rounded-lg bg-white p-4 ">
            <Text className="text-gray-700">Name: {invoice.recipient.name}</Text>
            <Text className="text-gray-700">Address: {invoice.recipient.address}</Text>
            <Text className="text-gray-700">N° TVA: {invoice.recipient.tva}</Text>
            <Text className="text-gray-700">Email: {invoice.recipient.email}</Text>
          </View>
        </View>
      )}

      {/* Items */}
      <View>
        <Text className="mb-2 text-lg font-semibold color-slate-500 ">Designations</Text>
        <View className="mb-4 gap-1 rounded-lg bg-white p-4 ">
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
      </View>

      {/* Total */}
      <View>
        {/* <Text className="mb-2 text-lg font-semibold color-slate-500 ">Total</Text> */}
        <View className="mb-4 gap-1 rounded-lg bg-white p-4 ">
          <View className="flex-row justify-between">
            <Text className="text-gray-700">Subtotal</Text>
            <Text className="font-semibold text-gray-700">{subtotal.toFixed(2)} TND</Text>
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
            <Text className="text-lg font-bold text-gray-800">{total.toFixed(2)} TND</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}

      <Button
        title="Confirmer et genérer"
        className="mt-auto"
        onPress={handleGeneratePdf}
      />
      </View>
    </KeyboardAwareScrollView>
  );
}
