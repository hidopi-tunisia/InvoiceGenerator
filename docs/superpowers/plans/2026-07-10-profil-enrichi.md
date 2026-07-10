# Profil enrichi — logo, téléphone, adresse structurée, SIRET/MF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter logo (upload best-effort), téléphone, adresse structurée (rue / CP / ville), et identifiant fiscal SIRET/MF aux deux écrans de profil (onboarding + réglages), en alignant les mappers backend sur la nouvelle structure.

**Architecture:** Couche données d'abord (schéma Zod + mappers + `uploadLogo` + `pushLogo`), puis dépendance native expo-image-picker et composant partagé `LogoPicker`, enfin les deux écrans UI qui consomment ces briques. Chaque tâche produit un livrable testable indépendant.

**Tech Stack:** Expo SDK 57 / New Architecture · React Native 0.86 · NativeWind 4 · Zustand 4 · React Hook Form 7 + Zod 3 · Firebase Auth · expo-image-picker (à installer) · TypeScript 6

## Global Constraints

- Expo SDK 57 / New Architecture — ne pas introduire de dépendances incompatibles.
- Commentaires et chaînes UI 100 % français ; pas de string anglaise côté utilisateur.
- Alias `~/` pour tout import sauf `domain/` (imports relatifs dans ce dossier — règle existante).
- `expo-image-picker` est un module natif → **rebuild du dev-client requis** après l'ajout (noté dans la tâche concernée).
- `.npmrc` avec `legacy-peer-deps=true` déjà en place — installer via `npx expo install`.
- Vérification = `npx tsc --noEmit` + `npx eslint "**/*.{ts,tsx}"` + `npx prettier --write "**/*.{ts,tsx}"` sur les fichiers modifiés.
- Mappers (fonctions pures) : vérifier avec un **repro Node dans le scratchpad** (`/private/tmp/claude-501/-Users-hamdichebbi-Desktop-SaaS-Facturation-InvoiceGenerator/4b7a5da4-c12a-4e49-939f-c3a7f838ab64/scratchpad/test-mappers.mjs`) — jamais commité.
- Chemins avec parenthèses/crochets **quotés** dans toutes les commandes shell.
- YAGNI : pas de validation stricte SIRET 14 chiffres, pas de suppression logo, pas de champ `state`, pas de logo dans le PDF.
- `siret` est déjà dans `businessEntitySchema` — ne pas le redéclarer.
- `fiscalTypeForCountry` est privé (non exporté) dans `domain/mappers.ts` — son comportement change (FR → SIRET, pas TVA) ; il faut modifier la fonction en place.

---

### Task 1 : Couche données — schéma, mappers, uploadLogo, pushLogo

**Files:**
- Modify: `app/schema/invoice.ts` (ajout champs optionnels à `businessEntitySchema`)
- Modify: `domain/mappers.ts` (réécriture `toBackendProfileInput`, `fromBackendProfile`, `fiscalTypeForCountry`)
- Modify: `domain/profile.ts` (nouvelle fonction `uploadLogo`)
- Modify: `store/profile-sync.ts` (nouvelle fonction `pushLogo`)
- Scratchpad (jamais commité): `/private/tmp/claude-501/-Users-hamdichebbi-Desktop-SaaS-Facturation-InvoiceGenerator/4b7a5da4-c12a-4e49-939f-c3a7f838ab64/scratchpad/test-mappers.mjs`

**Interfaces:**
- Consumes: `BusinessEntity` (store), `BackendProfile` (domain/profile.ts), `request` + `reportSyncError` (domain/http.ts), `getAuthorization` (domain/authorization.ts), `ENDPOINT` (constants/index.ts)
- Produces:
  - `BusinessEntity` étendu avec `phone?`, `zipCode?`, `city?`, `mf?`, `logoUri?`, `logoUrl?`, `logoSyncedUri?`
  - `toBackendProfileInput(profile: BusinessEntity): ProfileInput` — signature inchangée
  - `fromBackendProfile(remote: BackendProfile): Partial<BusinessEntity>` — signature inchangée
  - `uploadLogo(uri: string): Promise<{ logoUrl: string }>` — dans `domain/profile.ts`
  - `pushLogo(): Promise<void>` — dans `store/profile-sync.ts`

- [ ] **Étape 1 : Ajouter les champs optionnels au schéma Zod**

Dans `app/schema/invoice.ts`, ajouter après la ligne `siret: z.string().optional(),` :

