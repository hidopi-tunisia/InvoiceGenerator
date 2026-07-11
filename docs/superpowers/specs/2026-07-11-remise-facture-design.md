# Remise sur facture (étape 3/4) + MF/SIRET au récap

**Date** : 2026-07-11 · **Statut** : design validé
**Contrat** : `API.md` — `InvoiceInput.discount?: number` (% global 0-100, défaut 0),
appliqué sur le HT **avant TVA** ; serveur recalcule si `items` ou `discount` changent
(§237, §360-361). Pas de remise par ligne ni de montant fixe. Timbre : hors périmètre.

## 1. Donnée & calcul
- `app/schema/invoice.ts` : `discount?: number` (0-100) sur `Invoice` (optionnel — pas de migration).
- `app/utils/invoice.ts` → `getTotals` aligné serveur :
  `subtotal → discountAmount = subtotal×(discount/100) → subtotalAfterDiscount →
  tax = subtotalAfterDiscount×(taxRate/100) → total = subtotalAfterDiscount + tax`.
  Retour enrichi : `{ subtotal, discountRate, discountAmount, subtotalAfterDiscount,
  taxRate, tax, total }` — clés existantes conservées (6 consommateurs intacts).
  Source du taux : `invoice.discount ?? 0`. Arrondis `round2` comme l'existant.
  → Résorbe la moitié de la divergence local↔serveur du qualitygate (reste le timbre).

## 2. Sync
- `toBackendInvoiceInput` : `discount: invoice.discount || undefined`.
- `fromBackendInvoice` : `discount: remote.discount || undefined` (champ déjà dans `BackendInvoice`).
- Modifier la remise sur une facture existante = `dirty` via `updateInvoice` (comportement standard).

## 3. UI
- **Étape 3/4** (`items.tsx`, barre récap — design ui-ux-pro-max) : lien discret
  « + Ajouter une remise » → révèle un champ % compact (numérique, virgule acceptée,
  borné 0-100, message d'erreur français sinon) + possibilité de retirer la remise
  (croix/lien). Recalcul temps réel. Ligne « Remise (x %)  − montant » affichée
  seulement si > 0, entre Sous-total HT et TVA. État : `discount` en état local
  d'écran, initialisé de `newInvoice?.discount`, persisté à la validation via
  `addInvoiceInfo({ discount })` (+ `addItems` existant).
- **Récap 4/4** (`summary.tsx`) : (a) ligne Remise dans le bloc totaux (si > 0) ;
  (b) **MF/SIRET de l'émetteur** dans le bloc « De : » — `Siret : …` si
  `sender.siret`, `MF : …` si `sender.mf` (rien si absents ; TVA existante conservée).
- **Détail facture** (`detail.tsx`) et **PDF** (`pdf.ts`, bloc totaux) : ligne Remise
  (si > 0), même formatage. Le PDF affiche déjà SIRET/MF émetteur — inchangé.

## Vérification
Repro Node `getTotals` (0 %, 10 %, arrondis, TVA sur HT remisé, rétro-compat sans
discount) ; `tsc` + `eslint` ; smoke device : remise saisie → totaux corrects sur
3/4, 4/4, détail, PDF ; push → totaux serveur identiques ; MF/SIRET visible au récap.
