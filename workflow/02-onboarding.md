# 02 — Flux d'Onboarding

Fichiers : `app/onbording/index.tsx`, `app/onbording/profile.tsx`, `app/(modals)/country.tsx`, `app/(modals)/language.tsx`

> Note : le dossier s'appelle `onbording` (typo intentionnel — ne pas renommer)

---

## Diagramme du Flux

```mermaid
flowchart TD
    AUTH_GATE([Auth-Gate\nonboardingCompleted = false]) --> STEP1[Étape 1\n/onbording/index\nConfiguration]

    STEP1 --> PAYS_BTN[Bouton Pays]
    STEP1 --> LANG_BTN[Bouton Langue]
    STEP1 --> CURRENCY_PILLS[Pills Devise\nTND / EUR / USD]
    STEP1 --> TVA_INPUT[Champ Taux TVA\ndéfaut: 20%]

    PAYS_BTN --> MODAL_PAYS[Modal /modals/country\nTunisie · France · Maroc]
    MODAL_PAYS -->|Sélection| SET_COUNTRY[store.setCountry]
    SET_COUNTRY --> STEP1

    LANG_BTN --> MODAL_LANG[Modal /modals/language\nFrançais · Arabe · Anglais]
    MODAL_LANG -->|Sélection| SET_LANG[store.setLanguage]
    SET_LANG --> STEP1

    CURRENCY_PILLS -->|Tap| SET_CURRENCY[Sélection visuelle\nlocale uniquement]
    TVA_INPUT -->|Saisie| SET_TVA[Valeur locale]

    STEP1 -->|Bouton Suivant| SAVE1[store.setCountry\nstore.setLanguage\nprofile.currency\nprofile.taxRate]
    SAVE1 --> STEP2[Étape 2\n/onbording/profile\nProfil Entreprise]

    STEP2 --> NAME_INPUT[Champ Nom\nrequis]
    STEP2 --> ADDR_INPUT[Champ Adresse\nrequis, multilignes]
    STEP2 --> TVA_NUM[Champ Numéro TVA\noptionnel]

    STEP2 -->|Bouton Sauvegarder| VALIDATE{Validation\nZod}
    VALIDATE -->|Erreur| FORM_ERR[Messages d'erreur\nsous chaque champ]
    VALIDATE -->|OK| SAVE2[store.setProfile\nstore.setOnboardingCompleted]
    SAVE2 --> HOME[/(tabs)/index\nAccueil]
```

---

## Étapes

### Étape 1 — Configuration (`/onbording/index`)

| Champ | Type | Valeur par défaut | Obligatoire |
|---|---|---|---|
| Pays | Modal picker | — | Non |
| Langue | Modal picker | — | Non |
| Devise | Pills (TND/EUR/USD) | TND | Non |
| Taux TVA | Champ numérique | 20 | Non |

**Actions store :** `setCountry()`, `setLanguage()`, updates sur `profile.currency` et `profile.taxRate`

---

### Étape 2 — Profil Entreprise (`/onbording/profile`)

| Champ | Type | Obligatoire |
|---|---|---|
| Nom | TextInput | Oui (min 1 car.) |
| Adresse | TextInput multilignes | Oui (min 1 car.) |
| Numéro TVA | TextInput | Non |

**Validation :** React Hook Form + Zod (`BusinessEntitySchema`)

**Actions store :** `setProfile(data)` + `setOnboardingCompleted()`

---

## Modals

### Modal Pays (`/(modals)/country`)

Options disponibles :
- 🇹🇳 Tunisie
- 🇫🇷 France
- 🇲🇦 Maroc

Comportement : ouvre avec animation fade depuis le bas, fond semi-transparent `bg-black/50`, carte blanche arrondie. Fermeture via croix (×) ou lien "Annuler".

### Modal Langue (`/(modals)/language`)

Options disponibles :
- Français
- Arabe
- Anglais

Même comportement que le modal pays.

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
