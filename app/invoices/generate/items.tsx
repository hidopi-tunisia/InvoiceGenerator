import { Feather } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';

import { InvoiceItem, invoiceItemSchema } from '~/app/schema/invoice';
import { formatAmount, getInvoiceCurrency, getTotals } from '~/app/utils/invoice';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import NumericInputText from '~/components/NumericInputText';
import { useStore } from '~/store';

const itemsSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, 'Ajoutez au moins un article à la facture'),
});

type FormValues = { items: InvoiceItem[] };

// Ligne vierge par défaut — le prix à 0 force une saisie réelle (min 1 au schéma)
const emptyItem: InvoiceItem = { name: '', quantity: 1, price: 0 };

export default function GenerateInvoice() {
  const addItems = useStore((data) => data.addItems);
  const addInvoiceInfo = useStore((data) => data.addInvoiceInfo);
  const items = useStore((data) => data.newInvoice?.items);
  const taxRate = useStore((data) => data.newInvoice?.taxRate);
  const currency = useStore((data) => getInvoiceCurrency(data.newInvoice ?? undefined));

  // --- État remise ---
  const [discount, setDiscount] = useState<number | undefined>(
    useStore.getState().newInvoice?.discount
  );
  const [discountInput, setDiscountInput] = useState<string>(
    useStore.getState().newInvoice?.discount != null
      ? String(useStore.getState().newInvoice?.discount)
      : ''
  );
  const [discountVisible, setDiscountVisible] = useState<boolean>(
    (useStore.getState().newInvoice?.discount ?? 0) > 0
  );
  const [discountError, setDiscountError] = useState<string>('');

  const methods = useForm<FormValues>({
    resolver: zodResolver(itemsSchema),
    defaultValues: { items: items?.length ? items : [emptyItem] },
  });
  const { control } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Total général temps réel : recalcul à chaque frappe (watch de toutes les lignes)
  const watchedItems = methods.watch('items');
  const {
    subtotal,
    discountAmount,
    discountRate,
    tax,
    total,
    taxRate: appliedTaxRate,
  } = getTotals({ items: watchedItems ?? [], taxRate, discount });

  const handleDiscountChange = (text: string) => {
    // Accepte virgule ou point comme séparateur décimal
    const normalized = text.replace(',', '.');
    setDiscountInput(text);
    if (normalized === '' || normalized === '.') {
      setDiscount(undefined);
      setDiscountError('');
      return;
    }
    const value = parseFloat(normalized);
    if (isNaN(value)) {
      setDiscountError('Valeur invalide');
      setDiscount(undefined);
      return;
    }
    if (value < 0 || value > 100) {
      setDiscountError('La remise doit être comprise entre 0 et 100 %');
      setDiscount(undefined);
      return;
    }
    setDiscountError('');
    setDiscount(value);
  };

  const handleRemoveDiscount = () => {
    setDiscount(undefined);
    setDiscountInput('');
    setDiscountError('');
    setDiscountVisible(false);
  };

  const onSubmit = (data: FormValues) => {
    addItems(data.items);
    // Fusion à plat dans newInvoice — addInvoiceInfo accepte Partial<InvoiceInfo> & extra fields via spread
    addInvoiceInfo({ discount: discount || undefined });
    router.push('/invoices/generate/summary');
  };

  return (
    <FormProvider {...methods}>
      <View className="flex-1 bg-gray-50">
        <KeyboardAwareScrollView>
          <View className="gap-4 px-4 py-4">
            {fields.map((item, index) => {
              const lineTotal =
                (methods.watch(`items.${index}.quantity`) || 0) *
                (methods.watch(`items.${index}.price`) || 0);
              return (
                <View key={item.id} className="rounded-xl bg-white shadow-sm shadow-black/5">
                  {/* En-tête de carte : label Article N + poubelle */}
                  <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
                    <View className="flex-row items-center gap-2">
                      <View className="h-5 w-1 rounded-full bg-primary" />
                      <Text className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                        Article {index + 1}
                      </Text>
                    </View>
                    {fields.length > 1 && (
                      <TouchableOpacity
                        onPress={() => remove(index)}
                        hitSlop={10}
                        className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer l'article ${index + 1}`}>
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Corps de la carte */}
                  <View className="gap-4 px-4 pb-4 pt-3">
                    <CustomInputText
                      name={`items.${index}.name`}
                      label="Désignation"
                      placeholder="Entrez la désignation"
                      multiline
                    />

                    <View className="flex-row gap-3">
                      {/* Quantité (plus étroite) — décimales gérées comme le prix */}
                      <View className="flex-[2]">
                        <NumericInputText
                          name={`items.${index}.quantity`}
                          label="Quantité"
                          placeholder="1"
                        />
                      </View>
                      {/* Prix unitaire (plus large) */}
                      <View className="flex-[3]">
                        <NumericInputText
                          name={`items.${index}.price`}
                          label="Prix unitaire"
                          placeholder="0,00"
                        />
                      </View>
                    </View>

                    {/* Sous-total ligne */}
                    <View className="flex-row items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <Text className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Sous-total ligne
                      </Text>
                      <Text className="text-sm font-bold text-gray-800">
                        {formatAmount(lineTotal)} {currency}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {methods.formState.errors.items?.message && (
              <Text className="px-1 text-sm text-red-500">
                {methods.formState.errors.items.message}
              </Text>
            )}

            <Button variant="link" title="+ Ajouter un article" onPress={() => append(emptyItem)} />
          </View>
        </KeyboardAwareScrollView>

        {/* Récap fixe en bas : HT / Remise / TVA / TTC en temps réel, devise utilisateur */}
        <View className="border-t border-gray-200 bg-white px-5 pb-8 pt-4 shadow-lg shadow-black/10">
          {/* Sous-total HT */}
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm text-gray-500">Sous-total HT</Text>
            <Text className="text-sm font-medium text-gray-700">
              {formatAmount(subtotal)} {currency}
            </Text>
          </View>

          {/* Zone remise : lien discret ou champ actif */}
          {!discountVisible ? (
            <TouchableOpacity
              onPress={() => setDiscountVisible(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ajouter une remise"
              className="mb-2 self-start">
              <Text className="text-xs font-medium text-primary">+ Ajouter une remise</Text>
            </TouchableOpacity>
          ) : (
            <View className="mb-2">
              {/* Champ % compact + bouton retirer */}
              <View className="mb-1 flex-row items-center gap-2">
                <View className="flex-1 flex-row items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                  <TextInput
                    value={discountInput}
                    onChangeText={handleDiscountChange}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    maxLength={6}
                    returnKeyType="done"
                    accessibilityLabel="Remise en pourcentage"
                    className="flex-1 text-sm text-gray-800"
                    style={{ minHeight: 24 }}
                  />
                  <Text className="ml-1 text-sm text-gray-400">%</Text>
                </View>
                <TouchableOpacity
                  onPress={handleRemoveDiscount}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Retirer la remise"
                  className="h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <Feather name="x" size={14} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {/* Erreur de validation */}
              {discountError ? <Text className="text-xs text-red-500">{discountError}</Text> : null}
              {/* Ligne remise — affichée uniquement si > 0 */}
              {discountAmount > 0 && !discountError ? (
                <View className="mt-0.5 flex-row items-center justify-between">
                  <Text className="text-xs text-gray-500">Remise ({discountRate} %)</Text>
                  <Text className="text-xs font-medium text-green-600">
                    − {formatAmount(discountAmount)} {currency}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* TVA */}
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-sm text-gray-500">TVA ({appliedTaxRate} %)</Text>
            <Text className="text-sm font-medium text-gray-700">
              {formatAmount(tax)} {currency}
            </Text>
          </View>

          {/* Séparateur + Total TTC mis en valeur */}
          <View className="mb-4 border-t border-gray-200 pt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-gray-900">Total TTC</Text>
              <Text className="text-lg font-bold text-primary">
                {formatAmount(total)} {currency}
              </Text>
            </View>
          </View>

          <Button title="Suivant" onPress={methods.handleSubmit(onSubmit)} />
        </View>
      </View>
    </FormProvider>
  );
}
