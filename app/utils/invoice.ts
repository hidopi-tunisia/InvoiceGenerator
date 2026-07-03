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

const INVOICE_NUMBER_PREFIX = 'INV';

// Format : INV-{SEQ3}{MM}{YY}
export const generateInvoiceNumber = (): string => {
  const invoices = useStore.getState().invoices;
  const now = new Date();

  // 1. Trouver le dernier numéro séquentiel du mois courant
  const lastInvoice = invoices
    .filter((invoice) => {
      const invoiceDate = new Date(invoice.invoiceDate);
      return (
        invoiceDate.getMonth() + 1 === now.getMonth() + 1 &&
        invoiceDate.getFullYear() === now.getFullYear()
      );
    })
    .sort(
      (a, b) =>
        parseInt((b.invoiceNumber || '').split('-')[1]?.substring(0, 3) || '0', 10) -
        parseInt((a.invoiceNumber || '').split('-')[1]?.substring(0, 3) || '0', 10)
    )[0];

  // 2. Calculer le prochain numéro séquentiel
  const lastSeq = lastInvoice
    ? parseInt((lastInvoice.invoiceNumber?.split('-')[1] || '000').substring(0, 3), 10)
    : 0;

  const sequentialNumber = (lastSeq + 1).toString().padStart(3, '0');

  // 3. Construction du numéro complet
  return `INV-${sequentialNumber}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear().toString().slice(-2)}`;
};

// Fonction de validation du format
export const validateInvoiceNumber = (invoiceNumber: string): boolean => {
  const regex = new RegExp(`^${INVOICE_NUMBER_PREFIX}-\\d{3}(0[1-9]|1[0-2])\\d{2}$`);
  return regex.test(invoiceNumber);
};
