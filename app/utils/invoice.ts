import { Invoice } from '../schema/invoice';

import { useStore } from '~/store';

const round2 = (n: number) => Math.round(n * 100) / 100;

// Le taux et la devise sont figés sur la facture à sa création ;
// le profil ne sert que de fallback pour les factures antérieures à ces champs.
export const getTotals = (invoice: Partial<Invoice>) => {
  const items = invoice.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxRate = invoice.taxRate ?? useStore.getState().profile.taxRate ?? 0;
  const tax = subtotal * (taxRate / 100);

  return {
    subtotal: round2(subtotal),
    taxRate,
    tax: round2(tax),
    total: round2(subtotal + tax),
  };
};

export const getInvoiceCurrency = (invoice?: Partial<Invoice>): string =>
  invoice?.currency ?? useStore.getState().profile.currency ?? 'TND';

export type InvoiceDisplayStatus = 'payée' | 'en attente' | 'en retard';

// Statut affiché : « en retard » est dérivé de la date d'échéance au moment de
// l'affichage (jamais persisté) — le statut stocké reste 'en attente' | 'payée'.
export const getDisplayStatus = (invoice: Partial<Invoice>): InvoiceDisplayStatus => {
  if (invoice.status === 'payée') return 'payée';
  if (invoice.invoiceDueDate && new Date(invoice.invoiceDueDate) < new Date()) return 'en retard';
  return 'en attente';
};

// Couleur unique par statut, partagée par la liste et le détail.
export const getStatusColor = (status: InvoiceDisplayStatus): string => {
  switch (status) {
    case 'payée':
      return 'bg-green-500';
    case 'en retard':
      return 'bg-red-500';
    default:
      return 'bg-yellow-500';
  }
};

// Format monétaire unique de l'app : fr-FR, 2 décimales, espaces normales
// (les insécables étroites de fr-FR rendent mal dans certaines polices RN).
export const formatAmount = (amount: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(/[\u00a0\u202f]/g, ' ');

// La génération/validation du numéro vit dans ./invoice-number (module pur, sans
// dépendance au store) pour éviter le cycle store ↔ utils/invoice. Re-exporté ici
// pour compatibilité des imports existants.
export { generateInvoiceNumber, validateInvoiceNumber } from './invoice-number';

// Format de date unique de l'app : dd/mm/yyyy (fr-FR), indépendant de la
// locale du device (un simulateur en anglais afficherait mm/dd/yyyy).
export const formatDate = (value: Date | string): string =>
  new Date(value).toLocaleDateString('fr-FR');
