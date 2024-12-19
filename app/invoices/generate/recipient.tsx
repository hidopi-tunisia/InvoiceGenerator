import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';

import { Button } from '../../../components/Button';
import CustomInputText from '../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';

const senderInfoSchema = z.object({
  name: z.string({ required_error: 'Le nom est obligatoire' }).min(1, 'Le nom est obligatoire'),
  address: z
    .string({ required_error: "L'adresse postale est obligatoire" })
    .min(1, "L'adresse obligatoire"),
  tva: z.string().optional(),
});

type SenderInfo = z.infer<typeof senderInfoSchema>;

export default function GenerateInvoice() {
  const methods = useForm<SenderInfo>({
    resolver: zodResolver(senderInfoSchema),
    defaultValues: {
      name: 'Hatem',
      address: '456 rue alger',
      tva: '+21698307956',
    },
  });
  const onSubmit = (data: SenderInfo) => {
    router.push('/invoices/generate/invoice-info');
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView>
        <Text className="mb-4 text-2xl font-bold">Recipient info</Text>

        <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
        <CustomInputText name="address" label="Adresse" placeholder="Entrez l'adresse" multiline />
        <CustomInputText name="tva" label="Numéro de TVA" placeholder="Entrez le numéro de TVA" />

        <Button title="Suivant" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
