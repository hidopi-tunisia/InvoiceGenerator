import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text } from 'react-native';

import { Button } from '../../../components/Button';
import CustomInputText from '../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';

export default function GenerateInvoice() {
  const methods = useForm();
  const onSubmit = (data: any) => {
    console.log('data', data);
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView>
        <Text className="mb-4 text-2xl font-bold">Sender info</Text>

        <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
        <CustomInputText name="address" label="Adresse" placeholder="Entrez l'adresse" multiline />
        <CustomInputText name="tva" label="Numéro de TVA" placeholder="Entrez le numéro de TVA" />

        <Button title="Suivant" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
