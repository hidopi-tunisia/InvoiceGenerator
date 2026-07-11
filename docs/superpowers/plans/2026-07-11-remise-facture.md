# Remise facture + MF/SIRET récap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remise globale en % à l'étape 3/4 (contrat API.md : avant TVA, 0-100), propagée aux totaux (récap, détail, PDF) et à la sync ; + MF/SIRET de l'émetteur sur le récap 4/4.

**Architecture:** Un champ `discount` sur l'`Invoice` local ; `getTotals` devient la source unique du calcul remisé (alignée serveur), tous les affichages en dérivent ; 2 lignes de mappers pour la sync ; UI de saisie dans la barre récap de l'étape 3/4.

**Tech Stack:** Expo SDK 57, RHF+Zod, Zustand, NativeWind. Vérif : repro Node (getTotals pur) + `npx tsc --noEmit` + `npx eslint` + smoke device.

## Global Constraints
- `discount` = **pourcentage 0-100** (contrat API.md §237/§360) ; TVA calculée sur le **HT remisé** ; timbre hors périmètre.
- Clés existantes de `getTotals` (`subtotal`, `taxRate`, `tax`, `total`) conservées — ses 6 consommateurs ne doivent pas casser.
- Lignes « Remise » affichées **uniquement si discount > 0** (aucune ligne vide/0 %).
- 100 % français ; montants `formatAmount` + `getInvoiceCurrency` ; style barre récap existant (items.tsx) ; **ui-ux-pro-max** pour le rendu de la saisie de remise (sans changer la logique du plan).
- Repro Node dans le scratchpad session (`/private/tmp/claude-501/-Users-hamdichebbi-Desktop-SaaS-Facturation-InvoiceGenerator/4b7a5da4-c12a-4e49-939f-c3a7f838ab64/scratchpad/`), jamais commité.
- Chemins à parenthèses/crochets quotés dans les commandes.

---

### Task 1 : Remise bout-en-bout + MF/SIRET récap

**Files:**
- Modify: `app/schema/invoice.ts` (type `Invoice` : + `discount`)
- Modify: `app/utils/invoice.ts` (`getTotals`)
- Modify: `domain/mappers.ts` (`toBackendInvoiceInput` ~L84-94, `fromBackendInvoice` ~L101-130)
- Modify: `app/invoices/generate/items.tsx` (saisie remise dans la barre récap, ~L46 et ~L138-158)
- Modify: `app/invoices/generate/summary.tsx` (ligne Remise ~L120-139 ; MF/SIRET bloc « De : » ~L83)
- Modify: `app/(tabs)/invoices/[id]/detail.tsx` (ligne Remise ~L203-222)
- Modify: `app/utils/pdf.ts` (ligne Remise dans `.totals`, ~L440-453)
- Scratchpad (non commité) : `.../scratchpad/test-remise.mjs`

**Interfaces:**
- Produces: `getTotals(invoice)` → `{ subtotal, discountRate, discountAmount, subtotalAfterDiscount, taxRate, tax, total }` ; champ local `Invoice.discount?: number`.
- Consumes: `addInvoiceInfo` (store, fusion à plat), `addItems`, `formatAmount`, `getInvoiceCurrency`, `BackendInvoice.discount` (domain/invoices.ts:33).

- [ ] **Step 1 : Schéma** — dans `app/schema/invoice.ts`, type `Invoice`, ajouter sous `taxRate` :
```ts
  discount?: number; // remise globale en % (0-100), appliquée sur le HT avant TVA (API.md §237)
```

