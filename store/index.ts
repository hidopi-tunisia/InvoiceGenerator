import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { Invoice, BusinessEntity, InvoiceInfo, InvoiceItem } from '~/app/schema/invoice';
import { generateInvoiceNumber } from '~/app/utils/invoice';

export type InvoiceState = {
  onboardingStep: 'index' | 'profile' | 'tax' | 'completed';
  //Profile
  profile: BusinessEntity; //BusinessEntity --> fort possible je vais la modifier avec un nouveau Entity qui contiendra Logo, Currency etc ...
  newInvoice: Partial<Invoice> | null;
  invoices: Invoice[];
  onboardingCompleted: boolean;
  //Review
  lastReviewRequestAt: Date | null;

  //Contacts :
  contacts: BusinessEntity[];
  addContact: (contact: BusinessEntity) => void; // Fonction d'ajout de contact
  deleteContact: (id: BusinessEntity) => void; // Fonction de suppression de contact
  updateContact: (contact: BusinessEntity) => void; // Fonction de mise à jour de contact
  //getSingleInvoice: (invoice: Invoice) => Invoice | undefined;
  updateInvoice: (invoice: Invoice) => void;
  // Fonction de mise à jour de facture
  //updateInvoiceStatus: (invoiceId: string, newStatus: 'payée' | 'en attente' | 'en retard') => void;
  setProfile: (profile: BusinessEntity) => void;
  setCountry: (country: string) => void;
  setLanguage: (language: string) => void;
  setTaxRate: (rate: number) => void;
  startNewInvoice: () => void;
  resetNewInvoice: () => void;
  saveInvoice: () => void;
  deleteInvoice: (invoice: Invoice) => void;
  setOnboardingCompleted: () => void;
  //addSenderInfo: (sender: BusinessEntity) => void;
  addRecipientInfo: (recipient: BusinessEntity | null) => void;
  addInvoiceInfo: (invoiceInfo: InvoiceInfo) => void;
  addItems: (items: InvoiceItem[]) => void;
  // getSubtotal: () => number;
  // getTotal: () => number;
  setLastReviewRequestAt: (date: Date) => void;
  nextOnboardingStep: () => void;
  previousOnboardingStep: () => void;
};

export const useStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      profile: {
        id: Crypto.randomUUID(),
        name: '',
        address: '',
        tva: '',
        currency: 'TND', // Devise par défaut
        taxRate: 20, // Taux TVA par défaut
        country: '',
        language: '',
      },
      onboardingStep: 'index', // Valeur initiale
      onboardingCompleted: false,
      lastReviewRequestAt: null,
      invoices: [],
      newInvoice: null,
      contacts: [], // Initialisation du contacts
      // PROFILE
      setProfile: (profile) => set(() => ({ profile })), // pour tomber sur la page de profile de onbording il faut mettre "onboardingCompleted: true" et cliquer sur "Enregistrer" puis la supprimer puis Reloader l'app
      completeOnboarding: () =>
        set({
          onboardingCompleted: true,
          onboardingStep: 'completed',
        }),
      setOnboardingStep: (step: 'index' | 'profile' | 'tax' | 'completed') =>
        set({ onboardingStep: step }),
      setOnboardingCompleted: () => set(() => ({ onboardingCompleted: true })), // Objet pour stocker les données

      // FACTURE
      startNewInvoice: () =>
        set(() => ({
          newInvoice: {
            id: Crypto.randomUUID(),
            invoiceNumber: generateInvoiceNumber(),
            sender: get().profile,
            items: [{ name: 'Prestation 1', quantity: 1, price: 100 }],
            invoiceDate: new Date(),
            invoiceDueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
            status: 'en attente',
            taxRate: get().profile.taxRate,
            currency: get().profile.currency,
          },
        })), // Objet pour stocker les données
      resetNewInvoice: () => set(() => ({ newInvoice: null })),

      //addSenderInfo: (sender) => set((state) => ({ newInvoice: { ...state.newInvoice, sender } })), // Clé "senderInfo"
      addRecipientInfo: (recipient) =>
        set((state) => ({
          newInvoice: { ...state.newInvoice, recipient: recipient || undefined },
        })), // Clé "recipientInfo"
      addInvoiceInfo: (invoiceInfo) =>
        set((state) => ({ newInvoice: { ...state.newInvoice, invoiceInfo } })), // Clé "invoiceInfo"
      addItems: (items) => set((state) => ({ newInvoice: { ...state.newInvoice, items } })), // Clé "tableau des items"
      saveInvoice: () => {
        const newInvoice = get().newInvoice as Invoice;
        if (!newInvoice) {
          return; // Si la facture n'existe pas, ne rien faire
        }
        set((state) => ({
          invoices: [newInvoice, ...state.invoices],
          newInvoice: null,
        }));
        // Ajoute le contact du destinataire dans contacts s'il n'existe pas
        if (newInvoice.recipient) {
          get().addContact(newInvoice.recipient);
        }
      },
      // REVIEW REQUEST
      setLastReviewRequestAt: (date) => set(() => ({ lastReviewRequestAt: date })), // Clé pour stocker les données du dernier avis de faire un feedback
      // CONTACTS
      deleteContact: (contact) => {
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== contact.id),
        }));
      },
      updateContact: (contact) => {
        set((state) => ({
          contacts: state.contacts.map((c) => (c.id === contact.id ? contact : c)),
        }));
      }, // Fonction de mise à jour de contact
      addContact: (contact) => {
        // Vérifiez si l'ID existe déjà dans les contacts
        if (!get().contacts.some((c) => c.id === contact.id)) {
          set((state) => ({
            contacts: [contact, ...state.contacts],
          }));
        }
      },
      deleteInvoice: (invoice) => {
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== invoice.id),
        }));
      },
      updateInvoice: (updatedInvoice) => {
        set((state) => ({
          invoices: state.invoices.map((invoice) =>
            invoice.id === updatedInvoice.id ? updatedInvoice : invoice
          ),
        }));
      },
      setCountry: (country) => set((state) => ({ profile: { ...state.profile, country } })),
      setLanguage: (language) => set((state) => ({ profile: { ...state.profile, language } })),
      setTaxRate: (taxRate) => set((state) => ({ profile: { ...state.profile, taxRate } })),
      nextOnboardingStep: () => {
        const steps: InvoiceState['onboardingStep'][] = ['index', 'profile', 'tax', 'completed'];
        const current = steps.indexOf(get().onboardingStep);
        if (current < steps.length - 1) {
          set({ onboardingStep: steps[current + 1] });
        }
      },
      previousOnboardingStep: () => {
        const steps: InvoiceState['onboardingStep'][] = ['index', 'profile', 'tax', 'completed'];
        const current = steps.indexOf(get().onboardingStep);
        if (current > 0) {
          set({ onboardingStep: steps[current - 1] });
        }
      },
    }),
    {
      name: 'facture-store',
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any) => {
        // Migration pour les utilisateurs existants
        if (persistedState?.profile && !persistedState.profile.currency) {
          persistedState.profile.currency = 'TND';
        }
        return persistedState as InvoiceState;
      },
    }
  )
);
// Fonction utilitaire pour générer les totaux
const getTotals = (items: InvoiceItem[], taxRate: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const tax = subtotal * (taxRate / 100);
  return {
    subtotal: Number(subtotal.toFixed(2)),
    total: Number((subtotal + tax).toFixed(2)),
  };
};
