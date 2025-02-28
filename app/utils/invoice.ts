import { Invoice, InvoiceItem } from '../schema/invoice';

import { useStore } from '~/store';

const getSubtotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
};

const getTotal = (items: InvoiceItem[]) => {
  const subtotal = getSubtotal(items);
  const total = subtotal;
  return total;
};

export const getTotals = (invoice: Partial<Invoice>) => {
  const items = invoice.items || [];
  const subtotal = getSubtotal(items);
  const total = getTotal(items);

  return { subtotal, total };
};

const INVOICE_NUMBER_PREFIX = 'INV';
const INVOICE_NUMBER_FORMAT = `${INVOICE_NUMBER_PREFIX}-{SEQ3}{MM}{YY}`;

export const generateInvoiceNumber = (): string => {
  const invoices = useStore.getState().invoices;
  const now = new Date();

  // 1. Trouver le dernier numéro séquentiel du mois courant
  const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const currentYear = now.getFullYear().toString().slice(-2);

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
