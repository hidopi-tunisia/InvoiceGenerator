import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { TextInput, Text, View, TextInputProps } from 'react-native';

interface CustomInputTextProps extends TextInputProps {
  label: string;
  multiline?: boolean;
  name: string;
}

const CustomInputText: React.FC<CustomInputTextProps> = ({ label, multiline, name, ...props }) => {
  const { control } = useFormContext();

  return (
    <View className="mb-4">
      <Text className="mb-2 text-base font-medium text-gray-700">{label}</Text>
      <Controller
        control={control}
        name={name}
        rules={{ required: 'Ce champ est obligatoire' }}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => (
          <>
            <TextInput
              value={value?.toString()}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline={multiline}
              {...props}
              className={`border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white px-4 py-2 text-base ${
                multiline ? 'leading-relaxed' : 'h-12'
              }`}
            />
            {error && <Text className="mt-1 text-sm text-red-500">{error.message}</Text>}
          </>
        )}
      />
    </View>
  );
};

export default CustomInputText;
