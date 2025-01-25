import { router } from 'expo-router';
import React from 'react';
import { View, Text, Image } from 'react-native';

import { Button } from '~/components/Button';

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.push('/onbording/profile'); // Navigue vers la première étape de l'onboarding
  };

  return (
    <View className="flex-1 items-center justify-between bg-indigo-50 p-6">
      {/* Illustration */}
      <Image
        //source={require('../../../assets/welcome-illustration.png')} // Remplacez par votre image
        className="h-2/4 w-3/4"
        resizeMode="contain"
      />

      {/* Texte de bienvenue */}
      <View className="items-center">
        <Text className="text-center text-3xl font-bold text-indigo-600">Bienvenue !</Text>
        <Text className="mt-2 text-center text-lg text-gray-600">
          Commencez à utiliser notre application et profitez d'une expérience de facturation fluide
          et rapide.
        </Text>
      </View>

      {/* Bouton de démarrage */}
      <Button
        title="Commencer"
        onPress={handleGetStarted}
        className="w-full rounded-lg bg-indigo-500 py-4 shadow-md"
      />
    </View>
  );
}
