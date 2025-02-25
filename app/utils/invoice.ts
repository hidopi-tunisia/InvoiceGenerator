import { Invoice, InvoiceItem } from '../schema/invoice';

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