```typescript
  phone: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  mf: z.string().optional(),
  logoUri: z.string().optional(),
  logoUrl: z.string().optional(),
  logoSyncedUri: z.string().optional(),
```

Le schéma complet après modification :

```typescript
export const businessEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string({ required_error: 'Le nom est obligatoire' }).min(1, 'Le nom est obligatoire'),
  address: z
    .string({ required_error: "L'adresse postale est obligatoire" })
    .min(1, "L'adresse obligatoire"),
  tva: z.string().optional(),
  siret: z.string().optional(),
  email: z.string().optional(),
  currency: z.string().optional(),
  taxRate: z.number().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  phone: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  mf: z.string().optional(),
  logoUri: z.string().optional(),
  logoUrl: z.string().optional(),
  logoSyncedUri: z.string().optional(),
  // Métadonnées de sync backend (jamais saisies en formulaire)
  remoteId: z.string().optional(),
  syncedAt: z.string().optional(),
  dirty: z.boolean().optional(),
  syncError: z.string().optional(),
});
```

- [ ] **Étape 2 : Mettre à jour `fiscalTypeForCountry` dans `domain/mappers.ts`**

Remplacer la fonction privée actuelle (ligne 169) :

```typescript
// Avant :
const fiscalTypeForCountry = (country?: string): 'MF' | 'TVA' | 'none' => {
  if (country === 'TN') return 'MF';
  if (country === 'FR') return 'TVA';
  return 'none';
};
```

Par :

```typescript
// Après — FR → SIRET (plus TVA), TN → MF, sinon none (spec §Mappers)
const fiscalTypeForCountry = (country?: string): 'MF' | 'SIRET' | 'none' => {
  if (country === 'TN') return 'MF';
  if (country === 'FR') return 'SIRET';
  return 'none';
};
```

- [ ] **Étape 3 : Réécrire `toBackendProfileInput` dans `domain/mappers.ts`**

Remplacer l'implémentation existante (lignes 176-191) :

```typescript
/** Profil local → body PATCH/POST /profile (jamais de champs protégés). */
export const toBackendProfileInput = (profile: BusinessEntity): ProfileInput => {
  // Adresse : n'envoyer l'objet que si au moins un champ est renseigné
  const hasAddress = !!(profile.address || profile.zipCode || profile.city || profile.country);
  const address = hasAddress
    ? {
        street: profile.address || undefined,
        zip: profile.zipCode || undefined,
        city: profile.city || undefined,
        country: profile.country || undefined,
      }
    : undefined;

  // Identifiant fiscal : SIRET pour FR, MF pour TN — TVA n'est plus poussé ici
  let fiscalIdentifier: ProfileInput['fiscalIdentifier'] = undefined;
  if (profile.country === 'FR' && profile.siret) {
    fiscalIdentifier = { type: 'SIRET', value: profile.siret, country: 'FR' };
  } else if (profile.country === 'TN' && profile.mf) {
    fiscalIdentifier = { type: 'MF', value: profile.mf, country: 'TN' };
  }

  return {
    companyName: profile.name || undefined,
    currency: profile.currency || undefined,
    language: profile.language === 'en' ? 'en' : 'fr',
    vat: profile.taxRate,
    phone: profile.phone || undefined,
    address,
    fiscalIdentifier,
  };
};
```

- [ ] **Étape 4 : Réécrire `fromBackendProfile` dans `domain/mappers.ts`**

Remplacer l'implémentation existante (lignes 198-216) :

