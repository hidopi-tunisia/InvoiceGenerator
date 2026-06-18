# API.md — Contrat d'interface backend

## 1. Base URL
```
Dev  : http://localhost:3000/api/v1
Prod : APP_URL/api/v1 (variable d'environnement)
```
Toutes les routes sont préfixées par `/api/v1`. Les endpoints publics (`/info`, `/ready`, `/docs`) restent à la racine.

## 2. Authentification

Deux modes d'authentification supportés (dual auth). Les routes data acceptent les deux ; les routes de gestion de compte sont Firebase-only.

### Bearer Token (Firebase)
```
Authorization: Bearer <firebase_id_token>
```
Token vérifié via Firebase Admin SDK. Accès complet (pas de restriction par scopes). Expiration → `401 { code: "TOKEN_EXPIRED" }`.

### API Key
```
X-API-Key: ink_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Clé générée via `POST /api-keys`. Accès limité aux scopes attribués à la clé. La clé brute est affichée **une seule fois** à la création.

### Matrice d'authentification par route

| Routes | Firebase Bearer | API Key (`X-API-Key`) |
|---|---|---|
| `/invoices/*` | ✅ | ✅ scopes `invoices:read` / `invoices:write` |
| `/devis/*` | ✅ | ✅ scopes `devis:read` / `devis:write` |
| `/recipients/*` | ✅ | ✅ scopes `recipients:read` / `recipients:write` |
| `/audit/*` | ✅ | ✅ scope `audit:read` |
| `/profile/*` | ✅ | ❌ Firebase-only |
| `/auth/*` | ✅ | ❌ Firebase-only |
| `/subscription/*` | ✅ | ❌ Firebase-only |
| `/api-keys/*` | ✅ | ❌ Firebase-only |
| `/senders/*` | ✅ | ❌ Firebase-only |
| `/info`, `/ready` | ❌ public | ❌ public |

### Scopes disponibles

`invoices:read` · `invoices:write` · `devis:read` · `devis:write` · `recipients:read` · `recipients:write` · `profile:read` · `audit:read`

## 3. Format des réponses

Toutes les routes utilisent `ResponseFormatter` — format unifié sur l'ensemble de l'API.

| Format | Shape |
|---|---|
| Succès | `{ success:true, message, data, timestamp }` |
| Créé (201) | `{ success:true, message, data, timestamp }` |
| Paginé | `{ success:true, data:[], pagination:{total,page,limit,totalPages}, timestamp }` |
| Erreur | `{ success:false, message, errors, timestamp }` |

### Format des erreurs 400

Le champ `errors` est un tableau d'objets `{ field, message }` permettant d'identifier précisément le champ invalide. Notation pointée pour les champs imbriqués.

```json
{
  "success": false,
  "message": "Données invalides",
  "errors": [
    { "field": "email",                   "message": "Format d'email invalide" },
    { "field": "fiscalIdentifier.value",  "message": "Format MF invalide — attendu : XXX XXX XXX (9 chiffres)" },
    { "field": "address.zip",             "message": "Code postal invalide" }
  ],
  "timestamp": "2026-04-15T10:23:00.000Z"
}
```

### Erreurs automatiquement formatées par le global error handler

| Condition | HTTP | `errors` |
|---|---|---|
| Mongoose `ValidationError` | 400 | `[{ field, message }]` par champ invalide |
| Mongoose `CastError` | 400 | `[{ field, message: "Format invalide pour 'field'" }]` |
| MongoDB duplicate key E11000 | 409 | `[{ field, message: "Valeur déjà utilisée" }]` |
| JSON malformé (body-parser) | 400 | `[{ field: "body", message: "JSON malformé" }]` |
| Route introuvable | 404 | `null` |
| Erreur système inattendue | 500 | `null` (détails non exposés) |

## 4. Endpoints

### Info
| M | Route | Auth | Réponse `data` |
|---|---|---|---|
| GET | `/info` | ❌ public | `{ name, version, environment, status, uptime, node, timestamp }` |
| GET | `/ready` | ❌ public | `{ status: "ready"\|"degraded", checks: { mongodb, firebase }, uptime, timestamp }` — 503 si dégradé |

### Auth
| M | Route | Auth | Réponse |
|---|---|---|---|
| GET | `/auth/verify` | ✅ | `data`: claims Firebase (uid, email, name…) |

### Invoices

| M | Route | Auth | Query / Body | Réponse `data` |
|---|---|---|---|---|
| GET | `/invoices` | ✅ | `page` `limit` `status` `tag` `sender` `recipient` `startDate` `endDate` `dueDate` `sortBy` `sortOrder` | `Invoice[]` + `isLate` |
| GET | `/invoices/stats` | ✅ | `year` ou `startDate`+`endDate` | `{ summary, totalClients, revenueOverTime[], currency, vat }` |
| GET | `/invoices/export` | ✅ | `format=json\|csv` | fichier téléchargeable (défaut JSON) |
| POST | `/invoices/import` | ✅ | `{ records: ImportRecord[] }` (max 500) | `{ created, skipped, errors[] }` |
| GET | `/invoices/:id` | ✅ | — | `Invoice & { isLate, downloadUrl, totalHT, discountAmount, totalHTAfterDiscount, totalVAT, totalTTC }` |
| POST | `/invoices` | ✅ | `InvoiceInput` | `Invoice` (201) |
| PATCH | `/invoices/:id` | ✅ | `Partial<InvoiceInput>` | `Invoice` |
| DELETE | `/invoices/:id` | ✅ | — | `{ id }` |
| POST | `/invoices/:id/duplicate` | ✅ | — | `Invoice` (201) |
| GET | `/invoices/:id/summary` | ✅ | — | `{ items, discount, vat, currency, totalHT, discountAmount, totalHTAfterDiscount, totalVAT, totalTTC }` |
| PATCH | `/invoices/:id/status` | ✅ | `{ status: InvoiceStatus }` | `Invoice` |
| GET | `/invoices/:id/download` | ✅ | — | Redirect vers URL PDF Cloudinary |
| GET | `/invoices/:id/audit` | ✅ | — | `AuditTrail[]` |


### Devis
| M | Route | Auth | Query / Body | Réponse `data` |
|---|---|---|---|---|
| GET | `/devis` | ✅ | `page` `limit` `status` `tag` `recipient` `startDate` `endDate` `sortBy` `sortOrder` | paginé `Devis & { isExpired }` |
| GET | `/devis/stats` | ✅ | `year` ou `startDate`+`endDate` | même structure que invoice stats |
| GET | `/devis/export` | ✅ | `format=json\|csv` | fichier téléchargeable (défaut JSON) |
| POST | `/devis/import` | ✅ | `{ records: ImportRecord[] }` (max 500) | `{ created, skipped, errors[] }` |
| GET | `/devis/:id` | ✅ | — | `Devis & { isExpired, totalHT, discountAmount, totalHTAfterDiscount, totalVAT, totalTTC }` |
| POST | `/devis` | ✅ | `DevisInput` | `Devis` (201) |
| PATCH | `/devis/:id` | ✅ | `Partial<DevisInput>` | `Devis` |
| DELETE | `/devis/:id` | ✅ | — | archive (soft) |
| PATCH | `/devis/:id/status` | ✅ | `{ status: DevisStatus }` | `Devis` |
| GET | `/devis/:id/download` | ✅ | — | stream PDF (URL signée Cloudinary) |
| POST | `/devis/:id/convert` | ✅ | — | `{ invoice, devis }` — recalcule `total` et `totalInWords` avec le droit de timbre du profil (si activé) |

### Recipients
| M | Route | Auth | Query / Body | Réponse `data` |
|---|---|---|---|---|
| GET | `/recipients` | ✅ | `page` `limit` `search` `starred` `category` | paginé `Recipient[]` |
| GET | `/recipients/search` | ✅ | `q` (min 2 chars) | `Recipient[]` |
| GET | `/recipients/:id` | ✅ | — | `Recipient` |
| POST | `/recipients` | ✅ | `RecipientInput` | `Recipient` (201) |
| PATCH | `/recipients/:id` | ✅ | `Partial<RecipientInput>` | `Recipient` |
| DELETE | `/recipients/:id` | ✅ | — | `{ id }` (soft delete) |
| PATCH | `/recipients/:id/toggle-starred` | ✅ | — | `Recipient` |
| POST | `/recipients/bulk` | ✅ | `RecipientInput[]` | `Recipient[]` (201) |

### Profile
> ℹ️ `GET /` auto-crée le profil + trial 14j au premier appel.
> ℹ️ `isProfileComplete` auto-calculé sur create/update.

| M | Route | Auth | Body | Réponse |
|---|---|---|---|---|
| GET | `/profile` | ✅ | — | `{ success, data: Profile }` |
| POST/PATCH/DELETE | `/profile` | ✅ | champs Profile | `{ success, data?, message? }` |
| POST | `/profile/bank-accounts` | ✅ | `BankAccountInput` | `{ success, data: Profile }` |
| PATCH | `/profile/bank-accounts/:id` | ✅ | `Partial<BankAccountInput>` | `{ success, data: Profile }` |
| DELETE | `/profile/bank-accounts/:id` | ✅ | — | `{ success, data: Profile }` |
| PUT | `/profile/bank-accounts/:id/default` | ✅ | — | `{ success, data: Profile }` |
| POST | `/profile/documents` | ✅ | `multipart: file + type` | `{ success, data: Profile }` |
| DELETE | `/profile/documents/:id` | ✅ | — | `{ success, data: Profile }` |
| PATCH | `/profile/logo` | ✅ | `multipart: logo` | `{ success, data: { logoUrl } }` |
| GET | `/profile/documents/default` | ✅ | — | `{ success, data: Document }` |

### Subscription
| M | Route | Auth | Body | Réponse `data` |
|---|---|---|---|---|
| GET | `/subscription/plans` | ❌ public | — | `Plan[]` (limites + tarifs) |
| GET | `/subscription` | ✅ | — | `SubscriptionUsage` |
| GET | `/subscription/usage` | ✅ | — | `SubscriptionUsage` |
| POST | `/subscription/checkout` | ✅ | `{ plan, billingInterval?: 'monthly'\|'annual' }` | `{ url, sessionId }` (Stripe Checkout) |
| POST | `/subscription/portal` | ✅ | — | `{ url }` (Stripe Portal) |
| POST | `/subscription/webhook` | ❌ Stripe sig | raw | `{ received: true }` |

### Audit
| M | Route | Auth | Query | Réponse `data` |
|---|---|---|---|---|
| GET | `/audit/dashboard` | ✅ | — | `{ actionStats, recentActivity[], resourceStats }` |
| GET | `/audit/timeline` | ✅ | `page` `limit` `resourceType` | paginé `AuditTrail[]` |
| GET | `/audit/export` | ✅ | — | `text/csv` |

### API Keys
> ℹ️ Firebase-only — les API keys ne peuvent pas créer d'autres API keys.
> ℹ️ La clé brute (`key`) n'est retournée qu'au `POST` (création). Stockée en hash SHA-256.

| M | Route | Auth | Body | Réponse `data` |
|---|---|---|---|---|
| POST | `/api-keys` | ✅ Firebase | `{ name, scopes?[], expiresAt? }` | `{ _id, name, key, prefix, scopes, expiresAt, createdAt }` (201) |
| GET | `/api-keys` | ✅ Firebase | — | `ApiKey[]` (sans `keyHash`) |
| DELETE | `/api-keys/:id` | ✅ Firebase | — | `{ _id, name }` (révocation) |

## 5. Modèles TypeScript

```typescript
type InvoiceStatus = 'Draft'|'Pending'|'Paid'|'Partial_Payment'|'Overdue'|'Cancelled'|'Rejected'|'Refunded'|'Unpaid';
type InvoiceType   = 'Invoice'|'Quote';
type PaymentMethod = 'Credit Card'|'Bank Transfer'|'Cash'|'Nothing'|'Cheque'|'PayPal'|'Stripe';
type DevisStatus   = 'Brouillon'|'Créé'|'En_négociation'|'Accepté'|'Annulé';
type Category      = 'Entreprise'|'Particulier';
type SubPlan       = 'trial'|'starter'|'pro'|'enterprise';
type SubStatus     = 'trialing'|'active'|'past_due'|'cancelled'|'expired';
type FiscalType    = 'MF'|'SIRET'|'SIREN'|'TVA'|'none';
type DocType       = 'cgv'|'signature'|'logo'|'general'|'contract'|'other';

interface InvoiceItem { label: string; quantity: number; unitPrice: number; }
interface Address { street?: string; city?: string; state?: string; country?: string; zip?: string; }

interface InvoiceInput {
  tag?: string;           // auto : INV-YYYY-NNNN
  date?: string;          // ISO — doit être ≤ dueDate
  dueDate?: string;
  recipientId: string;    // ObjectId
  items: InvoiceItem[];
  discount?: number;      // remise globale en % (0–100), défaut 0; appliquée sur HT avant TVA
  type?: InvoiceType;     // défaut 'Invoice'
  status?: InvoiceStatus;
  paymentMethod?: PaymentMethod; // défaut 'Nothing'
  notes?: string; terms?: string;
  isRecurring?: boolean;
  recurrenceRule?: 'monthly'|'quarterly'|'annually';
}

interface Invoice extends InvoiceInput {
  _id: string; sender: string; recipient: Recipient; userId: string;
  total: number; totalInWords: string; // calculés — ne pas envoyer
  invoiceLink?: string; paidDate?: string; // PDF Cloudinary si plan PDF
  createdAt: string; updatedAt: string;
  isLate: boolean; downloadUrl: string; // calculés, non stockés
  // champs calculés à la volée (GET /:id et /:id/summary uniquement) :
  totalHT?: number; discountAmount?: number; totalHTAfterDiscount?: number; totalVAT?: number; timbreAmount?: number; totalTTC?: number;
  // totalTTC = totalHTAfterDiscount + totalVAT + timbreAmount
}

interface ImportRecord {
  tag?: string;                // conservé si unique pour cet utilisateur, sinon régénéré
  date?: string;               // ISO — défaut: now
  dueDate?: string;            // invoices uniquement
  validityDate?: string;       // devis uniquement
  status?: string;             // invoices : conservé si valide, sinon 'Draft'. devis : toujours 'Brouillon'
  paymentMethod?: PaymentMethod; // invoices uniquement, défaut 'Nothing'
  discount?: number;           // défaut 0
  notes?: string; terms?: string;
  items: InvoiceItem[];        // requis
  recipient: {                 // requis — résolu par email (find-or-create)
    email: string;             // clé de résolution
    companyName?: string; contactPerson?: string; phone?: string;
    category?: Category; companySiret?: string; address?: Address;
  };
}

interface DevisInput { tag?: string; date?: string; validityDate?: string; recipientId: string; items: InvoiceItem[]; discount?: number; // remise globale en % (0–100), défaut 0 status?: DevisStatus; notes?: string; terms?: string; }
interface Devis extends DevisInput {
  _id: string; sender: string; recipient: Recipient; userId: string;
  total: number; totalInWords: string; devisLink?: string;
  archived: boolean; convertedToInvoiceId?: string;
  createdAt: string; updatedAt: string; isExpired: boolean; // calculé, non stocké
  // champs calculés à la volée (GET /:id uniquement) :
  totalHT?: number; discountAmount?: number; totalHTAfterDiscount?: number; totalVAT?: number; totalTTC?: number;
}

interface RecipientInput {
  contactPerson: string;          // seul champ contact requis
  email?: string;                 // optionnel — validé si fourni (format)
  phone?: string;                 // optionnel — validé si fourni (format)
  category?: Category; companyName?: string;
  country?: string;           // Pays de l'entreprise, défaut "TN" — auto-dérive le `type` fiscal en pré-save
  fiscalIdentifier?: {
    type: 'MF' | 'SIRET' | 'SIREN' | 'TVA' | 'none';   // contrôlé par enum
    value?: string;           // Optionnel et **libre** — aucune validation de format côté serveur
  };
  companySiret?: string;      // Legacy — préférer fiscalIdentifier (validé en SIRET 14 chiffres si fourni)
  vat?: number; address?: Address; notes?: string; starred?: boolean;
}
interface Recipient extends RecipientInput { _id: string; userId: string; pictureUrl: string; frequentlyContacted: boolean; deleted: boolean; createdAt: string; updatedAt: string; }

interface Profile {
  _id: string; name: string; email: string; phone?: string; companyName?: string; // _id = Firebase UID
  currency: string; language: 'fr'|'en'|'ar'; vat?: number; address?: Address;
  timbre?: { enabled: boolean; value: number; }; // droit de timbre — appliqué aux factures uniquement (y compris celles issues d'une conversion devis → facture); ex: { enabled: true, value: 0.600 }
  bankAccounts: BankAccount[]; documents: Document[]; socialLinks?: Record<string,string>;
  fiscalIdentifier?: { type: FiscalType; value: string; country: string; };
  emailVerified: boolean; // défaut false
  logoUrl?: string; isProfileComplete: boolean; // auto-calculé sur create/update
}
interface BankAccount { _id: string; bankName: string; iban: string; bic?: string; isDefault: boolean; }
interface Document { _id: string; type: DocType; url: string; name?: string; isDefault: boolean; }

interface Plan {
  name: SubPlan;
  pricing: {
    billedMonthly: { price: number };               // tarif si facturation mensuelle (montant prélevé chaque mois)
    billedYearly:  {
      pricePerMonth: number;                        // total/12 — affichage marketing
      total: number;                                // prélèvement annuel unique
      discountPercent: number;                      // remise vs (billedMonthly.price × 12), arrondi
    };
    currency: 'EUR';
  };
  limits: { invoicesPerMonth: number|null; quotesPerMonth: number|null; pdfGeneration: boolean };
}
// Tarifs payants tirés en direct de Stripe (cache 1h, source de vérité unique).
// Fallback transparent aux valeurs locales si Stripe est inaccessible.
interface SubscriptionUsage {
  plan: SubPlan; status: SubStatus;
  invoicesThisMonth: number; quotesThisMonth: number;
  invoiceLimit: number|null; quoteLimit: number|null; // null = illimité
  pdfEnabled: boolean; trialEndDate?: string;
  currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean;
}
interface ApiKey {
  _id: string; name: string; prefix: string; // 12 premiers chars (ex: "ink_a1b2c3d4")
  scopes: Scope[]; expiresAt?: string; lastUsedAt?: string;
  revoked: boolean; createdAt: string; updatedAt: string;
  // key (raw) retourné uniquement au POST — jamais stocké
}
type Scope = 'invoices:read'|'invoices:write'|'devis:read'|'devis:write'|'recipients:read'|'recipients:write'|'profile:read'|'audit:read';
```

## 6. Rate Limiting

| Limiter | Fenêtre | Max (prod) | Max (dev) | Routes |
|---|---|---|---|---|
| Global | 15 min | 300 par IP | illimité | Toutes |
| Auth | 15 min | 30 par IP | illimité | `/auth/*` |
| Mutation (disponible) | 15 min | 100 par IP | illimité | À brancher par route si nécessaire |

Headers de réponse : `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (draft-6).
Dépassement → `429 { success: false, message: "Trop de requêtes..." }`.
En dev (`NODE_ENV !== "production"`) les limiters sont désactivés pour ne pas bloquer les tests Bruno/Postman.

## 7. Comportements implicites

- **Invoice auto-status** : sur chaque GET, les factures dont `dueDate` est dépassée deviennent `Unpaid` en base (sauf `Paid`/`Cancelled`).
- **`isLate` / `isExpired`** : calculés à la volée, non stockés. `isExpired` sur devis ne change pas le statut en base.
- **Soft delete** : recipients (`deleted: true`) et devis (`archived: true`) ne sont jamais réellement supprimés.
- **Profile auto-créé** : premier `GET /profile` crée le document et démarre un trial 14j.
- **`total` et `totalInWords`** : calculés par le backend depuis `items`, `discount` et `profile.vat/currency/language`. Ne pas envoyer dans le body. Recalculés automatiquement si `items` **ou** `discount` changent via PATCH.
- **`discount`** : remise globale en % appliquée sur le total HT **avant** TVA. Optionnel, défaut `0`. Modifier via `PATCH /:id` déclenche automatiquement le recalcul du total.
- **Tag auto-généré** : si absent, `INV-YYYY-NNNN` pour les factures, `DEV-YYYY-NNNN` pour les devis. Unicité scopée par utilisateur — deux tenants peuvent avoir le même tag sans collision.
- **PDF conditionnel** : généré seulement si `pdfEnabled` du plan (`starter` = pas de PDF).
- **Limites par plan (403)** : **toutes** les routes de mutation (création, modification, suppression, duplication) vérifient l'abonnement actif. Les routes de création vérifient en plus les quotas mensuels.

| Route | Middlewares de contrôle | 403 si… |
|---|---|---|
| `POST /invoices` | `checkSubscription` → `checkInvoiceLimit` | Plan inactif / trial expiré / limite factures atteinte |
| `PATCH /invoices/:id` | `checkSubscription` | Plan inactif / trial expiré |
| `PATCH /invoices/:id/status` | `checkSubscription` | Plan inactif / trial expiré |
| `DELETE /invoices/:id` | `checkSubscription` | Plan inactif / trial expiré |
| `POST /invoices/:id/duplicate` | `checkSubscription` → `checkInvoiceLimit` | Plan inactif / trial expiré / limite factures atteinte |
| `POST /devis` | `checkSubscription` → `checkDevisLimit` | Plan inactif / trial expiré / limite devis atteinte |
| `PATCH /devis/:id` | `checkSubscription` | Plan inactif / trial expiré |
| `PATCH /devis/:id/status` | `checkSubscription` | Plan inactif / trial expiré |
| `DELETE /devis/:id` | `checkSubscription` | Plan inactif / trial expiré |
| `POST /devis/:id/convert` | `checkSubscription` → `checkInvoiceLimit` | Plan inactif / limite factures atteinte (crée une facture) |
| `POST /devis/import` | `checkSubscription` → `checkDevisLimit` | Plan inactif / trial expiré / limite devis atteinte |
| `POST /invoices/import` | `checkSubscription` | Plan inactif / trial expiré |
| `POST /recipients` | `checkSubscription` | Plan inactif / trial expiré |

- **Export/Import migration** : `GET /export` embarque le recipient inline (pas d'ObjectId). `POST /import` résout le recipient par `email` (find-or-create), recalcule le total avec la TVA du profil courant, réinitialise `invoiceLink`/`devisLink` à null (PDFs non migrés). Import partiel toléré : les records invalides sont skippés sans bloquer les suivants.

## 8. Codes HTTP
| Code | Signification |
|---|---|
| 200 | Succès |
| 201 | Ressource créée |
| 204 | Suppression OK (body minimal) |
| 400 | Validation échouée ou règle métier violée |
| 401 | Token manquant, invalide ou expiré |
| 403 | Plan inactif, trial expiré, ou limite mensuelle atteinte (factures/devis) |
| 404 | Ressource introuvable |
| 409 | Conflit (email dupliqué, tag existant, devis déjà converti) |
| 429 | Rate limit dépassé (100 req/15min global, 20 req/15min auth) |
| 500 | Erreur serveur |
| 503 | Service dégradé (MongoDB ou Firebase indisponible) |

## 9. Sécurité & Performance

| Couche | Détail |
|---|---|
| **Helmet** | Headers HTTP sécurisés : `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, etc. CSP désactivé (API JSON-only). |
| **express-mongo-sanitize** | Supprime les clés `$`, `.` dans body/query/params — bloque les injections NoSQL. |
| **hpp** | Empêche la pollution de paramètres HTTP (query dupliqués). |
| **sanitizeInput** | Middleware global : trim + strip `<>` sur body et query (anti XSS). |
| **compression** | Compression gzip/brotli sur toutes les réponses. |
| **CORS dynamique** | `CORS_ORIGINS` env var (virgules). Fallback : `localhost:4200,localhost:3000`. Header `X-API-Key` autorisé. |
| **Config centralisée** | `src/config.js` — point unique pour toutes les variables d'environnement. Aucun `process.env` direct dans les modules. |
| **Logging structuré** | Winston uniquement — aucun `console.log/error` dans `src/`. Niveaux : `debug` (dev), `info`+ (prod). |
| **Process guards** | `unhandledRejection` + `uncaughtException` → loggés via Winston, pas de crash. |
| **Puppeteer pool** | Browser Chrome singleton réutilisé. Max 3 onglets simultanés, file d'attente au-delà. ~150 Mo total au lieu de ~150 Mo/PDF. |
| **Graceful shutdown** | `SIGTERM`/`SIGINT` : stop les nouvelles connexions, attend les requêtes en cours (timeout 10s), ferme Puppeteer + MongoDB, puis exit. |

## 10. Validation d'entrée

Toutes les routes de mutation valident le body avant traitement. La validation retourne `400` avec un tableau `errors` détaillant chaque champ invalide.

| Route | Validateur | Mode |
|---|---|---|
| `POST /invoices` | `InvoiceValidator.validateInvoiceData(body)` | create |
| `PATCH /invoices/:id` | `InvoiceValidator.validateInvoiceData(body, true)` | update |
| `POST /invoices/import` | `InvoiceValidator.validateImportData(body)` | import |
| `POST /devis` | `DevisValidator.validateDevisData(body)` | create |
| `PATCH /devis/:id` | `DevisValidator.validateDevisData(body, true)` | update |
| `POST /devis/import` | `DevisValidator.validateImportData(body)` | import |
| `POST /profile` | `ProfileValidator.validateProfileData(body)` | create |
| `PATCH /profile` | `ProfileValidator.validateProfileData(body, true)` | update |
| `POST /profile/bank-accounts` | `ProfileValidator.validateBankAccount(body)` | create |
| `PATCH /profile/bank-accounts/:id` | `ProfileValidator.validateBankAccount(body)` | update |
| `POST /recipients` | `RecipientValidator.validateRecipientData(body)` | create |
| `PATCH /recipients/:id` | `RecipientValidator.validateRecipientData(body, true)` | update |

### Champs protégés (rejetés avec 400)

Les champs calculés ou système sont refusés dans le body :
- **Invoices** : `userId`, `_id`, `createdAt`, `updatedAt`, `__v`, `sender`, `total`, `totalInWords`, `invoiceLink`
- **Devis** : idem + `devisLink`, `archived`, `convertedToInvoiceId`
- **Profile** : `_id`, `userId`, `createdAt`, `updatedAt`, `__v`

### Limites applicables

| Champ | Min | Max |
|---|---|---|
| `items` (tableau) | 1 | 100 |
| `item.label` | 1 car | 200 car |
| `item.quantity` | 0.01 | 999 999 |
| `item.unitPrice` | 0 | 99 999 999 |
| `discount` | 0% | 100% |
| `description` | — | 500 car |
| `notes` / `terms` | — | 2 000 car |
| `tag` | — | 50 car |
| `import records` | 1 | 500 |

## 11. Tests

| Type | Outil | Couverture | Commande |
|---|---|---|---|
| Unitaires | Mocha + Chai | 36 tests : `calculateInvoiceTotal`, `numberToWords`, `sanitizeInput`, `ResponseFormatter`, `config` | `NODE_ENV=development npm test` |
| API / intégration | Bruno CLI | 68 scénarios couvrant toutes les routes | `npx @usebruno/cli run --env local bruno/` |

## 11. Bugs corrigés

| Route | Était | Corrigé |
|---|---|---|
| `POST /devis` | Aucune vérification de plan ni de limite — création illimitée | `checkSubscription` + `checkDevisLimit` ajoutés |
| `PATCH/DELETE /invoices/:id` | Aucun `checkSubscription` — trial expiré pouvait modifier/supprimer | `checkSubscription` ajouté |
| `PATCH/DELETE /devis/:id` | Aucun `checkSubscription` — trial expiré pouvait modifier/archiver | `checkSubscription` ajouté |
| `POST /invoices/:id/duplicate` | Aucun `checkSubscription` ni `checkInvoiceLimit` — duplication illimitée | `checkSubscription` + `checkInvoiceLimit` ajoutés |
| `POST /devis/import` | `checkSubscription` sans `checkDevisLimit` — import contournait les quotas | `checkDevisLimit` ajouté |
| `POST /invoices/:id/duplicate` | Crash 500 — `total` non recalculé | Recalcul via `calculateInvoiceTotal` + `numberToWords` |
| `POST /devis/:id/convert` | ECONNRESET — PDF background sans `.catch()` | `.catch(() => {})` sur tous les `setImmediate` + process guards |
| `POST /devis/:id/convert` | Droit de timbre absent — recopiait `devis.total` / `devis.totalInWords` (le devis n'inclut pas le timbre) → facture sous-évaluée si `profile.timbre.enabled = true` | Recalcul via `calculateInvoiceTotal(items, vat, discount, timbreValue)` + `numberToWords` avant création Invoice |
| `PATCH /invoices/:id/status` | Crash 500 — `INVOICE_STATUSES` indéfini | `INVOICE_STATUSES = Object.values(InvoiceStatus)` |
| `GET /invoices/:id/download` | Route morte (après `module.exports`) | Déplacée avant `module.exports` |
| `GET /invoices/:id/audit` | Route morte (après `module.exports`) | Déplacée avant `module.exports` |
| `GET /profile/documents/default` | Masquée par `DELETE /documents/:id` | Enregistrée avant la route `:id` |
| Toutes les routes invoices | Réponses raw `res.send()` / `res.status().send()` | `ResponseFormatter` uniforme |
| Toutes les routes profile | `handleError` custom avec format `{ error }` | `ResponseFormatter` uniforme |
| `devis.js` — catch blocks | Status 400 pour erreurs serveur | Status 500 |
| `CompanyName` (virtual) dans devis/invoices | Accès au virtual au lieu de `companyName` | `companyName` |