- [ ] **Step 2 : `getTotals`** — remplacer le corps (app/utils/invoice.ts:9-21) :
```ts
export const getTotals = (invoice: Partial<Invoice>) => {
  const items = invoice.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  // Remise globale en % appliquée AVANT TVA (aligné sur le calcul serveur, API.md §360)
  const discountRate = invoice.discount ?? 0;
  const discountAmount = subtotal * (discountRate / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxRate = invoice.taxRate ?? useStore.getState().profile.taxRate ?? 0;
  const tax = subtotalAfterDiscount * (taxRate / 100);

  return {
    subtotal: round2(subtotal),
    discountRate,
    discountAmount: round2(discountAmount),
    subtotalAfterDiscount: round2(subtotalAfterDiscount),
    taxRate,
    tax: round2(tax),
    total: round2(subtotalAfterDiscount + tax),
  };
};
```

- [ ] **Step 3 : Repro Node** — écrire + lancer `test-remise.mjs` (recopie de la logique pure) : cas (a) sans discount = comportement actuel ; (b) discount 10 %, taux 19 % : subtotal 600 → discountAmount 60 → HT remisé 540 → tax 102.6 → total 642.6 ; (c) discount 0 explicite = (a) ; (d) arrondis round2. Attendu : PASS sur les 4.

- [ ] **Step 4 : Mappers** — `toBackendInvoiceInput` : ajouter `discount: invoice.discount || undefined,` ; `fromBackendInvoice` : ajouter `discount: remote.discount || undefined,`.

- [ ] **Step 5 : Étape 3/4 (`items.tsx`)** — état local `const [discount, setDiscount] = useState<number | undefined>(useStore.getState().newInvoice?.discount);` (+ état texte de saisie et erreur). Passer `discount` à `getTotals({ items: watchedItems ?? [], taxRate, discount })`. Dans la barre récap, entre Sous-total HT et TVA :
  - si pas de remise active : lien discret « + Ajouter une remise » (`text-primary`, petit) qui révèle le champ ;
  - champ % compact (TextInput numérique, virgule → point, borné 0-100 sinon erreur française sous le champ) + bouton retirer (icône `x`, remet `undefined`) ;
  - si `discountAmount > 0` : ligne `Remise (X %)` / `− {formatAmount(discountAmount)} {currency}` (valeur en vert `text-green-600` ou gris — jugement ui-ux-pro-max, cohérent avec la barre).
  Dans `onSubmit`, après `addItems(...)` : `addInvoiceInfo({ discount });` (l'action fusionne à plat). **ui-ux-pro-max** pour le polish, sans changer la logique.

- [ ] **Step 6 : Récap 4/4 (`summary.tsx`)** — (a) bloc totaux : ligne `Remise (x %)  − montant` si `discountAmount > 0` (utiliser les nouveaux champs de `getTotals`) ; (b) bloc émetteur « De : » : sous la TVA existante, `Siret : {sender.siret}` si présent, `MF : {sender.mf}` si présent (rendu conditionnel, aucun texte vide).

- [ ] **Step 7 : Détail (`detail.tsx`) + PDF (`pdf.ts`)** — même ligne Remise conditionnelle dans leurs blocs totaux (PDF : `total-row` supplémentaire entre Sous-total HT et TVA, montant préfixé `−`).

- [ ] **Step 8 : Vérifs** — `npx prettier --write` (fichiers touchés) ; `npx tsc --noEmit` (exit 0) ; `npx eslint` sur les fichiers touchés (0 erreur). Smoke device décrit (ne pas lancer) : remise 10 % à l'étape 3/4 → totaux corrects 3/4→4/4→détail→PDF ; push → mêmes totaux côté serveur ; MF/SIRET au récap.

- [ ] **Step 9 : Commit**
```bash
git add -A && git commit -m "feat(facture): remise globale en % (étape 3/4 → récap/détail/PDF/sync) + MF-SIRET au récap"
```

## Self-Review
Spec coverage : schéma ✅ (S1) ; getTotals aligné serveur + rétro-compat ✅ (S2-3) ; mappers ✅ (S4) ; UI 3/4 ✅ (S5) ; récap remise + MF/SIRET ✅ (S6) ; détail + PDF ✅ (S7) ; vérifs ✅ (S8). Placeholders : aucun. Types : `discount` optionnel partout, `getTotals` étend sans casser.
