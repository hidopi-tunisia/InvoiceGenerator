import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';

import { useStore } from '~/store';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useStore((state) => state.profile);
  const resetNewInvoice = useStore((state) => state.resetNewInvoice);

  const settingsItems = [
    {
      title: 'Modifier le profil',
      icon: 'edit',
      action: () => router.push('/profile/edit'),
    },
    {
      title: 'À propos',
      icon: 'info',
      //action: () => router.push('/profile/about'),
    },
    {
      title: "Évaluer l'application",
      icon: 'star',
      action: () => Linking.openURL('https://...'), // Lien vers votre store
    },
    {
      title: 'Envoyer un feedback',
      icon: 'mail',
      action: () => Linking.openURL('mailto:h.chebbi@hidopi.com'),
    },
    {
      title: 'Taxes & Devise',
      icon: 'dollar-sign',
      action: () => router.push('/profile/tax-currency'),
    },
  ];
  const handleLogout = () => {
    // Ajoutez ici votre logique de déconnexion
    resetNewInvoice(); // Exemple de réinitialisation du store
    router.replace('/onbording'); // Redirection vers l'écran de connexion
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ flexGrow: 1 }}>
      {/* En-tête avec nom de l'entreprise */}
      <View className="mb-4 bg-white px-4 py-8 shadow-sm">
        <Text className="text-center text-2xl font-bold text-gray-900">
          {profile?.name || 'Votre Entreprise'}
        </Text>
      </View>

      {/* Liste des paramètres style iOS */}
      <View className="bg-white px-4">
        {settingsItems.map((item, index) => (
          <Pressable
            key={item.title}
            onPress={item.action}
            className={`flex-row items-center justify-between py-4 ${
              index < settingsItems.length - 1 ? 'border-b border-gray-100' : ''
            }`}>
            <View className="flex-row items-center">
              <Feather name={item.icon as any} size={20} color="#4f46e5" className="mr-3" />
              <Text className="text-base text-gray-900">{item.title}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#6b7280" />
          </Pressable>
        ))}
      </View>
      {/* Section supplémentaire */}
      <View className="mt-6 bg-white px-4 py-4">
        <Pressable
          className="flex-row items-center justify-between py-4"
          onPress={() => Linking.openURL('https://votreentreprise.com/help')}>
          <Text className="text-base text-gray-900">Centre d'aide</Text>
          <Feather name="external-link" size={20} color="#6b7280" />
        </Pressable>
      </View>

      {/* Section bas de page */}
      <View className="mt-auto pb-8 pt-6">
        {/* Version */}
        <Text className="mb-4 text-center text-sm text-gray-500">
          Version {Constants.expoConfig?.version}
        </Text>

        {/* Bouton de déconnexion */}
        <Pressable
          className="flex-row items-center justify-center space-x-2"
          onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#ef4444" />
          <Text className="font-medium text-red-500"> Se déconnecter</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
