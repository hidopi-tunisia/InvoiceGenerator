import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, Pressable } from 'react-native';

const countries = [
  { code: 'TN', name: 'Tunisie' },
  { code: 'FR', name: 'France' },
  { code: 'MA', name: 'Maroc' },
];

export default function CountryModal() {
  const router = useRouter();

  const handleSelect = (code: string) => {
    // Mettez à jour le store ou passez l'information via des params de route si nécessaire
    console.log('Country selected:', code);
    // Fermez le modal en revenant en arrière
    router.back();
  };

  return (
    <View className="flex-1 justify-end bg-black/50">
      <View className="relative rounded-t-3xl bg-white p-6 shadow-lg">
        <Pressable
          onPress={() => router.back()}
          className="absolute right-4 top-4 rounded-full bg-gray-200 p-2 shadow-md">
          <Feather name="x" size={20} color="#4B5563" />
        </Pressable>
        <Text className="mb-4 text-center text-xl font-bold">Sélectionnez un pays</Text>
        {countries.map((item) => (
          <Pressable
            key={item.code}
            onPress={() => handleSelect(item.code)}
            className="mb-2 rounded-lg border border-gray-300 p-4 hover:bg-gray-100 active:bg-gray-200">
            <Text className="text-base font-medium text-gray-800">{item.name}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.back()} className="mt-4 items-center">
          <Text className="text-base font-semibold text-red-500">Annuler</Text>
        </Pressable>
      </View>
    </View>
  );
}
