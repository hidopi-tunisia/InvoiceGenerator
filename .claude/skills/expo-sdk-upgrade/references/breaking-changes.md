# Ruptures Expo SDK & pièges concrets

Table des matières :
1. Checklist `expo-doctor` (corrections mécaniques)
2. Pièges runtime/bundling (symptôme → cause → correctif)
3. Ruptures par version SDK 53 → 57
4. Décision architecture & timeline
5. Play Store / target API

---

## 1. Checklist `expo-doctor` (corrections mécaniques fréquentes)

- **`scheme` invalide** : depuis SDK 53 le schéma exige `^[a-z][a-z0-9+.-]*$`.
  Un scheme avec majuscules (`InvoiceGenerator`) échoue → passe-le en minuscules
  (`invoicegenerator`). ⚠️ Le scheme sert aux deep-links / redirect OAuth :
  revérifier le redirect Google au build (Android le minusculise déjà, iOS est
  insensible à la casse → risque faible).
- **`@types/react-native` installé en direct** : les types sont fournis par
  `react-native` → retire-le des `devDependencies`.
- **Peer manquant `expo-font`** (requis par `@expo/vector-icons`) →
  `npx expo install expo-font`. Et `expo-font` requiert **`expo-asset`**
  (`Unable to resolve module expo-asset from expo-font/build/FontLoader.js`) →
  `npx expo install expo-asset`.
- **Versions dev désalignées** : `@types/react` et `typescript` doivent suivre
  le SDK (ex. `~19.0.10` / `~5.8.3` au SDK 53).
- **`tsconfig` `moduleResolution`** : le base `expo/tsconfig.base` du SDK 53
  active `customConditions`, incompatible avec `moduleResolution: "node"`.
  Passe en `"bundler"` (compatible alias `~/*` + typedRoutes).

## 2. Pièges runtime / bundling

**`import.meta is not supported in Hermes` (zustand `esm/*.mjs`)**
- Cause : SDK 53 active `resolver.unstable_enablePackageExports` par défaut →
  Metro résout le build **ESM** de zustand (au lieu du CJS), qui utilise
  `import.meta`. Couvre `index.mjs` ET `middleware.mjs`.
- Correctif : dans `babel.config.js`, options de `babel-preset-expo` →
  `unstable_transformImportMeta: true`. Puis re-bundle avec `--clear`.

**`Maximum update depth exceeded` en ouvrant une liste qui charge des données**
- Cause A — **layout animations Reanimated** (`itemLayoutAnimation={LinearTransition}`
  sur `Animated.FlatList`, `layout={LinearTransition}` sur les items) : boucle de
  rendu sous New Arch + React 19 quand la liste change (sync serveur au montage).
  Correctif : retirer les layout animations, repli sur `FlatList`. À réévaluer
  sous Reanimated v4.
