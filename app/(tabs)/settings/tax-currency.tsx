import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { View, Text, ScrollView, Pressable, Linking, TextInput } from 'react-native';

import { useStore } from '~/store';
export default function TaxCurrencyScreen() {
  const { profile, setProfile } = useStore();

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="rounded-lg bg-white p-4">
        <Text className="mb-4 text-lg font-semibold">Préférences financières</Text>

        <View className="mb-4 border-b border-gray-100 pb-4">
          <Text className="mb-2 text-sm text-gray-500">Devise principale</Text>
          <Picker
            selectedValue={profile.currency}
            onValueChange={(value) => setProfile({ ...profile, currency: value })}>
            <Picker.Item label="Dinar Tunisien (TND)" value="TND" />
            <Picker.Item label="Euro (EUR)" value="EUR" />
            <Picker.Item label="Dollar USD" value="USD" />
          </Picker>
        </View>

        <View>
          <Text className="mb-2 text-sm text-gray-500">Taux de TVA par défaut</Text>
          <TextInput
            value={profile.taxRate?.toString()}
            onChangeText={(text) => setProfile({ ...profile, taxRate: parseFloat(text) || 0 })}
            keyboardType="numeric"
            className="rounded-lg border border-gray-200 p-3"
            placeholder="Ex: 19%"
          />
        </View>
      </View>
    </View>
  );
}
