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
  valider les hops sur Android, builder iOS au SDK final.

## 3. Ruptures par version

| SDK | RN / React | Ruptures clés |
|---|---|---|
| **53** | 0.79 / **React 19.0** | New Arch par défaut (mais désactivable) ; `expo-router` **v4→v5** ; package exports Metro par défaut (→ `import.meta` zustand) ; scheme strict ; reanimated 3.17 (auto). |
| **54** | 0.81 / 19.1 | **Dernière version supportant l'ancienne archi.** React Compiler stable (opt-in `experiments.reactCompiler`). Si bascule New Arch : **reanimated v3→v4 + `react-native-worklets`** (plugin babel `react-native-reanimated/plugin` → `react-native-worklets/plugin`), **nativewind v4→v5**. |
| **55** | 0.83 / 19.2.0 | **New Architecture obligatoire** (RN 0.82 a retiré l'option ; `newArchEnabled:false` ignoré). native-tabs (Icon/Label via `NativeTabs.Trigger.*`) ; `expo-av` → `expo-audio`/`expo-video` ; Hermes v1 opt-in. |
| **56** | 0.85 / 19.2.3 | Imports `@react-navigation/*` → `expo-router` (codemod). targetSdk Android 36. |
| **57** | 0.85+ / 19.2+ | Dernière stable au moment de la migration. |

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
