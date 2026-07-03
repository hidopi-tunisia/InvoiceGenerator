# Quality Gate — Fatourty

Analyse de la qualité du code, des défauts identifiés et des pistes d'amélioration.

> Dernière mise à jour : 2026-07-03 — correction des P0 sur la branche `fix/firebase-auth` (11 défauts résolus, voir la section « Résolus » en fin de document). Audit UX de référence : 2026-07-02 (grille ui-ux-pro-max croisée avec `workflow/`).

---

## Défauts (Bugs)

### Critiques

**1. Écrans d'auth reconstruits hors conventions (régression)**
`login.tsx` / `register.tsx` (réécrits sur `fix/firebase-auth`) : `TextInput` nus avec placeholder comme seul label, `Button` RN natif non stylé, styles inline au lieu de NativeWind, pas de RHF/Zod. Conséquences UX : pas d'état de chargement (double-submit possible), pas d'afficher/masquer le mot de passe, pas d'`autocomplete`/`textContentType` (autofill), et l'erreur affichée est le message Firebase brut en anglais technique (`e?.message`). Le flux « mot de passe oublié » n'existe plus — **bloquant review store** (item n°9 de la checklist MOBILE_GUIDELINES).

### Majeurs (UX / parcours)

**2. Filtre « En retard » mort et statuts incohérents**
`(tabs)/invoices/index.tsx` : le filtre exige `status === 'en retard'` mais rien ne positionne jamais ce statut (il devrait être dérivé de `dueDate < now`) → filtre toujours vide. La pastille de couleur teste `'impayée'` alors que le statut réel est `'en attente'` → pastille grise en liste, badge jaune en détail pour le même statut.

**3. Accessibilité absente des contrôles à icône**
Aucun `accessibilityLabel`/`accessibilityRole` dans l'app (poubelle, partage, FAB, plus-circle, croix de recherche). `onPress` posé directement sur des icônes Feather 20 px sans `hitSlop` (cible tactile < 44 pt, ex. `invoices/index.tsx`). Tab bar en icônes seules (`tabBarShowLabel: false`).

**4. Wizard sans indicateur d'étapes**
4 écrans de création de facture sans « étape X/4 » ni barre de progression.

**5. Suppressions sans garde-fou complet**
Alertes de confirmation sans `style: 'destructive'` sur le bouton « Supprimer » (liste + détail), et aucun undo après suppression.

**6. Sélecteur d'année déroutant**
Choisir l'année de filtre ouvre un `DateTimePicker` jour/mois/année complet en spinner (`invoices/index.tsx`).

**7. Incohérences visuelles**
Deux bleus primaires concurrents (`Button` en `bg-blue-700`, écrans en `indigo-500`) ; tint actif de tab bar `#052e16` (vert foncé hors palette) ; formats de montants : liste en `formatNumberWithSpaces`, détail/récap en `toFixed(2)` — unifier ; emoji ⚠️ comme icône dans l'ErrorBoundary.

### Mineurs

**8. `console.log` de débogage restants**
Présents dans : `(tabs)/contacts/index.tsx`, `app/index.tsx`, `utils/review.ts`, `(modals)/country.tsx`, `(modals)/language.tsx`. (Purgés de `_layout.tsx`, `(tabs)/index.tsx`, `success.tsx`, `pdf.ts` le 2026-07-03.)

**9. `app/(modals)/country.tsx` et `language.tsx` non connectés**
Inaccessibles depuis tout flux — dupliqués par les modales locales de `onbording/index.tsx`. Les brancher ou les supprimer.

**10. Écran `onbording/welcome.tsx` orphelin**
Déclaré dans le `Stack` de `onbording/_layout.tsx` mais aucun code ne navigue vers lui.

**11. Bugs du composant `Button.tsx`**
`${styles.primary}` interpole un objet dans `className` → `"[object Object]"` injecté dans les classes ; pas de prop `loading` pourtant décrite comme existante dans MOBILE_GUIDELINES §16 ; import `style` de `twrnc` inutilisé.

