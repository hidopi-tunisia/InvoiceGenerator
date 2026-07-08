# Rectifications UI/UX — détail contact, wizard 3/4, français

**Date** : 2026-07-08
**Statut** : design validé, prêt pour plan
**Contexte** : lot de finitions UI/UX avant le chantier RevenueCat. Design/implémentation avec le skill `ui-ux-pro-max`.

## Portée

Trois chantiers indépendants :
1. **Page détail contact** (nouvelle route lecture, avec actions + historique factures).
2. **Refonte du wizard 3/4** (`items.tsx`) + **total général temps réel** (HT/TVA/TTC).
3. **App 100 % français** (balayage des chaînes résiduelles anglaises).

Style existant à respecter : NativeWind, cartes `bg-white rounded-xl shadow-sm`, primary
`#4f46e5` (`bg-primary`/`text-primary`), fonds `gray-50`, `formatDate` (fr-FR),
`formatAmount` + devise via `getInvoiceCurrency`.

---

## 1. Page détail contact

### Route & navigation
- **Nouvelle route** `app/(tabs)/contacts/[id]/index.tsx` (lecture).
- La liste Contacts (`app/(tabs)/contacts/index.tsx`) fait `router.push('/contacts/[id]')`
  (détail) au lieu de `/contacts/[id]/edit`.
- Enregistrer l'écran dans `app/(tabs)/contacts/_layout.tsx` avec titre « Contact ».

### Contenu (lecture)
Avatar initiales (couleur dérivée du nom, comme la liste), nom (xl gras), puis les
champs présents seulement : adresse, email (tap → `Linking` `mailto:`), téléphone
(tap → `tel:`), infos fiscales (TVA / SIRET). Indicateur ⚠ `syncError` repris de la liste
si présent.

### Actions
- **Modifier** (header, droite) → `/contacts/[id]/edit` (écran existant inchangé).
- **+ Nouvelle facture** (bouton primaire) → `startNewInvoice()` puis
  `addRecipientInfo(contact)`, puis `router.push('/invoices/generate/items')` (le
  destinataire étant déjà connu, on saute l'étape 2). Si un souci de pré-remplissage
  apparaît à l'implémentation, il sera traité comme un correctif, pas comme un
  changement de design.
- **Supprimer le contact** (lien rouge) → `Alert` de confirmation → `deleteContact` +
  `pushContactDeletion` + `router.back()`. **Pas d'undo** depuis le détail (l'undo
  snackbar reste sur la liste) : le retour arrière suffit après confirmation.

### Historique factures
Section « Factures (N) » : filtre `store.invoices` sur le destinataire — match par
`recipient.remoteId === contact.remoteId` (si présents) sinon `recipient.id === contact.id`
sinon email (insensible à la casse). Chaque ligne (numéro, date `formatDate`, montant
`formatAmount` + devise, pastille statut via `getDisplayStatus`/`getStatusColor`) →
`router.push('/invoices/[id]/detail')`. Vide → « Aucune facture pour ce contact ».

---

## 2. Wizard 3/4 (`items.tsx`) — refonte + total temps réel

### Total général temps réel
Barre récapitulative **fixe en bas**, au-dessus du bouton « Suivant » :
- **Sous-total HT**, **TVA (taux %)**, **Total TTC** — recalculés en direct depuis
  `methods.watch('items')` via `getTotals({ items: watched, taxRate: newInvoice?.taxRate })`.
- Devise = `getInvoiceCurrency(newInvoice)` (fallback profil — déjà en place).
- Total TTC en gras + `text-primary` ; HT/TVA en gris.

### Refonte de la carte article
- **« Item » → « Article »** (« Article 1 », « + Ajouter un article »).
- En-tête de carte : « Article N » à gauche, **icône 🗑** (suppression) à droite
  (remplace le lien texte « Supprimer cet item » ; masquée si une seule ligne).
- **Désignation** pleine largeur ; **Quantité** et **Prix unitaire** sur une même ligne ;
  **Sous-total de ligne** (quantité × prix, temps réel + devise) sur sa propre ligne,
  aligné à droite, discret. Espacements/hiérarchie plus aérés que les 3 colonnes actuelles.
- Composants réutilisés : `CustomInputText`, `NumericInputText` (déjà branchés RHF).

### Comportement inchangé
Validation Zod (`itemsSchema`, min 1 article), `addItems` → `router.push('summary')`.

---

## 3. App 100 % français

- `items.tsx` : « Item » → « Article » (déjà couvert §2).
- **Balayage** de `app/` et `components/` : toute chaîne affichée en anglais
  (`Text`, `label`, `placeholder`, `title`, `accessibilityLabel`, `Alert`) passée en
  français. **« Email » est conservé** (accepté en formulaire FR — décision utilisateur).
- Ne pas toucher aux identifiants techniques, clés, valeurs de statut backend, commentaires.

---

## Hors périmètre (YAGNI)
- Pas de i18n/multi-langue (l'app est mono-langue FR).
- Pas de refonte des autres étapes du wizard (1, 2, 4).
- Pas de nouvelle donnée contact (on affiche l'existant `BusinessEntity`).
- Undo snackbar sur la suppression depuis le détail (décidé : non — confirmation + retour).
