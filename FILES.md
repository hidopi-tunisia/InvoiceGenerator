# FILES.md — Carte de l'arborescence Myfakto

> Pour chaque dossier : rôle, contenu autorisé, contenu interdit, dépendances autorisées.
> Deux repos frères : `InvoiceGenerator/` (mobile) et `../invoice-backend/` (API).

---

## Arborescence globale

```
Facturation/
├── InvoiceGenerator/          ← App mobile React Native (ce repo)
│   ├── app/                   ← Écrans + routes (expo-router)
│   │   ├── (auth)/            ← Login / inscription
│   │   ├── (tabs)/            ← Onglets : accueil, factures, contacts, paramètres
│   │   ├── invoices/          ← Wizard de création + écran succès
│   │   ├── onbording/         ← Onboarding premier lancement (typo conservée)
│   │   ├── schema/            ← Schémas Zod
│   │   ├── utils/             ← PDF, numéro de facture, review
│   │   └── config.ts          ← Init Firebase
│   ├── components/            ← Composants UI réutilisables
│   ├── store/                 ← Store Zustand unique
│   ├── domain/                ← Client REST vers le backend
│   ├── hooks/                 ← Hooks custom
│   ├── constants/             ← Constantes partagées
│   ├── assets/                ← Images, icônes, animations Lottie
│   ├── workflow/              ← Docs des flux (Mermaid)
│   └── android/ · ios/        ← Projets natifs générés (prebuild)
└── invoice-backend/           ← API REST Node.js/Express + MongoDB
    └── src/
        ├── routes/            ← Handlers HTTP (= controllers)
        ├── services/          ← Logique métier
        ├── models/            ← Schémas Mongoose (= repositories)
        ├── middlewares/       ← Auth, quotas, sanitization, erreurs
        ├── validators/        ← Validation d'entrée
        ├── utils/             ← ResponseFormatter, logger, calculs
        ├── constants/         ← Config Firebase/Cloudinary, plans, regex
        ├── templates/         ← Templates HTML des PDFs
        ├── docs/              ← swagger.js (OpenAPI)
        └── locales/           ← i18n (fr)
```

---

## Frontend — `InvoiceGenerator/`

### `app/` — Écrans et routes

| | |
|---|---|
| **Rôle** | Routing par fichiers (expo-router) : chaque `.tsx` est une route, chaque `_layout.tsx` un navigateur. `_layout.tsx` racine = auth gate. |
| **Contenu autorisé** | Écrans, layouts, composition d'UI, appels au store et aux hooks, `useForm` + schéma Zod. |
| **Contenu interdit** | Logique métier (calculs, règles), appels réseau directs, composants génériques réutilisables, styles hors NativeWind. |
| **Dépendances autorisées** | `~/components`, `~/store`, `~/hooks`, `~/constants`, `app/schema`, `app/utils`, expo-router, react-hook-form. |

### `app/(auth)/` — Authentification

- **Rôle** : login.tsx, register.tsx — écrans Firebase Auth (email + Google).
- **Autorisé** : formulaires d'auth, appels `signInWithEmailAndPassword` etc. via `app/config.ts`, `useGoogleSignIn`.
- **Interdit** : accès au backend, logique de session (elle vit dans `_layout.tsx` racine).
- **Dépendances** : `~/app/config`, `~/hooks/useGoogleSignIn`, `~/components`.

### `app/(tabs)/` — Navigation principale

- **Rôle** : les 4 onglets (accueil, factures, contacts, paramètres) et leurs sous-écrans (`[id]/detail`, `settings/edit`…).
- **Autorisé** : lecture/écriture du store via sélecteurs, navigation.
- **Interdit** : duplication de la logique du wizard, calculs de totaux inline.
- **Dépendances** : `~/store`, `~/components`, `app/utils` (pdf pour le détail).

### `app/invoices/generate/` — Wizard de facture

- **Rôle** : les 4 étapes de création (`index` → `contact`/`new-contact` → `items` → `summary`).
- **Autorisé** : lecture/écriture de `newInvoice` via les actions dédiées (`addInvoiceInfo`, `addRecipientInfo`, `addItems`, `saveInvoice`).
- **Interdit** : écrire directement `invoices[]` ; entrer dans le wizard sans `startNewInvoice()` préalable.
- **Dépendances** : `~/store`, `app/schema/invoice`, `~/components`.

### `app/onbording/` — Onboarding

- **Rôle** : premier lancement (config pays/langue/devise/TVA, puis profil). **Le nom du dossier garde sa typo** — les routes en dépendent.
- **Autorisé** : écriture du `profile`, `onboardingStep`, `setOnboardingCompleted`.
- **Interdit** : renommer le dossier ; créer des factures ici.