**12. Champ `siret` hors schéma dans `settings/edit.tsx`**
Un `CustomInputText name="siret"` est affiché mais `siret` n'existe pas dans `businessEntitySchema` : la valeur saisie est validée par la règle inline générique puis perdue au typage. L'ajouter au schéma ou retirer le champ.

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
| P1 | Écrans d'auth (n°1) | Reconstruire selon les conventions : RHF+Zod, composants maison, loading, erreurs Firebase mappées en français, mot de passe oublié |
| P1 | Accessibilité (n°3) | `accessibilityLabel`/`Role` + `hitSlop` ≥ 44 pt sur les icônes tactiles, labels de tab bar |
| P1 | `console.log` restants (n°8) | Purger ou conditionner à `__DEV__` |
| P2 | Statuts factures (n°2) | Dériver « en retard » de la date d'échéance, unifier les couleurs liste/détail |
| P2 | Indicateur d'étapes wizard (n°4) | « Étape X/4 » dans les headers du wizard |
| P2 | Button.tsx (n°11) | Corriger l'interpolation, ajouter la prop `loading`, retirer twrnc |
| P2 | Formats montants + palette (n°7) | Un seul format, un seul bleu primaire dans `tailwind.config.js` |
| P2 | Suppressions (n°5) | `style: 'destructive'` + undo léger |
| P2 | Champ siret (n°12) | Ajouter au schéma ou retirer |
| P3 | Sélecteur d'année (n°6) | Remplacer par une liste d'années simple |
| P3 | Deps mortes (n°16-18) | Retirer `expo-sqlite`, `react-native-flags`, `twrnc` |
| P3 | Listes (n°19) | Standardiser LegendList ou FlatList |
| P3 | Écrans orphelins (n°9-10) | Brancher ou supprimer les modales et `welcome.tsx` |
| P3 | Imports (n°15) | Alias `~/` partout |

---

## ✅ Résolus

### 2026-07-03 — correction des P0 (branche `fix/firebase-auth`)

- **Données d'onboarding perdues** — pays/langue/devise/taux persistés par **code** au « Suivant » (`setCountry/setLanguage/setCurrency/setTaxRate`), taux validé (0-100), sélections initialisées depuis le profil. `setProfile` rendu **fusionnant** (l'étape profil et `settings/edit` n'écrasent plus les sélections).
- **Imbrication `invoiceInfo`** — `addInvoiceInfo` écrit à la racine de `newInvoice` ; type `Invoice` nettoyé (+ `taxRate`/`currency`) ; migration persist v1 aplatit les factures existantes. Les dates/numéro édités à l'étape 1 sont désormais réellement affichés au récap et au PDF.
- **TVA absente des totaux** — `getTotals` calcule sous-total/TVA/total avec le taux de la facture (fallback profil).
- **Récapitulatif à lignes vides** — ligne TVA remplie, droit de timbre retiré, labels traduits en français.
- **PDF hardcodé** — TVA dynamique, devise de la facture, n° TVA du destinataire corrigé (affichait celui de l'émetteur), logo hidopi externe retiré (cassait le rendu hors ligne), virgules parasites du tableau corrigées (`.join('')`), `lang="fr"`.
- **`push` après commit** — `router.replace` : récap → succès, et onboarding profil → accueil.
- **Facture sans articles possible** — `.min(1)` sur le schéma items, ligne vierge par défaut, garde NaN sur la quantité, item fantôme « Prestation 1 » retiré de `startNewInvoice`.
- **Bouton de test « Recipients »** — supprimé de l'accueil avec ses fonctions, états morts et imports `domain/`.
- **Sentry désactivé** — init + `navigationIntegration` + `Sentry.wrap` restaurés depuis l'historique git (⚠️ à re-tester sur device : il avait été coupé pour diagnostiquer un `require(undefined)`).
- **Devise TND en dur** — helper `getInvoiceCurrency` utilisé dans items, récap, liste, détail et PDF.
- **Échec PDF silencieux** — succès : message + bouton « Réessayer » ; détail : alerte + relance via Partager.
- **Chaînes anglaises / typos** — récap en français, titres du wizard accentués, onglet « Paramètres », header « Facture générée » (ex-« Yoopiii »), « Revenir à l'accueil ».
- **Double init Vexo + fuite de clé en console** — une seule init conditionnée à `!__DEV__`, `console.log` de la clé supprimé.
- **`BusinessEntity` incomplet** — `country`/`language` ajoutés au schéma Zod.
- **Erreurs TS préexistantes dans `domain/`** — helper `toQueryParams` (`domain/query.ts`) pour les filtres numériques d'`URLSearchParams`.

### Audit précédent (déjà résolus au 2026-07-02)

- `useState` manquant et code mort dans `_layout.tsx` ; navigation dans le `catch` de `register.tsx` ; mélange `useNavigation`/expo-router ; double SDK Firebase.