```typescript
/**
 * Profil backend → champs locaux (bootstrap d'un utilisateur venu du front
 * Angular : store mobile vierge mais profil serveur renseigné). Ne retourne
 * que les champs non vides — le merge préserve le reste du profil local.
 * Adresse répartie : street → address, zip → zipCode, city → city.
 * fiscalIdentifier : SIRET → siret, MF → mf, TVA → tva (rétro-compat).
 */
export const fromBackendProfile = (remote: BackendProfile): Partial<BusinessEntity> => {
  const local: Partial<BusinessEntity> = {};
  const name = remote.companyName || remote.name;
  if (name) local.name = name;
  if (remote.currency) local.currency = remote.currency;
  if (remote.language) local.language = remote.language;
  if (remote.vat !== undefined) local.taxRate = remote.vat;
  if (remote.phone) local.phone = remote.phone;
  if (remote.logoUrl) local.logoUrl = remote.logoUrl;

  // Adresse structurée (répartie — plus de concaténation)
  if (remote.address?.street) local.address = remote.address.street;
  if (remote.address?.zip) local.zipCode = remote.address.zip;
  if (remote.address?.city) local.city = remote.address.city;

  // Pays : priorité fiscalIdentifier.country, sinon address.country
  const country = remote.fiscalIdentifier?.country || remote.address?.country;
  if (country) local.country = country;

  // Identifiant fiscal : type détermine le champ local cible
  if (remote.fiscalIdentifier?.value) {
    switch (remote.fiscalIdentifier.type) {
      case 'SIRET':
      case 'SIREN':
        local.siret = remote.fiscalIdentifier.value;
        break;
      case 'MF':
        local.mf = remote.fiscalIdentifier.value;
        break;
      case 'TVA':
        // Rétro-compat : les anciennes valeurs poussées en type TVA restent dans tva
        local.tva = remote.fiscalIdentifier.value;
        break;
      default:
        break;
    }
  }

  return local;
};
```

- [ ] **Étape 5 : Écrire le repro Node pour valider les mappers**

Créer (ne pas commiter) `/private/tmp/claude-501/-Users-hamdichebbi-Desktop-SaaS-Facturation-InvoiceGenerator/4b7a5da4-c12a-4e49-939f-c3a7f838ab64/scratchpad/test-mappers.mjs` :

