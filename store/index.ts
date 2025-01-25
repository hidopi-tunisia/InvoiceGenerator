import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { Invoice, BusinessEntity, InvoiceInfo, InvoiceItem } from '~/app/schema/invoice';

export type InvoiceState = {
  profile: BusinessEntity; //BusinessEntity --> fort possible je vais la modifier avec un nouveau Entity qui contiendra Logo, Currency etc ...
  newInvoice: Partial<Invoice> | null;
  onboardingCompleted: boolean;
  setProfile: (profile: BusinessEntity) => void;
  startNewInvoice: () => void;
  resetNewInvoice: () => void;
  setOnboardingCompleted: () => void;
  //addSenderInfo: (sender: BusinessEntity) => void;
  addRecipientInfo: (recipient: BusinessEntity) => void;
  addInvoiceInfo: (invoiceInfo: InvoiceInfo) => void;
  addItems: (items: InvoiceItem[]) => void;
  getSubtotal: () => number;
  getTotal: () => number;
};

export const useStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      profile: {
        name: '',
        address: '',
        tva: '',
      },
      onboardingCompleted: false,
      newInvoice: null,
      // PROFILE
      setProfile: (profile) => set(() => ({ profile })), // pour tomber sur la page de profile de onbording il faut mettre "onboardingCompleted: true" et cliquer sur "Enregistrer" puis la supprimer puis Reloader l'app
      setOnboardingCompleted: () => set(() => ({ onboardingCompleted: true })), // Objet pour stocker les données

      // FACTURE
      startNewInvoice: () =>
        set(() => ({
          newInvoice: {
            sender: get().profile,
            items: [{ name: 'Prestation 1', quantity: 1, price: 100 }],
            invoiceDate: new Date(),
            invoiceDueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
          },
        })), // Objet pour stocker les données
      resetNewInvoice: () => set(() => ({ newInvoice: null })),
      //addSenderInfo: (sender) => set((state) => ({ newInvoice: { ...state.newInvoice, sender } })), // Clé "senderInfo"
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
    {
      name: 'facture-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
