# Carte des fichiers — Fatourty

Description de chaque fichier du projet.

---

## Racine

| Fichier | Rôle |
|---------|------|
| `app.json` | Configuration Expo : identifiants de bundle (iOS/Android), plugins, expérimentations (typedRoutes, tsconfigPaths), Sentry et Vexo |
| `eas.json` | Profils de build EAS : `development` (APK debug), `preview` (distribution interne), `production` (store), `simulator` (iOS), `androidapk` |
| `package.json` | Dépendances et scripts npm (`start`, `android`, `ios`, `web`, `lint`, `format`) |
| `tsconfig.json` | Configuration TypeScript : alias `~/` → racine, mode strict, cible ESNext |
| `babel.config.js` | Preset Expo Babel (requis pour NativeWind et expo-router) |
| `metro.config.js` | Configuration Metro bundler (NativeWind CSS) |
| `tailwind.config.js` | Configuration Tailwind pour NativeWind (contenu : `app/`, `components/`) |
| `prettier.config.js` | Règles Prettier : `singleQuote`, `printWidth: 100`, plugin `prettier-plugin-tailwindcss` |
| `global.css` | Point d'entrée CSS pour NativeWind (`@tailwind base/components/utilities`) |
| `nativewind-env.d.ts` | Déclaration de types NativeWind pour la prop `className` sur les composants RN |
| `app-env.d.ts` | Référence aux types Expo Router générés |
| `cesconfig.json` | Configuration CES (Claude Engineering System) pour les hooks de développement |

---

## `app/` — Écrans (expo-router)

### Racine de l'app

| Fichier | Rôle |
|---------|------|
| `app/_layout.tsx` | Layout racine : initialise Sentry, Vexo, souscrit à Firebase Auth, redirige selon l'état (non-auth → login, sans onboarding → onboarding, sinon → tabs). Exporte aussi `ErrorBoundary` global. |
| `app/index.tsx` | Redirection initiale : vers `/onbording` ou `/(tabs)` selon `onboardingCompleted` |
| `app/config.ts` | Initialisation Firebase (JS SDK web) et export de l'instance `auth` |
| `app/+not-found.tsx` | Écran 404 expo-router |
| `app/404.tsx` | Page 404 alternative |
| `app/_error.tsx` | Composant d'erreur de fallback |
| `app/+html.tsx` | Template HTML pour le rendu web (Expo web) |

### `app/(auth)/` — Authentification

| Fichier | Rôle |
|---------|------|
| `_layout.tsx` | Layout du groupe auth (Stack sans header) |
| `login.tsx` | Connexion email/password via `signInWithEmailAndPassword` |
| `register.tsx` | Inscription email/password via `createUserWithEmailAndPassword` |
| `forgot_psx.tsx` | Écran de réinitialisation de mot de passe (placeholder) |

### `app/(tabs)/` — Navigation principale

| Fichier | Rôle |
|---------|------|
| `_layout.tsx` | Layout Tabs : 4 onglets (Accueil, Factures, Contacts, Paramètres), icônes FontAwesome6/Feather |
| `index.tsx` | Accueil : bouton « Nouvelle Facture », bouton « Reprendre » si une facture est en cours. Contient aussi du code de test API non nettoyé. |

#### `app/(tabs)/invoices/`

| Fichier | Rôle |
|---------|------|
| `_layout.tsx` | Stack du groupe factures |
| `index.tsx` | Liste des factures avec filtres statut/année, suppression, animation de liste |
| `[id]/detail.tsx` | Détail d'une facture : génère le PDF à l'ouverture, partage, marquage comme payée, suppression |

#### `app/(tabs)/contacts/`

| Fichier | Rôle |
|---------|------|
| `_layout.tsx` | Stack du groupe contacts |
| `index.tsx` | Liste des contacts avec recherche, menu contextuel (modifier/supprimer), bouton « Nouvelle facture » par contact |
| `[id]/edit.tsx` | Formulaire d'édition d'un contact (nom, adresse, TVA, email) |

#### `app/(tabs)/settings/`

| Fichier | Rôle |
|---------|------|
| `_layout.tsx` | Stack du groupe paramètres |
| `index.tsx` | Menu des paramètres : liens vers édition profil, taxes/devise, avis, feedback, centre d'aide. Affiche la version et le bouton de déconnexion. |
| `edit.tsx` | Formulaire d'édition du profil entreprise (nom, adresse, TVA, SIRET) |
| `tax-currency.tsx` | Sélection de la devise (Picker) et saisie du taux de TVA |

### `app/(modals)/` — Modaux

