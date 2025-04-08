import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';

import { Button } from '~/components/Button';
import NumericInputText from '~/components/NumericInputText';

const countries = [
  { code: 'TN', name: 'Tunisie' },
  { code: 'FR', name: 'France' },
];

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'Anglais' },
];

const currencies = [
  { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollar US' },
];

export default function OnbordingScreen() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [vatRate, setVatRate] = useState<string>('20');

  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-5 pb-6 pt-10">
          {/* Logo et Titre */}
          <View className="mb-12 mt-10 items-center">
            <Image
              source={require('../../assets/icon.png')}
              className="h-16 w-16"
              resizeMode="contain"
            />
            <Text className="mt-4 text-3xl font-bold text-black">Fatourty</Text>
          </View>

          {/* Texte de bienvenue */}
          <Text className="mb-2 text-center text-3xl font-semibold text-gray-800">Bienvenue</Text>
          <Text className="mb-8 text-center text-base text-gray-500">
            Veuillez faire votre sélection pour commencer
          </Text>

          {/* Sélection du pays */}
          <View className="mb-6 w-full">
            <Text className="mb-2 text-base text-gray-700">Sélectionnez le pays</Text>
            <Pressable
              className="flex-row items-center justify-between rounded-lg border border-gray-300 p-4"
              onPress={() => setShowCountryModal(true)}>
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <Feather name="globe" size={20} color="#4285F4" />
                </View>
                <Text className="text-base">
                  {selectedCountry ? selectedCountry : 'Sélectionner'}
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color="#9ca3af" />
            </Pressable>
          </View>

          {/* Sélection de la langue */}
          <View className="mb-6 w-full">
            <Text className="mb-2 text-base text-gray-700">Choisissez la langue</Text>
            <Pressable
              className="flex-row items-center justify-between rounded-lg border border-gray-300 p-4"
              onPress={() => setShowLanguageModal(true)}>
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <Feather name="type" size={20} color="#A855F7" />
                </View>
                <Text className="text-base">
                  {selectedLanguage ? selectedLanguage : 'Sélectionner'}
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color="#9ca3af" />
            </Pressable>
          </View>

          {/* Sélection de la devise */}
          <View className="mb-6 w-full">
            <Text className="mb-2 text-base text-gray-700">Sélectionnez la devise</Text>
            <View className="flex-row flex-wrap gap-2">
              {currencies.map((currency) => (
                <Pressable
                  key={currency.code}
                  onPress={() => setSelectedCurrency(currency.name)}
                  className={`rounded-full border px-4 py-3 ${
                    selectedCurrency === currency.name
                      ? 'border-black bg-gray-100'
                      : 'border-gray-300 bg-white'
                  }`}>
                  <Text className={`${selectedCurrency === currency.name ? 'font-medium' : ''}`}>
                    {currency.symbol} {currency.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Saisie du taux de TVA */}
          <View className="mb-6 w-full">
            <Text className="mb-2 text-base text-gray-700">Taux de TVA (%)</Text>
            <TextInput
              value={vatRate}
              onChangeText={setVatRate}
              keyboardType="numeric"
              className="rounded-lg border border-gray-300 p-4"
              placeholder="Ex: 20"
            />
          </View>

          <View className="px-5 py-4">
            <Button onPress={() => router.push('/onbording/profile')} title="Suivant" />
          </View>
        </View>
      </ScrollView>

      {/* Modal pour la sélection du pays */}
      <Modal
        animationType="fade"
        transparent
        visible={showCountryModal}
        onRequestClose={() => setShowCountryModal(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setShowCountryModal(false)}>
          <Pressable onPress={() => {}} className="w-4/5 rounded-2xl bg-white p-6">
            <Text className="mb-4 text-xl font-bold text-black">Sélectionnez un pays</Text>
            {countries.map((country) => (
              <Pressable
                key={country.code}
                onPress={() => {
                  setSelectedCountry(country.name);
                  setShowCountryModal(false);
                }}
                className="mb-2 rounded-lg border border-gray-300 p-4">
                <Text className="text-base text-gray-700">{country.name}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowCountryModal(false)}>
              <Text className="mt-4 text-center text-blue-600">Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal pour la sélection de la langue */}
      <Modal
        animationType="fade"
        transparent
        visible={showLanguageModal}
        onRequestClose={() => setShowLanguageModal(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setShowLanguageModal(false)}>
          <Pressable onPress={() => {}} className="w-4/5 rounded-2xl bg-white p-6">
            <Text className="mb-4 text-xl font-bold text-black">Choisissez la langue</Text>
            {languages.map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => {
                  setSelectedLanguage(lang.name);
                  setShowLanguageModal(false);
                }}
                className="mb-2 rounded-lg border border-gray-300 p-4">
                <Text className="text-base text-gray-700">{lang.name}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowLanguageModal(false)}>
              <Text className="mt-4 text-center text-blue-600">Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