```javascript
// Repro Node — teste les mappers profil sans framework
// Exécuter : node /private/tmp/claude-501/-Users-hamdichebbi-Desktop-SaaS-Facturation-InvoiceGenerator/4b7a5da4-c12a-4e49-939f-c3a7f838ab64/scratchpad/test-mappers.mjs

// --- Copies inline des fonctions (pas d'import TS) ---
const fiscalTypeForCountry = (country) => {
  if (country === 'TN') return 'MF';
  if (country === 'FR') return 'SIRET';
  return 'none';
};

const toBackendProfileInput = (profile) => {
  const hasAddress = !!(profile.address || profile.zipCode || profile.city || profile.country);
  const address = hasAddress
    ? {
        street: profile.address || undefined,
        zip: profile.zipCode || undefined,
        city: profile.city || undefined,
        country: profile.country || undefined,
      }
    : undefined;
  let fiscalIdentifier = undefined;
  if (profile.country === 'FR' && profile.siret) {
    fiscalIdentifier = { type: 'SIRET', value: profile.siret, country: 'FR' };
  } else if (profile.country === 'TN' && profile.mf) {
    fiscalIdentifier = { type: 'MF', value: profile.mf, country: 'TN' };
  }
  return {
    companyName: profile.name || undefined,
    currency: profile.currency || undefined,
    language: profile.language === 'en' ? 'en' : 'fr',
    vat: profile.taxRate,
    phone: profile.phone || undefined,
    address,
    fiscalIdentifier,
  };
};

const fromBackendProfile = (remote) => {
  const local = {};
  const name = remote.companyName || remote.name;
  if (name) local.name = name;
  if (remote.currency) local.currency = remote.currency;
  if (remote.language) local.language = remote.language;
  if (remote.vat !== undefined) local.taxRate = remote.vat;
  if (remote.phone) local.phone = remote.phone;
  if (remote.logoUrl) local.logoUrl = remote.logoUrl;
  if (remote.address?.street) local.address = remote.address.street;
  if (remote.address?.zip) local.zipCode = remote.address.zip;
  if (remote.address?.city) local.city = remote.address.city;
  const country = remote.fiscalIdentifier?.country || remote.address?.country;
  if (country) local.country = country;
  if (remote.fiscalIdentifier?.value) {
    switch (remote.fiscalIdentifier.type) {
      case 'SIRET':
      case 'SIREN':
        local.siret = remote.fiscalIdentifier.value;
        break;
      case 'MF':
        local.mf = remote.fiscalIdentifier.value;
        break;
      case 'TVA':
        local.tva = remote.fiscalIdentifier.value;
        break;
    }
  }
  return local;
};

// --- Tests ---
let passed = 0;
let failed = 0;
const assert = (label, condition) => {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.error(`  ✗ ${label}`); failed++; }
};

console.log('\n=== toBackendProfileInput ===');

// SIRET pour FR
const fr = { name: 'Acme FR', country: 'FR', siret: '12345678901234', taxRate: 20, address: '10 rue de la Paix', zipCode: '75001', city: 'Paris' };
const frOut = toBackendProfileInput(fr);
assert('FR → type SIRET', frOut.fiscalIdentifier?.type === 'SIRET');
assert('FR → value siret', frOut.fiscalIdentifier?.value === '12345678901234');
assert('FR → country FR', frOut.fiscalIdentifier?.country === 'FR');
assert('TVA non poussée', frOut.fiscalIdentifier?.type !== 'TVA');
assert('adresse street', frOut.address?.street === '10 rue de la Paix');
assert('adresse zip', frOut.address?.zip === '75001');
assert('adresse city', frOut.address?.city === 'Paris');

// MF pour TN
const tn = { name: 'Acme TN', country: 'TN', mf: '1234567A/B/000', phone: '+21650000000' };
const tnOut = toBackendProfileInput(tn);
assert('TN → type MF', tnOut.fiscalIdentifier?.type === 'MF');
assert('TN → phone mappé', tnOut.phone === '+21650000000');
assert('TN → pas de SIRET', !tnOut.fiscalIdentifier?.value?.includes('SIRET'));

// Aucun fiscal → undefined
const noFiscal = { name: 'Test', country: 'MA' };
const noOut = toBackendProfileInput(noFiscal);
assert('pays inconnu → fiscalIdentifier undefined', noOut.fiscalIdentifier === undefined);

// TVA non envoyée même si présente
const withTva = { name: 'TVA co', country: 'FR', tva: 'FR12345678901', siret: undefined };
const tvaOut = toBackendProfileInput(withTva);
assert('TVA non poussée dans fiscalIdentifier', tvaOut.fiscalIdentifier === undefined);

console.log('\n=== fromBackendProfile ===');

// Utilisateur Angular : adresse répartie
const remote1 = {
  companyName: 'Mon Entreprise',
  currency: 'EUR',
  language: 'fr',
  vat: 20,
  phone: '+33612345678',
  logoUrl: 'https://cdn.example.com/logo.png',
  address: { street: '5 avenue Victor Hugo', zip: '69000', city: 'Lyon', country: 'FR' },
  fiscalIdentifier: { type: 'SIRET', value: '98765432100019', country: 'FR' },
};
const loc1 = fromBackendProfile(remote1);
assert('companyName → name', loc1.name === 'Mon Entreprise');
assert('phone mappé', loc1.phone === '+33612345678');
assert('logoUrl mappé', loc1.logoUrl === 'https://cdn.example.com/logo.png');
assert('street → address', loc1.address === '5 avenue Victor Hugo');
assert('zip → zipCode', loc1.zipCode === '69000');
assert('city → city', loc1.city === 'Lyon');
assert('SIRET → siret', loc1.siret === '98765432100019');
assert('country depuis fiscalIdentifier', loc1.country === 'FR');
assert('tva non défini', loc1.tva === undefined);

// Rétro-compat TVA
const remote2 = {
  name: 'Old User',
  fiscalIdentifier: { type: 'TVA', value: 'FR00123456789', country: 'FR' },
  address: { country: 'FR' },
};
const loc2 = fromBackendProfile(remote2);
assert('TVA rétro-compat → tva', loc2.tva === 'FR00123456789');
assert('TVA rétro-compat → siret non défini', loc2.siret === undefined);

// MF tunisien
const remote3 = {
  companyName: 'Sarl TN',
  fiscalIdentifier: { type: 'MF', value: '1234567A/B/000', country: 'TN' },
};
const loc3 = fromBackendProfile(remote3);
assert('MF → mf', loc3.mf === '1234567A/B/000');
assert('country TN', loc3.country === 'TN');

console.log(`\n${passed} tests passés, ${failed} échoués.`);
if (failed > 0) process.exit(1);
```

- [ ] **Étape 6 : Exécuter le repro Node**

```bash
node "/private/tmp/claude-501/-Users-hamdichebbi-Desktop-SaaS-Facturation-InvoiceGenerator/4b7a5da4-c12a-4e49-939f-c3a7f838ab64/scratchpad/test-mappers.mjs"
```

Résultat attendu : tous les tests passés, exit 0.

- [ ] **Étape 7 : Ajouter `uploadLogo` dans `domain/profile.ts`**

