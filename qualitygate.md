# Quality Gate — Fatourty

Analyse de la qualité du code, des défauts identifiés et des pistes d'amélioration.

---

## Défauts (Bugs)

### Critiques

**1. `useState` manquant dans `app/_layout.tsx`**
`useState` est utilisé (`const [user, setUser] = useState(null)`) mais n'est pas importé depuis `'react'`. Seul `useEffect` est importé. L'app ne compile pas en mode strict TypeScript.

**2. Code mort inaccessible dans `app/_layout.tsx`**
Le second bloc `return <Stack>` (lignes 82–96) est syntaxiquement présent après un `if/else if/else` complet. Il ne peut jamais être atteint et génère un avertissement TypeScript/ESLint.

**3. Bug logique dans `app/(auth)/register.tsx`**
`navigation.navigate('(tabs)')` est appelé dans le bloc `catch`, donc la navigation vers les onglets se déclenche uniquement en cas d'erreur d'inscription. Une inscription réussie ne navigue nulle part.

**4. Données d'onboarding perdues**
`app/onbording/index.tsx` collecte pays, langue, devise et taux de TVA dans un état local React, mais ne les sauvegarde jamais dans le store Zustand avant de naviguer vers `/onbording/profile`. Ces choix sont silencieusement ignorés.

**5. TVA et Droit de Timbre hardcodés dans le PDF**
`app/utils/pdf.ts` affiche `TVA (20%) : 40.00 TND` et `Droit de Timbre : 0.99 TND` en dur, quel que soit le contenu réel de la facture. Le taux de TVA du profil n'est pas utilisé.

**6. La taxe n'est pas calculée dans les totaux**
Dans `app/utils/invoice.ts`, `getTotal` retourne simplement `subtotal` sans appliquer aucun taux de TVA. Le champ `taxRate` du store existe mais n'est jamais intégré au calcul.

**7. Bouton de test exposé en production**
`app/(tabs)/index.tsx` affiche un bouton `<Button variant="link" title="Recipients" />` qui appelle `handleOnPress`, une fonction de test avec des données en dur (`name: 'Morchka'`, `address: 'Tunis'`). Ce bouton est visible par les utilisateurs finaux.

**8. Récapitulatif avec lignes vides**
`app/invoices/generate/summary.tsx` affiche les lignes « TVA (20%) » et « Droit de Timbre » sans valeurs — les montants sont commentés et jamais calculés.

### Mineurs

**9. Double initialisation de Vexo dans `_layout.tsx`**
`vexo(vexoApiKey)` est appelé deux fois : une fois sans condition et une fois dans un `if (!__DEV__)`. En développement, Vexo est quand même initialisé.

**10. `console.log` de débogage en code de production**
Présents dans : `_layout.tsx` (affiche la clé API Vexo), `app/index.tsx` (affiche `onboardingCompleted`), `app/(tabs)/index.tsx`, `app/(tabs)/invoices/[id]/detail.tsx`, `store/index.ts`. Ces logs exposent des données sensibles et polluent la console.

**11. `app/(modals)/country.tsx` et `language.tsx` non connectés**
Ces deux écrans modaux existent mais ne sont référencés dans aucun `Stack.Screen` du layout racine, et aucun code ne navigue vers eux. Ils sont inaccessibles.

---

## Problèmes de qualité de code

### Architecture

**12. Double SDK Firebase**
`app/config.ts` utilise le SDK JS web (`firebase/auth`, `firebase/app`), tandis que `@react-native-firebase/app` et `@react-native-firebase/auth` sont aussi installés dans `package.json`. Ces deux SDKs coexistent sans raison, ce qui alourdit le bundle.

**13. Couche `domain/` morte**
`domain/invoices.ts`, `domain/recipients.ts`, `domain/senders.ts`, `domain/profile.ts` sont implémentés mais non utilisés dans l'UI. L'app fonctionne entièrement sur le store Zustand local. Cette couche donne l'impression d'être en cours d'intégration mais crée une confusion sur l'architecture réelle.

**14. Mélange de stratégies de navigation**
Les écrans d'auth (`login.tsx`, `register.tsx`) utilisent `useNavigation` de `@react-navigation/native`, tandis que tout le reste de l'app utilise `router` d'`expo-router`. Ces deux APIs ne doivent pas être mélangées.

