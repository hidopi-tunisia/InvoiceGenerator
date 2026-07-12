# 03 — Assistant de Création de Facture

Fichiers : `app/invoices/generate/index.tsx`, `contact.tsx`, `new-contact.tsx`, `items.tsx`, `summary.tsx`, `app/invoices/[id]/success.tsx`

---

## Diagramme du Flux

```mermaid
flowchart TD
    TRIGGER([Déclencheur\nAccueil ou Contacts]) --> INIT[store.startNewInvoice\nPré-remplit sender depuis profile\nGénère numéro de facture]
    INIT --> STEP1[Étape 1\n/invoices/generate/index\nInfos Facture]

    STEP1 --> STEP1_FORM[Numéro de facture\nDate de facture\nDate d'échéance]
    STEP1_FORM -->|Suivant| SAVE_INFO[store.addInvoiceInfo\ninvoiceNumber + dates\nécrits à la racine de newInvoice]

    SAVE_INFO --> ROUTE_CHECK{Routing conditionnel}
    ROUTE_CHECK -->|recipient déjà\ndans newInvoice| STEP3[Étape 3 — Items]
    ROUTE_CHECK -->|contacts.length > 0\nET pas de recipient| STEP2A[Étape 2A\n/invoices/generate/contact\nSélectionner Contact]
    ROUTE_CHECK -->|contacts.length = 0| STEP2B[Étape 2B\n/invoices/generate/new-contact\nNouveau Contact]

    STEP2A --> SEARCH[Barre de recherche\nfiltrage temps réel]
    STEP2A --> CONTACT_LIST[Liste contacts\navec avatars initiales]
    CONTACT_LIST -->|Tap contact| SET_RECIPIENT_A[store.addRecipientInfo\ncontact sélectionné]
    SET_RECIPIENT_A --> STEP3

    STEP2A -->|Bouton + FAB| STEP2B
    STEP2A -->|Auto-redirect si\nplus de contacts| STEP2B

    STEP2B --> NEW_FORM[Nom · Adresse · N° TVA · Email]
    NEW_FORM -->|Suivant| SET_RECIPIENT_B[store.addRecipientInfo\nnouvel objet BusinessEntity\navec UUID généré]
    SET_RECIPIENT_B --> STEP3

    STEP3[Étape 3\n/invoices/generate/items\nDésignations] --> ITEMS_FORM[Tableau dynamique d'items\nDésignation · Quantité · Prix\nTotal calculé automatiquement]
    ITEMS_FORM -->|Ajouter item| ADD_ITEM[Append dans useFieldArray]
    ITEMS_FORM -->|Supprimer item| DEL_ITEM[Remove si nb items > 1]
    ITEMS_FORM -->|+ Ajouter une remise| DISCOUNT[Remise globale en %\n0-100, décimales acceptées\nrecalcul temps réel HT/TVA/TTC]
    ITEMS_FORM -->|Suivant| SAVE_ITEMS[store.addItems\nliste des InvoiceItem\n+ addInvoiceInfo discount]
    SAVE_ITEMS --> STEP4

    STEP4[Étape 4\n/invoices/generate/summary\nRécapitulatif] --> RECAP_VIEW[Carte bleue header\nÉmetteur · Destinataire\nListe désignations\nSous-total · Remise · TVA · Total]
    RECAP_VIEW -->|Confirmer et générer| SAVE_INV[store.saveInvoice\nAjoute newInvoice → invoices\nAuto-ajoute recipient → contacts\nVide newInvoice]
    SAVE_INV -->|router.replace| SUCCESS[/invoices/:id/success\nÉcran Succès]

    SUCCESS --> ANIM[Animation Lottie\n+ generateInvoicePdf]
    ANIM -->|PDF prêt| SHARE_BTN[Bouton Partager la facture]
    ANIM -->|Échec| RETRY[Message d'erreur\n+ bouton Réessayer]
    RETRY -->|Réessayer| ANIM
    SHARE_BTN -->|Tap| NATIVE_SHARE[expo-sharing\nSharesheet natif]
    NATIVE_SHARE --> REVIEW[requestFeedbackOrReview\nNote app ou feedback]
    SUCCESS --> BACK_HOME[Bouton Revenir à l'accueil\nresetNewInvoice + router.replace /]
```

---

## Étapes Détaillées

> Chaque écran du wizard affiche sa progression dans le header (`generate/_layout.tsx`) : « Facture · Étape 1/4 », « Client · Étape 2/4 » (sélection ou création), « Désignations · Étape 3/4 », « Récapitulatif · Étape 4/4 ».

### Étape 1 — Infos Facture (`/invoices/generate/index`)

| Champ | Type | Détail |
|---|---|---|
| Numéro de facture | TextInput | Format `INV-YYYY-NNNN` (aligné backend), pré-généré |
| Date de facture | DatePicker modal | Obligatoire, défaut = aujourd'hui |
| Date d'échéance | DatePicker modal | Obligatoire, défaut = aujourd'hui + 14j |

**Action store :** `addInvoiceInfo({ invoiceNumber, invoiceDate, invoiceDueDate })`

---

