import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { View, Text, Pressable, TextInput } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

type CustomDatePickerProps = {
  label: string;
  placeholder?: string;
  name: string;
  control: any;
  rules?: any;
};

export default function CustomDatePicker({
  label,
  placeholder = 'Sélectionnez une date',
  name,
  control,
  rules = {},
}: CustomDatePickerProps) {
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const handleConfirm = (onChange: (value: Date) => void) => (date: Date) => {
    setDatePickerVisibility(false);
    onChange(date);
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
            <Pressable onPress={() => setDatePickerVisibility(true)}>
              <TextInput
                value={value ? new Date(value).toLocaleDateString() : placeholder}
                editable={false}
                pointerEvents="none"
                className="h-12 rounded-md border border-gray-300 bg-white p-4"
              />
            </Pressable>
            {error && <Text className="mt-1 text-sm text-red-500">{error.message}</Text>}
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              date={value || new Date()}
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
