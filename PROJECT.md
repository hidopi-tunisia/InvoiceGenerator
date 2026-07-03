# PROJECT.md — Myfakto (Fatourty)

> Document d'onboarding technique. Objectif : comprendre le projet en moins de 10 minutes.

---

# Vision du produit

## Objectif

Myfakto (nom historique : Fatourty) est une application mobile de **facturation SaaS** qui permet de créer, gérer et partager des factures professionnelles en PDF, en quelques minutes, depuis un smartphone.

## Utilisateurs

- Freelances, artisans, TPE et indépendants **francophones** (Tunisie et France en priorité, Maroc supporté).
- Utilisateurs peu équipés en outils de gestion : l'app doit fonctionner **sans connexion permanente** (local-first).

## Fonctionnalités principales

- Création de factures via un assistant multi-étapes (infos → destinataire → articles → récapitulatif).
- Génération et partage de PDF conformes (TVA, droit de timbre, mentions légales).
- Gestion des contacts (clients/destinataires) et des statuts de facture (payée, en attente, en retard).
- Profil entreprise configurable : pays, langue, devise (TND/EUR/USD), taux de TVA.
- Backend SaaS (devis, abonnements Stripe, audit trail) — prêt côté API, **pas encore branché à l'app mobile**.

---

# Stack technique

## Frontend (`InvoiceGenerator/`)

| Domaine | Technologie |
|---|---|
| Framework | React Native 0.76 + Expo SDK 52 (TypeScript) |
| Navigation | expo-router v4 (routing par fichiers) |
| Styling | NativeWind (Tailwind CSS pour RN) |
| État global | Zustand + persistance AsyncStorage (clé `facture-store-{uid}` par utilisateur) |
| Formulaires | React Hook Form + Zod |
| PDF | expo-print (HTML → PDF) + expo-sharing |
| Analytics / Monitoring | vexo-analytics + Sentry |

## Backend (`../invoice-backend/`)

| Domaine | Technologie |
|---|---|
| Runtime | Node.js + Express 4 (monolithe assumé, décision documentée) |
| ORM | Mongoose 8 |
| PDF serveur | Puppeteer (HTML Handlebars → PDF) |
| Documentation | Swagger UI (spec OpenAPI 3 maintenue manuellement) |
| Tests API | Bruno (68 scénarios versionnés dans `bruno/`) |
| Logs | Winston |

## Base de données

- **MongoDB Atlas** via Mongoose.
- Collections principales : `Invoice`, `Devis`, `Recipient`, `Sender`, `Profile`, `Subscription`, `AuditTrail`, `ApiKey`.
- Particularité : `Profile._id` = UID Firebase (String, pas ObjectId).

## Authentification

- **Firebase Auth** : email/mot de passe + Google Sign-In (expo-auth-session) côté mobile.
- Côté backend : **Firebase Admin SDK** vérifie le token Bearer → `req.user.uid` ; toutes les requêtes MongoDB sont filtrées par `userId`.
- Clés API (`src/routes/apiKeys.js`) pour l'accès programmatique.

## Notifications

- **Aucun système de push notification n'est implémenté** (ni expo-notifications, ni FCM).
- Monitoring d'erreurs uniquement : Sentry (mobile + backend).

## Paiement

- **Stripe** côté backend : Checkout, Customer Portal, webhooks.
- Plans d'abonnement : `trial` (14 jours, créé automatiquement) → `starter` / `pro` / `enterprise`.
- Le middleware `checkSubscription` / `checkInvoiceLimit` applique les quotas par plan.

## Stockage

- **Mobile** : AsyncStorage (état applicatif) + `FileSystem.documentDirectory` (PDFs générés localement).
- **Backend** : **Cloudinary** (PDFs en `resource_type: "raw"`, logos).

## CI/CD

