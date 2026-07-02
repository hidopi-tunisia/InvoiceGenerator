# MOBILE_GUIDELINES.md — Conventions React Native Myfakto

> Référence permanente des conventions mobiles. Objectif : **sortir un MVP sur l'App Store et le Play Store**.
>
> Chaque règle porte un statut :
> - 🟢 **en place** — convention déjà respectée, la maintenir.
> - 🟡 **requis MVP** — à faire/corriger **avant** la soumission au store.
> - 🔵 **post-MVP** — ne pas construire maintenant ; la règle existe pour que le jour venu, ce soit fait correctement.
>
> Stack de référence : Expo SDK 52 · expo-router v4 · Zustand + AsyncStorage (local-first) · NativeWind · React Hook Form + Zod · Firebase Auth. Ne pas ajouter de dépendance sans justification MVP.

---

## 1. Structure des écrans

- 🟢 Un écran = un fichier de route dans `app/` ; le chemin du fichier définit l'URL (expo-router). Nom en kebab-case (`new-contact.tsx`).
- 🟢 Un écran **compose** : formulaire (RHF), composants de `components/`, sélecteurs de store. Il ne contient **jamais** de logique métier — calculs et règles vivent dans `store/`, `app/utils/` ou `app/schema/`.
- 🟢 Structure type d'un écran (modèle : [app/invoices/generate/index.tsx](app/invoices/generate/index.tsx)) : sélecteurs store → `useForm` + zodResolver → `onSubmit` qui appelle une action du store puis navigue → JSX sous `FormProvider`/`KeyboardAwareScrollView`.
- 🟡 Supprimer le code mort des écrans avant release : blocs commentés, boutons de test (`handleOnPress` avec données en dur dans `app/(tabs)/index.tsx`), écrans placeholder non branchés.
- 🟢 Export par défaut d'une fonction nommée (`export default function GenerateInvoice()`), pas de composant anonyme.

## 2. Navigation

- 🟢 **Uniquement expo-router** : `router.push/replace/back` et `<Link>`. 🟡 Interdit et à purger : `useNavigation()` de `@react-navigation/native` (encore présent dans `(auth)/login.tsx` / `register.tsx` — source du bug de navigation dans le `catch`).
- 🟢 L'auth gate vit **exclusivement** dans `app/_layout.tsx` via `onAuthStateChanged` : non connecté → `/(auth)/login`, sans onboarding → `/onbording`, sinon `/(tabs)`. Aucun écran ne re-vérifie l'auth lui-même.
- 🟢 Chaque groupe de routes a son `_layout.tsx` ; tout nouvel écran est déclaré dans le `<Stack>` parent et accessible depuis un flux réel — pas d'écran orphelin (cas actuel des modales `(modals)/country` et `language` : 🟡 les brancher ou les supprimer).
- 🟢 `router.replace` pour les transitions dont on ne doit pas revenir (post-login, post-onboarding, succès de facture) ; `router.push` sinon.
- 🟢 Entrer dans le wizard **uniquement** après `store.startNewInvoice()` ; quitter proprement = `resetNewInvoice()` ou reprise depuis l'accueil.

## 3. Hooks

- 🟢 Composants fonction + hooks uniquement, jamais de classes.
- 🟢 Hook réutilisé par ≥ 2 écrans → `hooks/useXxx.ts` (modèle : [hooks/useGoogleSignIn.ts](hooks/useGoogleSignIn.ts)). Hook propre à un écran → dans le fichier de l'écran.
- 🟢 Tout `useEffect` avec souscription (Firebase, listener, timer) retourne son cleanup. Le `onAuthStateChanged` du layout racine doit retourner `unsubscribe`.
- 🟢 Dépendances de `useEffect` exhaustives — pas de `// eslint-disable` pour masquer une dépendance manquante.

## 4. Context

