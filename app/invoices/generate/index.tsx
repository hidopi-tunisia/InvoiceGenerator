import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';

import { Button } from '../../../components/Button';
import CustomInputText from '../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { InvoiceInfo, InvoiceInfoSchema } from '../../schema/invoice';

import CustomDatePicker from '~/components/CustomDatePicker';
import { useStore } from '~/store';

export default function GenerateInvoice() {
  const addInvoiceInfo = useStore((state) => state.addInvoiceInfo);
  const invoice = useStore((data) => data.newInvoice);
  const numberOfContacts = useStore((data) => data.contacts.length);
  const methods = useForm<InvoiceInfo>({
    resolver: zodResolver(InvoiceInfoSchema),
    defaultValues: {
      invoiceNumber: invoice?.invoiceNumber,
      invoiceDate: invoice?.invoiceDate,
      invoiceDueDate: invoice?.invoiceDueDate,
      // new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()
    },
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const onSubmit = (data: InvoiceInfo) => {
    addInvoiceInfo(data);
    if (invoice?.recipient) {
      router.push('/invoices/generate/items');
      return;
    }
    if (numberOfContacts > 0) {
      router.push('/invoices/generate/contact');
    } else {
      router.push('/invoices/generate/new-contact');
    }
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
        <CustomDatePicker
          name="invoiceDate"
          label="Date de facture"
          placeholder="Choisissez une date"
          control={methods.control}
          rules={{ required: 'Veuillez choisir une date' }}
        />

        <CustomDatePicker
          name="invoiceDueDate"
          label="Date d'échéance de facture"
          placeholder="Choisissez une date"
          control={methods.control}
          rules={{ required: 'Veuillez choisir une date' }}
        />
        {/* <CustomInputText
          name="invoiceDueDate"
          label="Date d'échéance de facture"
          placeholder="Entrez la date d'échéance de facture"
        /> */}

        <Button title="Suivant" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
