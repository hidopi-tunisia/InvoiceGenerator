import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import CustomInputText from '../../components/CustomInputText';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';
import { BusinessEntity, businessEntitySchema } from '../schema/invoice';

import { useStore } from '~/store';

export default function ProfileScreen() {
  const setProfile = useStore((data) => data.setProfile);
  const setOnboardingCompleted = useStore((data) => data.setOnboardingCompleted);
  const profile = useStore((data) => data.profile);
  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    defaultValues: {
      name: profile?.name,
      address: profile?.address,
      tva: profile?.tva,
    },
  });
  const onSubmit = (data: any) => {
    setProfile(data);
    setOnboardingCompleted();
    router.replace('/');
  };

  return (
    <KeyboardAwareScrollView edges={['bottom', 'top']}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1, paddingHorizontal: 0 }}>
        <FormProvider {...methods}>
          <Text className="mb-4 text-2xl font-bold">Mon Profile</Text>

          <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
          <CustomInputText
            name="address"
            label="Adresse"
            placeholder="Entrez l'adresse"
            multiline
            numberOfLines={3}
            className="min-h-28"
          />
          <CustomInputText
            name="tva"
            label="Numéro de TVA (optionnel) "
            placeholder="Entrez le numéro de TVA"
          />
          {/* ajouter le logo */}

          <Button
            title="Sauvegarder"
            className="mt-auto"
            onPress={methods.handleSubmit(onSubmit)}
          />
        </FormProvider>
      </SafeAreaView>
    </KeyboardAwareScrollView>
  );
}
