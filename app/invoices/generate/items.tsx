import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
//import * as ContextMenu from 'zeego/context-menu';
import { z } from 'zod';

import { Button } from '../../../components/Button';
import CustomInputText from '../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { InvoiceItem, invoiceItemSchema } from '../../schema/invoice';

import { useStore } from '~/store';

const itemsSchema = z.object({
  items: z.array(invoiceItemSchema), //TODO: Add minimum 1 item
});

type Items = z.infer<typeof itemsSchema>;

type FormValues = {
  items: InvoiceItem[];
};

export default function GenerateInvoice() {
  // Configuration du formulaire avec React Hook Form et Zod
  const addItems = useStore((data) => data.addItems);
  const items = useStore((data) => data.newInvoice?.items);
  const methods = useForm<FormValues>({
    resolver: zodResolver(itemsSchema),
    defaultValues: {
      items: items || [],
    },
  });
  const { control, handleSubmit } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });
  const onSubmit = (data: any) => {
    addItems(data.items);
    router.push('/invoices/generate/summary');
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView>
        {/* Champs de formulaire */}

        {/* Champs dynamiques */}
        <View className="mb-5 gap-1 shadow">
          {fields.map((item, index) => (
            <View key={item.id} className="mb-5 gap-3 rounded-lg bg-gray-500 p-4 shadow-md">
              {/* Ajout de la marge inférieure pour séparer les items */}
              <Text className="mb-2 text-lg font-semibold">Item {index + 1}</Text>
              <CustomInputText
                name={`items.${index}.name`}
                label="Désignation"
                placeholder="Entrez la désignation"
              />
              {/* Champs Quantité et prix et Total */}
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <CustomInputText
                    name={`items.${index}.quantity`}
                    label="Quantité"
                    placeholder="Entrez la quantité"
                    keyboardType="numeric"
                    onChangeText={(value) => {
                      methods.setValue(`items.${index}.quantity`, Number(value));
                    }}
                  />
                </View>
                <View className="flex-1">
                  <CustomInputText
                    name={`items.${index}.price`}
                    label="Prix"
                    placeholder="Prix"
                    keyboardType="numeric"
                    onChangeText={(value) => {
                      methods.setValue(`items.${index}.price`, Number(value));
                    }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-right text-lg font-semibold text-gray-600">Total</Text>
                  <View className="h-12 justify-center rounded-md bg-gray-100 px-3">
                    <Text className="text-right font-bold text-gray-700">
                      {(methods.watch(`items.${index}.quantity`) || 0) *
                        (methods.watch(`items.${index}.price`) || 0)}{' '}
                      {/* € */}
                      TND
                    </Text>
                  </View>
                </View>
              </View>
              {/* Bouton pour supprimer un item */}
              {fields.length > 1 && (
                <TouchableOpacity onPress={() => remove(index)} className="mt-2">
                  <Text className="text-sm text-red-500">Supprimer cet item</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {/* Bouton pour ajouter un nouvel item (link) */}
          <Button
            variant="link"
            title="+ Ajouter un item"
            onPress={() => append({ name: '', quantity: 1, price: 0.0 })}
          />
        </View>

        <Button
          title="Suivant"
          className="mt-auto" // assure que le bouton soit toujours en bas.
          onPress={methods.handleSubmit(onSubmit)}
        />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