- 🟢 **Pas de Context custom pour l'état applicatif** — c'est le rôle du store Zustand. Les seuls contextes autorisés : `FormProvider` (RHF), providers de librairies (SafeArea, GestureHandler).
- 🔵 Si un jour un contexte s'impose (thème custom), il vit dans `components/providers/` et n'embarque aucune donnée métier.

## 5. State Management

- 🟢 **Un seul store Zustand** : [store/index.ts](store/index.ts), persisté AsyncStorage sous `facture-store`. Interdit d'en créer un second.
- 🟢 Sélecteurs ciblés obligatoires : `useStore((s) => s.invoices)` — jamais `useStore()` entier (re-render global).
- 🟢 Toute mutation passe par une action nommée du store ; jamais de `set` inline depuis un écran.
- 🟢 Toute évolution du schéma persisté s'accompagne d'une mise à jour de `migrate()` (les utilisateurs existants ont des données à l'ancien format).
- 🟢 État éphémère d'UI (modal ouverte, index d'étape visuel) → `useState` local, pas le store.

## 6. Services

- 🟢 Tout accès réseau vit dans `domain/` (un fichier par ressource : `invoices.ts`, `recipients.ts`, `profile.ts`, `senders.ts`). Les écrans n'appellent jamais `fetch` directement.
- 🟢 `domain/authorization.ts` fournit le Bearer token Firebase — conserver son import relatif `'../config'`.
- 🟢 Les services retournent des types de `app/schema/` (ou des DTO mappés vers eux), jamais des réponses brutes.

## 7. API

- 🟢 Base URL via `process.env.EXPO_PUBLIC_API_URL` (fallback Render) — jamais d'URL en dur dans un écran.
- 🟡 Tout appel `domain/` a un **timeout** (`AbortController`, ~15 s) : le backend Render a des cold starts ; sans timeout, spinner infini garanti.
- 🔵 La couche `domain/` n'est pas branchée à l'UI pour le MVP — **ne pas la brancher partiellement** : le MVP sort en local-first pur, la sync est un chantier post-MVP complet (voir §8).
- 🔵 Gestion des réponses : le backend répond `{ success, data, message, timestamp }` — parser ce format dans un helper unique de `domain/`, pas dans chaque fonction.

## 8. Gestion Offline

- 🟢 **L'app est offline-first** : création de facture, PDF, partage, contacts fonctionnent sans réseau. C'est l'argument produit — toute nouvelle fonctionnalité MVP doit marcher sans réseau.
- 🟢 Le réseau n'est requis que pour l'auth Firebase (login initial) ; la session persiste ensuite hors ligne via AsyncStorage.
- 🟡 Aucun parcours critique ne doit dépendre d'un appel réseau bloquant ; si un appel échoue, l'app continue en local avec un message discret, jamais un crash.
- 🔵 Post-MVP (sync) : métadonnées `syncedAt`/`dirty` dans le store via `migrate()`, file d'attente de mutations, résolution de conflits last-write-wins par entité.

## 9. Stockage local

- 🟢 Trois emplacements, trois usages — ne pas les mélanger :
  | Donnée | Emplacement |
  |---|---|
  | État applicatif (profil, factures, contacts) | Zustand → AsyncStorage (`facture-store`) |
  | Fichiers générés (PDFs `facture-{n°}.pdf`) | `FileSystem.documentDirectory` |
  | Session Firebase | gérée par le SDK (persistance AsyncStorage via `app/config.ts`) |
- 🟢 Jamais de donnée métier écrite directement en AsyncStorage hors du store.

## 10. AsyncStorage

- 🟢 Accès uniquement via le middleware `persist` de Zustand — pas de `AsyncStorage.setItem` manuel.
- 🟢 Clé unique `facture-store` ; ne jamais la renommer (perte de données utilisateur) — toute évolution passe par `migrate()`.
- 🟢 AsyncStorage n'est **pas chiffré** : aucun secret n'y transite (voir §11).

## 11. Secure Storage

