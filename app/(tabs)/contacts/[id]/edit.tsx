import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';

import { Button } from '../../../../components/Button';
import CustomInputText from '../../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../../components/KeyboardAwareScrollView';
import { BusinessEntity, businessEntitySchema } from '../../../schema/invoice';

import { useStore } from '~/store';

export default function ContactEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Récupération de l'id du contact
  const contact = useStore((state) => state.contacts.find((c) => c.id === id)); // Récupération du contact
  const updateContact = useStore((state) => state.updateContact); // Fonction de mise à jour de contact

  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    defaultValues: {
      id: contact?.id || Crypto.randomUUID(),
      name: contact?.name,
      address: contact?.address,
      tva: contact?.tva,
      email: contact?.email,
    },
  });
  const onSubmit = (data: BusinessEntity) => {
    updateContact(data);
    router.back();
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView edges={[]}>
        <Text className="mb-4 text-2xl font-bold">Modifier le Contact</Text>

        <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
        <CustomInputText name="address" label="Adresse" placeholder="Entrez l'adresse" multiline />
        <CustomInputText name="tva" label="Numéro de TVA" placeholder="Entrez le numéro de TVA" />
        <CustomInputText name="email" label="E-mail" placeholder="E-mail Pro" />

        <Button
          title="Mettre à jour"
          className="mt-auto"
          onPress={methods.handleSubmit(onSubmit)}
        />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