- **Mobile** : EAS Build (profils `development`, `preview`, `production`, `simulator`) ; `autoIncrement` des versions en production. Les numéros de version sont gérés côté EAS (`appVersionSource: "remote"` dans `eas.json`) — consulter/forcer via `eas build:version:get` / `eas build:version:set`.
- ⚠️ **Dette de version** : le projet est en Expo SDK 52 / RN 0.76 alors que l'écosystème Expo est au SDK 56 (RN 0.85). Impact store immédiat : Google Play exige un target API level que SDK 52 (API 34) ne satisfait plus — voir l'item n°5 de la checklist « Prêt pour le store » dans [MOBILE_GUIDELINES.md](./MOBILE_GUIDELINES.md) et la procédure d'upgrade en annexe du même document.
- **Backend** : déploiement sur **Render** (`https://invoice-backend-qq9j.onrender.com`, script `render-build.sh`).
- Pas de pipeline de tests automatisé en CI ; les tests Bruno se lancent manuellement (`npx @usebruno/cli run`).

---

# Organisation du projet

Le produit est réparti sur plusieurs dossiers frères dans `Facturation/` :

```
Facturation/
├── InvoiceGenerator/    ← App mobile React Native (ce repo)
├── invoice-backend/     ← API REST Node.js/Express + MongoDB
├── fatourty-webv1/      ← Site web v1
└── Marketing/           ← Assets marketing
```

## App mobile (`InvoiceGenerator/`)

