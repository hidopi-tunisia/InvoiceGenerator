# Myfakto — Vue Globale de l'Application

Application de facturation mobile (React Native / Expo) ciblant les utilisateurs francophones (Tunisie / France).

---

## Flux de Navigation Global

```mermaid
flowchart TD
    START([Lancement de l'app]) --> AUTHCHECK{Firebase\nonAuthStateChanged}

    AUTHCHECK -->|Non authentifié| AUTH_LOGIN[/\(auth\)/login]
    AUTHCHECK -->|Authentifié\nsans onboarding| ONBOARD[/onbording/index]
    AUTHCHECK -->|Authentifié\n+ onboarding complet| TABS[/\(tabs\)/index]

    %% Auth
    AUTH_LOGIN -->|Créer un compte| AUTH_REGISTER[/\(auth\)/register]
    AUTH_REGISTER -->|Déjà un compte| AUTH_LOGIN
    AUTH_LOGIN -->|Connexion réussie| AUTHCHECK
    AUTH_REGISTER -->|Inscription réussie| AUTHCHECK

    %% Onboarding
    ONBOARD -->|Suivant| ONBOARD_PROFILE[/onbording/profile]
    ONBOARD_PROFILE -->|Sauvegarder| TABS

    %% Tabs principales
    TABS --> TAB_HOME[Accueil]
    TABS --> TAB_INVOICES[Factures]
    TABS --> TAB_CONTACTS[Contacts]
    TABS --> TAB_SETTINGS[Paramètres]

    %% Accueil
    TAB_HOME -->|Nouvelle Facture| GEN_START[/invoices/generate/index]
    TAB_HOME -->|Reprendre| GEN_START

    %% Wizard facture
    GEN_START -->|contacts exist| GEN_CONTACT[/invoices/generate/contact]
    GEN_START -->|pas de contacts| GEN_NEWCONTACT[/invoices/generate/new-contact]
    GEN_START -->|recipient déjà choisi| GEN_ITEMS[/invoices/generate/items]
    GEN_CONTACT -->|Sélectionner contact| GEN_ITEMS
    GEN_CONTACT -->|Nouveau contact| GEN_NEWCONTACT
    GEN_NEWCONTACT -->|Suivant| GEN_ITEMS
    GEN_ITEMS -->|Suivant| GEN_SUMMARY[/invoices/generate/summary]
    GEN_SUMMARY -->|Confirmer| GEN_SUCCESS[/invoices/:id/success]
    GEN_SUCCESS -->|Retour accueil| TABS

    %% Gestion factures
    TAB_INVOICES -->|Voir facture| INV_DETAIL[/invoices/:id/detail]
    INV_DETAIL -->|Partager PDF| SHARE([Partage natif])
    INV_DETAIL -->|Marquer payée| INV_DETAIL
    INV_DETAIL -->|Supprimer| TAB_INVOICES

    %% Contacts
    TAB_CONTACTS -->|Modifier| CONT_EDIT[/contacts/:id/edit]
    TAB_CONTACTS -->|Créer facture| GEN_START
    CONT_EDIT -->|Sauvegarder| TAB_CONTACTS

    %% Paramètres
    TAB_SETTINGS -->|Modifier profil| SET_EDIT[/settings/edit]
    TAB_SETTINGS -->|Taxes & Devise| SET_TAX[/settings/tax-currency]
    TAB_SETTINGS -->|Déconnexion| AUTH_LOGIN
    SET_EDIT -->|Sauvegarder| TAB_SETTINGS
```

---

## Tableau des Écrans

| Route | Écran | Rôle |
|---|---|---|
| `/(auth)/login` | Connexion | Email/password + Google Sign-In |
| `/(auth)/register` | Inscription | Création de compte Firebase |
| `/onbording/index` | Configuration | Pays, langue, devise, taux TVA |
| `/onbording/profile` | Profil | Nom, adresse, numéro TVA de l'entreprise |
| `/(tabs)/index` | Accueil | Dashboard + lancer création facture |
| `/(tabs)/invoices` | Liste Factures | Filtres par statut et année |
| `/(tabs)/invoices/[id]/detail` | Détail Facture | Voir, partager, marquer payée, supprimer |
| `/(tabs)/contacts` | Liste Contacts | Recherche + actions rapides |
| `/(tabs)/contacts/[id]/edit` | Modifier Contact | Formulaire édition contact |
| `/(tabs)/settings` | Paramètres | Menu principal des réglages |
| `/(tabs)/settings/edit` | Modifier Profil | Édition profil entreprise |
| `/(tabs)/settings/tax-currency` | Taxes & Devise | Taux TVA + devise (TND/EUR/USD) |
| `/invoices/generate/index` | Étape 1 — Infos | Numéro, date, date d'échéance |
| `/invoices/generate/contact` | Étape 2A — Contact | Sélection contact existant |
| `/invoices/generate/new-contact` | Étape 2B — Nouveau Contact | Création nouveau destinataire |
| `/invoices/generate/items` | Étape 3 — Désignations | Lignes de facturation dynamiques |
| `/invoices/generate/summary` | Étape 4 — Récap | Revue + confirmation |
| `/invoices/[id]/success` | Succès | Animation + génération PDF + partage |
| `/(modals)/country` | Modal Pays | Sélecteur pays (TN, FR, MA) |
| `/(modals)/language` | Modal Langue | Sélecteur langue (FR, AR, EN) |

---

## Groupes de Flux

| Fichier | Flux |
|---|---|
| [01-auth.md](01-auth.md) | Authentification (login, register, Google) |
| [02-onboarding.md](02-onboarding.md) | Premier lancement (config + profil) |
| [03-invoice-wizard.md](03-invoice-wizard.md) | Création de facture (5 étapes) |
| [04-invoice-management.md](04-invoice-management.md) | Gestion des factures |
| [05-contacts.md](05-contacts.md) | Gestion des contacts |
| [06-settings.md](06-settings.md) | Paramètres & Profil |
| [07-architecture.md](07-architecture.md) | Architecture technique |

---

## Captures d'Écran

> Dossier prévu : `workflow/screenshots/`
>
> Pour ajouter des captures, naviguez vers chaque écran dans le simulateur iOS/Android et utilisez :
> ```bash
> # iOS Simulator
> xcrun simctl io booted screenshot workflow/screenshots/<nom-ecran>.png
>
> # Android Emulator
> adb exec-out screencap -p > workflow/screenshots/<nom-ecran>.png
> ```
> Puis référencez-les dans chaque fichier `.md` : `![Login](screenshots/login.png)`
