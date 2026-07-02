# MEMORY.md — Mémoire permanente du projet Myfakto

> Règles et décisions durables. Jamais de bugs, de tâches ni de TODO ici.

## Décisions d'architecture

- App mobile **local-first** : Zustand + AsyncStorage est la source de vérité ; le backend est une couche de synchronisation optionnelle.
- Store Zustand **unique** (`store/index.ts`), persisté sous la clé `facture-store`, avec fonction `migrate` pour la compatibilité ascendante.
- Backend **monolithe Express assumé** — pas de microservices tant que le volume ne l'exige pas.
- Couche `domain/` = client REST isolé ; l'UI ne parle jamais directement à `fetch`/axios.
- Génération PDF mobile en local (expo-print) ; génération PDF serveur centralisée dans `pdfService.js` (jamais inline dans les routes).
- Tests API en **Bruno** (fichiers `.bru` versionnés), pas Postman.
- Format de réponse API unique via `ResponseFormatter` : `{ success, data, message, timestamp }`.
- Le dossier `app/onbording/` garde son nom (typo volontairement conservée — les routes en dépendent).
- `workflow/` = source de vérité des parcours utilisateur (diagrammes Mermaid) ; `API.md` = contrat d'interface backend (copie identique dans les deux repos). Toute tâche les consulte avant de coder et les maintient à jour au même commit.

## Règles React Native

- Hooks uniquement — aucun composant classe.
- TypeScript strict — pas de `any` non justifié.
- Pas de logique métier dans les écrans — calculs et règles dans `store/`, `app/utils/` ou `domain/`.
- Composants réutilisables dans `components/` (formulaires : `CustomInputText`, `CustomDatePicker`, `NumericInputText` sous `<FormProvider>`).
- Services séparés : accès réseau dans `domain/`, jamais dans les écrans.
- Import alias `~/` (racine projet) plutôt que chemins relatifs.
- Styling via NativeWind (`className`) ; lancer `npm run format` après toute édition de classes.
- Formulaires : React Hook Form + résolveur Zod, schémas dans `app/schema/`.
- UI en français (cible Tunisie/France).

## Règles Backend

- Controller → Service → Repository : route = orchestration, service = logique métier, Mongoose = accès données.
- DTO obligatoires : les services retournent des objets plain, jamais de documents Mongoose.
- Validation systématique avant le service : classes statiques dans `src/validators/` retournant `{ isValid, errors }`.
- Gestion centralisée des erreurs : `errorHandler` + `logger.error(\`ROUTE /path failed - ${error.message}\`)`.
- Chaîne middleware standard : `[verifyFirebaseToken, checkSubscription?, sanitizeInput, handler]`.
- Toute route documentée dans `src/docs/swagger.js` **dans le même commit**.

## MongoDB

- Index : index texte sur les champs de recherche (ex. Recipient : companyName + contactPerson + email) ; `userId` indexé partout ; `tag` de facture unique.
- Relations : références par String/ObjectId (`Profile._id` = UID Firebase) ; pas de populate profond — dénormaliser ce qui est affiché.
- Soft delete : flag (`deleted`, `archived`) au lieu de suppression physique ; filtrer explicitement si aucun pre-find hook n'existe.
- Dates UTC : toujours stocker en UTC ; le formatage local se fait côté client.

## API

- REST : ressources au pluriel, verbes HTTP standards, codes de statut corrects (201/204 via `ResponseFormatter.created/noContent`).
- Pagination : `ResponseFormatter.paginated` avec `page`/`limit` sur toute liste.
- Tri : paramètre `sort` explicite, tri par défaut sur la date de création décroissante.
- Filtrage : query params whitelistés (statut, dates, recherche) — jamais de passage direct du query au `find()`.
- Versionnement : préfixe `/api/v1` ; breaking change = nouvelle version.

## Authentification

- Firebase Auth côté mobile (email/password + Google) ; Firebase Admin côté backend.
- `verifyFirebaseToken` en **premier** middleware de toute route protégée.
- Isolation multi-tenant : chaque requête MongoDB filtrée par `userId: req.user.uid` — sans exception.
- Redirection reactive dans `app/_layout.tsx` via `auth.onAuthStateChanged` (auth gate unique).

## Notifications

- Pas de push notifications à ce jour — toute introduction passera par expo-notifications + FCM/APNs, jamais de polling.
- Monitoring d'erreurs via Sentry (mobile et backend) ; les erreurs silencieuses sont interdites.

## Upload

- Fichiers binaires sur **Cloudinary** uniquement (PDFs en `resource_type: "raw"`, logos en image) — jamais sur le disque du serveur.
- Upload en stream (`streamifier`), pas d'écriture temporaire.
- PDF mobile : `FileSystem.documentDirectory`, nommage `facture-{invoiceNumber}.pdf`.

## Sécurité

- Défense en profondeur backend : helmet, CORS configuré, hpp, express-mongo-sanitize, rate limiting (global 100 / auth 20 / mutations 50 par 15 min).
- Champs fiscaux sensibles en `select: false` ; jamais de secrets loggés ni commités (`.env` hors Git).
- Entrées utilisateur validées côté client (Zod) **et** côté serveur (validators) — la validation client n'est jamais suffisante.
- Actions sensibles tracées dans l'audit trail avec les seules actions de l'enum (CREATE, UPDATE, DELETE, STATUS_CHANGE, PDF_REGENERATED, SENT, PAYMENT_RECEIVED).

## Performances

- Travaux lourds hors du cycle requête/réponse : PDF serveur via `setImmediate` après la réponse HTTP.
- Compression HTTP activée ; réponses paginées obligatoires sur les collections.
- Mobile : listes virtualisées, animations via `react-native-reanimated` (thread UI), pas de re-render global du store (sélecteurs Zustand ciblés).
- Prendre en compte les cold starts de Render dans les timeouts côté client.