- 🟡 Tout secret (token API tiers, clé, credential) → `expo-secure-store` (Keychain/Keystore), jamais AsyncStorage ni le bundle JS.
- 🟢 État actuel sain : aucun secret côté app — Firebase gère ses tokens, la config Firebase publique dans `app/config.ts` n'est pas un secret. **Maintenir cet état** : la future clé Anthropic/Stripe ne doit jamais arriver côté mobile.

## 12. Push Notifications

- 🔵 **Hors MVP.** Aucune infra n'existe et ce n'est pas bloquant store.
- 🔵 Le jour venu (règles vérifiées sur la doc Expo actuelle) : `expo-notifications` + `getExpoPushTokenAsync({ projectId })` (projectId EAS via `Constants.expoConfig.extra.eas.projectId`), token enregistré au backend (`domain/notifications.ts`, hook `hooks/usePushNotifications.ts`).
- 🔵 Sur Android : créer un **notification channel avant** de demander la permission (sans canal, le prompt Android 13+ n'apparaît pas) ; les listeners (`addNotificationReceivedListener`/`addNotificationResponseReceivedListener`) se nettoient avec `.remove()` dans le cleanup du `useEffect`.
- 🔵 Le push distant est **indisponible dans Expo Go depuis SDK 53** : tester uniquement sur development build EAS (le projet en a déjà).
- 🔵 Demander la permission **en contexte** (après la première facture, pas au premier lancement) ; gérer le refus sans nag.

## 13. Deep Links

- 🟢 Le scheme est déjà déclaré dans `app.json` et expo-router mappe automatiquement chaque route à une URL — un lien `myfakto://invoices/123/detail` fonctionne nativement.
- 🟡 Vérifier avant release que l'auth gate intercepte un deep link vers un écran protégé (redirection login puis retour) — tester `npx uri-scheme open myfakto://... --ios/--android`.
- 🔵 Universal Links / App Links (https) : post-MVP, nécessite le domaine web + fichiers d'association.

## 14. Permissions

- 🟢 Le MVP ne demande **aucune permission runtime** (pas de caméra, localisation, contacts système) — le partage PDF passe par la sharesheet qui n'en exige pas. C'est un avantage review store : le conserver.
- 🟡 Purger `app.json`/Info.plist/AndroidManifest de toute permission déclarée mais non utilisée (rejet App Store fréquent). Vérifier après chaque prebuild.
- 🔵 Toute future permission : demande en contexte, texte d'usage explicite (`infoPlist` : `NS*UsageDescription` en français), fallback si refus.

## 15. Gestion des erreurs

- 🟢 `ErrorBoundary` global exporté depuis `app/_layout.tsx` + Sentry (`@sentry/react-native`) initialisé au boot — maintenir.
- 🟡 **Zéro `console.log` en production** : purger ceux de `_layout.tsx` (il expose la clé Vexo), `app/index.tsx`, `(tabs)/index.tsx`, `detail.tsx`, `store/index.ts`. Erreurs → `Sentry.captureException`.
- 🟢 Toute erreur montrée à l'utilisateur est en **français**, actionnable, sans détail technique (« Impossible de générer le PDF. Réessayez. » — pas de stack).
- 🟢 Mapper les codes Firebase Auth (`auth/invalid-credential`, `auth/email-already-in-use`…) vers des messages français dans un util partagé par login/register.
- 🟢 Jamais de `catch` vide, jamais de logique de succès dans un `catch` (bug historique de `register.tsx`).

## 16. Loading

- 🟢 Toute action asynchrone > 300 ms a un état visuel : bouton désactivé + spinner intégré (prop `loading` du `Button`), pas d'overlay plein écran.
- 🟢 Un état de chargement a **toujours** une issue : succès, erreur affichée, ou timeout (§7) — le spinner infini est un bug.
- 🟢 Double-submit interdit : le bouton se désactive dès le premier press (login, sauvegarde facture, génération PDF).

## 17. Skeleton

- 🟢 App local-first = lectures synchrones : **pas de skeletons pour le MVP** — un skeleton sur des données instantanées est du bruit visuel.
- 🔵 Post-sync : skeletons (blocs NativeWind `animate-pulse`) uniquement sur les listes alimentées par le réseau, jamais sur les données locales.

## 18. Infinite Scroll

- 🟢 Listes locales (factures, contacts) : virtualisation via `@legendapp/list`/FlatList suffit — **pas de pagination UI au MVP**, le volume d'un utilisateur (centaines de factures max) ne le justifie pas.
- 🔵 Post-sync : `onEndReached` + `page/limit` du backend (`ResponseFormatter.paginated`), avec footer spinner et garde anti-appels multiples.

## 19. Pull To Refresh

- 🟢 Hors MVP sur les listes locales (rien à rafraîchir — la donnée est déjà la source de vérité).
- 🔵 Dès la sync branchée : `RefreshControl` sur factures et contacts, déclenchant `syncInvoices()` ; l'indicateur s'arrête toujours (`finally`).

## 20. Gestion des formulaires

- 🟢 **React Hook Form + `FormProvider` partout** : `useForm` avec `zodResolver` + `defaultValues`, champs via les composants maison (`CustomInputText`, `NumericInputText`, `CustomDatePicker`), submit via `methods.handleSubmit(onSubmit)`. Modèle : [app/invoices/generate/index.tsx](app/invoices/generate/index.tsx).
- 🟢 Jamais de `useState` par champ, jamais de `TextInput` nu dans un écran — toujours les composants de `components/`.
- 🟢 Tout formulaire est enveloppé dans `KeyboardAwareScrollView` (saisie clavier ouvert).
- 🟢 Un formulaire à étapes (wizard) écrit dans le store à chaque étape validée — pas d'état géant trans-écrans dans RHF.

## 21. Validation

- 🟢 **Zod est la source de vérité** : schémas dans `app/schema/invoice.ts`, types inférés (`z.infer`). Interdit de dupliquer une règle dans le composant (les `rules={{ required }}` inline de `CustomInputText`/`CustomDatePicker` sont un doublon 🟡 à résorber : le resolver Zod suffit).
- 🟢 Messages d'erreur définis dans le schéma Zod, **en français**, affichés sous le champ (pattern existant de `CustomInputText`).
- 🟢 Valider à la soumission (`handleSubmit`), revalider à la frappe après première erreur (comportement RHF par défaut — le garder).

## 22. Internationalisation

- 🟢 MVP : **français uniquement, en dur** — c'est assumé (cible Tunisie/France). Aucune chaîne anglaise ne doit apparaître dans l'UI.
- 🟡 Discipline pré-i18n dès maintenant : pas de concaténation de phrases (`'Facture ' + n`→ template complet), formats date/monnaie via `Intl`/`toLocaleDateString('fr-FR')` et non des strings bricolées.
- 🔵 Post-MVP (arabe = RTL !) : `i18next` + `expo-localization`, clés par écran, audit RTL complet — le sélecteur de langue de l'onboarding ne devra être branché qu'à ce moment-là.

## 23. Thème

- 🟢 **NativeWind uniquement** : `className` avec classes Tailwind, jamais de `StyleSheet.create` ni de style inline (sauf valeur dynamique impossible en classe).
- 🟡 Centraliser la palette dans `tailwind.config.js` (`colors.primary`, etc.) et remplacer les couleurs hex éparpillées — condition préalable au dark mode.
- 🟢 `npm run format` obligatoire après toute édition de classes (tri automatique par `prettier-plugin-tailwindcss`).

## 24. Dark Mode

- 🟢 **MVP : light-only assumé.** Verrouiller `"userInterfaceStyle": "light"` dans `app.json` 🟡 — une app qui suit le thème système sans styles sombres affiche des écrans illisibles, motif de mauvaises reviews.
- 🟢 Prérequis technique déjà rempli : sur Android, `userInterfaceStyle` est **ignoré** si `expo-system-ui` n'est pas installé — le projet l'a (`expo-system-ui ~4.0.7`), ne pas le retirer du `package.json`.
- 🔵 Post-MVP : variantes `dark:` NativeWind sur la palette centralisée (§23), puis passer `userInterfaceStyle` à `"automatic"`. Ne jamais faire l'un sans l'autre.

## 25. Accessibilité

- 🟡 Tout contrôle tactile custom porte `accessibilityRole` + `accessibilityLabel` (les icônes seules — poubelle, partage — sont muettes pour VoiceOver/TalkBack). Zone de touche ≥ 44×44 pt (`hitSlop` si l'icône est petite).
- 🟢 Les erreurs de formulaire sont exprimées par du **texte** (pattern existant), jamais par la seule couleur de bordure.
- 🟢 Contraste minimum AA : pas de gris clair sur blanc pour du texte porteur d'information.
- 🔵 Audit VoiceOver/TalkBack complet écran par écran : post-MVP.

## 26. Animations

- 🟢 **`react-native-reanimated` uniquement** (thread UI) pour les animations de liste et transitions (pattern existant : entrées/sorties des factures) ; Lottie pour les moments de célébration (écran succès).
- 🟢 Jamais d'`Animated` JS-driven sur un parcours chaud ; toute animation avec `useNativeDriver` implicite via Reanimated.
- 🟢 Les animations sont un bonus, pas un bloquant : une animation qui saccade sur device réel est supprimée, pas « optimisée plus tard ».

## 27. Performance

- 🟢 Listes non bornées → virtualisation (`@legendapp/list`/FlatList) ; jamais de `.map()` dans un `ScrollView` pour les factures/contacts.
- 🟢 Sélecteurs Zustand ciblés (§5) = première défense anti re-render ; `useCallback` sur les handlers passés aux items de liste.
- 🟢 Travail lourd (génération PDF) déclenché par action utilisateur, jamais dans le rendu ; l'écran détail génère le PDF **une fois** et réutilise l'URI.
- 🟡 Nettoyer `package.json` avant release : dépendances redondantes (double SDK Firebase JS + `@react-native-firebase/*` si toujours présent, `twrnc` alors que NativeWind est la convention) — chaque lib inutile alourdit le bundle et l'app startup.
- 🟢 Tester la fluidité sur un **Android milieu de gamme réel**, pas seulement le simulateur iOS.

---

# ✅ Checklist « Prêt pour le store » (MVP)

Ordonnée par blocage. Tout 🟡 ci-dessus doit être traité ; en synthèse :

**Bloquant soumission (crash / rejet)**
1. Corriger les bugs critiques connus de `qualitygate.md` : import `useState` manquant et code mort dans `_layout.tsx`, navigation dans le `catch` de `register.tsx`, données d'onboarding non sauvegardées.
2. Justesse métier : TVA réellement calculée dans les totaux (`app/utils/invoice.ts`) et PDF fidèle au profil (`taxRate`, devise) — une app de facturation qui calcule faux est morte en review utilisateur.
3. Purger le bouton de test de l'accueil et tout `console.log` (dont la clé Vexo).
4. `npx tsc --noEmit` et `npm run lint` passent sans erreur.

**Bloquant review store**
5. **Target API level Android** : le projet est en Expo SDK 52 (`targetSdkVersion` 34 par défaut) alors que Google Play exige un target API level récent pour toute nouvelle soumission (35 depuis fin 2025, l'exigence monte chaque année — l'écosystème Expo est au SDK 56 / target 36). Vérifier l'exigence en vigueur sur la Play Console au moment de soumettre, puis : soit relever `targetSdkVersion`/`compileSdkVersion` via `expo-build-properties` (déjà utilisé dans le projet) et tester sur device Android 14+, soit — préférable mais plus long — upgrader le SDK Expo. **Sans ça, la soumission Play Store est refusée d'office.**
6. Permissions déclarées = permissions utilisées (audit `app.json` post-prebuild).
7. `userInterfaceStyle: "light"` verrouillé ; icône, splash, nom « Myfakto » cohérents.
8. Politique de confidentialité (URL) + formulaires App Privacy (Apple) / Data Safety (Google) reflétant : Firebase Auth, Sentry, Vexo.
9. Flux mot de passe oublié : `forgot_psx.tsx` a été supprimé — soit le réimplémenter (`sendPasswordResetEmail`), soit retirer tout lien vers lui. Un lien mort en review = rejet.
10. Suppression de compte accessible dans l'app (exigence Apple/Google pour toute app avec création de compte).

**Qualité de lancement**
11. Timeouts sur tout appel réseau ; messages d'erreur français partout.
12. Accessibilité minimale : labels sur les contrôles à icône, touch targets 44 pt.
13. Test manuel du parcours complet en **mode avion** : onboarding → facture → PDF → partage.
14. Build `eas build --profile production` testé sur device réel iOS + Android milieu de gamme.

**Explicitement hors MVP** (ne pas s'y disperser) : sync backend, push notifications, i18n/RTL, dark mode, pull-to-refresh, skeletons, pagination.

---

# 📦 Annexe — Procédure d'upgrade Expo SDK (item n°5)

> Référence pour résorber la dette SDK 52 → 56. Source : skill officiel Expo `upgrading-expo` (juillet 2026).

## Procédure

```bash
npx expo install expo@latest    # monter le SDK
npx expo install --fix          # aligner toutes les dépendances Expo/RN
npx expo-doctor                 # diagnostics
npx expo prebuild --clean       # android/ et ios/ sont générés → les régénérer
rm -rf node_modules .expo && npm install   # purge des caches si comportement étrange
```

Relire le changelog de chaque SDK traversé : https://expo.dev/changelog. Monter **un SDK majeur à la fois** est plus sûr que 52 → 56 d'un coup.

## Breaking changes sur le chemin 52 → 56, spécifiques à ce projet

| SDK | Changement | Impact Myfakto |
|---|---|---|
| 53 | **New Architecture activée par défaut** (Expo Go ne supporte plus l'ancienne archi) | Auditer les libs natives : `lottie-react-native` 5.x (support new arch à partir de v6 — upgrade obligatoire), `react-native-keyboard-aware-scroll-view` (non maintenue, prévoir remplacement), `react-native-context-menu-view`, `react-native-flags` |
| 53 | Push distant indisponible dans Expo Go | Déjà documenté §12 — dev builds EAS uniquement |
| 54 | **React 19** : `Context.Provider` → `Context`, `forwardRef` supprimé, `useContext` → `use` | Vérifier les composants custom de `components/` qui utilisent `forwardRef` |
| 54 | `react-native-worklets` **requis** pour `react-native-reanimated` | À installer, sinon les animations de listes cassent |
| 54 | React Compiler stable et recommandé | Opt-in : `"experiments": { "reactCompiler": true }` dans `app.json` |
| 56 | Imports `@react-navigation/*` → `expo-router` (codemod fourni) | Converge avec le 🟡 du §2 (purge de `useNavigation`) — le faire avant l'upgrade simplifie |

## Housekeeping post-upgrade

- Retirer de `package.json` les paquets implicites : `@babel/core`, `expo-constants` (fournis par Expo), et l'entrée suspecte `hermes-engine` (Hermes est embarqué dans RN).
- `@react-native-async-storage/async-storage` est déprécié côté Expo au profit de `expo-sqlite/localStorage` — **ne pas migrer à chaud** (le store Zustand persiste dessus, clé `facture-store`, cf. §10) ; planifier la migration avec `migrate()` le jour venu.
- Re-dérouler l'audit permissions (§14) et le test mode avion (checklist n°13) après chaque `prebuild --clean`.
