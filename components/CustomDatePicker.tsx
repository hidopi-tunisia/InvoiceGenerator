import React, { useState } from 'react';
import { Controller, useController } from 'react-hook-form';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

type CustomDatePickerProps = {
  label: string;
  placeholder?: string;
  name: string; // Nom utilisé dans le formulaire
  control: any; // Passé depuis react-hook-form
  rules?: any; // Règles de validation
};

export default function CustomDatePicker({
  label,
  placeholder = 'Sélectionnez une date',
  name,
  control,
  rules = {},
}: CustomDatePickerProps) {
  const {
    field: { onChange, onBlur, value },
    fieldState: { error },
  } = useController({ name });

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const handleConfirm = (onChange: (value: Date) => void) => (date: Date) => {
    setDatePickerVisibility(false);
    onChange(date); // Met à jour la valeur dans react-hook-form
  };

  const handleCancel = () => {
    setDatePickerVisibility(false);
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-base font-medium text-gray-700">{label}</Text>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            <TextInput
              value={value ? new Date(value).toLocaleDateString() : 'Sélectionner une date'}
              onPressIn={() => setDatePickerVisibility(true)}
              editable={false}
              className="rounded-md border border-gray-300 bg-white p-4"
            />

            {error && <Text className="mt-1 text-sm text-red-500">{error.message}</Text>}
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              date={value}
              mode="date"
              onConfirm={handleConfirm(onChange)}
              onCancel={handleCancel}
            />
          </>
        )}
      />
    </View>
  );
}
