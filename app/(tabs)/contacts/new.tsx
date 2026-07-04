import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';

import { BusinessEntity, businessEntitySchema } from '~/app/schema/invoice';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import { useStore } from '~/store';
import { syncContactById } from '~/store/contacts-sync';

// Création d'un contact hors wizard (FAB de l'onglet Contacts).
// Ne pas confondre avec invoices/generate/new-contact : celui-ci démarre
// une facture (layout du wizard) et enchaîne sur l'étape articles.
export default function NewContactScreen() {
  const addContact = useStore((state) => state.addContact);
  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    defaultValues: { id: Crypto.randomUUID() },
  });

  const onSubmit = (data: BusinessEntity) => {
    addContact(data); // dirty par défaut → poussé ci-dessous puis au boot si échec
    syncContactById(data.id); // fire-and-forget vers le backend
    // navigate (pas back) : revient à la liste en lui passant le nom ajouté,
    // qu'elle affiche en snackbar de confirmation.
    router.navigate({ pathname: '/contacts', params: { added: data.name } });
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView edges={[]}>
        <Text className="mb-4 text-2xl font-bold">Nouveau contact</Text>

        <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
        <CustomInputText
          name="address"
          label="Adresse"
          placeholder="Entrez l'adresse"
          multiline
          numberOfLines={3}
          className="min-h-28"
        />
        <CustomInputText name="tva" label="Numéro de TVA" placeholder="Entrez le numéro de TVA" />
        <CustomInputText name="email" label="E-mail" placeholder="E-mail Pro" />

        <Button title="Ajouter" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