Le helper `request` de `domain/http.ts` impose `Content-Type: application/json` dès qu'un `body` est fourni et ne gère pas le multipart. Il faut un `fetch` dédié avec le même token Firebase. Ajouter en fin de fichier (avant les exports) :

```typescript
/**
 * Upload du logo en multipart (PATCH /profile/logo, API.md §157).
 * Le helper `request` ne gère pas le multipart — fetch dédié avec token Firebase.
 * Retourne l'URL Cloudinary du logo uploadé.
 */
export const uploadLogo = async (uri: string): Promise<{ logoUrl: string }> => {
  const { getAuthorization } = await import('./authorization');
  const { ENDPOINT } = await import('../constants');
  const token = await getAuthorization(false);

  const formData = new FormData();
  // React Native accepte { uri, name, type } comme valeur FormData
  formData.append('logo', { uri, name: 'logo.jpg', type: 'image/jpeg' } as unknown as Blob);

  const response = await fetch(`${ENDPOINT}/profile/logo`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      // Pas de Content-Type : le browser/RN le génère avec le boundary multipart
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload logo échoué (${response.status}) : ${text}`);
  }

  const json = (await response.json()) as { success: boolean; data: { logoUrl: string } };
  return { logoUrl: json.data.logoUrl };
};
```

Et ajouter `uploadLogo` à la ligne d'export en bas du fichier :

```typescript
export { getProfile, createProfile, updateProfile, removeProfile, uploadLogo };
```

- [ ] **Étape 8 : Ajouter `pushLogo` dans `store/profile-sync.ts`**

Ajouter après l'import de `getProfile, updateProfile` :

```typescript
import { getProfile, updateProfile, uploadLogo, type BackendProfile } from '../domain/profile';
```

Ajouter la fonction en fin de fichier (avant `syncProfileOnBoot`) :

```typescript
/**
 * Upload best-effort du logo : si `logoUri` est présent et différent de
 * `logoSyncedUri`, tente l'upload. Succès → met à jour `logoUrl` et
 * `logoSyncedUri`. Échec réseau → silencieux (retenté à la prochaine
 * sauvegarde). Autre échec → `reportSyncError`.
 */
export const pushLogo = async (): Promise<void> => {
  const { profile, setProfile } = useStore.getState();
  const { logoUri, logoSyncedUri } = profile;
  if (!logoUri || logoUri === logoSyncedUri) return;
  try {
    const { logoUrl } = await uploadLogo(logoUri);
    setProfile({ logoUrl, logoSyncedUri: logoUri });
  } catch (error) {
    reportSyncError('pushLogo', error);
  }
};
```

- [ ] **Étape 9 : Vérification TypeScript + lint**

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx tsc --noEmit
```

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx eslint "app/schema/invoice.ts" "domain/mappers.ts" "domain/profile.ts" "store/profile-sync.ts"
```

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx prettier --write "app/schema/invoice.ts" "domain/mappers.ts" "domain/profile.ts" "store/profile-sync.ts"
```

Résultat attendu : aucune erreur TS, aucun warning ESLint.

- [ ] **Étape 10 : Commit**

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && git add "app/schema/invoice.ts" "domain/mappers.ts" "domain/profile.ts" "store/profile-sync.ts"
git commit -m "feat(profil): schéma enrichi + mappers adresse structurée / SIRET/MF + uploadLogo + pushLogo"
```

---

### Task 2 : expo-image-picker + composant LogoPicker + écran onboarding

**Files:**
- Modify: `app.json` (plugin expo-image-picker avec message permission français)
- Modify: `package.json` (dépendance expo-image-picker après `npx expo install`)
- Create: `components/LogoPicker.tsx`
- Modify: `app/onbording/profile.tsx`

**Interfaces:**
- Consumes: `BusinessEntity` (schéma étendu de Task 1), `pushLogo` (store/profile-sync.ts de Task 1), `useStore` (store/index.ts)
- Produces:
  - `LogoPicker` : `React.FC<{ logoUri?: string; logoUrl?: string; onPick: (uri: string) => void }>` — cercle tappable, aperçu ou icône, ouvre la galerie
  - Écran onboarding mis à jour : inclut tous les nouveaux champs + LogoPicker + `pushLogo()` à la sauvegarde

- [ ] **Étape 1 : Installer expo-image-picker**

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx expo install expo-image-picker
```

Résultat attendu : `expo-image-picker` ajouté dans `package.json` dependencies avec la version SDK 57 compatible.