### Étape 2A — Sélectionner Contact (`/invoices/generate/contact`)

- Barre de recherche temps réel (filtre sur le nom)
- Liste de `store.contacts[]` avec avatar (initiales colorées)
- Bouton FAB bleu en bas à droite → redirige vers 2B
- Tap sur contact → `addRecipientInfo(contact)` → Étape 3

---

### Étape 2B — Nouveau Contact (`/invoices/generate/new-contact`)

| Champ | Obligatoire |
|---|---|
| Nom | Oui |
| Adresse | Oui |
| Numéro TVA | Non |
| Email | Non |

Un UUID est généré automatiquement. **Action store :** `addRecipientInfo(newBusinessEntity)`

---

### Étape 3 — Désignations (`/invoices/generate/items`)

Tableau dynamique (React Hook Form `useFieldArray`). Chaque item :

| Sous-champ | Type | Obligatoire |
|---|---|---|
| Désignation | TextInput multilignes | Oui |
| Quantité | NumericInput | Oui (min 1) |
| Prix unitaire | NumericInput | Oui (≥ 0 — 0, 0,99 et 0,00 acceptés, virgule ou point) |
| Total ligne | Calculé (qté × prix) | Lecture seule |

**Minimum 1 item requis** — validé par Zod (`.min(1)` sur le tableau) ; l'écran présente une ligne vierge par défaut (quantité 1, prix 0 — un prix à 0 est valide, seul le négatif est refusé). L'item peut être supprimé seulement si `nb items > 1`. La devise affichée est celle de la facture (fallback profil).

**Remise globale (optionnelle)** : le récap fixe en bas d'écran affiche Sous-total HT / TVA / Total TTC en temps réel et propose « + Ajouter une remise » — un pourcentage (0-100, décimales acceptées) appliqué sur le HT avant TVA. La ligne « Remise (x %) » n'apparaît que si le montant est > 0 ; le bouton × retire la remise.

**Action store :** `addItems(items[])` + `addInvoiceInfo({ discount })`

---

### Étape 4 — Récapitulatif (`/invoices/generate/summary`)

Affichage en lecture seule :

```
┌─────────────────────────────────┐
│  [Bleu] Facture N° INV-001 0626 │
│  Date: 01/07/2026               │
│  Échéance: 15/07/2026           │
├─────────────────────────────────┤
│  ÉMETTEUR : Mon Entreprise      │
│  Adresse, N° TVA, SIRET/MF      │
├─────────────────────────────────┤
│  DESTINATAIRE : Client SARL     │
│  Adresse, Email, N° TVA         │
├─────────────────────────────────┤
│  Désignation    Qté   Prix  Tot │
│  Développement   1    500  500  │
│  Design          2    150  300  │
├─────────────────────────────────┤
│  Sous-total :         800.00    │
│  Remise (10 %) :     − 80.00    │
│  TVA (19%) :          136.80    │
│  Total :              856.80    │
└─────────────────────────────────┘
         [Confirmer et générer]
```

La TVA est calculée par `getTotals` avec le taux **figé sur la facture** à sa création (fallback : taux du profil pour les factures antérieures), après application de la remise sur le HT. Les lignes Remise et TVA n'apparaissent que si leur valeur est > 0. Le SIRET (ou à défaut le MF) de l'émetteur est affiché s'il est renseigné. Montants suffixés de la devise de la facture ; une désignation longue passe à la ligne sans décaler la colonne des prix.

**Action store :** `saveInvoice()` → persiste dans `store.invoices[]` + auto-ajout contact, puis **`router.replace`** vers l'écran succès (le retour arrière ne revient pas au récap).

> **Mode édition** (voir [04](./04-invoice-management.md)) : si la facture en cours existe déjà dans `invoices[]` (entrée via `startEditInvoice()` depuis le détail), le CTA devient « Enregistrer les modifications » et appelle `updateInvoice()` au lieu de `saveInvoice()`, puis `router.replace` vers le détail.

---

### Succès (`/invoices/[id]/success`)

1. Animation Lottie au chargement
2. `generateInvoicePdf(invoice)` appelé automatiquement (la fonction calcule elle-même les totaux) — le fichier est nommé d'après le tag : `{invoiceNumber}.pdf`
3. Bouton **"Partager la facture"** (visible quand PDF prêt) → `expo-sharing`
4. En cas d'échec de génération : message d'erreur français + bouton **"Réessayer"**
5. Après partage → `requestFeedbackOrReview()` (demande note, throttle 3 jours)
6. Lien **"Revenir à l'accueil"** → `resetNewInvoice()` + `router.replace('/')`

---

## Format du Numéro de Facture

```
INV-YYYY-NNNN
    └2026┘└0042┘
    Année  Séquence annuelle (4 chiffres)

Exemple : INV-2026-0042
```

Généré par `app/utils/invoice.ts:generateInvoiceNumber()` — aligné sur le format `tag` du backend : incrémente le max de l'année courante, avec boucle anti-collision (les factures rapatriées du serveur sont prises en compte). Poussé comme `tag` à la sync ; en cas de 409, le numéro serveur est adopté au pull.
