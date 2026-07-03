import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';

interface PasswordInputTextProps extends TextInputProps {
  label: string;
  name: string;
}

// Champ mot de passe intégré RHF (à utiliser sous <FormProvider>) avec
// afficher/masquer — même pattern visuel que CustomInputText.
const PasswordInputText: React.FC<PasswordInputTextProps> = ({ label, name, ...props }) => {
  const { control } = useFormContext();
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-base font-medium text-gray-700">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => (
          <>
            <View
              className={`h-12 flex-row items-center rounded-md border bg-white pl-4 pr-2 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}>
              <TextInput
                value={value?.toString()}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-base"
                {...props}
              />
              <Pressable
                onPress={() => setVisible((v) => !v)}
                hitSlop={12}
                className="p-2"
                accessibilityRole="button"
                accessibilityLabel={
                  visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                }>
                <Feather name={visible ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
              </Pressable>
            </View>
            {error && <Text className="mt-1 text-sm text-red-500">{error.message}</Text>}
          </>
        )}
      />
    </View>
  );
};

export default PasswordInputText;
