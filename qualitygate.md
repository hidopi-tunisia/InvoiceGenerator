# Quality Gate — Fatourty

Analyse de la qualité du code, des défauts identifiés et des pistes d'amélioration.

> Dernière mise à jour : 2026-07-04 — lot P3 terminé sur `fix/firebase-auth` : **tous les défauts P0/P1/P2/P3 de l'audit sont résolus** (voir « Résolus »). Restent deux sujets structurels liés au prochain chantier (intégration backend). Audit UX de référence : 2026-07-02 (grille ui-ux-pro-max croisée avec `workflow/`).

---

## Défauts ouverts

### Critiques / Majeurs / Mineurs

Aucun ✅ — l'intégralité de l'audit du 2026-07-02 est résolue.

---

## Sujets structurels (chantier backend)

**13. Couche `domain/` morte — chantier en cours**
L'app fonctionne local-first ; la sync se branche progressivement.
- **Phase 0 livrée (2026-07-04)** : helper réseau unique `domain/http.ts` (timeout 15 s, erreurs typées, retry GET, refresh token 401, X-App-Version), `mappers.ts`, ressources typées API.md, `senders.ts` legacy supprimé, warm-up `/info` au boot.
- **Phase 1 livrée (2026-07-04)** : cloisonnement du store par uid + migration v2 (cf. n°20 résolu).
- **Phase 2 livrée (2026-07-04)** : sync du profil — `store/profile-sync.ts` : au boot connecté, `GET /profile` (auto-création + trial serveur) ; store vierge + profil serveur renseigné (utilisateur venu du front Angular) → pré-remplissage local et onboarding sauté si `isProfileComplete` ; sinon push local (LWW simple, retenté via flag `dirty`). Push explicite après sauvegarde (onboarding, réglages, taxes/devise à la sortie d'écran). Carte Abonnement dans Réglages (`GET /subscription/usage`, best-effort).
- **Phase 3 livrée (2026-07-04)** : sync des contacts — `store/contacts-sync.ts` : push des `dirty` (POST/PATCH, adoption par email sur 409, recréation sur 404), pull paginé complet avec merge (remoteId puis email, le `dirty` local gagne), suppression distante différée à la fermeture du snackbar (l'undo n'envoie jamais de DELETE). `addContact`/`updateContact` posent `dirty` par défaut ; `updateContact` fusionne (préserve `remoteId`). Ajout produit : FAB « + » sur l'onglet Contacts → nouvelle route `/contacts/new` hors wizard.
- **Restent** : phase 4 (factures), 5 (moteur de sync + pull-to-refresh + file de mutations), 6 (upsell 403 → plans + Stripe Checkout).

~~**20. Store local non cloisonné par utilisateur**~~ ✅ **Résolu le 2026-07-04 (phase 1)** — clé de persistance par compte `facture-store-{uid}` (`store/user-scope.ts`) : bascule + réinitialisation mémoire + réhydratation **avant** la redirection de l'auth-gate ; les données héritées de l'ancienne clé unique sont adoptées par le premier compte connecté après la mise à jour (backup `facture-store-legacy-backup` conservé quelques versions). Migration store **v2** : métadonnées de sync (`remoteId`/`syncedAt`/`dirty`) — l'existant est marqué `dirty` pour la première synchronisation.

---

## Points forts

- **Auth gate centralisé** : redirection unique dans `app/_layout.tsx` via `onAuthStateChanged`
- **Justesse métier** : TVA calculée avec le taux **figé sur la facture** (fallback profil), devise du profil propagée aux écrans et au PDF
- **Monitoring** : Sentry réactivé (init + navigation integration + `Sentry.wrap`)
- **Local-first réel** : le parcours complet (facture → PDF → partage) fonctionne hors ligne
- **Wizard résumable** avec routing conditionnel intelligent ; retour arrière sûr (`replace` après commit)
- **Validation Zod + RHF** sur les formulaires du wizard et du profil (⚠️ plus sur l'auth — voir n°1)
- **Persistance fiable** : Zustand + AsyncStorage, `migrate()` versionnée (v1 : aplatissement `invoiceInfo`)
- **UX listes** : virtualisation + transitions Reanimated, empty states, confirmation avant suppression
- **Échec PDF géré** : message français + réessai (écran succès et détail)
- **Numérotation automatique** séquentielle par mois ; avis store throttlé ; Error Boundary global

---

## Prochains chantiers

| Ordre | Chantier | Contenu |
|-------|----------|---------|
| 1 | **Intégration backend** (n°13) | Brancher `domain/` sur l'UI selon API.md : timeouts AbortController (§7 guidelines), helper de parsing `{ success, data, message, timestamp }`, stratégie de sync (métadonnées `syncedAt`/`dirty` via `migrate()`), cloisonnement du store par `uid` (n°20) |
| 2 | **Upgrade SDK 52 → 56** | Après le backend (décision 2026-07-03) — bloquant Play Store (target API level), procédure en annexe de MOBILE_GUIDELINES.md |

---

## ✅ Résolus

### 2026-07-04 — lot P3 (solde de l'audit)

- **Écrans orphelins (n°9-10)** — `app/(modals)/country.tsx`, `language.tsx` et `onbording/welcome.tsx` supprimés (docs FILES/PROJECT/workflow mises à jour).
- **Dépendances mortes (n°16-19)** — `expo-sqlite` (+ plugin app.json), `react-native-flags`, `twrnc`, `@legendapp/list` et `hermes-engine` désinstallés ; listes standardisées sur `Animated.FlatList` (Reanimated). ⚠️ Retrait d'un module natif (expo-sqlite) : rebuild des dev clients nécessaire au prochain build.
- **`InvoiceStatus` (n°14)** — constante anglaise retirée de `constants/` (note ajoutée : le mapping des statuts backend se fera dans `domain/` lors de la sync).
- **Imports (n°15)** — plus aucun import relatif profond dans `app/` (alias `~/` partout ; exception documentée `domain/authorization.ts` conservée).
- **Balayage palette (n°7, solde)** — plus aucun `indigo-*`/`blue-*` d'action en dur dans les écrans : `bg-primary`, `text-primary`, teintes `primary/5`-`primary/10` (seule la palette décorative des avatars garde des couleurs variées).
- **Sélecteur d'année (n°6)** — modale liste simple (années des factures + année courante), remplace le spinner date complet.
- **Undo de suppression (n°5, solde)** — composant `Snackbar` léger (auto-dismiss 5 s, action unique, `accessibilityLiveRegion`) + action store `addInvoice` de ré-insertion ; branché sur les listes factures et contacts.

### 2026-07-03 — P2 (statuts, wizard, palette/formats, siret)

- **Statut « en retard » dérivé (n°2)** — `getDisplayStatus` dans `utils/invoice.ts` : dérivé de `invoiceDueDate < maintenant` à l'affichage (jamais persisté) ; filtres de la liste branchés dessus (le filtre « En retard » fonctionne enfin) ; couleurs unifiées liste/détail via `getStatusColor` partagé.
- **Indicateur d'étapes du wizard (n°4)** — headers « Facture · Étape 1/4 » → « Récapitulatif · Étape 4/4 ».
- **Palette et formats (n°7, partiel)** — token `colors.primary` (#4f46e5) dans `tailwind.config.js`, appliqué au `Button` (fini le `bg-blue-700`) et au tint de la tab bar (fini le vert `#052e16`) ; `formatAmount` unique (fr-FR, 2 décimales) utilisé par liste, détail, récap, items et PDF ; emoji ⚠️ de l'ErrorBoundary remplacé par une icône vectorielle. Reste : balayage des `indigo-*` en dur (reclassé P3).
- **Champ `siret` (n°12)** — ajouté à `businessEntitySchema` (optionnel), la saisie de `settings/edit` n'est plus perdue au typage.
- **Suppressions (n°5, partiel)** — `style: 'destructive'` posé partout (fait avec le lot a11y) ; l'undo restant est reclassé P3 (nécessite une infra toast).

### 2026-07-03 — P1 accessibilité (n°3) et console.log (n°8)

- **Accessibilité des contrôles à icône** — `accessibilityRole`/`accessibilityLabel` + `hitSlop` sur : poubelle et plus-circle (liste factures), partage/poubelle (détail), bouton facture par contact et croix de recherche (contacts), FAB et croix (wizard contact), CTA « Créer un contact ». Tab bar avec labels visibles (`tabBarShowLabel: false` retiré). Alertes de suppression passées en `style: 'destructive'` (avance le n°5). Reste hors périmètre : audit VoiceOver/TalkBack complet écran par écran (post-MVP, MOBILE_GUIDELINES §25).
- **Zéro `console.log` dans les sources** — purge finale de `(tabs)/contacts`, `utils/review.ts` (abandon silencieux commenté), modales orphelines. Vérifié par grep sur app/, store/, components/, hooks/, domain/.

### 2026-07-03 — déconnexion réelle (découvert en test simulateur)

- **Bouton « Se déconnecter » factice** — `settings/index.tsx` ne faisait aucun `auth.signOut()` : il naviguait manuellement vers `/onbording` (stub « Ajoutez ici votre logique de déconnexion » jamais terminé), laissant la session Firebase active. Corrigé : confirmation (`Alert` destructive — l'app étant offline-first, une déconnexion accidentelle hors ligne bloque l'utilisateur), abandon du brouillon, `signOut()`, et **aucune navigation manuelle** (l'auth-gate redirige vers login). Révèle la limitation n°20 (store non cloisonné par compte).

### 2026-07-03 — refonte des écrans d'auth (P1 n°1) + Button (n°11)

- **Écrans d'auth reconstruits selon les conventions** — `login.tsx`, `register.tsx` et nouveau `forgot-password.tsx` : RHF + Zod (`app/schema/auth.ts`), composants maison (`CustomInputText` + nouveau `PasswordInputText` avec toggle afficher/masquer accessible), NativeWind, état `loading` anti double-submit, autofill (`autoComplete`/`textContentType`), erreurs Firebase mappées en français (`app/utils/auth-errors.ts`, messages non-énumérants). Le flux « mot de passe oublié » (`sendPasswordResetEmail`) lève le bloquant store n°9 — avec réponse générique anti-énumération de comptes.
- **`Button.tsx` corrigé** — interpolation `[object Object]` supprimée, prop `loading` (spinner + disabled + `accessibilityState`), plus aucune trace de twrnc.

### 2026-07-03 — correction des P0 (branche `fix/firebase-auth`)

- **Données d'onboarding perdues** — pays/langue/devise/taux persistés par **code** au « Suivant » (`setCountry/setLanguage/setCurrency/setTaxRate`), taux validé (0-100), sélections initialisées depuis le profil. `setProfile` rendu **fusionnant** (l'étape profil et `settings/edit` n'écrasent plus les sélections).
- **Imbrication `invoiceInfo`** — `addInvoiceInfo` écrit à la racine de `newInvoice` ; type `Invoice` nettoyé (+ `taxRate`/`currency`) ; migration persist v1 aplatit les factures existantes. Les dates/numéro édités à l'étape 1 sont désormais réellement affichés au récap et au PDF.
- **TVA absente des totaux** — `getTotals` calcule sous-total/TVA/total avec le taux de la facture (fallback profil).
- **Récapitulatif à lignes vides** — ligne TVA remplie, droit de timbre retiré, labels traduits en français.
- **PDF hardcodé** — TVA dynamique, devise de la facture, n° TVA du destinataire corrigé (affichait celui de l'émetteur), logo hidopi externe retiré (cassait le rendu hors ligne), virgules parasites du tableau corrigées (`.join('')`), `lang="fr"`.
- **`push` après commit** — `router.replace` : récap → succès, et onboarding profil → accueil.
- **Facture sans articles possible** — `.min(1)` sur le schéma items, ligne vierge par défaut, garde NaN sur la quantité, item fantôme « Prestation 1 » retiré de `startNewInvoice`.
- **Bouton de test « Recipients »** — supprimé de l'accueil avec ses fonctions, états morts et imports `domain/`.
- **Sentry désactivé** — init + `navigationIntegration` + `Sentry.wrap` restaurés depuis l'historique git. **Cause racine du `require(undefined)` identifiée le 2026-07-03** : `@sentry/react-native` 8.16 incompatible avec le SDK 52 (version attendue ~6.10) — désactiver Sentry masquait le symptôme sans traiter la cause. Corrigé par `npx expo install --fix` (Sentry ~6.10, RN 0.76.9, expo-router ~4.0.22, lottie 7.1.0…) ; nécessite un rebuild du dev client.
- **Devise TND en dur** — helper `getInvoiceCurrency` utilisé dans items, récap, liste, détail et PDF.
- **Échec PDF silencieux** — succès : message + bouton « Réessayer » ; détail : alerte + relance via Partager.
- **Chaînes anglaises / typos** — récap en français, titres du wizard accentués, onglet « Paramètres », header « Facture générée » (ex-« Yoopiii »), « Revenir à l'accueil ».
- **Double init Vexo + fuite de clé en console** — une seule init conditionnée à `!__DEV__`, `console.log` de la clé supprimé.
- **`BusinessEntity` incomplet** — `country`/`language` ajoutés au schéma Zod.
- **Erreurs TS préexistantes dans `domain/`** — helper `toQueryParams` (`domain/query.ts`) pour les filtres numériques d'`URLSearchParams`.

### Audit précédent (déjà résolus au 2026-07-02)

- `useState` manquant et code mort dans `_layout.tsx` ; navigation dans le `catch` de `register.tsx` ; mélange `useNavigation`/expo-router ; double SDK Firebase.
