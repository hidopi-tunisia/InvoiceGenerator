import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import tw from 'twrnc';
import { Button } from '../../../components/Button';
import CustomInputText from '../../../components/CustomInputText';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';

// Définition du schéma Zod pour validation
const invoiceItemSchema = z.object({
  name: z.string({ required_error: 'Le nom est obligatoire' }).min(1, 'Le nom est obligatoire'),
  quantity: z
    .number({ required_error: 'La quantité est obligatoire' })
    .min(1, 'La quantité est obligatoire'),
  price: z.number({ required_error: 'Le prix est obligatoire' }).min(1, 'Le prix est obligatoire'),
});

type InvoiceItem = z.infer<typeof invoiceItemSchema>;

const itemsSchema = z.object({
  items: z.array(invoiceItemSchema),
});

type Items = z.infer<typeof itemsSchema>;

type FormValues = {
  items: InvoiceItem[];
};

export default function GenerateInvoice() {
  // Configuration du formulaire avec React Hook Form et Zod
  const methods = useForm<FormValues>({
    resolver: zodResolver(itemsSchema),
    defaultValues: {
      items: [{ name: 'Prestation', quantity: 1 }],
    },
  });
  const { control, handleSubmit } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });
  const onSubmit = (data: InvoiceItem) => {
    console.log(data);
    //router.push('/invoices/generate/invoice-info');
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView>
        {/* Champs de formulaire */}

        {/* Champs dynamiques */}
        <View className="mb-5 gap-3 shadow">
          {fields.map((item, index) => (
            <View key={item.id} className="mb-5 gap-3 rounded-lg bg-gray-50 p-4 shadow-md">
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
                <View style={tw`flex-1`}>
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
                <View style={tw`flex-1`}>
                  <Text style={tw`text-lg text-right font-semibold text-gray-600 mb-1`}>Total</Text>
                  <View style={tw`h-12 bg-gray-100 rounded-md justify-center px-3`}>
                    <Text style={tw`text-right text-gray-700 font-bold`}>
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
                <TouchableOpacity onPress={() => remove(index)} style={tw`mt-2`}>
                  <Text style={tw`text-red-500 text-sm`}>Supprimer cet item</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {/* Bouton pour ajouter un nouvel item (link) */}

          <Button
            variant="link"
            title="Add item"
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
