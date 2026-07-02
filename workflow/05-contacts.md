# 05 — Gestion des Contacts

Fichiers : `app/(tabs)/contacts/index.tsx`, `app/(tabs)/contacts/[id]/edit.tsx`

---

## Diagramme du Flux

```mermaid
flowchart TD
    TAB([Onglet Contacts]) --> LIST[Liste des Contacts\n/tabs/contacts]

    LIST --> SEARCH[Barre de recherche\nfiltrage temps réel par nom]
    LIST --> CONTACT_ITEMS[Items contacts\nAvatar initiales · Nom · Adresse]

    CONTACT_ITEMS -->|Tap long / tap| CONTEXT_MENU[Menu contextuel]
    CONTEXT_MENU -->|Modifier| EDIT[/contacts/:id/edit\nFormulaire édition]
    CONTEXT_MENU -->|Supprimer| DEL_CONFIRM{Confirmation\nalerte}
    DEL_CONFIRM -->|Confirmer| DELETE[store.deleteContact\nRefresh liste]
    DEL_CONFIRM -->|Annuler| LIST

    EDIT --> EDIT_FORM[Nom · Adresse · TVA · Email]
    EDIT_FORM -->|Mettre à jour| SAVE[store.updateContact\nrouter.back]
    SAVE --> LIST

    CONTACT_ITEMS -->|Icône facture verte| CREATE_INVOICE[store.startNewInvoice\nstore.addRecipientInfo\nrouter.push /invoices/generate/index]
    CREATE_INVOICE --> WIZARD_STEP1[Wizard → Étape 1\nContact pré-sélectionné\nSaute Étape 2]

    LIST -->|Liste vide| EMPTY_STATE[Message vide\n+ Bouton Créer un contact]
    EMPTY_STATE -->|Tap| NEW_CONTACT[/invoices/generate/new-contact\nFormulaire nouveau contact]

    SEARCH -->|Aucun résultat| NO_RESULTS[Aucun contact trouvé]
```

---

## Écran Liste des Contacts

```
┌──────────────────────────────────┐
│  Contacts                        │
│  🔍 Rechercher un contact...   ✕ │
├──────────────────────────────────┤
│  [AB] Ahmed Ben Ali              │
│       123 Rue Habib Bourguiba    │
│                              [📄]│  ← Bouton "Nouvelle facture"
├──────────────────────────────────┤
│  [CS] Client SARL                │
│       45 Av. Charles de Gaulle   │
│                              [📄]│
└──────────────────────────────────┘
```

**Avatar** : Deux premières lettres du nom en majuscules, fond coloré généré automatiquement.

---

## Création Automatique de Contact

**La fonctionnalité clé** : chaque fois qu'une facture est sauvegardée (`store.saveInvoice()`), le destinataire est automatiquement ajouté à `store.contacts[]` — sans action manuelle de l'utilisateur.

```mermaid
sequenceDiagram
    participant Wizard as Wizard Facture
    participant Store as Zustand Store
    participant Contacts as Liste Contacts

    Wizard->>Store: saveInvoice()
    Store->>Store: Ajoute invoice à invoices[]
    Store->>Store: Vérifie si recipient.id existe dans contacts[]
    alt Recipient non présent
        Store->>Store: Ajoute recipient à contacts[]
        Store->>Contacts: Contact visible dans la liste
    else Recipient déjà présent
        Store->>Store: Aucun doublon ajouté
    end
```

La déduplication se fait par `recipient.id` (UUID).

---

## Écran Édition Contact (`/contacts/[id]/edit`)

| Champ | Obligatoire |
|---|---|
| Nom | Oui |
| Adresse | Oui |
| Numéro TVA | Non |
| Email | Non |
| SIRET | Non |

**Action store :** `updateContact(updatedBusinessEntity)` + `router.back()`

---

## État Vide

Si `store.contacts.length === 0` :
- Message : *"Les contacts vont apparaître lorsque vous créerez des factures"*
- Bouton bleu **"+ Créer un contact"** → redirige vers `/invoices/generate/new-contact`

---

## Type `BusinessEntity` (Contact)

```typescript
{
  id: string        // UUID, généré automatiquement
  name: string      // Nom du contact / entreprise
  address: string   // Adresse complète
  tva?: string      // Numéro TVA (optionnel)
  email?: string    // Email (optionnel)
  currency?: string // Devise préférée (optionnel)
  taxRate?: number  // Taux TVA (optionnel)
}
```

> Le même type `BusinessEntity` sert pour le profil émetteur (`store.profile`) ET les contacts/destinataires.
