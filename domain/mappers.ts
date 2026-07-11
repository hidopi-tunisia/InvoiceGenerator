import * as Crypto from 'expo-crypto';

import type { BackendInvoice, InvoiceInput } from './invoices';
import type { BackendProfile, ProfileInput } from './profile';
import type { BackendRecipient, RecipientInput } from './recipients';
import type { BusinessEntity, Invoice, InvoiceItem } from '../app/schema/invoice';
// import type obligatoire : app/utils/invoice importe le store → un import
// valeur créerait un cycle de modules au bundling.
import type { InvoiceDisplayStatus } from '../app/utils/invoice';

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
 * 'en attente' → 'Pending' (et non 'Unpaid' : côté web, Unpaid s'affiche
 * « Non payé » — le backend bascule lui-même Pending → Unpaid quand
 * l'échéance est dépassée, API.md §7). « en retard » n'est jamais poussé :
 * statut dérivé de l'échéance des deux côtés.
 */
export const toBackendStatus = (
  status?: 'payée' | 'en attente' | 'en retard'
): BackendInvoiceStatus => (status === 'payée' ? 'Paid' : 'Pending');

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

// ---------------------------------------------------------------------------
// Facture locale ↔ Invoice backend.
//   invoiceNumber ↔ tag (conservé par le serveur s'il est unique)
//   invoiceDate/invoiceDueDate ↔ date/dueDate (ISO)
//   recipient ↔ recipientId (ObjectId du contact — il doit être poussé avant)
// Le statut stocké localement reste 'payée' | 'en attente' ('en retard' est
// dérivé de l'échéance des deux côtés — jamais persisté).
// Jamais total/totalInWords/sender dans le body (champs protégés → 400).
// ---------------------------------------------------------------------------

const toIsoDate = (value?: Date | string) => (value ? new Date(value).toISOString() : undefined);

/** Facture locale → body POST/PATCH /invoices. */
export const toBackendInvoiceInput = (
  invoice: Invoice,
  recipientRemoteId: string
): InvoiceInput => ({
  tag: invoice.invoiceNumber || undefined,
  date: toIsoDate(invoice.invoiceDate),
  dueDate: toIsoDate(invoice.invoiceDueDate),
  recipientId: recipientRemoteId,
  items: toBackendItems(invoice.items),
  discount: invoice.discount || undefined,
  status: toBackendStatus(invoice.status),
});

/**
 * Invoice backend → facture locale (pull). Le destinataire est relié au
 * contact local par remoteId quand il existe, sinon reconstruit a minima.
 * `sender` = profil local (le backend le déduit du token, il n'expose que l'id).
 */
export const fromBackendInvoice = (
  remote: BackendInvoice,
  localContacts: BusinessEntity[],
  localProfile: BusinessEntity
): Invoice => {
  const recipient =
    localContacts.find((c) => c.remoteId === remote.recipient?._id) ??
    ({
      id: Crypto.randomUUID(),
      name: remote.recipient?.companyName || remote.recipient?.contactPerson || 'Client',
      address: '',
      email: remote.recipient?.email || undefined,
      remoteId: remote.recipient?._id,
    } as BusinessEntity);

  return {
    id: Crypto.randomUUID(), // id local — le lien serveur est remoteId
    invoiceNumber: remote.tag,
    invoiceDate: new Date(remote.date),
    invoiceDueDate: remote.dueDate ? new Date(remote.dueDate) : undefined,
    sender: localProfile,
    recipient,
    items: fromBackendItems(remote.items ?? []),
    discount: remote.discount || undefined,
    status: remote.status === 'Paid' || remote.status === 'Refunded' ? 'payée' : 'en attente',
    remoteId: remote._id,
    remotePdfUrl: remote.downloadUrl || undefined,
    syncedAt: new Date().toISOString(),
    dirty: false,
  };
};

// ---------------------------------------------------------------------------
// Contact local (BusinessEntity) ↔ Recipient backend.
// Résolution locale ↔ serveur : par remoteId, sinon par email (API.md §15.15).
//   name (local)     ↔ companyName + contactPerson (le local n'a qu'un nom)
//   address (string) ↔ address.street
//   tva              ↔ fiscalIdentifier.value (type libre côté recipients)
// ---------------------------------------------------------------------------

/** Contact local → body POST/PATCH /recipients (contactPerson est requis). */
export const toBackendRecipientInput = (contact: BusinessEntity): RecipientInput => ({
  contactPerson: contact.name,
  companyName: contact.name,
  email: contact.email || undefined,
  address: contact.address ? { street: contact.address } : undefined,
  fiscalIdentifier: contact.tva ? { type: 'none', value: contact.tva } : undefined,
});

/** Recipient backend → contact local (pull) : marqué propre (dirty: false). */
export const fromBackendRecipient = (remote: BackendRecipient): BusinessEntity => {
  const addressParts = [
    remote.address?.street,
    remote.address?.zip,
    remote.address?.city,
    remote.address?.country,
  ].filter(Boolean);
  return {
    id: Crypto.randomUUID(), // id local — le lien serveur est remoteId
    name: remote.companyName || remote.contactPerson,
    address: addressParts.join(', '),
    email: remote.email || undefined,
    tva: remote.fiscalIdentifier?.value || undefined,
    remoteId: remote._id,
    syncedAt: new Date().toISOString(),
    dirty: false,
  };
};

/** Profil local → body PATCH/POST /profile (jamais de champs protégés). */
export const toBackendProfileInput = (profile: BusinessEntity): ProfileInput => {
  // Adresse : n'envoyer l'objet que si au moins un champ est renseigné
  const hasAddress = !!(profile.address || profile.zipCode || profile.city || profile.country);
  const address = hasAddress
    ? {
        street: profile.address || undefined,
        zip: profile.zipCode || undefined,
        city: profile.city || undefined,
        country: profile.country || undefined,
      }
    : undefined;

  // Identifiant fiscal : SIRET pour FR, MF pour TN — TVA n'est plus poussé ici
  let fiscalIdentifier: ProfileInput['fiscalIdentifier'] = undefined;
  if (profile.country === 'FR' && profile.siret) {
    fiscalIdentifier = { type: 'SIRET', value: profile.siret, country: 'FR' };
  } else if (profile.country === 'TN' && profile.mf) {
    fiscalIdentifier = { type: 'MF', value: profile.mf, country: 'TN' };
  }

  return {
    companyName: profile.name || undefined,
    currency: profile.currency || undefined,
    language: profile.language === 'en' ? 'en' : 'fr',
    vat: profile.taxRate,
    phone: profile.phone || undefined,
    address,
    fiscalIdentifier,
  };
};

/**
 * Profil backend → champs locaux (bootstrap d'un utilisateur venu du front
 * Angular : store mobile vierge mais profil serveur renseigné). Ne retourne
 * que les champs non vides — le merge préserve le reste du profil local.
 * Adresse répartie : street → address, zip → zipCode, city → city.
 * fiscalIdentifier : SIRET → siret, MF → mf, TVA → tva (rétro-compat).
 */
export const fromBackendProfile = (remote: BackendProfile): Partial<BusinessEntity> => {
  const local: Partial<BusinessEntity> = {};
  const name = remote.companyName || remote.name;
  if (name) local.name = name;
  if (remote.currency) local.currency = remote.currency;
  if (remote.language) local.language = remote.language;
  if (remote.vat !== undefined) local.taxRate = remote.vat;
  if (remote.phone) local.phone = remote.phone;
  if (remote.logoUrl) local.logoUrl = remote.logoUrl;

  // Adresse structurée (répartie — plus de concaténation)
  if (remote.address?.street) local.address = remote.address.street;
  if (remote.address?.zip) local.zipCode = remote.address.zip;
  if (remote.address?.city) local.city = remote.address.city;

  // Pays : priorité fiscalIdentifier.country, sinon address.country
  const country = remote.fiscalIdentifier?.country || remote.address?.country;
  if (country) local.country = country;

  // Identifiant fiscal : type détermine le champ local cible
  if (remote.fiscalIdentifier?.value) {
    switch (remote.fiscalIdentifier.type) {
      case 'SIRET':
      case 'SIREN':
        local.siret = remote.fiscalIdentifier.value;
        break;
      case 'MF':
        local.mf = remote.fiscalIdentifier.value;
        break;
      case 'TVA':
        // Rétro-compat : les anciennes valeurs poussées en type TVA restent dans tva
        local.tva = remote.fiscalIdentifier.value;
        break;
      default:
        break;
    }
  }

  return local;
};