| Dossier | Rôle |
|---|---|
| `app/` | Écrans (expo-router : chaque fichier = une route) |
| `app/(auth)/` | Login, inscription (Firebase Auth) |
| `app/(tabs)/` | Navigation principale : accueil, factures, contacts, paramètres |
| `app/invoices/generate/` | Assistant de création de facture (4 étapes) |
| `app/onbording/` | Onboarding premier lancement (le typo du nom est volontairement conservé) |
| `app/utils/` | Génération PDF (`pdf.ts`), numéro de facture (`invoice.ts`), demande d'avis (`review.ts`) |
| `app/schema/` | Schémas Zod (`Invoice`, `BusinessEntity`, `InvoiceItem`) |
| `app/config.ts` | Initialisation Firebase |
| `components/` | Composants réutilisables (CustomInputText, CustomDatePicker, NumericInputText, Button…) |
| `store/` | Store Zustand unique (`store/index.ts`) |
| `domain/` | Client REST vers le backend (implémenté, **non branché à l'UI**) |
| `hooks/` | Hooks custom (`useGoogleSignIn`) |
| `constants/` | Constantes partagées |
| `workflow/` | Documentation des flux utilisateur (diagrammes Mermaid) |
| `android/`, `ios/` | Projets natifs générés (prebuild) |

## Backend (`invoice-backend/src/`)

| Dossier | Rôle |
|---|---|
| `routes/` | Handlers HTTP (invoices, devis, recipients, senders, profile, subscription, audit, apiKeys) |
| `services/` | Logique métier (ProfileService, RecipientService, SubscriptionService, AuditTrailService, pdfService) |
| `models/` | Schémas Mongoose |
| `middlewares/` | verifyFirebaseToken, checkSubscription, sanitizeInput, rateLimiter, auditMiddleware, errorHandler |
| `validators/` | Classes de validation statiques (`{ isValid, errors }`) |
| `utils/` | ResponseFormatter, logger, calculs de totaux, nombre en lettres |
| `constants/` | Constantes de validation, plans, config Firebase/Cloudinary |
| `docs/` | `swagger.js` — spec OpenAPI maintenue au même commit que chaque route |
| `templates/` | Templates Handlebars pour les PDFs |
| `locales/` | i18n (i18next — seul `fr` existe) |

---

# Fonctionnalités

## Implémentées dans l'app mobile

- **Authentification** : connexion / inscription email + mot de passe, Google Sign-In, persistance de session, déconnexion.
- **Onboarding** : sélection pays, langue, devise, taux de TVA ; création du profil entreprise (nom, adresse, n° TVA).
- **Création de facture** (assistant) : numéro auto-généré (`INV-{SEQ3}{MM}{YY}`), dates validées par Zod, sélection ou création de contact, lignes d'articles dynamiques avec calcul en temps réel, récapitulatif avant sauvegarde.
- **Gestion des factures** : liste avec filtres par statut et par année, détail, marquage « payée », suppression avec confirmation.
- **PDF** : génération à l'ouverture du détail, sauvegarde locale, partage via la sharesheet native.
- **Contacts** : auto-ajout du destinataire à la sauvegarde d'une facture, recherche, édition, suppression.
- **Paramètres** : édition du profil, taux de TVA et devise.

## Implémentées côté backend (non branchées à l'app)

- CRUD complet : factures, devis, destinataires, émetteurs, profils.
- Devis avec conversion en facture et statuts dédiés (Brouillon → Accepté…).
- Abonnements Stripe (trial automatique 14 jours, upgrade, portail client, webhooks).
- Génération PDF serveur (Puppeteer) + upload Cloudinary, exécutée après la réponse HTTP (`setImmediate`).
- Audit trail des actions (CREATE, UPDATE, DELETE, STATUS_CHANGE, PDF_REGENERATED, SENT, PAYMENT_RECEIVED).
- Import / Export, clés API, health checks (`/info`, readiness).

---

# Flux principal

Parcours utilisateur nominal, de l'installation au partage d'une facture :

1. **Lancement** — le layout racine (`app/_layout.tsx`) écoute `auth.onAuthStateChanged` :
   - non authentifié → `/(auth)/login` ;
   - authentifié sans onboarding → `/onbording` ;
   - authentifié et onboardé → `/(tabs)` (accueil).
2. **Inscription / Connexion** — email + mot de passe ou Google.
3. **Onboarding** (premier lancement) — pays, langue, devise, taux de TVA, puis profil entreprise. `onboardingCompleted` est persisté.
4. **Création de facture** — depuis l'accueil, `store.startNewInvoice()` pré-remplit l'émetteur et génère le numéro, puis :
   - Étape 1 : numéro, date d'émission, date d'échéance ;
   - Étape 2 : sélection d'un contact existant ou création d'un nouveau ;
   - Étape 3 : lignes d'articles (désignation, quantité, prix unitaire) ;
   - Étape 4 : récapitulatif → `store.saveInvoice()` (commit + auto-ajout du contact).
5. **Succès** — animation, génération du PDF, partage via la sharesheet native (WhatsApp, email…).
6. **Suivi** — dans l'onglet Factures : filtres, marquage « payée », suppression.

Une facture en cours (`newInvoice`) est reprennable depuis l'accueil si l'utilisateur quitte l'assistant.

---

# Contraintes

## Performance

- Listes animées avec `react-native-reanimated` ; listes virtualisées (Animated.FlatList).
- Génération PDF mobile locale (pas d'aller-retour réseau).
- Côté backend : PDF généré **après** la réponse HTTP (`setImmediate`) pour ne pas bloquer la requête ; compression HTTP activée.
- Le backend tourne sur Render (plan avec cold starts possibles) — à prendre en compte pour les timeouts côté client.

## Sécurité

- Tout endpoint backend exige `verifyFirebaseToken` en premier middleware ; **toute requête MongoDB est filtrée par `userId: req.user.uid`** (isolation multi-tenant).
- Défense en profondeur : helmet, CORS, hpp, express-mongo-sanitize, rate limiting (global 100 req/15min, auth 20, mutations 50).
- Champs fiscaux sensibles en `select: false` dans Mongoose.
- Aucune donnée sensible dans le store mobile hormis le profil de facturation local.

## Scalabilité

- Monolithe Express **assumé** (décision documentée dans `invoice-backend/decisions.md`) : le volume actuel ne justifie pas les microservices.
- Points de vigilance avant multi-instance : rate limiting in-memory (migrer vers Redis), génération PDF Puppeteer dans le process web.
- Plans d'abonnement Stripe déjà en place pour la montée en charge commerciale.

## Offline

- **L'app mobile est local-first** : tout l'état (profil, factures, contacts) vit dans Zustand persisté en AsyncStorage. Création de facture, PDF et partage fonctionnent **entièrement hors ligne**.
- Seules l'authentification Firebase et (à terme) la synchronisation nécessitent le réseau.

## Synchronisation

- La couche `domain/` (client REST avec token Firebase) est implémentée mais **non branchée à l'UI** : il n'y a pas encore de synchronisation entre les données locales et le backend.
- C'est le principal chantier d'évolution : brancher le store local sur l'API (stratégie de merge, gestion des conflits, migration des données AsyncStorage existantes).
- Le store possède déjà une fonction `migrate` pour la compatibilité ascendante des données persistées.