> **REBUILD DU DEV-CLIENT REQUIS** après cette étape pour que le module natif soit disponible. Sans rebuild, `launchImageLibraryAsync` lancera une erreur « module not found » au runtime.

- [ ] **Étape 2 : Ajouter le plugin expo-image-picker dans `app.json`**

Dans `app.json`, dans le tableau `"plugins"`, ajouter après `"expo-sharing"` :

```json
[
  "expo-image-picker",
  {
    "photosPermission": "Fatourty a besoin d'accéder à votre galerie pour ajouter un logo à votre profil."
  }
],
```

Le bloc `plugins` complet après modification :

```json
"plugins": [
  "expo-router",
  "expo-build-properties",
  [
    "@sentry/react-native/expo",
    {
      "organization": "hidopi",
      "project": "fatourty",
      "url": "https://sentry.io/"
    }
  ],
  "expo-font",
  "expo-asset",
  "@react-native-community/datetimepicker",
  "@sentry/react-native",
  "expo-web-browser",
  "expo-sharing",
  [
    "expo-image-picker",
    {
      "photosPermission": "Fatourty a besoin d'accéder à votre galerie pour ajouter un logo à votre profil."
    }
  ],
  "expo-status-bar",
  [
    "expo-splash-screen",
    {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    }
  ]
]
```

- [ ] **Étape 3 : Créer `components/LogoPicker.tsx`**

```typescript
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

type LogoPickerProps = {
  /** URI locale (sélectionnée dans cette session ou stockée). */
  logoUri?: string;
  /** URL serveur (Cloudinary) — fallback si pas de logoUri local. */
  logoUrl?: string;
  /** Appelé avec l'URI locale après sélection réussie. */
  onPick: (uri: string) => void;
};

/**
 * Cercle tappable affiché en tête des écrans de profil.
 * Montre l'aperçu du logo (logoUri en priorité, sinon logoUrl) ou une icône
 * appareil photo + « Ajouter un logo » si aucun logo.
 */
export default function LogoPicker({ logoUri, logoUrl, onPick }: LogoPickerProps) {
  const source = logoUri || logoUrl;

  const handlePress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onPick(result.assets[0].uri);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className="mb-6 items-center"
      accessibilityLabel="Sélectionner un logo"
      accessibilityRole="button"
    >
      <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100">
        {source ? (
          <Image source={{ uri: source }} className="h-24 w-24 rounded-full" resizeMode="cover" />
        ) : (
          <View className="items-center">
            <Text className="text-3xl">📷</Text>
          </View>
        )}
      </View>
      <Text className="mt-2 text-sm text-gray-500">
        {source ? 'Modifier le logo' : 'Ajouter un logo'}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Étape 4 : Réécrire `app/onbording/profile.tsx`**

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
    pushLogo();    // fire-and-forget best-effort
    // replace : l'onboarding est terminé, le retour arrière ne doit pas y revenir
    router.replace('/');
  };

  return (
    <KeyboardAwareScrollView edges={['bottom', 'top']}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1, paddingHorizontal: 0 }}>
        <FormProvider {...methods}>
          <Text className="mb-4 text-2xl font-bold">Mon Profil</Text>

          <LogoPicker
            logoUri={logoUri}
            logoUrl={profile?.logoUrl}
            onPick={setLogoUri}
          />

          <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
          <CustomInputText
            name="phone"
            label="Téléphone (optionnel)"
            placeholder="+216 XX XXX XXX"
            keyboardType="phone-pad"
          />
          <CustomInputText
            name="address"
            label="Adresse"
            placeholder="Numéro et nom de rue"
            multiline
            numberOfLines={3}
            className="min-h-28"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <CustomInputText name="zipCode" label="Code postal" placeholder="75001" />
            </View>
            <View className="flex-[2]">
              <CustomInputText name="city" label="Ville" placeholder="Paris" />
            </View>
          </View>

          {country === 'FR' && (
            <CustomInputText name="siret" label="Siret" placeholder="14 chiffres" />
          )}
          {country === 'TN' && (
            <CustomInputText name="mf" label="Matricule fiscal (MF)" placeholder="XXXXXXX/X/X/XXX" />
          )}

          <CustomInputText
            name="tva"
            label="Numéro de TVA (optionnel)"
            placeholder="FR12345678901"
          />

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
```

