import React, { useEffect, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { TextInput, Text, View } from 'react-native';

type NumericInputTextProps = {
  label: string;
  name: string;
  placeholder?: string;
};

export default function NumericInputText({
  label,
  name,
  placeholder = 'Entrez un montant',
}: NumericInputTextProps) {
  const { control } = useFormContext();
  const {
    field: { onChange, value, onBlur },
    fieldState: { error },
  } = useController({ name, control });

  // State local pour stocker la valeur saisie (avec virgule)
  const [inputValue, setInputValue] = useState('');

  // Synchroniser le state local avec la valeur provenant du formulaire
  useEffect(() => {
    if (value !== undefined && value !== null) {
      // Convertir le point en virgule pour l'affichage
      setInputValue(value.toString().replace('.', ','));
    }
  }, [value]);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-base font-medium text-gray-700">{label}</Text>
      <TextInput
        value={inputValue}
        placeholder={placeholder}
        keyboardType="decimal-pad"
        onChangeText={setInputValue}
        onBlur={() => {
          // Normaliser la chaîne pour convertir les virgules en points
          const normalized = inputValue.replace(/,/g, '.').replace(/\s+/g, '');
          const parsed = parseFloat(normalized);
          onChange(isNaN(parsed) ? 0 : parsed);
          onBlur();
        }}
        className="rounded-md border border-gray-300 bg-white p-4 text-base"
      />
      {error && <Text className="mt-1 text-sm text-red-500">{error.message}</Text>}
    </View>
  );
}
