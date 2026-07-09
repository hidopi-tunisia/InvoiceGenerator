# Onboarding réactif au profil serveur + langue par défaut « Français »

**Date** : 2026-07-09
**Statut** : design validé (approche A), prêt pour plan

## Problème

1. **Utilisateur existant** (profil serveur partiel, ex. créé depuis le front Angular) :
   `syncProfileOnBoot()` est non-bloquant — la redirection vers `/onbording` part avant
   l'arrivée du pull serveur. Les écrans d'onboarding capturent leurs valeurs initiales
   **une seule fois au montage** (useState sur la welcome, `defaultValues` RHF sur le
   profil) → les données serveur arrivées 1-2 s plus tard ne s'affichent jamais.
2. **Nouvel utilisateur** : `profile.language` démarre à `''` → aucune langue
   présélectionnée. Attendu : **Français** par défaut (module de traduction pas encore
   en place ; seule la valeur stockée/poussée compte).

Le cas « profil serveur complet » est déjà géré (phase 2 : onboarding sauté) — inchangé.

## Comportement cible

| Cas | Welcome (étape 1) | Profil (étape 2) |
|---|---|---|
| Nouvel utilisateur (serveur vide / hors ligne) | Langue présélectionnée **Français** (`'fr'`) ; pays vide ; devise `TND` ; TVA 20 (défauts actuels) | vide |
| Existant, profil partiel | Champs adoptent les valeurs serveur **dès l'arrivée du pull**, même écran déjà affiché ; langue serveur prioritaire sur le défaut `'fr'` | nom/adresse/TVA pré-remplis, y compris si le pull arrive tard |
| Existant, profil complet | *(inchangé — onboarding sauté)* | — |

**Règle de non-écrasement** : une valeur que l'utilisateur a déjà modifiée n'est jamais
écrasée par le pull (seuls les champs intacts adoptent le serveur).

## Conception

### `app/onbording/index.tsx` (welcome — états locaux, pas de RHF)
- Init : `selectedLanguage: profile.language || 'fr'` (défaut Français au **formulaire**,
  pas au store — un `'en'` serveur n'est jamais écrasé, le store garde `''` initial).
- Réactivité : un `useEffect` observant `profile.country/language/currency/taxRate`
  adopte la valeur serveur pour chaque champ **non touché** par l'utilisateur (suivi via
  un `useRef` de drapeaux `touched`, posés dans les handlers de sélection/saisie).

### `app/onbording/profile.tsx` (étape 2 — React Hook Form)
- `defaultValues` → option **`values`** (réactive) + `resetOptions: { keepDirtyValues: true }`
  (RHF resynchronise les champs non-dirty quand `store.profile` change).
- ⚠️ L'`id` de repli doit être **stable** entre rendus : `useRef(Crypto.randomUUID())`
  (un `Crypto.randomUUID()` inline dans `values` changerait à chaque rendu).

### Hors périmètre
- Aucun changement à `store/index.ts` (défaut `language: ''` conservé),
  `store/profile-sync.ts`, l'auth-gate, ni au module de traduction (inexistant).
- Pas d'ajout de langue à la liste (fr/en actuels).

## Vérification
Pas de framework de test : `npx tsc --noEmit` + `npx eslint` sur les 2 fichiers, puis
smoke-test device : (a) nouveau compte → « Français » présélectionné sur la welcome ;
(b) compte existant au profil partiel → champs de la welcome et de l'étape 2 qui se
remplissent à l'arrivée du pull ; (c) saisir un champ avant l'arrivée du pull → la
saisie est conservée.