- [ ] **Étape 5 : Vérification TypeScript + lint**

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx tsc --noEmit
```

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx eslint "components/LogoPicker.tsx" "app/onbording/profile.tsx"
```

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx prettier --write "components/LogoPicker.tsx" "app/onbording/profile.tsx" "app.json"
```

Résultat attendu : aucune erreur.

- [ ] **Étape 6 : Commit**

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && git add "app.json" "package.json" "components/LogoPicker.tsx" "app/onbording/profile.tsx"
git commit -m "feat(profil): expo-image-picker + LogoPicker + onboarding avec tous les champs enrichis"
```

---

### Task 3 : Écran Réglages/edit + vérifications finales

**Files:**
- Modify: `app/(tabs)/settings/edit.tsx`

**Interfaces:**
- Consumes: `BusinessEntity` (schéma étendu de Task 1), `LogoPicker` (Task 2), `pushLogo` (Task 1), `pushProfile` (store/profile-sync.ts), `useStore` (store/index.ts)
- Produces: écran `app/(tabs)/settings/edit.tsx` avec les mêmes champs que l'onboarding

- [ ] **Étape 1 : Réécrire `app/(tabs)/settings/edit.tsx`**

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Text, View } from 'react-native';

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

  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    // defaultValues figés acceptables ici : profil déjà en local (spec §UI)
    defaultValues: {
      id: profile?.id || Crypto.randomUUID(),
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
    pushProfile(); // fire-and-forget
    pushLogo();    // fire-and-forget best-effort
    router.back();
  };

  return (
    <FormProvider {...methods}>
      <KeyboardAwareScrollView>
        <Text className="mb-4 text-2xl font-bold">Mon Entreprise</Text>
        <Text className="mb-4 text-gray-600">
          Ces informations seront affichées sur toutes vos factures.
        </Text>
        <Text className="mb-4 text-gray-600">Assurez-vous qu'elles sont exactes.</Text>

        <LogoPicker
          logoUri={logoUri}
          logoUrl={profile?.logoUrl}
          onPick={setLogoUri}
        />

        <CustomInputText name="name" label="Nom" placeholder="Entrez le nom" />
        <CustomInputText
          name="phone"
          label="Téléphone (optionnel)"
          placeholder="+216 XX XXX XXX"
          keyboardType="phone-pad"
        />
        <CustomInputText
          name="address"
          label="Adresse"
          placeholder="Numéro et nom de rue"
          multiline
          numberOfLines={3}
          className="min-h-28"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <CustomInputText name="zipCode" label="Code postal" placeholder="75001" />
          </View>
          <View className="flex-[2]">
            <CustomInputText name="city" label="Ville" placeholder="Paris" />
          </View>
        </View>

        {country === 'FR' && (
          <CustomInputText name="siret" label="Siret" placeholder="14 chiffres" />
        )}
        {country === 'TN' && (
          <CustomInputText name="mf" label="Matricule fiscal (MF)" placeholder="XXXXXXX/X/X/XXX" />
        )}

        <CustomInputText
          name="tva"
          label="Numéro de TVA (optionnel)"
          placeholder="FR12345678901"
        />

        <Button title="Sauvegarder" className="mt-auto" onPress={methods.handleSubmit(onSubmit)} />
      </KeyboardAwareScrollView>
    </FormProvider>
  );
}
```

- [ ] **Étape 2 : Vérification TypeScript + lint + prettier**

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx tsc --noEmit
```

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx eslint "app/(tabs)/settings/edit.tsx"
```

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && npx prettier --write "app/(tabs)/settings/edit.tsx"
```

Résultat attendu : aucune erreur.

- [ ] **Étape 3 : Smoke tests (sur dev-client après rebuild)**

Suivre dans l'ordre après rebuild du dev-client (requis pour expo-image-picker) :

**(a) Utilisateur Angular existant** — Lancer l'app avec un compte ayant un profil serveur rempli (companyName, address.street, address.zip, address.city, phone, fiscalIdentifier.type=SIRET). Vérifier que les champs Adresse / Code postal / Ville / Téléphone / Siret sont chacun dans leur champ distinct (plus de concaténation), et que le profil s'affiche immédiatement sans onboarding.

**(b) Pays FR → champ Siret visible** — Onboarder un profil avec country=FR : le champ « Siret » doit apparaître. Passer country=TN : « Matricule fiscal (MF) » apparaît à la place. Autre pays : aucun des deux. (Le `country` vient du pull serveur — ne pas modifier le champ country dans cette spec.)

