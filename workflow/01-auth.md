# 01 — Flux d'Authentification

Fichiers : `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `hooks/useGoogleSignIn.ts`, `app/config.ts`

---

## Diagramme du Flux

```mermaid
flowchart TD
    APP([Lancement app]) --> AUTH_CHECK{onAuthStateChanged\nFirebase}

    AUTH_CHECK -->|user = null| LOGIN[Écran Login]
    AUTH_CHECK -->|user existe| ONBOARD_CHECK{onboardingCompleted?}
    ONBOARD_CHECK -->|false| ONBOARD[/onbording]
    ONBOARD_CHECK -->|true| HOME[/tabs]

    LOGIN --> EMAIL_FORM[Formulaire email + mot de passe]
    LOGIN --> GOOGLE_BTN[Bouton Google]
    LOGIN --> REGISTER_LINK[Lien → Créer un compte]

    EMAIL_FORM -->|handleLogin| SIGNIN_CALL[signInWithEmailAndPassword\nFirebase]
    SIGNIN_CALL -->|succès| AUTH_CHECK
    SIGNIN_CALL -->|erreur| ERROR_MSG[Affiche message d'erreur\nen rouge]

    GOOGLE_BTN -->|useGoogleSignIn| GOOGLE_FLOW[Flux Google OAuth]
    GOOGLE_FLOW --> GOOGLE_PROMPT[promptAsync — WebBrowser OAuth]
    GOOGLE_PROMPT -->|code reçu| EXCHANGE[Échange code → id_token\nGoogle]
    EXCHANGE --> FIREBASE_CRED[GoogleAuthProvider.credential\nid_token]
    FIREBASE_CRED --> SIGNIN_GOOGLE[signInWithCredential\nFirebase]
    SIGNIN_GOOGLE -->|succès| AUTH_CHECK
    SIGNIN_GOOGLE -->|erreur| ERROR_MSG

    REGISTER_LINK --> REGISTER[Écran Register]
    REGISTER --> REG_FORM[Formulaire email + mot de passe]
    REGISTER --> REG_GOOGLE[Bouton Google]
    REGISTER --> LOGIN_LINK[Lien → Se connecter]

    REG_FORM -->|handleRegister| CREATE_CALL[createUserWithEmailAndPassword\nFirebase]
    CREATE_CALL -->|succès| AUTH_CHECK
    CREATE_CALL -->|erreur| ERROR_MSG

    REG_GOOGLE -->|useGoogleSignIn| GOOGLE_FLOW
    LOGIN_LINK --> LOGIN
```

---

## Écrans

### Login — `/(auth)/login`

| Élément | Détail |
|---|---|
| Titre | "Connexion" |
| Champ 1 | Email (autoCapitalize: none, keyboardType: email-address) |
| Champ 2 | Mot de passe (secureTextEntry) |
| Bouton 1 | "Se connecter" → `signInWithEmailAndPassword` |
| Bouton 2 | "Continuer avec Google" → `signInWithGoogle()` (désactivé si non configuré) |
| Bouton 3 | "Créer un compte" → `router.push('/(auth)/register')` |
| Erreur | Texte rouge sous le titre si échec |

### Register — `/(auth)/register`

| Élément | Détail |
|---|---|
| Titre | "Créer un compte" |
| Champ 1 | Email (autoCapitalize: none, keyboardType: email-address) |
| Champ 2 | Mot de passe (secureTextEntry) |
| Bouton 1 | "S'inscrire" → `createUserWithEmailAndPassword` |
| Bouton 2 | "S'inscrire avec Google" → `signInWithGoogle()` |
| Bouton 3 | "Déjà un compte ? Se connecter" → `router.push('/(auth)/login')` |
| Erreur | Texte rouge sous le titre si échec |

---

## Hook `useGoogleSignIn`

Fichier : `hooks/useGoogleSignIn.ts`

```
Variables d'environnement requises (.env) :
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
```

**État retourné :**
- `signInWithGoogle()` — déclenche le flux OAuth
- `signingIn: boolean` — true pendant le chargement
- `ready: boolean` — true si les client IDs sont configurés (bouton activé)

---

## Auth-Gate (Redirection automatique)

Fichier : `app/_layout.tsx`

```mermaid
stateDiagram-v2
    [*] --> Chargement : App lancée
    Chargement --> NonAuthentifié : onAuthStateChanged → null
    Chargement --> AuthentifiéSansOnboarding : user existe + onboardingCompleted = false
    Chargement --> AuthentifiéAvecOnboarding : user existe + onboardingCompleted = true

    NonAuthentifié --> [*] : router.replace('/(auth)/login')
    AuthentifiéSansOnboarding --> [*] : router.replace('/onbording')
    AuthentifiéAvecOnboarding --> [*] : router.replace('/(tabs)')
```

La redirection est **réactive** : tout changement de `user` ou `onboardingCompleted` déclenche une mise à jour automatique.
