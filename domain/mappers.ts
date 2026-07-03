import { InvoiceItem } from '../app/schema/invoice';
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
