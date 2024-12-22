import { create } from 'zustand';

import { Invoice, BusinessEntity, InvoiceInfo, InvoiceItem } from '~/app/schema/invoice';

export type InvoiceState = {
  newInvoice: Partial<Invoice>;
  addSenderInfo: (sender: BusinessEntity) => void;
  addRecipientInfo: (recipient: BusinessEntity) => void;
  addInvoiceInfo: (invoiceInfo: InvoiceInfo) => void;
  addItems: (items: InvoiceItem[]) => void;
  getSubtotal: () => number;
  getTotal: () => number;
};

export const useStore = create<InvoiceState>((set, get) => ({
  newInvoice: {}, // Objet pour stocker les données
  addSenderInfo: (sender) => set((state) => ({ newInvoice: { ...state.newInvoice, sender } })), // Clé "senderInfo"
  addRecipientInfo: (recipient) =>
    set((state) => ({ newInvoice: { ...state.newInvoice, recipient } })), // Clé "recipientInfo"
  addInvoiceInfo: (invoiceInfo) =>
    set((state) => ({ newInvoice: { ...state.newInvoice, invoiceInfo } })), // Clé "invoiceInfo"
  addItems: (items) => set((state) => ({ newInvoice: { ...state.newInvoice, items } })), // Clé "tableau des items"
  getSubtotal: () => {
    const items = get().newInvoice.items || [];
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  },
  getTotal: () => {
    const subtotal = get().getSubtotal();
    return subtotal;
  },
}));
