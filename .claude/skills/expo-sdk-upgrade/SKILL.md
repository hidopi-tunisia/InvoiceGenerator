---
name: expo-sdk-upgrade
description: >-
  Guide et exécute la montée de version d'un projet Expo/React Native, un SDK
  majeur à la fois. Utilise ce skill dès que la tâche touche à un upgrade Expo
  SDK, une bascule d'architecture React Native (ancienne → New Architecture),
  l'erreur « target API level » du Play Store, ou des conflits de dépendances
  après un bump (peer deps React 19, expo install --fix, reanimated/worklets,
  nativewind v5). Déclenche-le même si l'utilisateur dit juste « passe à la
  dernière version d'Expo », « migre le SDK », « débloque la soumission store »
  ou colle une erreur de build/bundling apparue après un changement de version.
  Contient les pièges concrets déjà rencontrés sur ce projet (Fatourty/Myfakto).
---

# Montée de version Expo SDK (incrémentale)

## Principe directeur

**Un SDK majeur à la fois.** Sauter plusieurs versions (52 → 57 d'un coup)
empile des ruptures dont on ne peut plus isoler la cause quand un build casse.
Chaque hop = un petit périmètre, validé sur device avant le suivant. C'est plus
lent en apparence, bien plus rapide en pratique (pas de debug en aveugle).

Chaque hop suit toujours la même boucle : **préparer → bumper → réparer
(doctor/types) → valider le bundling soi-même → rebuild natif → smoke-test
device → commit**. Ne passe jamais au hop suivant tant que le device n'a pas
validé le hop courant.

## Avant de commencer

1. **Connaître la cible et le chemin.** Lis les dist-tags pour savoir ce qui
   est stable : `npm view expo dist-tags --json`. La dernière `latest` peut être
   plus récente que ce que la doc/les tickets supposent — confirme-la.
2. **Vérifier la contrainte réelle.** Souvent le vrai besoin est le *target API
   level* Android du Play Store (échéance mouvante ; ex. API 36 au 31/08/2026).
   Vérifie l'exigence en vigueur — parfois relever `targetSdkVersion` via
   `expo-build-properties` suffit, sans migration complète. Si l'utilisateur
   veut quand même la montée SDK, continue.
3. **Auditer les libs natives communautaires** (celles qu'`expo install --fix`
   ne réaligne PAS : keyboard/context-menu/pickers tiers, analytics natifs…)
   pour leur compat avec la cible — surtout la New Architecture. Voir
   `references/breaking-changes.md`.
4. **Travailler sur une branche dédiée** (`chore/upgrade-sdk-NN`), jamais sur
   `main`/`master`.

## La boucle, hop par hop

### 1. Préparer (avant tout `expo install`)
- **Retirer les dépendances mortes** : une lib jamais importée dans le code
  (`grep -rn "<lib>" app components hooks`) est un faux bloquant — supprime-la
  du `package.json` au lieu de la migrer. (Vécu : `react-native-keyboard-aware-scroll-view`
  était en dep mais un wrapper maison n'utilisait que `KeyboardAvoidingView`.)
- **Épingler les libs dont `latest` sauterait un major** incompatible avec la
  cible (ex. `nativewind` en `^4.1.0` tant qu'on n'est pas en New Arch +
  Reanimated v4, car NativeWind v5 les exige).

### 2. Bumper
```bash
npx expo install expo@^NN.0.0   # NN = SDK cible du hop
npx expo install --fix          # aligne RN, react, expo-*, reanimated…
```
`--fix` réécrit `package.json` en versions du SDK. **React 19** (arrive dès
**SDK 53**, RN 0.79) provoque des conflits de peer deps `ERESOLVE` (des libs
déclarent encore `peer react ^18`). Solution standard, respectée aussi par EAS :
un `.npmrc` à la racine avec `legacy-peer-deps=true`, puis `npm install`. Retire
ce workaround une fois la cible atteinte et l'écosystème stabilisé.

### 3. Réparer (doctor + types)
```bash
npx expo-doctor      # vise 18/18
npx tsc --noEmit     # les nouveaux types (React 19, expo-router vN) cassent souvent
```
Corrige les remontées de `expo-doctor` (souvent mécaniques) : voir la checklist
dans `references/breaking-changes.md` (scheme minuscule, retrait
`@types/react-native`, peer `expo-font`→`expo-asset`, `@types/react`/`typescript`
alignés, `tsconfig` `moduleResolution: "bundler"`…).

### 4. Valider le bundling TOI-MÊME (avant de solliciter un device)
```bash
npx expo export -p ios --clear
```
Ça bundle et sort sans serveur : ça capture d'un coup les erreurs JS/ESM
(`import.meta`/Hermes de zustand, module manquant comme `expo-asset`) **avant**
de faire perdre du temps à l'utilisateur sur un build. Corrige jusqu'à un export
propre. Un changement de `babel.config.js` n'est pris en compte qu'avec `--clear`.

### 5. Rebuild NATIF (indispensable, `expo start` ne suffit pas)
Un changement de version touche le natif. Lancer `npx expo start` contre un
dev-client déjà installé sert le nouveau JS sur l'**ancien binaire** → erreurs
de mismatch (`[Reanimated] Native part … not initialized`, modules natifs
absents). Il faut **reconstruire le dev-client** :
```bash
npx expo run:android   # ou run:ios
```
Sur macOS, si `SDK location not found` : `echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties`.
Projet CNG (`ios/`/`android/` gitignorés) : ces dossiers sont régénérés au build,
rien à committer.

### 6. Smoke-test device
Ouvre les écrans à risque (listes qui chargent des données serveur, animations,
auth/OAuth, PDF). **Redémarre l'app à froid** (fermeture complète + réouverture)
plutôt que Fast Refresh (`r`) : recharger le JS à répétition sur le bridge
provoque un crash natif `Cannot create a new React context on an invalidated
ReactInstanceManager` qui n'est PAS un bug du code.

### 7. Commit + validation avant le hop suivant
Un commit par hop. Ne démarre pas le hop N+1 tant que le device n'a pas validé N.

## Décision d'architecture (à trancher tôt)

L'**ancienne architecture** (bridge, `newArchEnabled=false`) n'est supportée que
**jusqu'au SDK 54**. **SDK 55+ (RN 0.82) supprime l'option — New Architecture
obligatoire.** Donc pour toute cible ≥ 55, planifie la **bascule New Arch au
SDK 54** : c'est la dernière version où l'ancienne archi reste un filet de
secours pendant qu'on valide la New Arch. `react-native-reanimated` v4 et
`nativewind` v5 sont **New-Arch uniquement** — leur montée va avec la bascule.

## Contrainte toolchain (iOS)

Un **Xcode trop récent** peut ne pas compiler un SDK intermédiaire (ex. Xcode 26
casse le `fmt`/Folly de RN 0.79 : `call to consteval function … is not a
constant expression`). Plutôt que patcher `fmt` à chaque hop, **valide les hops
intermédiaires sur Android** (qui build) et ne construis **iOS qu'au SDK final**
(dont la RN supporte le Xcode courant).

## Pièges déjà rencontrés

La liste concrète (symptôme → cause → correctif), plus le tableau des ruptures
par version (53→57) et la checklist `expo-doctor`, sont dans
**`references/breaking-changes.md`** — lis-le au début d'un hop et quand un
build/bundle/runtime casse, avant de partir en investigation à froid.
