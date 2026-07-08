import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { formatDate } from '~/app/utils/invoice';

type CustomDatePickerProps = {
  label: string;
  placeholder?: string;
  name: string;
  control: any;
  rules?: any;
  minimumDate?: Date; // ex. la date d'échéance ne peut pas précéder la date de facture
  maximumDate?: Date;
};

// Sélecteur de date basé directement sur @react-native-community/datetimepicker
// (le wrapper react-native-modal-datetime-picker était incompatible avec
// datetimepicker 9 / New Architecture — « undefined is not a function »).
export default function CustomDatePicker({
  label,
  placeholder = 'Sélectionnez une date',
  name,
  control,
  rules = {},
  minimumDate,
  maximumDate,
}: CustomDatePickerProps) {
  const [isVisible, setVisible] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-base font-medium text-gray-700">{label}</Text>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            <Pressable onPress={() => setVisible(true)}>
              <TextInput
                value={value ? formatDate(value) : placeholder}
                editable={false}
                pointerEvents="none"
                className="h-12 rounded-md border border-gray-300 bg-white p-4"
              />
            </Pressable>
            {error && <Text className="mt-1 text-sm text-red-500">{error.message}</Text>}
            {isVisible && (
              <DateTimePicker
                value={value ? new Date(value) : new Date()}
                mode="date"
                // iOS : calendrier inline ; Android : dialog natif (se ferme seul)
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(event, selectedDate) => {
                  setVisible(false); // masque dans les deux cas (Android se ferme déjà seul)
                  if (event.type !== 'dismissed' && selectedDate) onChange(selectedDate);
                }}
              />
            )}
          </>
        )}
      />
    </View>
  );
}
