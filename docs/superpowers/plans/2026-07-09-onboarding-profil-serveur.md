# Onboarding réactif au profil serveur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La page welcome (et l'étape profil) de l'onboarding adopte les données du profil serveur dès l'arrivée du pull (utilisateur existant), et présélectionne « Français » pour un nouvel utilisateur.

**Architecture:** Deux écrans, deux mécanismes : la welcome (`onbording/index.tsx`) gère des états locaux → un `useEffect` adopte les valeurs serveur pour les champs non touchés (drapeaux `useRef`) ; l'étape profil (`onbording/profile.tsx`) est en React Hook Form → bascule `defaultValues` → `values` réactif + `keepDirtyValues`. Aucun changement au store ni à `profile-sync.ts`.

**Tech Stack:** React Native / Expo (SDK 57), React Hook Form + Zod, Zustand, NativeWind. Pas de framework de test → `npx tsc --noEmit` + `npx eslint` + smoke-test device décrit.

## Global Constraints

- **Langue par défaut au formulaire uniquement** : `profile.language || 'fr'` — ne PAS changer le défaut du store (`language: ''` dans `createInitialData`).
- **Non-écrasement** : une valeur déjà modifiée par l'utilisateur n'est jamais écrasée par le pull serveur.
- 100 % français pour les chaînes affichées ; alias `~/` ; `npx prettier --write` après édition.
- Ne pas toucher : `store/index.ts`, `store/profile-sync.ts`, `app/_layout.tsx`, la liste des langues (fr/en).

---

### Task 1: Welcome + étape profil réactives au profil serveur

**Files:**
- Modify: `app/onbording/index.tsx` (imports ligne 3, états lignes 43-46, handlers lignes 128/147/176/205, + nouveau useEffect)
- Modify: `app/onbording/profile.tsx` (imports lignes 2-4, useForm lignes 20-28)

**Interfaces:**
- Consumes: `useStore` → `profile` (`country`, `language`, `currency`, `taxRate`, `id`, `name`, `address`, `tva`) ; `useForm` (option `values` + `resetOptions`).
- Produces: aucun nouvel export — comportement d'écran uniquement.

- [ ] **Step 1: `app/onbording/index.tsx` — défaut 'fr' + adoption réactive**

1a. Étendre l'import React (ligne 3) :
```tsx
import React, { useEffect, useRef, useState } from 'react';
```

1b. Remplacer le bloc d'états locaux (lignes 42-46) :
```tsx
  // Sélections locales (codes), initialisées depuis le profil pour un utilisateur qui revient.
  // Langue : « Français » par défaut pour un nouvel utilisateur (module de traduction absent,
  // seule la valeur stockée compte) — une langue serveur existante reste prioritaire.
  const [selectedCountry, setSelectedCountry] = useState<string | null>(profile.country || null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
    profile.language || 'fr'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(profile.currency || 'TND');
  const [vatRate, setVatRate] = useState<string>(String(profile.taxRate ?? 20));
  const [vatError, setVatError] = useState('');

  // Champs déjà modifiés par l'utilisateur : ne jamais les écraser par le pull serveur.
  const touched = useRef({ country: false, language: false, currency: false, taxRate: false });

  // Adoption réactive : syncProfileOnBoot() est non-bloquant, le pull serveur peut
  // atterrir APRÈS l'affichage de cet écran — on adopte alors les valeurs serveur
  // pour les champs que l'utilisateur n'a pas touchés.
  useEffect(() => {
    if (!touched.current.country && profile.country) setSelectedCountry(profile.country);
    if (!touched.current.language && profile.language) setSelectedLanguage(profile.language);
    if (!touched.current.currency && profile.currency) setSelectedCurrency(profile.currency);
    if (!touched.current.taxRate && profile.taxRate != null) setVatRate(String(profile.taxRate));
  }, [profile.country, profile.language, profile.currency, profile.taxRate]);
```

1c. Poser les drapeaux `touched` dans les 4 handlers utilisateur :
- Sélection devise (pill, ligne ~128) :
```tsx
                  onPress={() => {
                    touched.current.currency = true;
                    setSelectedCurrency(currency.code);
                  }}
```
- Saisie TVA (TextInput, ligne ~147) :
```tsx
              onChangeText={(value) => {
                touched.current.taxRate = true;
                setVatRate(value);
              }}
```
- Modal pays (ligne ~176) :
```tsx
                onPress={() => {
                  touched.current.country = true;
                  setSelectedCountry(country.code);
                  setShowCountryModal(false);
                }}
```
- Modal langue (ligne ~205) :
```tsx
                onPress={() => {
                  touched.current.language = true;
                  setSelectedLanguage(lang.code);
                  setShowLanguageModal(false);
                }}
```

- [ ] **Step 2: `app/onbording/profile.tsx` — formulaire réactif (RHF `values`)**

2a. Étendre l'import React (ligne 4) :
```tsx
import React, { useRef } from 'react';
```

2b. Remplacer le `useForm` (lignes 20-28) :
```tsx
  // Id de repli STABLE entre rendus (un randomUUID() inline dans `values`
  // changerait à chaque rendu → resets en boucle).
  const fallbackId = useRef(Crypto.randomUUID()).current;
  const methods = useForm<BusinessEntity>({
    resolver: zodResolver(businessEntitySchema),
    // `values` (réactif, vs defaultValues figé) : le pull serveur peut arriver
    // après le montage — RHF resynchronise alors les champs non modifiés.
    values: {
      id: profile?.id || fallbackId,
      name: profile?.name,
      address: profile?.address,
      tva: profile?.tva,
    } as BusinessEntity,
    resetOptions: { keepDirtyValues: true },
  });
```
(Le cast `as BusinessEntity` reflète l'existant : `name`/`address` peuvent être vides avant saisie ; la validation Zod reste la barrière à la soumission. Si `tsc` accepte sans le cast, le retirer.)

- [ ] **Step 3: Vérifier types + lint + format**

Run: `npx prettier --write app/onbording/index.tsx app/onbording/profile.tsx` puis `npx tsc --noEmit` puis `npx eslint app/onbording/index.tsx app/onbording/profile.tsx`
Expected: tsc exit 0 ; eslint 0 erreur (le `useEffect` a toutes ses deps → pas de warning exhaustive-deps).

- [ ] **Step 4: Smoke-test (device, décrit — ne pas lancer de simulateur)**

(a) Nouveau compte → welcome : « Français » affiché dans le sélecteur de langue sans action. (b) Compte existant au profil serveur partiel → les champs de la welcome se remplissent à l'arrivée du pull (1-2 s), idem étape profil. (c) Saisir/sélectionner un champ AVANT l'arrivée du pull → la saisie est conservée, seuls les autres champs adoptent le serveur.

- [ ] **Step 5: Commit**

```bash
git add app/onbording/index.tsx app/onbording/profile.tsx
git commit -m "feat(onbording): écrans réactifs au profil serveur + langue Français par défaut"
```

---

## Self-Review

**Spec coverage :** défaut 'fr' au formulaire (1b) ✅ ; adoption réactive welcome (1b/1c) ✅ ; étape profil réactive (`values`+keepDirtyValues, 2b) ✅ ; non-écrasement (drapeaux touched / keepDirtyValues) ✅ ; store/profile-sync/auth-gate intacts ✅ ; id stable (2b) ✅.
**Placeholder scan :** aucun. **Type consistency :** `profile` déjà sélectionné dans les deux écrans ; signatures RHF v7 (`values`, `resetOptions`) correctes.
