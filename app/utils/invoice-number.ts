import type { Invoice } from '../schema/invoice';

// Module PUR (aucune dépendance au store) : le store l'importe pour
// `startNewInvoice` sans créer de cycle store ↔ utils/invoice.

const INVOICE_NUMBER_PREFIX = 'INV';

// Format aligné sur le backend : INV-YYYY-NNNN (séquence annuelle sur 4 chiffres).
// `invoices` est passé par l'appelant (le store) : il contient aussi les factures
// rapatriées du serveur (pull), donc le max + la boucle anti-collision couvrent
// les deux origines.
export const generateInvoiceNumber = (invoices: Pick<Invoice, 'invoiceNumber'>[]): string => {
  const year = new Date().getFullYear();
  const prefix = `${INVOICE_NUMBER_PREFIX}-${year}-`;
  const yearPattern = new RegExp(`^${INVOICE_NUMBER_PREFIX}-${year}-(\\d{4})$`);

  const maxSeq = invoices.reduce((max, invoice) => {
    const match = invoice.invoiceNumber?.match(yearPattern);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  // Anti-duplication : des numéros importés/serveur peuvent créer des trous
  // ou des doublons hors séquence — on avance jusqu'au premier numéro libre.
  const existing = new Set(invoices.map((invoice) => invoice.invoiceNumber));
  let seq = maxSeq + 1;
  while (existing.has(`${prefix}${String(seq).padStart(4, '0')}`)) {
    seq += 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

export const validateInvoiceNumber = (invoiceNumber: string): boolean =>
  new RegExp(`^${INVOICE_NUMBER_PREFIX}-\\d{4}-\\d{4}$`).test(invoiceNumber);
