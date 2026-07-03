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

### Senders — ⚠️ legacy, ne pas consommer depuis l'app

> ⚠️ Routes historiques **non conformes** : réponses brutes (`res.send`) hors `ResponseFormatter`, erreurs 400 pour des erreurs serveur, aucun validator. L'émetteur d'une facture = le **Profile** ; l'app mobile ne doit consommer que `/profile`. Conservées uniquement pour compatibilité, à déprécier.

| M | Route | Auth | Réponse (brute, non enveloppée) |
|---|---|---|---|
| GET | `/senders` | ✅ Firebase | `{ senders: Sender[] }` |
| GET | `/senders/:id` | ✅ Firebase | `Sender` — 404 texte brut si absent |
| POST | `/senders` | ✅ Firebase | `Sender` (201) |
| PATCH | `/senders/:id` | ✅ Firebase | `Sender` |
| DELETE | `/senders/:id` | ✅ Firebase | `Sender` supprimé |

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

## 12. Bugs corrigés

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

## 13. Conventions de requête

### Headers standard

| Header | Direction | Usage |
|---|---|---|
| `Authorization: Bearer <token>` | → | Auth Firebase (toutes routes protégées) |
| `X-API-Key: ink_...` | → | Auth alternative (routes data uniquement, cf. matrice §2) |
| `Content-Type: application/json` | → | Toutes les mutations (sauf multipart : `/profile/logo`, `/profile/documents`) |
| `Accept-Encoding: gzip` | → | Compression (automatique avec fetch/axios) |
| `RateLimit-Limit / -Remaining / -Reset` | ← | Quotas de rate limiting (draft-6) |

### Pagination

Toutes les routes de liste (`GET /invoices`, `/devis`, `/recipients`, `/audit/timeline`) :

- Query : `page` (défaut `1`) · `limit` (défaut `10`, **max 100** — toute valeur supérieure est plafonnée).
- Réponse : `{ success, data: [], pagination: { total, page, limit, totalPages }, timestamp }`.
- Fin de liste atteinte quand `page >= totalPages`.

### Tri

- Query : `sortBy` (champ whitelisté : `date`, `dueDate`, `total`, `createdAt`, `tag`) + `sortOrder` (`asc` | `desc`).
- Défaut : `createdAt desc` (plus récent en premier).
- Champ non whitelisté → ignoré silencieusement (retombe sur le défaut), jamais d'erreur.

### Filtrage

- Filtres par query params **whitelistés uniquement** (statut, dates, tag, recipient…) — un paramètre inconnu est ignoré, jamais passé brut à MongoDB.
- Dates : format ISO 8601 (`2026-07-01` ou `2026-07-01T00:00:00.000Z`), bornes `startDate`/`endDate` inclusives.
- Recherche plein-texte : `GET /recipients/search?q=` (min 2 caractères) — index texte MongoDB, insensible à la casse.
- Combinables : `GET /invoices?status=Paid&startDate=2026-01-01&sortBy=total&sortOrder=desc&page=1&limit=20`.

### Versionnement

- Version actuelle : **v1** — toutes les routes data sous `/api/v1`. Endpoints hors version : `/info`, `/ready`, `/docs` (opérationnels, contrat non garanti).
- Changement **rétrocompatible** (champ ajouté, filtre ajouté) → reste en v1. Changement **cassant** (champ renommé/supprimé, format modifié) → nouvelle racine `/api/v2`, v1 maintenue le temps de la migration des clients mobiles (les apps installées ne se mettent pas à jour instantanément — règle absolue pour une app store).
- Le client mobile envoie sa version d'app (`expo-application`) dans un header `X-App-Version` (branché dans `domain/http.ts` le 2026-07-04) pour permettre les stats d'adoption avant tout retrait de v1.

## 14. Exemples JSON

### Créer une facture — `POST /api/v1/invoices`

Requête (seuls `recipientId` et `items` sont requis ; ne **jamais** envoyer `total`/`totalInWords`/`sender`) :

```json
{
  "recipientId": "6650f2a9c1e4a12b34567890",
  "date": "2026-07-02",
  "dueDate": "2026-07-16",
  "items": [
    { "label": "Développement site vitrine", "quantity": 1, "unitPrice": 1200 },
    { "label": "Maintenance mensuelle", "quantity": 3, "unitPrice": 80 }
  ],
  "discount": 10,
  "paymentMethod": "Bank Transfer",
  "notes": "Merci pour votre confiance."
}
```

Réponse `201` :

```json
{
  "success": true,
  "message": "Facture créée avec succès",
  "data": {
    "_id": "6684a1b2c3d4e5f678901234",
    "tag": "INV-2026-0042",
    "userId": "fWq8...uid",
    "sender": "fWq8...uid",
    "recipient": { "_id": "6650f2a9c1e4a12b34567890", "companyName": "ACME SARL", "contactPerson": "Sami Ben Ali", "email": "sami@acme.tn" },
    "items": [
      { "label": "Développement site vitrine", "quantity": 1, "unitPrice": 1200 },
      { "label": "Maintenance mensuelle", "quantity": 3, "unitPrice": 80 }
    ],
    "discount": 10,
    "status": "Draft",
    "total": 1545.55,
    "totalInWords": "mille cinq cent quarante-cinq dinars et cinq cent cinquante millimes",
    "date": "2026-07-02T00:00:00.000Z",
    "dueDate": "2026-07-16T00:00:00.000Z",
    "createdAt": "2026-07-02T09:14:00.000Z",
    "updatedAt": "2026-07-02T09:14:00.000Z"
  },
  "timestamp": "2026-07-02T09:14:00.000Z"
}
```

