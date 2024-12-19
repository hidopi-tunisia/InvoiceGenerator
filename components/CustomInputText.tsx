import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { TextInput, Text, View, TextInputProps } from 'react-native';
import tw from 'twrnc';

interface CustomInputTextProps extends TextInputProps {
  label: string;
  multiline?: boolean;
  name: string;
  //keyboardType?: 'default' | 'numeric'; // Spécifie le clavier pour les nombres
}

const CustomInputText: React.FC<CustomInputTextProps> = ({ label, multiline, name, ...props }) => {
  const { control } = useFormContext();

  return (
    <View style={tw`mb-4`}>
      <Text style={tw`text-gray-700 text-base font-medium mb-2`}>{label}</Text>

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
              style={tw`border ${error ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md px-4 py-2 text-base ${multiline ? 'h-20' : 'h-12'}`}
            />
            {error && <Text style={tw`text-red-500 text-sm mt-1`}>{error.message}</Text>}
          </>
        )}
      />
    </View>
  );
};

export default CustomInputText;
