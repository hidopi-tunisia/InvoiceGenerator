import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert } from 'react-native';

import { auth } from '~/app/config';
import { useReviews } from '~/app/utils/review';
import { getSubscriptionUsage, SubscriptionUsage } from '~/domain/subscription';
import { useStore } from '~/store';
import { refreshProfileFromServer } from '~/store/profile-sync';

const PLAN_LABELS: Record<SubscriptionUsage['plan'], string> = {
  trial: 'Essai gratuit',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function SettingScreen() {
  const router = useRouter();
  const profile = useStore((state) => state.profile);
  const resetNewInvoice = useStore((state) => state.resetNewInvoice);
  const { requestFeedbackOrReview, askForFeedback } = useReviews();

  // Abonnement : affichage best-effort — l'échec réseau masque simplement la carte
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSubscriptionUsage()
      .then(({ data }) => {
        if (!cancelled) setUsage(data);
      })
      .catch(() => {
        // Silencieux : offline-first, la section abonnement est un bonus
      });
    // Rafraîchit le profil depuis le serveur à l'ouverture des Réglages :
    // devise, TVA, etc. restent alignées sur la source de vérité (web inclus).
    refreshProfileFromServer();
    return () => {
      cancelled = true;
    };
  }, []);

  const settingsItems = [
    {
      title: 'Modifier le profil',
      icon: 'edit',
      action: () => router.push('/settings/edit'),
    },
    {
      title: 'Taxes & Devise',
      icon: 'dollar-sign',
      action: () => router.push('/settings/tax-currency'),
    },
    {
      title: "Évaluer l'application",
      icon: 'star',
      action: () => requestFeedbackOrReview(), // Lien vers votre store
    },
    {
      title: 'Envoyer un feedback',
      icon: 'mail',
      action: () => askForFeedback(),
    },
  ];
  const handleLogout = () => {
    // Confirmation : l'app est offline-first, une déconnexion accidentelle
    // hors ligne bloque l'utilisateur jusqu'au retour du réseau.
    Alert.alert('Se déconnecter', 'Vous devrez vous reconnecter pour accéder à vos factures.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            resetNewInvoice(); // abandonne le brouillon de facture en cours
            await auth.signOut();
            // Pas de navigation manuelle : l'auth-gate (app/_layout.tsx) détecte
            // user = null via onAuthStateChanged et redirige vers /(auth)/login.
          } catch {
            Alert.alert('Erreur', 'Impossible de se déconnecter. Réessayez.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ flexGrow: 1 }}>
      {/* En-tête avec nom de l'entreprise */}
      <View className="mb-4 bg-white px-4 py-8 shadow-sm">
        <Text className="text-center text-2xl font-bold text-gray-900">
          {profile?.name || 'Votre Entreprise'}
        </Text>
      </View>

      {/* Abonnement (best-effort : absent hors ligne) */}
      {usage && (
        <View className="mb-4 bg-white px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-semibold text-gray-900">
                Plan {PLAN_LABELS[usage.plan]}
              </Text>
              <Text className="mt-1 text-sm text-gray-600">
                {usage.invoicesThisMonth}
                {usage.invoiceLimit != null ? ` / ${usage.invoiceLimit}` : ''} factures ce mois-ci
              </Text>
              {usage.status === 'trialing' && usage.trialEndDate && (
                <Text className="mt-1 text-sm text-gray-500">
                  Essai jusqu'au {new Date(usage.trialEndDate).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </View>
            <Feather name="award" size={22} color="#4f46e5" />
          </View>
        </View>
      )}

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
          onPress={() => Linking.openURL('https://hidopi.com')}>
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
