import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';

import { Button } from '../../../components/Button';
import CustomInputText from '../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { BusinessEntity, businessEntitySchema } from '../../schema/invoice';

import { useStore } from '~/store';

export default function GenerateInvoice() {
  const addRecipientInfo = useStore((data) => data.addRecipientInfo);
  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    defaultValues: {
      name: 'V art Vision',
      address: '17 rue dalger, El Mourouj 3, Ben Arous',
      tva: 'AF8889XR-TN',
      email: 'contact@vartvision.com',
    },
  });
  const onSubmit = (data: BusinessEntity) => {
    addRecipientInfo(data);
    router.push('/invoices/generate/invoice-info');
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView>
        <Text className="mb-4 text-2xl font-bold">Recipient info</Text>

        <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
        <CustomInputText name="address" label="Adresse" placeholder="Entrez l'adresse" multiline />
        <CustomInputText name="tva" label="Numéro de TVA" placeholder="Entrez le numéro de TVA" />
        <CustomInputText name="email" label="E-mail" placeholder="E-mail Pro" />

        <Button title="Suivant" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