| Fichier | Rôle |
|---------|------|
| `country.tsx` | Modal de sélection de pays (non connecté à la navigation actuelle) |
| `language.tsx` | Modal de sélection de langue (non connecté à la navigation actuelle) |

### `app/onbording/` — Onboarding

| Fichier | Rôle |
|---------|------|
| `_layout.tsx` | Stack de l'onboarding |
| `index.tsx` | Étape 1 : sélection du pays, langue, devise, taux TVA (état local non sauvegardé dans le store) |
| `profile.tsx` | Étape 2 : création du profil entreprise |
| `welcome.tsx` | Écran de bienvenue alternatif (non utilisé dans le flux actuel) |

### `app/invoices/generate/` — Assistant de création de facture

| Fichier | Rôle |
|---------|------|
| `_layout.tsx` | Stack de l'assistant (headerShown: false) |
| `index.tsx` | Étape 1 : numéro, date d'émission, date d'échéance |
| `contact.tsx` | Étape 2a : sélection d'un contact existant |
| `new-contact.tsx` | Étape 2b : création d'un nouveau contact |
| `items.tsx` | Étape 3 : liste dynamique d'articles (ajout/suppression, calcul temps réel) |
| `summary.tsx` | Étape 4 : récapitulatif et confirmation (appelle `saveInvoice`) |

### `app/invoices/[id]/`

| Fichier | Rôle |
|---------|------|
| `success.tsx` | Écran de succès après sauvegarde d'une facture (animation Lottie) |

### `app/schema/`

| Fichier | Rôle |
|---------|------|
| `invoice.ts` | Schémas Zod et types TypeScript : `BusinessEntity`, `InvoiceInfo`, `InvoiceItem`, `Invoice` |

### `app/utils/`

| Fichier | Rôle |
|---------|------|
| `invoice.ts` | `generateInvoiceNumber` (format INV-SEQ3MMYY), `getTotals` (sous-total sans taxe), `validateInvoiceNumber` |
| `pdf.ts` | `generateInvoicePdf` : génère un PDF HTML via `expo-print` et le déplace dans `documentDirectory` |
| `review.ts` | Hook `useReviews` : demande d'avis App Store (throttlée 3 jours), feedback par email |

---

## `store/`

| Fichier | Rôle |
|---------|------|
| `index.ts` | Store Zustand unique (`useStore`), persisté dans AsyncStorage (`facture-store`). Gère : profil, factures, newInvoice, contacts, onboarding. Inclut une fonction `migrate` pour la compatibilité ascendante. |

---

## `components/`

| Fichier | Rôle |
|---------|------|
| `Button.tsx` | Bouton réutilisable avec variantes `primary`, `secondary`, `link` |
| `CustomInputText.tsx` | Champ texte contrôlé pour React Hook Form (`<Controller>`) |
| `NumericInputText.tsx` | Champ numérique pour React Hook Form (parse float) |
| `CustomDatePicker.tsx` | Sélecteur de date natif (`react-native-modal-datetime-picker`) pour React Hook Form |
| `KeyboardAwareScrollView.tsx` | ScrollView avec gestion du clavier (`react-native-keyboard-aware-scroll-view`) + safe area |
| `Container.tsx` | Wrapper de mise en page simple |
| `TransitionView.tsx` | Wrapper d'animation de transition (Reanimated) |
| `Button.tsx` (legacy) | Voir ci-dessus |
| `EditScreenInfo.tsx` | Composant de démonstration Expo (non utilisé dans le flux principal) |
| `ScreenContent.tsx` | Composant de démonstration Expo (non utilisé dans le flux principal) |

---

## `domain/` — Couche API REST (partiellement implémentée, non connectée à l'UI)

| Fichier | Rôle |
|---------|------|
| `authorization.ts` | Récupère le token Firebase JWT via `auth.currentUser?.getIdToken()` |
| `invoices.ts` | CRUD factures sur `https://invoice-backend-qq9j.onrender.com/invoices` |
| `recipients.ts` | CRUD destinataires sur l'API REST |
| `senders.ts` | CRUD émetteurs sur l'API REST |
| `profile.ts` | Gestion du profil via l'API REST |

---

## `constants/`

| Fichier | Rôle |
|---------|------|
| `index.ts` | `ENDPOINT` (URL backend), `HTTPMethod`, `InvoiceStatus` (constantes en anglais, non utilisées dans le store) |

---

## `assets/`

| Fichier | Rôle |
|---------|------|
| `icon.png` | Icône de l'application |
| `adaptive-icon.png` | Icône adaptive Android |
| `splash.png` | Écran de démarrage |
| `favicon.png` | Favicon web |
| `nice.lottie` | Animation Lottie pour l'écran de succès |