**(c) Logo** — Dans Réglages > Mon Entreprise, tapper le cercle logo → la galerie photo s'ouvre → choisir une image → l'aperçu apparaît immédiatement (avant sauvegarde). Sauvegarder → l'upload part en arrière-plan → vérifier côté Angular/web que `logoUrl` est rempli.

**(d) Hors ligne** — Couper le réseau, modifier le profil et sauvegarder → OK (pas de crash). Choisir un nouveau logo et sauvegarder → logo enregistré localement. Rétablir le réseau, ouvrir Réglages et sauvegarder à nouveau → le logo est uploadé (logoSyncedUri mis à jour).

**(e) Contacts et wizard factures non affectés** — Naviguer vers les contacts et créer une facture complète : aucun champ nouveau ne casse le wizard (les champs `phone`, `zipCode`, `city`, `mf`, `logoUri`, `logoUrl`, `logoSyncedUri` sont ignorés par les contacts et les factures).

- [ ] **Étape 4 : Commit final**

```bash
cd /Users/hamdichebbi/Desktop/SaaS/Facturation/InvoiceGenerator && git add "app/(tabs)/settings/edit.tsx"
git commit -m "feat(profil): écran Réglages enrichi — logo, téléphone, adresse structurée, SIRET/MF"
```

---

## Self-Review

### 1. Couverture spec

| Exigence spec | Tâche |
|---|---|
| `phone`, `zipCode`, `city`, `mf`, `logoUri`, `logoUrl`, `logoSyncedUri` dans le schéma | Task 1 étape 1 |
| `toBackendProfileInput` : phone, adresse structurée, SIRET/MF (pas TVA) | Task 1 étape 3 |
| `fromBackendProfile` : répartition street/zip/city, SIRET→siret, MF→mf, TVA rétro-compat | Task 1 étape 4 |
| `uploadLogo` multipart fetch dédié | Task 1 étape 7 |
| `pushLogo` best-effort (logoUri ≠ logoSyncedUri) | Task 1 étape 8 |
| expo-image-picker + plugin app.json français | Task 2 étapes 1-2 |
| Composant `LogoPicker` — aperçu, galerie, icône | Task 2 étape 3 |
| Onboarding : tous les champs + LogoPicker + values réactif + keepDirtyValues | Task 2 étape 4 |
| Réglages/edit : mêmes champs + defaultValues figés | Task 3 étape 1 |
| SIRET visible si FR, MF si TN, sinon aucun | Task 2 étape 4 + Task 3 étape 1 |
| TVA conservée | Task 2 étape 4 + Task 3 étape 1 |
| `pushProfile()` + `pushLogo()` aux 2 écrans | Task 2 étape 4 + Task 3 étape 1 |
| Repro Node mappers dans scratchpad | Task 1 étapes 5-6 |
| Rebuild dev-client noté | Task 2 étape 1 |
| Smoke tests (a)-(e) | Task 3 étape 3 |

### 2. Scan placeholders

Aucun « TBD », « TODO », « implémenter plus tard » ou « similaire à » dans le plan — chaque étape contient le code complet.

### 3. Cohérence des types

- `BusinessEntity` étendu en Task 1 : `phone`, `zipCode`, `city`, `mf`, `logoUri`, `logoUrl`, `logoSyncedUri` — tous optionnels, tous utilisés tels quels dans Task 2 et Task 3.
- `pushLogo` importé dans les deux écrans depuis `~/store/profile-sync` (même export que `pushProfile`).
- `LogoPicker` props : `logoUri?: string; logoUrl?: string; onPick: (uri: string) => void` — consommé identiquement dans les deux écrans.
- `uploadLogo` dans `domain/profile.ts` exporte `{ logoUrl: string }` — consommé par `pushLogo` qui lit `logoUrl` du résultat.
- `fiscalTypeForCountry` retourne `'MF' | 'SIRET' | 'none'` — utilisé uniquement en interne dans `toBackendProfileInput` (non exporté). Le type de retour est compatible avec `ProfileInput['fiscalIdentifier']['type']` (`'MF' | 'SIRET' | 'SIREN' | 'TVA' | 'none'`).
- `ProfileInput` (domain/profile.ts) contient déjà `phone` dans `Pick<BackendProfile, ...>` — la propriété est déjà disponible, aucune modification du type nécessaire.
