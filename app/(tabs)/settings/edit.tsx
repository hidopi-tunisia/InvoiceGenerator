import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';

import { Button } from '../../../components/Button';
import CustomInputText from '../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { BusinessEntity, businessEntitySchema } from '../../schema/invoice';

import { useStore } from '~/store';

export default function ProfileScreen() {
  const setProfile = useStore((data) => data.setProfile);
  const profile = useStore((data) => data.profile);
  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    defaultValues: {
      id: profile?.id || Crypto.randomUUID(),
      name: profile?.name,
      address: profile?.address,
      tva: profile?.tva,
    },
  });
  const onSubmit = (data: any) => {
    setProfile(data); //TODO: integrer AutoSave ??
    // Afficher Success Screen :)
    router.back();
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView>
        <Text className="mb-4 text-2xl font-bold">Mon Entreprise</Text>
        <Text className="mb-4 text-gray-600">
          Ces informations seront affichées sur toutes vos factures.
        </Text>
        <Text className="mb-4 text-gray-600">Assurez-vous qu'elles sont exactes.</Text>
        <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
        <CustomInputText name="address" label="Adresse" placeholder="Entrez l'adresse" multiline />
        <CustomInputText name="tva" label="Numéro de TVA" placeholder="Entrez le numéro de TVA" />
        {/* ajouter le logo */}

        <Button title="Sauvegarder" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
