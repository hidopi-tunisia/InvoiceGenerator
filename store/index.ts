import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { Invoice, BusinessEntity, InvoiceInfo, InvoiceItem } from '~/app/schema/invoice';

export type InvoiceState = {
  newInvoice: Partial<Invoice> | null;
  startNewInvoice: () => void;
  resetNewInvoice: () => void;
  addSenderInfo: (sender: BusinessEntity) => void;
  addRecipientInfo: (recipient: BusinessEntity) => void;
  addInvoiceInfo: (invoiceInfo: InvoiceInfo) => void;
  addItems: (items: InvoiceItem[]) => void;
  getSubtotal: () => number;
  getTotal: () => number;
};

export const useStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      newInvoice: null,
      startNewInvoice: () =>
        set(() => ({
          newInvoice: {
            items: [{ name: 'Prestation 1', quantity: 1, price: 100 }],
            invoiceDate: new Date(),
            invoiceDueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
          },
        })), // Objet pour stocker les données
      resetNewInvoice: () => set(() => ({ newInvoice: null })),
      addSenderInfo: (sender) => set((state) => ({ newInvoice: { ...state.newInvoice, sender } })), // Clé "senderInfo"
      addRecipientInfo: (recipient) =>
        set((state) => ({ newInvoice: { ...state.newInvoice, recipient } })), // Clé "recipientInfo"
      addInvoiceInfo: (invoiceInfo) =>
        set((state) => ({ newInvoice: { ...state.newInvoice, invoiceInfo } })), // Clé "invoiceInfo"
      addItems: (items) => set((state) => ({ newInvoice: { ...state.newInvoice, items } })), // Clé "tableau des items"
      getSubtotal: () => {
        const items = get().newInvoice?.items || [];
        return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      },
      getTotal: () => {
        const subtotal = get().getSubtotal();
        return subtotal;
      },
    }),
    { name: 'facture-store', getStorage: () => Storage }
  )
);