**15. Imbrication redondante dans le type `Invoice`**
`Invoice` étend `InvoiceInfo` (donc hérite de `invoiceNumber`, `invoiceDate`, `invoiceDueDate`) ET contient un champ `invoiceInfo: InvoiceInfo`. Les mêmes données sont potentiellement stockées deux fois, ce qui explique le `invoice.invoiceInfo?.invoiceNumber` dans le PDF au lieu de `invoice.invoiceNumber`.

**16. `BusinessEntity` incomplet dans le schéma Zod**
Le schéma `businessEntitySchema` dans `app/schema/invoice.ts` ne déclare pas les champs `country` et `language`, pourtant utilisés dans l'objet `profile` du store. Le type TypeScript inféré est donc plus étroit que l'objet réel.

**17. `InvoiceStatus` jamais utilisé**
`constants/index.ts` définit `InvoiceStatus` avec des valeurs en anglais (`PAID`, `PENDING`…), mais le store et tous les composants utilisent directement les chaînes françaises `'payée'`, `'en attente'`, `'en retard'`. La constante est inutile.

**18. Imports incohérents**
Certains fichiers mélangent les imports relatifs (`'../../../components/Button'`) et les imports avec alias (`~/components/Button`) dans le même fichier. La convention du projet est d'utiliser `~/` partout.

### Dépendances

**19. `expo-sqlite` installé mais non utilisé**
La dépendance est dans `package.json` et le plugin est dans `app.json`, mais aucun fichier source ne l'importe.

**20. `react-native-flags` installé mais inutilisé**
Présent dans `package.json`, introuvable dans les sources.

**21. `twrnc` et NativeWind coexistent**
`Button.tsx` utilise `style` depuis `twrnc` tout en ayant des `className` NativeWind. Les deux librairies font la même chose. `twrnc` devrait être retiré au profit de NativeWind seul.

**22. `@legendapp/list` et `Animated.FlatList` utilisés en alternance**
`LegendList` est utilisé dans les contacts, `Animated.FlatList` dans les factures. Une seule approche devrait être standardisée.

---

## Points forts

- **Validation robuste** : Zod + React Hook Form sur tous les formulaires
- **Persistance fiable** : Zustand avec AsyncStorage et fonction `migrate` pour la compatibilité ascendante
- **Monitoring en production** : Sentry correctement configuré (navigation, frames lentes, DSN propre)
- **UX animations** : transitions de liste fluides via `react-native-reanimated`
- **Context menu natif** : `react-native-context-menu-view` pour les actions sur les contacts (feeling iOS)
- **Numérotation automatique** : génération de numéros de facture séquentiels par mois
- **Avis throttlé** : demande d'avis App Store limitée à une fois tous les 3 jours
- **Error Boundary** : écran d'erreur global avec bouton de réessai

---

## Améliorations prioritaires

| Priorité | Sujet | Action |
|----------|-------|--------|
| P0 | Calcul TVA absent | Implémenter `taxRate` dans `getTotals` et le propager au PDF |
| P0 | Bug register navigation | Déplacer `navigate` hors du `catch` |
| P0 | Onboarding ne sauvegarde pas | Appeler `setCountry`, `setLanguage`, `setTaxRate` avant de naviguer |
| P0 | `useState` manquant dans `_layout` | Ajouter `useState` à l'import React |
| P1 | Bouton test en production | Supprimer `handleOnPress`, `retrieve` et le bouton « Recipients » de `home` |
| P1 | `console.log` en production | Nettoyer ou conditionner à `__DEV__` |
| P1 | PDF hardcodé | Utiliser le `taxRate` du profil et calculer dynamiquement TVA et droit de timbre |
| P2 | Retirer un SDK Firebase | Choisir entre `firebase` (JS) et `@react-native-firebase` (natif) |
| P2 | Brancher la couche `domain/` | Ou la supprimer si le backend n'est pas prioritaire |
| P2 | Unifier les imports | Remplacer tous les imports relatifs profonds par `~/` |
| P3 | Supprimer `expo-sqlite` et `react-native-flags` | Alléger le bundle |
| P3 | Supprimer `twrnc` | Utiliser NativeWind seul |
| P3 | Standardiser les listes | Choisir `Animated.FlatList` ou `LegendList` |
