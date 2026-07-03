# Quality Gate — Fatourty

Analyse de la qualité du code, des défauts identifiés et des pistes d'amélioration.

> Dernière mise à jour : 2026-07-03 — correction des P0 sur la branche `fix/firebase-auth` (11 défauts résolus, voir la section « Résolus » en fin de document). Audit UX de référence : 2026-07-02 (grille ui-ux-pro-max croisée avec `workflow/`).

---

## Défauts (Bugs)

### Critiques

Aucun défaut critique ouvert ✅ (le n°1 — écrans d'auth hors conventions — a été résolu le 2026-07-03, voir « Résolus »).

### Majeurs (UX / parcours)

**5. Pas d'undo après suppression**
La confirmation destructive est en place (liste, détail, contacts) ; il manque un undo léger (« Annuler » en toast/snackbar) pour les suppressions accidentelles. Nécessite une infra de toast inexistante — post-MVP raisonnable.

**6. Sélecteur d'année déroutant**
Choisir l'année de filtre ouvre un `DateTimePicker` jour/mois/année complet en spinner (`invoices/index.tsx`).

**7. Balayage palette incomplet**
Le token `colors.primary` (#4f46e5) est en place (`tailwind.config.js`) et appliqué au `Button` et à la tab bar, mais les écrans utilisent encore des `indigo-500`/`indigo-600` en dur — balayage `bg-primary`/`text-primary` à finir (préalable dark mode, MOBILE_GUIDELINES §23).

### Mineurs

**9. `app/(modals)/country.tsx` et `language.tsx` non connectés**
Inaccessibles depuis tout flux — dupliqués par les modales locales de `onbording/index.tsx`. Les brancher ou les supprimer.

**10. Écran `onbording/welcome.tsx` orphelin**
Déclaré dans le `Stack` de `onbording/_layout.tsx` mais aucun code ne navigue vers lui.

**20. Store local non cloisonné par utilisateur**
Le store Zustand (`facture-store`) n'est pas rattaché à l'UID Firebase : après une vraie déconnexion, un **autre** compte qui se connecte sur le même appareil voit les factures/contacts/profil du compte précédent. Assumé pour le MVP (appareil mono-utilisateur), mais à cloisonner par `uid` au moment du chantier sync — décision à documenter.

---

## Problèmes de qualité de code

### Architecture

**13. Couche `domain/` morte**
`domain/invoices.ts`, `recipients.ts`, `senders.ts`, `profile.ts` sont implémentés mais non branchés à l'UI. L'app fonctionne entièrement sur le store Zustand local. Décision MVP assumée (MOBILE_GUIDELINES §7) — ne pas brancher partiellement.

**14. `InvoiceStatus` jamais utilisé**
`constants/index.ts` définit des valeurs anglaises (`PAID`, `PENDING`…) ; le store et les composants utilisent les chaînes françaises. La constante est inutile.

**15. Imports incohérents**
Mélange d'imports relatifs profonds (`'../../../components/Button'`) et d'alias `~/` dans les mêmes fichiers.

### Dépendances

**16. `expo-sqlite` installé mais non utilisé** (package.json + plugin app.json, aucun import).

**17. `react-native-flags` installé mais inutilisé.**

**18. `twrnc` et NativeWind coexistent** — `twrnc` à retirer au profit de NativeWind seul.

**19. `@legendapp/list` et `Animated.FlatList` en alternance**
`LegendList` dans `(tabs)/contacts`, `Animated.FlatList` dans les factures et le contact du wizard. Standardiser.

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

## Améliorations prioritaires

| Priorité | Sujet | Action |
|----------|-------|--------|
| P3 | Balayage palette (n°7) | Remplacer les `indigo-*` en dur par `primary` dans les écrans |
| P3 | Undo suppression (n°5) | Snackbar « Annuler » (nécessite une infra toast) |
| P3 | Sélecteur d'année (n°6) | Remplacer par une liste d'années simple |
| P3 | Deps mortes (n°16-18) | Retirer `expo-sqlite`, `react-native-flags`, `twrnc` |
| P3 | Listes (n°19) | Standardiser LegendList ou FlatList |
| P3 | Écrans orphelins (n°9-10) | Brancher ou supprimer les modales et `welcome.tsx` |
| P3 | Imports (n°15) | Alias `~/` partout |

---

## ✅ Résolus

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
