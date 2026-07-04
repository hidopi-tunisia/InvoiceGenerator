# 02 — Flux d'Onboarding

Fichiers : `app/onbording/index.tsx`, `app/onbording/profile.tsx`

> Note : le dossier s'appelle `onbording` (typo intentionnel — ne pas renommer)
>
> Les modales pays/langue sont **locales** à `onbording/index.tsx` (composant `Modal` RN). Les anciennes routes orphelines `app/(modals)/` et `onbording/welcome.tsx` ont été supprimées le 2026-07-03.
>
> **Bootstrap serveur (phase 2 sync)** : au boot connecté, si le store local est vierge, `store/profile-sync.ts` tente `GET /profile` — un utilisateur venu du front web (Angular) retrouve son profil pré-rempli, et **l'onboarding est sauté** si `isProfileComplete`. Hors ligne : onboarding classique, non bloquant. À la sauvegarde du profil (étape 2), `pushProfile()` pousse vers le backend (fire-and-forget, retenté au boot si échec).

---

## Diagramme du Flux

```mermaid
flowchart TD
    AUTH_GATE([Auth-Gate\nonboardingCompleted = false]) --> STEP1[Étape 1\n/onbording/index\nConfiguration]

    STEP1 --> PAYS_BTN[Bouton Pays]
    STEP1 --> LANG_BTN[Bouton Langue]
    STEP1 --> CURRENCY_PILLS[Pills Devise\nTND / EUR / USD]
    STEP1 --> TVA_INPUT[Champ Taux TVA\ndéfaut: 20%]

    PAYS_BTN --> MODAL_PAYS[Modal locale\nTunisie · France]
    MODAL_PAYS -->|Sélection| SET_COUNTRY[Code pays\nen état local]
    SET_COUNTRY --> STEP1

    LANG_BTN --> MODAL_LANG[Modal locale\nFrançais · Anglais]
    MODAL_LANG -->|Sélection| SET_LANG[Code langue\nen état local]
    SET_LANG --> STEP1

    CURRENCY_PILLS -->|Tap| SET_CURRENCY[Code devise\nen état local]
    TVA_INPUT -->|Saisie| SET_TVA[Valeur locale]

    STEP1 -->|Bouton Suivant| VALIDATE_TVA{Taux TVA\nvalide 0-100 ?}
    VALIDATE_TVA -->|Non| TVA_ERR[Erreur sous le champ]
    VALIDATE_TVA -->|Oui| SAVE1[store.setCountry\nstore.setLanguage\nstore.setCurrency\nstore.setTaxRate]
    SAVE1 --> STEP2[Étape 2\n/onbording/profile\nProfil Entreprise]

    STEP2 --> NAME_INPUT[Champ Nom\nrequis]
    STEP2 --> ADDR_INPUT[Champ Adresse\nrequis, multilignes]
    STEP2 --> TVA_NUM[Champ Numéro TVA\noptionnel]

    STEP2 -->|Bouton Sauvegarder| VALIDATE{Validation\nZod}
    VALIDATE -->|Erreur| FORM_ERR[Messages d'erreur\nsous chaque champ]
    VALIDATE -->|OK| SAVE2[store.setProfile — fusion\nstore.setOnboardingCompleted]
    SAVE2 -->|router.replace| HOME[/(tabs)/index\nAccueil]
```

> `setProfile` **fusionne** avec le profil existant (name/address/tva par-dessus country/language/currency/taxRate déjà persistés à l'étape 1). `router.replace` : le retour arrière ne revient pas dans l'onboarding.

---

## Étapes

### Étape 1 — Configuration (`/onbording/index`)

| Champ | Type | Valeur par défaut | Obligatoire |
|---|---|---|---|
| Pays | Modal picker | profil existant, sinon — | Non |
| Langue | Modal picker | profil existant, sinon — | Non |
| Devise | Pills (TND/EUR/USD) | profil existant, sinon TND | Non |
| Taux TVA | Champ numérique | profil existant, sinon 20 | Oui (0-100, validé au Suivant) |

Les sélections sont stockées par **code** (`TN`, `fr`, `TND`), jamais par libellé affiché.

**Actions store (au « Suivant ») :** `setCountry()`, `setLanguage()`, `setCurrency()`, `setTaxRate()`

---

### Étape 2 — Profil Entreprise (`/onbording/profile`)

| Champ | Type | Obligatoire |
|---|---|---|
| Nom | TextInput | Oui (min 1 car.) |
| Adresse | TextInput multilignes | Oui (min 1 car.) |
| Numéro TVA | TextInput | Non |

**Validation :** React Hook Form + Zod (`businessEntitySchema`)

**Actions store :** `setProfile(data)` (fusion) + `setOnboardingCompleted()`, puis `router.replace('/')`

---

## Modales (locales à `onbording/index.tsx`)

### Modale Pays

Options disponibles :
- 🇹🇳 Tunisie (`TN`)
- 🇫🇷 France (`FR`)

### Modale Langue

Options disponibles :
- Français (`fr`)
- Anglais (`en`)

Comportement commun : `Modal` transparent avec fond `bg-black/50`, carte blanche arrondie, fermeture par tap sur le fond ou lien « Fermer ». La sélection écrit le **code** en état local ; la persistance n'a lieu qu'au « Suivant ».

---

## État Zustand — Onboarding

```
store.onboardingStep : 'index' | 'profile' | 'tax' | 'completed'
store.onboardingCompleted : boolean
store.profile : BusinessEntity
  ├── country : string
  ├── language : string
  ├── currency : 'TND' | 'EUR' | 'USD'
  └── taxRate : number
```

Une fois `setOnboardingCompleted()` appelé, l'auth-gate redirige automatiquement vers `/(tabs)` et l'onboarding ne sera plus affiché.
