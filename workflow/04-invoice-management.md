# 04 — Gestion des Factures

Fichiers : `app/(tabs)/invoices/index.tsx`, `app/(tabs)/invoices/[id]/detail.tsx`

---

## Diagramme du Flux

```mermaid
flowchart TD
    TAB([Onglet Factures]) --> LIST[Liste des Factures\n/tabs/invoices]

    LIST --> FILTER_BAR[Filtres : Toutes · Payées · Impayées · En retard]
    LIST --> YEAR_FILTER[Filtre Année\nsélecteur calendrier]
    LIST --> PLUS_BTN[Bouton + Header\n→ Créer facture]

    FILTER_BAR -->|Tap filtre| FILTERED_LIST[Liste filtrée par statut]
    YEAR_FILTER -->|Sélection année| YEAR_LIST[Liste filtrée par année]

    FILTERED_LIST --> INVOICE_ITEM[Item Facture\nNuméro · Client · Montant · Date · Statut]
    YEAR_LIST --> INVOICE_ITEM

    INVOICE_ITEM -->|Tap| DETAIL[Détail Facture\n/tabs/invoices/:id/detail]
    INVOICE_ITEM -->|Icône poubelle| DELETE_CONFIRM{Confirmation\nalerte}
    DELETE_CONFIRM -->|Confirmer| DELETE[store.deleteInvoice\nRefresh liste]
    DELETE_CONFIRM -->|Annuler| LIST

    DETAIL --> HEADER_ACTIONS[Header : Icône Share · Icône Poubelle]
    DETAIL --> STATUS_BADGE[Badge statut coloré]
    DETAIL --> INFO_SECTION[N° facture · Dates · Client · Items · Total]
    DETAIL --> PAY_BTN{Statut ≠ payée ?}
    PAY_BTN -->|Oui| MARK_PAID_BTN[Bouton Marquer comme payée]
    PAY_BTN -->|Non| NO_BTN[Bouton absent]

    MARK_PAID_BTN -->|Tap| UPDATE_STATUS[store.updateInvoice\nstatus = payée]
    UPDATE_STATUS --> PAID_ALERT[Alerte de confirmation\n Facture marquée payée]
    PAID_ALERT --> DETAIL

    HEADER_ACTIONS -->|Share| PDF_CHECK{PDF existe ?}
    PDF_CHECK -->|Oui| SHARE[expo-sharing\nSharesheet natif]
    PDF_CHECK -->|Non| INFO_ALERT[Alerte info\nPDF non disponible]

    HEADER_ACTIONS -->|Poubelle| DEL_CONFIRM2{Confirmation\nalerte}
    DEL_CONFIRM2 -->|Confirmer| DELETE2[store.deleteInvoice\nrouter.back]
    DEL_CONFIRM2 -->|Annuler| DETAIL

    PLUS_BTN --> WIZARD[Wizard création\n/invoices/generate]
```

---

## Écran Liste des Factures

### Filtres Statut

| Filtre | Statut correspondant |
|---|---|
| Toutes | Tous |
| Payées | `'payée'` |
| Impayées | `'en attente'` |
| En retard | `'en retard'` |

### Indicateur Visuel de Statut

| Statut | Couleur |
|---|---|
| `payée` | Vert |
| `en attente` | Jaune |
| `en retard` | Rouge |
| Autre | Gris |

### Item Facture

```
┌──────────────────────────────────┐
│  #001        1 234,56 TND    🗑  │
│  Client SARL          01/07/2026 │
│  ● (badge statut coloré)         │
└──────────────────────────────────┘
```

---

## Écran Détail Facture

```
┌──────────────────────────────────┐
│  ← Retour    [📤 Share]  [🗑]   │
├──────────────────────────────────┤
│  [Badge: EN ATTENTE]             │
│  N° INV-001 0626                 │
│  Émise le : 01/07/2026           │
│  Échéance : 15/07/2026           │
├──────────────────────────────────┤
│  Client :                        │
│  Client SARL                     │
│  123 Rue de la Paix, Paris       │
│  TVA : FR12345678901             │
├──────────────────────────────────┤
│  Désignation    Qté   Prix       │
│  Développement   1    500,00     │
│  Design          2    150,00     │
├──────────────────────────────────┤
│  Total : 800,00 TND              │
├──────────────────────────────────┤
│  [Marquer comme payée]           │
└──────────────────────────────────┘
```

---

## Valeurs de Statut

> Les statuts sont stockés en français dans le store Zustand, indépendamment des constantes `InvoiceStatus` en anglais dans `constants/index.ts`.

| Valeur Store | Label UI |
|---|---|
| `'en attente'` | En attente (jaune) |
| `'payée'` | Payée (vert) |
| `'en retard'` | En retard (rouge) |

---

## Génération PDF depuis le Détail

Le PDF est généré via `app/utils/pdf.ts:generateInvoicePdf()` et stocké dans `FileSystem.documentDirectory/facture-{invoiceNumber}.pdf`. Le partage utilise `expo-sharing`.

> Si le PDF n'a pas encore été généré (facture créée en dehors du wizard), une alerte informe l'utilisateur.
