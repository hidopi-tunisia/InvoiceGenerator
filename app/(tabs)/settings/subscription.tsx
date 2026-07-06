import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '~/components/Button';
import {
  BillingInterval,
  createCheckoutSession,
  getPlans,
  getSubscriptionUsage,
  openBillingPortal,
  Plan,
  SubPlan,
  SubscriptionUsage,
} from '~/domain/subscription';
import { syncInvoices } from '~/store/invoices-sync';

const PLAN_LABELS: Record<SubPlan, string> = {
  trial: 'Essai gratuit',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const formatLimit = (limit: number | null, unit: string) =>
  limit == null ? `${unit} illimitées` : `${limit} ${unit}/mois`;

export default function SubscriptionScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [billing, setBilling] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<SubPlan | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getPlans(), getSubscriptionUsage().catch(() => ({ data: null }))])
      .then(([plansRes, usageRes]) => {
        setPlans(plansRes.data ?? []);
        setUsage(usageRes.data);
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger les offres. Réessayez.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSubscribe = async (plan: SubPlan) => {
    setCheckoutPlan(plan);
    try {
      const { data } = await createCheckoutSession(plan, billing);
      await WebBrowser.openBrowserAsync(data.url);
      // Retour du navigateur : on ne connaît pas l'issue du paiement Stripe,
      // on rafraîchit l'abonnement et on repousse les factures restées dirty.
      load();
      syncInvoices();
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir le paiement. Réessayez.");
    } finally {
      setCheckoutPlan(null);
    }
  };

  const onManage = async () => {
    try {
      const { data } = await openBillingPortal();
      await WebBrowser.openBrowserAsync(data.url);
      load();
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir le portail de gestion.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      {usage && (
        <View className="mb-4 rounded-lg bg-white p-4">
          <Text className="text-sm text-gray-500">Plan actuel</Text>
          <Text className="text-lg font-bold text-gray-900">{PLAN_LABELS[usage.plan]}</Text>
          <Text className="mt-1 text-sm text-gray-600">
            {usage.invoicesThisMonth}
            {usage.invoiceLimit != null ? ` / ${usage.invoiceLimit}` : ''} factures ce mois-ci
          </Text>
        </View>
      )}

      {/* Bascule mensuel / annuel */}
      <View className="mb-4 flex-row rounded-full bg-gray-200 p-1">
        {(['monthly', 'annual'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setBilling(value)}
            accessibilityRole="button"
            className={`flex-1 rounded-full py-2 ${billing === value ? 'bg-white shadow-sm' : ''}`}>
            <Text
              className={`text-center text-sm font-medium ${
                billing === value ? 'text-primary' : 'text-gray-600'
              }`}>
              {value === 'monthly' ? 'Mensuel' : 'Annuel'}
            </Text>
          </Pressable>
        ))}
      </View>

      {plans
        .filter((plan) => plan.name !== 'trial')
        .map((plan) => {
          const isCurrent = usage?.plan === plan.name;
          const price =
            billing === 'monthly'
              ? plan.pricing.billedMonthly.price
              : plan.pricing.billedYearly.pricePerMonth;
          return (
            <View
              key={plan.name}
              className={`mb-3 rounded-lg border bg-white p-4 ${
                isCurrent ? 'border-primary' : 'border-gray-200'
              }`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900">{PLAN_LABELS[plan.name]}</Text>
                {isCurrent && (
                  <View className="rounded-full bg-primary/10 px-3 py-1">
                    <Text className="text-xs font-semibold text-primary">Actuel</Text>
                  </View>
                )}
              </View>
              <Text className="mt-1 text-2xl font-bold text-gray-900">
                {price} {plan.pricing.currency}
                <Text className="text-sm font-normal text-gray-500"> /mois</Text>
              </Text>
              {billing === 'annual' && plan.pricing.billedYearly.discountPercent > 0 && (
                <Text className="text-sm text-green-600">
                  -{plan.pricing.billedYearly.discountPercent}% en annuel
                </Text>
              )}
              <View className="mt-3 gap-1">
                <View className="flex-row items-center gap-2">
                  <Feather name="check" size={16} color="#16a34a" />
                  <Text className="text-sm text-gray-700">
                    {formatLimit(plan.limits.invoicesPerMonth, 'factures')}
                  </Text>
                </View>
                {plan.limits.pdfGeneration && (
                  <View className="flex-row items-center gap-2">
                    <Feather name="check" size={16} color="#16a34a" />
                    <Text className="text-sm text-gray-700">Génération PDF serveur</Text>
                  </View>
                )}
              </View>
              {!isCurrent && (
                <Button
                  className="mt-4"
                  title="Choisir ce plan"
                  loading={checkoutPlan === plan.name}
                  onPress={() => onSubscribe(plan.name)}
                />
              )}
            </View>
          );
        })}

      {usage && usage.plan !== 'trial' && (
        <Button variant="link" title="Gérer mon abonnement" onPress={onManage} />
      )}
    </ScrollView>
  );
}