### `app/schema/` — Schémas Zod

- **Rôle** : source de vérité des types métier (`Invoice`, `BusinessEntity`, `InvoiceItem`, `InvoiceInfo`) + schémas de validation des formulaires.
- **Autorisé** : schémas Zod, types TypeScript inférés.
- **Interdit** : logique, composants, imports React.
- **Dépendances** : zod uniquement.

### `app/utils/` — Utilitaires métier frontend

- **Rôle** : `pdf.ts` (HTML → PDF via expo-print), `invoice.ts` (`generateInvoiceNumber`), `review.ts` (demande d'avis store).
- **Autorisé** : fonctions pures ou à effets isolés (FileSystem, expo-print).
- **Interdit** : JSX, accès au store (les données arrivent en paramètres).
- **Dépendances** : expo-print, expo-file-system, expo-sharing, `app/schema`.

### `app/config.ts` — Configuration Firebase

- **Rôle** : initialisation unique de Firebase (app + auth avec persistance AsyncStorage).
- **Interdit** : dupliquer une init Firebase ailleurs ; y mettre autre chose que la config.

### `components/` — Composants réutilisables

- **Rôle** : UI générique : `CustomInputText`, `NumericInputText`, `CustomDatePicker` (à utiliser sous `<FormProvider>`), `Button`, `Container`, `TransitionView`, `KeyboardAwareScrollView`.
- **Autorisé** : composants présentational, props typées, NativeWind.
- **Interdit** : accès au store, navigation, appels réseau, logique métier.
- **Dépendances** : react, react-native, nativewind, react-hook-form (contexte), `~/constants`.

### `store/` — État global (Zustand)

- **Rôle** : store **unique** `store/index.ts`, persisté en AsyncStorage sous une clé par utilisateur (`facture-store-{uid}`, bascule via `store/user-scope.ts` à la connexion). Détient profile, invoices, newInvoice, contacts, onboarding.
- **Autorisé** : état, actions, fonction `migrate` pour toute évolution de schéma persisté.
- **Interdit** : créer un second store ; JSX ; appels réseau (la sync passera par `domain/`).
- **Dépendances** : zustand, AsyncStorage, expo-crypto, `app/schema`, `app/utils/invoice`.

### `domain/` — Services réseau (client REST)

- **Rôle** : couche d'accès au backend. `http.ts` = helper unique (timeout 15 s, enveloppe `{ success, data, pagination, errors }`, erreurs typées, retry GET, refresh token sur 401, warm-up `/info`) ; `mappers.ts` = conversions locales ↔ backend (statuts FR/EN, items) ; `invoices.ts`, `recipients.ts`, `profile.ts` = ressources typées API.md ; `authorization.ts` = token Firebase ; `query.ts` = query params. Socle prêt (phase 0), **sync pas encore branchée à l'UI** (seul le warm-up l'est).
- **Autorisé** : appels via `request()` uniquement, mapping DTO ↔ types locaux dans `mappers.ts`.
- **Interdit** : JSX, accès au store, logique d'affichage, `fetch` direct hors `http.ts`. `authorization.ts` importe Firebase via `'../app/config'` (relatif) — **conserver cet import relatif**. `/senders` est legacy : ne jamais le consommer (l'émetteur = Profile).
- **Dépendances** : firebase/auth, expo-application, `app/schema`.

### `hooks/` — Hooks custom

- **Rôle** : logique réutilisable à état (`useGoogleSignIn`).
- **Autorisé** : hooks React purs, composition de store/domain.
- **Interdit** : JSX, hooks spécifiques à un seul écran (les garder dans l'écran).

### `constants/` — Constantes

- **Rôle** : valeurs partagées (`API_BASE`/`ENDPOINT`, `HTTPMethod`, `GOOGLE_AUTH`). Les statuts de facture côté app sont les chaînes **françaises** du store ; le mapping vers les statuts backend anglais vit dans `domain/mappers.ts`.
- **Interdit** : logique, secrets.

### `assets/` — Ressources statiques

- **Rôle** : icônes app, splash, favicon, animations Lottie (`nice.lottie`).
- **Autorisé** : images, animations, futures polices.
- **Interdit** : fichiers générés, données utilisateur.

### `workflow/` — Documentation des flux

- **Rôle** : diagrammes Mermaid des parcours (auth, onboarding, wizard, gestion, contacts, settings, architecture).
- **Interdit** : documentation obsolète — mettre à jour au même commit qu'un changement de flux.

### Racine (configuration mobile)

| Fichier | Rôle |
|---|---|
| `app.json` | Config Expo (id `com.hidopi.myfakto`, nom Myfakto) |
| `eas.json` | Profils de build EAS (development/preview/production/simulator) |
| `metro.config.js`, `babel.config.js` | Bundler + NativeWind |
| `tailwind.config.js`, `global.css` | Thème Tailwind |
| `tsconfig.json` | Alias `~/*` → racine |
| `android/`, `ios/` | **Générés** par prebuild — ne pas éditer à la main sauf nécessité native ; préférer `app.json`/expo-build-properties |

---

## Backend — `../invoice-backend/src/`

### `routes/` — Controllers HTTP

- **Rôle** : handlers Express par ressource (invoices, devis, recipients, senders, profile, subscription, audit, apiKeys, auth).
- **Autorisé** : composition de middlewares `[verifyFirebaseToken, checkSubscription?, sanitizeInput, handler]`, appel des validators puis services, réponse via `ResponseFormatter`.
- **Interdit** : requête Mongoose sans filtre `userId: req.user.uid` ; route sans `verifyFirebaseToken` en premier ; `res.json()`/`res.send()` bruts ; route non documentée dans `swagger.js`. Ne pas imiter `senders.js` ni `profile.js` (non conformes).
- **Dépendances** : middlewares, validators, services, models, utils.

### `services/` — Logique métier

- **Rôle** : classes statiques (`ProfileService`, `RecipientService`, `SubscriptionService`, `AuditTrailService`, `pdfService`, `ExportService`, `ImportService`).
- **Autorisé** : requêtes Mongoose, retour d'**objets plain** (pas de documents Mongoose), `AuditTrailService.logAction()` sur les actions significatives, PDF via `setImmediate`.
- **Interdit** : accès à `req`/`res` ; actions d'audit hors enum (échec Mongoose silencieux).
- **Dépendances** : models, utils, constants, Cloudinary, Puppeteer, Stripe.

### `models/` — Schémas Mongoose

- **Rôle** : `invoice.js`, `devis.js`, `recipient.js`, `sender.js`, `profile.js` (`_id` = UID Firebase), `subscription.js`, `auditTrail.js`, `apiKey.js`, `InvoiceTemplate.js`.
- **Autorisé** : schémas, index, hooks pre-find/pre-save, champs `select: false` pour le sensible, flags de soft delete.
- **Interdit** : logique métier applicative, appels HTTP.
- **Dépendances** : mongoose uniquement.

### `middlewares/` — Middlewares Express

- **Rôle** : `authenticateRequest` (verifyFirebaseToken), `checkPlan`/`payment` (quotas Stripe), `sanitizeInput`, `rateLimiter`, `corsHandler`, `errorHandler`, `auditMiddleware`, `validateObjectId`, `verifyApiKey`, `logger`.
- **Autorisé** : préoccupations transverses uniquement.
- **Interdit** : logique métier ; double audit (auditMiddleware **ou** logAction direct, pas les deux).

### `validators/` — Validation d'entrée

- **Rôle** : classes statiques par ressource, méthode `validateXxx(data, isUpdate)` → `{ isValid, errors }`.
- **Autorisé** : règles s'appuyant sur `constants/validation.constants.js`.
- **Interdit** : accès base de données ; référencer les fichiers vides (`commonValidator.js`, `ValidationService.js`) comme fonctionnels.

### `utils/` — Utilitaires backend

- **Rôle** : `responseFormatter.js` (format unique `{ success, data, message, timestamp }`), `logger.js` (Winston), `calculateInvoiceTotal.js`, `numberToWords.js`, `asyncHandler.js`, `errorMessages.js`, `userScopePlugin.js`.
- **Interdit** : état global, accès req/res hors ResponseFormatter.

### `constants/` — Configuration et constantes

- **Rôle** : `firebase.config.js`, `cloudinary.config.js`, `plan.constants.js`, `validation.constants.js`.
- **Interdit** : secrets en dur (tout vient de `.env`).

### `templates/` + `docs/` + `locales/`

- `templates/invoiceTemplate.js` : HTML Handlebars des PDFs — seul endroit où vit le markup PDF serveur.
- `docs/swagger.js` : spec OpenAPI **maintenue au même commit** que chaque route (hook `check-swagger-coverage.js`).
- `locales/fr/` : i18n i18next (seul `fr` existe).

### `bruno/`, `tests/`, `scripts/` (racine backend)

- `bruno/` : 68 scénarios de tests API versionnés (`npx @usebruno/cli run --env local bruno/`).
- `scripts/` : maintenance (couverture swagger, factures en retard, migration index, reset user de test).

---

## Glossaire des couches

| Concept | Où dans ce projet |
|---|---|
| **Frontend** | `InvoiceGenerator/` — React Native + Expo, local-first (Zustand/AsyncStorage). |
| **Backend** | `invoice-backend/` — monolithe Express + MongoDB Atlas, multi-tenant par UID Firebase. |
| **Shared** | Pas de package partagé. Le contrat commun = types Zod (`app/schema/invoice.ts`) côté mobile ↔ spec Swagger côté backend. Toute évolution de modèle doit être répercutée des deux côtés. |
| **Configuration** | Mobile : `app.json`, `eas.json`, `app/config.ts`, `.env` (`EXPO_PUBLIC_API_URL`). Backend : `.env`, `src/config.js`, `src/constants/*`. |
| **Assets** | `assets/` (mobile). Fichiers utilisateur → Cloudinary (backend), jamais dans le repo. |
| **Navigation** | Fichiers `_layout.tsx` (expo-router) : racine = auth gate, `(tabs)/_layout` = tab bar, autres = stacks. |
| **Components** | `components/` — UI pure, réutilisable, sans store ni réseau. |
| **Screens** | Fichiers de route dans `app/` — composition, pas de logique métier. |
| **Hooks** | `hooks/` — logique à état réutilisable. |
| **Services** | Mobile : `domain/` (réseau). Backend : `src/services/` (métier). |
| **Repositories** | Pas de couche repository dédiée : les modèles Mongoose (`src/models/`) + requêtes dans les services jouent ce rôle. |
| **Controllers** | `src/routes/` — les handlers Express sont les controllers. |
| **Models** | Backend : `src/models/` (Mongoose). Mobile : `app/schema/` (Zod). |
| **Routes** | Mobile : arborescence `app/`. Backend : `src/routes/` + enregistrement dans `src/routes/index.js` et `src/index.js`, préfixe `/api/v1`. |
| **Middleware** | `src/middlewares/` — auth, quotas, sanitization, rate limit, erreurs. |
| **Utils** | Mobile : `app/utils/`. Backend : `src/utils/`. Fonctions pures ou à effet isolé. |

---

# Si je veux…

## Créer un écran

1. Créer `app/<groupe>/mon-ecran.tsx` (la route découle du chemin). Écran modal → utiliser le composant Modal RN localement (pattern onbording/index).
2. Si nouveau groupe : ajouter un `_layout.tsx` dans le dossier et déclarer le screen dans le `<Stack>` du layout parent (`app/_layout.tsx`).
3. Formulaire ? Schéma dans `app/schema/invoice.ts` (ou nouveau fichier schema), composants `~/components/CustomInputText` sous `<FormProvider>`.
4. Données ? Sélecteurs/actions dans `store/index.ts` — jamais de logique métier dans l'écran.
5. Documenter le flux dans `workflow/` et lancer `npm run format`.

## Créer une API (nouvelle ressource backend)

1. Modèle : `src/models/maRessource.js` (schéma Mongoose + index + `userId`).
2. Validator : `src/validators/maRessourceValidator.js` (classe statique → `{ isValid, errors }`), regex dans `src/constants/validation.constants.js`.
3. Service : `src/services/MaRessourceService.js` (classe statique, objets plain).
4. Routes : `src/routes/maRessource.js` avec chaîne `[verifyFirebaseToken, checkSubscription?, sanitizeInput, handler]` + `ResponseFormatter`.
5. Enregistrer dans `src/routes/index.js` **et** `src/index.js`.
6. Documenter dans `src/docs/swagger.js` (même commit) + ajouter au `ROUTE_MAP` de `scripts/check-swagger-coverage.js`.
7. Tests : dossier de scénarios dans `bruno/`.

## Créer une collection (MongoDB)

1. `src/models/<nom>.js` : schéma, index (`userId` + champs de recherche), soft delete (`deleted`/`archived`), dates UTC, `select: false` sur le sensible.
2. L'exporter dans `src/models/index.js`.
3. Migration éventuelle : script dans `scripts/` (modèle : `migrate-tag-index.js`).

## Créer un endpoint (sur une ressource existante)

1. Ajouter le handler dans le fichier existant `src/routes/<ressource>.js` (respecter la chaîne middleware + filtre `userId`).
2. Logique dans le service correspondant `src/services/`.
3. `src/docs/swagger.js` au même commit (le hook `check-swagger-coverage.js` échoue sinon).
4. Scénario Bruno dans `bruno/<ressource>/`.

## Créer une notification

Rien n'existe aujourd'hui — infrastructure à créer :
1. Mobile : installer `expo-notifications`, demander la permission et récupérer le token Expo Push dans un hook `hooks/usePushNotifications.ts`, l'enregistrer au backend via un nouveau fichier `domain/notifications.ts`.
2. Backend : champ `pushTokens` dans `src/models/profile.js`, endpoint `POST /profile/push-token` dans `src/routes/profile.js`, service `src/services/NotificationService.js` (appel Expo Push API), documenter dans `swagger.js`.
3. Déclencheurs : brancher `NotificationService` dans les services concernés (ex. `scripts/check-overdue-invoices.js` pour les factures en retard).

## Créer une synchronisation (local ↔ backend)

La couche existe mais n'est pas branchée :
1. Compléter/utiliser `domain/invoices.ts`, `domain/recipients.ts`, `domain/profile.ts` (token via `domain/authorization.ts` — garder l'import relatif `'../app/config'`).
2. Dans `store/index.ts` : ajouter les métadonnées de sync (`syncedAt`, `dirty`) via la fonction `migrate`, et des actions `syncInvoices()` etc. qui appellent `domain/`.
3. Point d'orchestration : `app/_layout.tsx` (déclencher la sync quand l'utilisateur est authentifié) ou un hook `hooks/useSync.ts`.
4. Côté backend, les endpoints CRUD existent déjà (`src/routes/invoices.js`, `recipients.js`, `profile.js`).

## Créer une fonctionnalité offline

L'app est déjà local-first — toute nouvelle donnée doit suivre le même schéma :
1. Type Zod dans `app/schema/`.
2. État + actions dans `store/index.ts` (persisté automatiquement) + mise à jour de `migrate` pour les utilisateurs existants.
3. Fichiers locaux éventuels : `FileSystem.documentDirectory` via `app/utils/`.
4. Prévoir la resync future : ne jamais supposer le réseau dans les écrans.

## Créer un upload

1. Backend : route dans `src/routes/` (multipart), stream vers Cloudinary via `streamifier` (modèle : `src/services/pdfService.js`), config dans `src/constants/cloudinary.config.js`, URL stockée dans le modèle concerné.
2. Mobile : `expo-image-picker` (à installer), fonction d'envoi dans `domain/` (FormData + Bearer), UI dans l'écran concerné (ex. logo → `app/(tabs)/settings/edit.tsx`).
3. Swagger + scénario Bruno.

## Créer une authentification (nouveau provider, ex. Apple)

1. Mobile : hook `hooks/useAppleSignIn.ts` sur le modèle de `hooks/useGoogleSignIn.ts` (expo-auth-session / expo-apple-authentication), bouton dans `app/(auth)/login.tsx` et `register.tsx`.
2. Provider à activer dans la console Firebase — aucun changement backend : `verifyFirebaseToken` accepte tout token Firebase valide.
3. La redirection post-login est déjà gérée par `auth.onAuthStateChanged` dans `app/_layout.tsx`.

## Créer un paiement

Stripe est déjà en place côté backend :
1. Plans/quotas : `src/constants/plan.constants.js` + variables `STRIPE_PRICE_*` dans `.env`.
2. Logique : `src/services/SubscriptionService.js` ; routes : `src/routes/subscription.js` (checkout, portal, webhook — vérifier `STRIPE_WEBHOOK_SECRET`).
3. Restrictions d'accès : middlewares `src/middlewares/checkPlan.js` / `payment.js` dans les chaînes de routes.
4. Mobile (à créer) : `domain/subscription.ts` + écran `app/(tabs)/settings/subscription.tsx`, ouverture du Checkout via `expo-web-browser`.

## Créer un chatbot IA

Rien n'existe — architecture recommandée (clé API côté serveur uniquement) :
1. Backend : service `src/services/AssistantService.js` (SDK `@anthropic-ai/sdk`, modèle `claude-fable-5` ou `claude-haiku-4-5-20251001` selon coût/latence), route `src/routes/assistant.js` protégée par `[verifyFirebaseToken, checkSubscription, sanitizeInput]` + rate limit dédié dans `src/middlewares/rateLimiter.js`, clé `ANTHROPIC_API_KEY` dans `.env`. Swagger + Bruno.
2. Contexte métier : passer les données de l'utilisateur (factures, profil) comme contexte ou via tool use — toujours filtrées par `req.user.uid`.
3. Mobile : `domain/assistant.ts` (appel du endpoint, streaming SSE si besoin), écran de chat `app/(tabs)/assistant.tsx` + onglet dans `app/(tabs)/_layout.tsx`, état de conversation dans `store/index.ts` si persistance souhaitée.
4. **Interdit** : appeler l'API Anthropic directement depuis l'app mobile (la clé serait exposée dans le bundle).
