import { BackendProfile, ProfileInput } from './profile';
import { BusinessEntity, InvoiceItem } from '../app/schema/invoice';
import { InvoiceDisplayStatus } from '../app/utils/invoice';

// ---------------------------------------------------------------------------
// Table de conversion UNIQUE local ↔ backend (API.md §15.14).
// Jamais de mapping inline dans un écran ou un module domain.
// ---------------------------------------------------------------------------

/** Statuts backend (API.md §5). */
export type BackendInvoiceStatus =
  | 'Draft'
  | 'Pending'
  | 'Paid'
  | 'Partial_Payment'
  | 'Overdue'
  | 'Cancelled'
  | 'Rejected'
  | 'Refunded'
  | 'Unpaid';

/** Item backend (API.md §5) — le local utilise { name, quantity, price }. */
export type BackendInvoiceItem = { label: string; quantity: number; unitPrice: number };

/**
 * Statut local → backend (pour les POST/PATCH).
 * « en retard » n'est jamais poussé : c'est un statut dérivé de l'échéance —
 * le backend fait pareil (auto-status `Unpaid` + `isLate`, API.md §7).
 */
export const toBackendStatus = (
  status?: 'payée' | 'en attente' | 'en retard'
): BackendInvoiceStatus => (status === 'payée' ? 'Paid' : 'Unpaid');

/**
 * Statut backend → statut d'affichage local. `isLate` (calculé par le backend
 * sur chaque GET) prime sur le statut stocké pour les impayées.
 */
export const fromBackendStatus = (
  status: BackendInvoiceStatus,
  isLate = false
): InvoiceDisplayStatus => {
  if (status === 'Paid' || status === 'Refunded') return 'payée';
  if (status === 'Overdue' || isLate) return 'en retard';
  return 'en attente';
};

export const toBackendItems = (items: InvoiceItem[]): BackendInvoiceItem[] =>
  items.map((item) => ({ label: item.name, quantity: item.quantity, unitPrice: item.price }));

export const fromBackendItems = (items: BackendInvoiceItem[]): InvoiceItem[] =>
  items.map((item) => ({ name: item.label, quantity: item.quantity, price: item.unitPrice }));

// ---------------------------------------------------------------------------
// Profil local (BusinessEntity du store) ↔ Profile backend.
// Correspondances retenues :
//   name (local)      ↔ companyName (le nom affiché sur les factures)
//   taxRate           ↔ vat (taux en %)
//   tva (identifiant) ↔ fiscalIdentifier.value (type dérivé du pays)
//   address (string)  ↔ address.street (le local ne structure pas l'adresse)
//   country           ↔ fiscalIdentifier.country + address.country
// ---------------------------------------------------------------------------

const fiscalTypeForCountry = (country?: string): 'MF' | 'TVA' | 'none' => {
  if (country === 'TN') return 'MF';
  if (country === 'FR') return 'TVA';
  return 'none';
};

/** Profil local → body PATCH/POST /profile (jamais de champs protégés). */
export const toBackendProfileInput = (profile: BusinessEntity): ProfileInput => ({
  companyName: profile.name || undefined,
  currency: profile.currency || undefined,
  language: profile.language === 'en' ? 'en' : 'fr',
  vat: profile.taxRate,
  address: profile.address
    ? { street: profile.address, country: profile.country || undefined }
    : undefined,
  fiscalIdentifier: profile.tva
    ? {
        type: fiscalTypeForCountry(profile.country),
        value: profile.tva,
        country: profile.country || 'TN',
      }
    : undefined,
});

/**
 * Profil backend → champs locaux (bootstrap d'un utilisateur venu du front
 * Angular : store mobile vierge mais profil serveur renseigné). Ne retourne
 * que les champs non vides — le merge préserve le reste du profil local.
 */
export const fromBackendProfile = (remote: BackendProfile): Partial<BusinessEntity> => {
  const local: Partial<BusinessEntity> = {};
  const name = remote.companyName || remote.name;
  if (name) local.name = name;
  if (remote.currency) local.currency = remote.currency;
  if (remote.language) local.language = remote.language;
  if (remote.vat !== undefined) local.taxRate = remote.vat;
  if (remote.fiscalIdentifier?.value) local.tva = remote.fiscalIdentifier.value;
  const country = remote.fiscalIdentifier?.country || remote.address?.country;
  if (country) local.country = country;
  const addressParts = [
    remote.address?.street,
    remote.address?.zip,
    remote.address?.city,
    remote.address?.country,
  ].filter(Boolean);
  if (addressParts.length) local.address = addressParts.join(', ');
  return local;
};