- Cause B — **`router` dans les deps d'un `useEffect`** : en expo-router v5,
  l'objet de `useRouter()` n'est plus stable entre rendus → l'effet se relance à
  chaque rendu (boucle si l'effet fait un `setState`). Correctif : retirer
  `router` des deps (ses méthodes sont stables) + `eslint-disable-next-line
  react-hooks/exhaustive-deps`.
- Note : deux écrans peuvent boucler pour des causes DIFFÉRENTES — corrige-les
  une par une, ne suppose pas une cause unique.

**`[Reanimated] Native part … not initialized (Worklets)`**
- Cause : JS neuf servi sur un **ancien binaire dev-client** (`expo start` seul).
  Correctif : rebuild natif (`expo run:*`), pas juste `start`.

**`Cannot create a new React context on an invalidated ReactInstanceManager`**
- Cause : race du **Fast Refresh** sur le bridge (ancienne archi) après reloads
  répétés. Pas un bug du code. Correctif : **cold restart** de l'app.

**`ERESOLVE ... peer react@19` pendant `expo install`**
- Cause : transition React 18→19, des libs peer `react ^18`. Correctif :
  `.npmrc` `legacy-peer-deps=true` puis `npm install`.

**iOS `fmt … consteval … not a constant expression`**
- Cause : Xcode trop récent pour le RN du SDK intermédiaire. Correctif :
  valider les hops sur Android, builder iOS au SDK final (RN récent = Xcode courant OK).

**iOS `pod install` : `Unable to find a specification for 'RCT-Folly'` (lib tierce)**
- Cause : le podspec d'une lib native tierce (ex. `vexo-analytics`) déclare
  `RCT-Folly` en dur au lieu d'`install_modules_dependencies(s)` — cassé sous RN
  récent. Correctif : monter la lib à une version au podspec modernisé.

**iOS `RNReanimated/.../*.h file not found` (Reanimated 4 + Xcode 26)**
- Cause : les **modules précompilés Expo** (`EXPO_USE_PRECOMPILED_MODULES=true`,
  défaut SDK 57) + les **explicit C++ modules de Xcode 26** ne résolvent pas les
  headers imbriqués de Reanimated 4. Correctif : `EXPO_USE_PRECOMPILED_MODULES=0`
  (dans `.env` pour le local + `eas.json` `build.<profil>.env` pour EAS), clean
  pods, rebuild. À réévaluer après un patch Expo/Reanimated.

**Bundling `Cannot read properties of undefined (reading 'match')` (Sentry, SDK 54)**
- Cause : Sentry 7 change le câblage metro Expo. Correctif : `metro.config.js` →
  `getSentryExpoConfig(__dirname)` **remplace** `getDefaultConfig` +
  `withSentryConfig` (puis `withNativeWind` par-dessus).

**Android `Minimum supported Gradle version is 8.13` / plugin `version-check`**
- Cause : l'AGP du nouveau SDK exige un Gradle plus récent, mais un prebuild
  **incrémental** (`expo run:android`) a réutilisé l'ancien `android/`. Correctif :
  à chaque saut majeur, **`npx expo prebuild --clean -p android`** (régénère le
  wrapper Gradle, `gradle.properties`, etc.). Recréer `android/local.properties`
  (`sdk.dir=...`) après un clean.

**Android `Can't find KSP version for Kotlin version '1.9.25'` (SDK 54)**
- Cause : un `kotlinVersion` épinglé (souvent dans `expo-build-properties`) est
  resté sur du 1.9.x ; SDK 54 exige Kotlin 2.x. Correctif : retirer le pin obsolète
  (le SDK fournit un Kotlin 2.x compatible).

**`expo-doctor` : `should NOT have additional property 'newArchEnabled'` (SDK 55)**
- Retirer `newArchEnabled` de `app.json` : New Arch implicite dès 55, champ rejeté.

**`expo-doctor` : `@react-navigation/*` interdits / `splash` interdit (SDK 56)**
- Retirer les deps directes `@react-navigation/*` (expo-router s'en occupe seul ;
  remplacer d'éventuels imports par `expo-router`). Déplacer le champ top-level
  `splash` dans le plugin **`expo-splash-screen`** (`["expo-splash-screen", { image,
  resizeMode, backgroundColor }]`).

**tsc `expo-file-system` (SDK 54) / `absoluteFillObject` (RN 0.85) / `baseUrl` (TS 6)**
- `FileSystem.documentDirectory/downloadAsync/moveAsync` : l'ancienne API est dans
  **`expo-file-system/legacy`** (la nouvelle API File/Directory est par défaut).
- `StyleSheet.absoluteFillObject` retiré des types → `StyleSheet.absoluteFill`
  (forme tableau : `style={[StyleSheet.absoluteFill, { … }]}`).
- `baseUrl` déprécié → ajouter `"ignoreDeprecations": "6.0"` au `tsconfig`
  (le garder tant que Metro résout l'alias `~/` via `baseUrl`).

## 3. Ruptures par version

| SDK | RN / React | Ruptures clés |
|---|---|---|
| **53** | 0.79 / **React 19.0** | New Arch par défaut (mais désactivable) ; `expo-router` **v4→v5** ; package exports Metro par défaut (→ `import.meta` zustand) ; scheme strict ; reanimated 3.17 (auto). |
| **54** | 0.81 / 19.1 | **Dernière version supportant l'ancienne archi.** React Compiler stable (opt-in). Bascule New Arch : **reanimated v3→v4 + `react-native-worklets`** (plugin babel `react-native-reanimated/plugin` → `react-native-worklets/plugin`). **NativeWind reste v4** (stable = 4.2.x, aucun peer Reanimated → PAS de migration v5/Tailwind4). `expo-file-system` API changée (→ `/legacy`). Sentry 7 (metro `getSentryExpoConfig`). AGP → Gradle 8.13+ (prebuild --clean) ; Kotlin 2.x (retirer un pin 1.9.x). |
| **55** | 0.83 / 19.2.0 | **New Architecture obligatoire** (RN 0.82 a retiré l'option). Retirer `newArchEnabled` du `app.json`. native-tabs / `expo-av`→`expo-audio`/`video` : seulement si utilisés. |
| **56** | 0.85 / 19.2.3 | **targetSdk Android 36** (débloque Play). Retirer deps `@react-navigation/*`. `splash` → plugin `expo-splash-screen`. `StyleSheet.absoluteFillObject` retiré. `baseUrl` déprécié (TS). |
| **57** | 0.86 / 19.2.3 | Dernière stable. Bump propre depuis 56. |

(Confirme toujours les versions exactes via `npm view expo dist-tags --json` et
`docs.expo.dev/bare/upgrade?fromSdk=X&toSdk=Y`.)

## 4. Décision architecture & timeline

- Ancienne archi (`newArchEnabled=false`) : supportée **jusqu'au SDK 54 inclus**.
- **SDK 55+ : New Architecture obligatoire.**
- Recommandation : basculer New Arch **au SDK 54** (filet de secours old-arch
  encore dispo). `reanimated` v4 et `nativewind` v5 sont New-Arch only et se
  migrent à ce moment-là.
- Vérifier `newArchEnabled` dans `android/gradle.properties` ET
  `ios/Podfile.properties.json` (le champ `app.json` `newArchEnabled` pilote les
  deux à la génération).

## 5. Play Store / target API

- Google impose un *target API level* dans l'année de la dernière version
  Android. Échéances connues : API 35 (Android 15) depuis fin 2025 ; **API 36
  (Android 16) au 31/08/2026**.
- SDK 52 vise API 35 par défaut ; SDK 56 vise API 36.
- App déjà publiée : reste visible tant qu'elle vise ≥ le plancher, mais on ne
  peut plus **pousser de mise à jour** sous le plancher.
- Builds internes / TestFlight / APK : jamais bloqués par le target API level.
