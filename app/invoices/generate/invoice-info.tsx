import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';

import { Button } from '../../../components/Button';
import CustomInputText from '../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';

const InvoiceInfoSchema = z.object({
  invoiceNumber: z
    .string({ required_error: 'Le numéro de facture est obligatoire' })
    .min(1, 'Le numéro de facture est obligatoire'),
  invoiceDate: z
    .string({ required_error: 'La date de facture est obligatoire' })
    .min(1, 'La date de facture est obligatoire'),
  invoiceDueDate: z
    .string({ required_error: "La date d'échéance de facture est obligatoire" })
    .min(1, "La date d'échéance de facture est obligatoire"),
});

type InvoiceInfo = z.infer<typeof InvoiceInfoSchema>;

export default function GenerateInvoice() {
  const methods = useForm<InvoiceInfo>({
    resolver: zodResolver(InvoiceInfoSchema),
    defaultValues: {
      invoiceNumber: '1234567890',
      invoiceDate: new Date().toISOString(),
      invoiceDueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
    },
  });
  const onSubmit = (data: InvoiceInfo) => {
    router.push('/invoices/generate/items');
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView>
        <Text className="mb-4 text-2xl font-bold">Invoice info</Text>

        <CustomInputText
          name="invoiceNumber"
          label="Numéro de facture"
          placeholder="Entrez le numéro de facture"
        />
        <CustomInputText
          name="invoiceDate"
          label="Date de facture"
          placeholder="Entrez la date de facture"
        />
        <CustomInputText
          name="invoiceDueDate"
          label="Date d'échéance de facture"
          placeholder="Entrez la date d'échéance de facture"
        />

        <Button title="Suivant" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
