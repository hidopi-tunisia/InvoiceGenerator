import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BusinessEntity, businessEntitySchema } from '~/app/schema/invoice';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import LogoPicker from '~/components/LogoPicker';
import { useStore } from '~/store';
import { pushLogo, pushProfile } from '~/store/profile-sync';

export default function ProfileScreen() {
  const setProfile = useStore((data) => data.setProfile);
  const profile = useStore((data) => data.profile);

  // logoUri : état local d'écran (pas dans RHF — fusionné à la sauvegarde)
  const [logoUri, setLogoUri] = useState<string | undefined>(profile?.logoUri);

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
    },
  });

  const country = profile?.country;

  const onSubmit = (data: BusinessEntity) => {
    setProfile({ ...data, logoUri: logoUri ?? profile?.logoUri });
    pushProfile(); // fire-and-forget : pousse le profil vers le backend
    pushLogo(); // fire-and-forget best-effort : upload du logo si changé
    router.back();
  };

  return (
    <KeyboardAwareScrollView edges={['bottom', 'top']}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1, paddingHorizontal: 0 }}>
        <FormProvider {...methods}>
          {/* ── En-tête ──────────────────────────────────────────────── */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900">Mon Entreprise</Text>
            <Text className="mt-1 text-sm text-gray-500">
              Ces informations apparaîtront sur vos factures.
            </Text>
          </View>

          {/* ── Logo ─────────────────────────────────────────────────── */}
          <LogoPicker logoUri={logoUri} logoUrl={profile?.logoUrl} onPick={setLogoUri} />

          {/* ── Carte : Informations générales ───────────────────────── */}
          <View className="mb-4 rounded-xl bg-white px-4 pb-2 pt-4 shadow-sm">
            <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Informations générales
            </Text>

            <CustomInputText name="name" label="Nom / Raison sociale" placeholder="Entrez le nom" />
            <CustomInputText
              name="phone"
              label="Téléphone (optionnel)"
              placeholder="+216 XX XXX XXX"
              keyboardType="phone-pad"
            />
          </View>

          {/* ── Carte : Adresse ──────────────────────────────────────── */}
          <View className="mb-4 rounded-xl bg-white px-4 pb-2 pt-4 shadow-sm">
            <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Adresse
            </Text>

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

          {/* ── Carte : Informations fiscales ────────────────────────── */}
          <View className="mb-6 rounded-xl bg-white px-4 pb-2 pt-4 shadow-sm">
            <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Informations fiscales
            </Text>

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
          <Button
            title="Sauvegarder"
            className="mt-auto"
            onPress={methods.handleSubmit(onSubmit)}
          />
        </FormProvider>
      </SafeAreaView>
    </KeyboardAwareScrollView>
  );
}
