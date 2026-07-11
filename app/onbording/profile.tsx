import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { BusinessEntity, businessEntitySchema } from '~/app/schema/invoice';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import LogoPicker from '~/components/LogoPicker';
import { useStore } from '~/store';
import { adoptLogoAndPush, pushLogo, pushProfile } from '~/store/profile-sync';

export default function ProfileScreen() {
  const setProfile = useStore((data) => data.setProfile);
  const setOnboardingCompleted = useStore((data) => data.setOnboardingCompleted);
  const profile = useStore((data) => data.profile);

  // logoUri : état local d'écran (pas dans RHF — fusionné à la sauvegarde)
  const [logoUri, setLogoUri] = useState<string | undefined>(profile?.logoUri);

  // Id de repli STABLE entre rendus (un randomUUID() inline dans `values`
  // changerait à chaque rendu → resets en boucle).
  const fallbackId = useRef(Crypto.randomUUID()).current;

  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    // `values` réactif : le pull serveur peut arriver après le montage —
    // RHF resynchronise alors les champs non modifiés.
    values: {
      id: profile?.id || fallbackId,
      name: profile?.name,
      address: profile?.address,
      tva: profile?.tva,
      siret: profile?.siret,
      mf: profile?.mf,
      phone: profile?.phone,
      zipCode: profile?.zipCode,
      city: profile?.city,
    } as BusinessEntity,
    resetOptions: { keepDirtyValues: true },
  });

  const country = profile?.country;

  const onSubmit = (data: BusinessEntity) => {
    // Fusionner logoUri dans les données avant de persister
    setProfile({ ...data, logoUri: logoUri ?? profile?.logoUri });
    setOnboardingCompleted();
    pushProfile(); // fire-and-forget
    pushLogo(); // fire-and-forget best-effort
    // replace : l'onboarding est terminé, le retour arrière ne doit pas y revenir
    router.replace('/');
  };

  return (
    <KeyboardAwareScrollView edges={['bottom', 'top']}>
      <FormProvider {...methods}>
        {/* ── En-tête ──────────────────────────────────────────────── */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">Mon Profil</Text>
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
          <CustomInputText
            name="phone"
            label="Téléphone (optionnel)"
            placeholder="+216 XX XXX XXX"
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
          {country === 'FR' && (
            <CustomInputText name="siret" label="Siret" placeholder="14 chiffres" />
          )}
          {country === 'TN' && (
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
    </KeyboardAwareScrollView>
  );
}
