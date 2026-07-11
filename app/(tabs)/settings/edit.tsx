import { Feather } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Modal, Pressable, Text, View } from 'react-native';

import { BusinessEntity, businessEntitySchema } from '~/app/schema/invoice';
import { phonePlaceholderForCountry } from '~/app/utils/profile';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import LogoPicker from '~/components/LogoPicker';
import { useStore } from '~/store';
import { adoptLogoAndPush, pushLogo, pushProfile } from '~/store/profile-sync';

const countries = [
  { code: 'TN', name: 'Tunisie' },
  { code: 'FR', name: 'France' },
];

export default function ProfileScreen() {
  const setProfile = useStore((data) => data.setProfile);
  const profile = useStore((data) => data.profile);

  // logoUri : état local d'écran (pas dans RHF — fusionné à la sauvegarde)
  const [logoUri, setLogoUri] = useState<string | undefined>(profile?.logoUri);

  // Modal pays
  const [showCountryModal, setShowCountryModal] = useState(false);

  // Id de repli STABLE entre rendus (un randomUUID() inline dans `defaultValues`
  // changerait à chaque rendu → resets en boucle).
  const fallbackId = useRef(Crypto.randomUUID()).current;

  // defaultValues figés acceptables ici : le profil est déjà présent en local
  // (l'utilisateur a complété l'onboarding avant d'accéder aux Réglages).
  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    defaultValues: {
      id: profile?.id || fallbackId,
      name: profile?.name,
      address: profile?.address,
      tva: profile?.tva,
      siret: profile?.siret,
      mf: profile?.mf,
      phone: profile?.phone,
      zipCode: profile?.zipCode,
      city: profile?.city,
      country: profile?.country,
    },
  });

  // Réactif : basculer le pays dans le form met à jour immédiatement le conditionnel fiscal
  const watchedCountry = methods.watch('country');

  const countryName = countries.find((c) => c.code === watchedCountry)?.name;

  const onSubmit = (data: BusinessEntity) => {
    setProfile({ ...data, logoUri: logoUri ?? profile?.logoUri });
    pushProfile(); // fire-and-forget : pousse le profil vers le backend
    pushLogo(); // fire-and-forget best-effort : upload du logo si changé
    router.back();
  };

  return (
    <KeyboardAwareScrollView edges={['bottom', 'top']}>
      <FormProvider {...methods}>
        {/* ── En-tête ──────────────────────────────────────────────── */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">Mon Entreprise</Text>
          <Text className="mt-1 text-sm text-gray-500">
            Ces informations apparaîtront sur vos factures.
          </Text>
        </View>

        {/* ── Logo centré ──────────────────────────────────────────── */}
        <View className="mb-8 items-center">
          <LogoPicker
            logoUri={logoUri ?? profile?.logoUri}
            logoUrl={profile?.logoUrl}
            onPick={(uri) => {
              setLogoUri(uri);
              adoptLogoAndPush(uri); // sauvegarde + upload immédiats (demande produit)
            }}
          />
        </View>

        {/* ── Section : Informations générales ─────────────────────── */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Informations générales
        </Text>
        <View className="mb-6 gap-4">
          <CustomInputText name="name" label="Nom / Raison sociale" placeholder="Entrez le nom" />

          {/* Sélecteur de pays */}
          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700">Pays</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sélectionner le pays"
              className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-4"
              onPress={() => setShowCountryModal(true)}>
              <View className="flex-row items-center">
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Feather name="globe" size={18} color="#4f46e5" />
                </View>
                <Text className="text-base text-gray-800">
                  {countryName ?? 'Sélectionner un pays'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9ca3af" />
            </Pressable>
          </View>

          <CustomInputText
            name="phone"
            label="Téléphone (optionnel)"
            placeholder={phonePlaceholderForCountry(watchedCountry)}
            keyboardType="phone-pad"
          />
        </View>

        {/* ── Section : Adresse ────────────────────────────────────── */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Adresse
        </Text>
        <View className="mb-6 gap-4">
          <CustomInputText
            name="address"
            label="Adresse"
            placeholder="Numéro et nom de rue"
            multiline
            numberOfLines={3}
            className="min-h-28"
          />

          {/* Code postal + Ville sur une même ligne */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <CustomInputText name="zipCode" label="Code postal" placeholder="75001" />
            </View>
            <View className="flex-[2]">
              <CustomInputText name="city" label="Ville" placeholder="Paris" />
            </View>
          </View>
        </View>

        {/* ── Section : Informations fiscales ──────────────────────── */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Informations fiscales
        </Text>
        <View className="mb-8 gap-4">
          {watchedCountry === 'FR' && (
            <CustomInputText name="siret" label="Siret" placeholder="14 chiffres" />
          )}
          {watchedCountry === 'TN' && (
            <CustomInputText
              name="mf"
              label="Matricule fiscal (MF)"
              placeholder="XXXXXXX/X/X/XXX"
            />
          )}

          <CustomInputText
            name="tva"
            label="Numéro de TVA (optionnel)"
            placeholder="FR12345678901"
          />
        </View>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <Button title="Sauvegarder" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </FormProvider>

      {/* ── Modal sélection du pays ───────────────────────────────── */}
      <Modal
        animationType="fade"
        transparent
        visible={showCountryModal}
        onRequestClose={() => setShowCountryModal(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setShowCountryModal(false)}>
          <Pressable
            accessibilityRole="none"
            onPress={() => {}}
            className="w-4/5 rounded-2xl bg-white p-6">
            <Text className="mb-4 text-xl font-bold text-black">Sélectionnez un pays</Text>
            {countries.map((c) => (
              <Pressable
                key={c.code}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                onPress={() => {
                  methods.setValue('country', c.code, { shouldDirty: true });
                  setShowCountryModal(false);
                }}
                className="mb-2 rounded-lg border border-gray-300 p-4">
                <Text className="text-base text-gray-700">{c.name}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={() => setShowCountryModal(false)}>
              <Text className="mt-4 text-center text-primary">Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAwareScrollView>
  );
}