### Liste paginée — `GET /api/v1/invoices?status=Unpaid&page=1&limit=20`

```json
{
  "success": true,
  "data": [
    { "_id": "…", "tag": "INV-2026-0041", "status": "Unpaid", "isLate": true, "total": 890, "recipient": { "companyName": "ACME SARL" }, "dueDate": "2026-06-15T00:00:00.000Z" }
  ],
  "pagination": { "total": 37, "page": 1, "limit": 20, "totalPages": 2 },
  "timestamp": "2026-07-02T09:15:00.000Z"
}
```

### Erreur de validation — `400`

```json
{
  "success": false,
  "message": "Données invalides",
  "errors": [
    { "field": "items", "message": "Au moins un article est requis" },
    { "field": "recipientId", "message": "Format invalide pour 'recipientId'" }
  ],
  "timestamp": "2026-07-02T09:16:00.000Z"
}
```

### Quota atteint — `403`

```json
{
  "success": false,
  "message": "Limite mensuelle de factures atteinte pour le plan trial (10/10). Passez à un plan supérieur.",
  "errors": null,
  "timestamp": "2026-07-02T09:17:00.000Z"
}
```

## 15. Intégration mobile React Native (Myfakto)

> **Règles à respecter le jour où les endpoints sont branchés à l'app** (`domain/` → UI). L'app reste local-first : le backend synchronise, il ne remplace pas AsyncStorage.

### Résilience réseau (Render = cold starts)

1. **Timeout obligatoire** sur chaque appel : `AbortController` à 15 s (le cold start Render peut prendre 30 s+ — au-delà de 15 s, considérer le backend indisponible et continuer en local).
2. **Warm-up** : au lancement de l'app (utilisateur connecté), un `GET /info` fire-and-forget réchauffe l'instance avant la première vraie requête.
3. **Retry** : 1 retry avec backoff (2 s) **uniquement sur les GET** (idempotents). Jamais de retry automatique sur POST/PATCH/DELETE — risque de doublon (le double-tap mobile s'ajoute au problème : désactiver le bouton dès le premier press).
4. Toute erreur réseau est **non bloquante** : l'app continue sur les données locales, bannière discrète « Synchronisation impossible », jamais d'écran d'erreur plein page.

### Consommation efficace (batterie / data)

5. **Toujours paginer** : `limit=20` par défaut dans `domain/`, jamais de fetch de liste complète.
6. **Dashboard = 1 appel** : utiliser `GET /invoices/stats` pour l'accueil (résumé, CA, clients) au lieu de rapatrier toutes les factures et calculer côté client.
7. **PATCH minimal** : n'envoyer que les champs modifiés (diff), jamais l'objet entier — et jamais les champs protégés (§10 : `total`, `totalInWords`, `sender`…) qui provoquent un 400.
8. **Sync différentielle** : filtrer par `startDate` = date de dernière sync plutôt que tout re-télécharger (`updatedAt` est présent sur toutes les entités).
9. La compression gzip est active côté serveur — utiliser `fetch` standard (la supporte nativement), pas d'upload base64 (multipart pour logo/documents).

### Auth & erreurs

10. **Token** : `auth.currentUser.getIdToken()` (le SDK gère le cache/refresh) via `domain/authorization.ts` — jamais de token stocké manuellement. Sur `401 TOKEN_EXPIRED` : `getIdToken(true)` (force refresh) puis **un seul** retry ; si échec → re-login.
11. **Parser unique** : un helper `domain/http.ts` qui gère timeout, enveloppe `{ success, data, pagination, errors }`, et mappe les codes → erreurs typées (`ValidationError[400]`, `AuthError[401]`, `QuotaError[403]`, `ConflictError[409]`, `RateLimitError[429]`). Les écrans ne voient jamais un `Response` brut.
12. **403 = upsell, pas erreur** : `QuotaError` déclenche l'écran d'abonnement (plans via `GET /subscription/plans`, checkout Stripe via `expo-web-browser`), pas un toast d'erreur.
13. **400 `errors[]` → formulaires** : mapper `{ field, message }` vers `setError(field)` de React Hook Form (la notation pointée `address.zip` correspond aux noms de champs RHF).

### Mapping local ↔ backend (pièges connus)

14. **Statuts** : backend en anglais (`Paid`, `Unpaid`, `Overdue`…), store local en français (`'payée'`, `'en attente'`, `'en retard'`). Table de conversion **unique** dans `domain/` — jamais de mapping inline dans un écran.
15. **Identifiants** : local = UUID (expo-crypto), backend = ObjectId. Conserver les deux (`id` local + `remoteId`) dans le store pour la réconciliation ; résoudre les contacts par **email** (même clé que l'import backend).
16. **Émetteur** : ne jamais envoyer `sender` — le backend le déduit du token (= Profile). Le profil local se synchronise via `/profile` (auto-créé + trial 14 j au premier GET).
17. **PDF** : si `pdfEnabled` du plan → utiliser `downloadUrl` (PDF serveur Cloudinary, source de vérité) ; sinon fallback génération locale expo-print. Ne pas maintenir deux PDFs divergents pour la même facture.
18. **Champs calculés** (`total`, `isLate`, `totalTTC`…) : toujours faire confiance au backend une fois synchronisé ; le calcul local n'est que l'aperçu offline.
