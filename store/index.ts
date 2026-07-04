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
  // Sync backend (phase 5) : date ISO du dernier pull différentiel réussi
  lastSyncAt: string | null;
  setLastSyncAt: (date: string) => void;

  //Contacts :
  contacts: BusinessEntity[];
  addContact: (contact: BusinessEntity) => void; // Fonction d'ajout de contact (dirty par défaut)
  deleteContact: (id: BusinessEntity) => void; // Fonction de suppression de contact
  updateContact: (contact: Partial<BusinessEntity> & { id: string }) => void; // fusionne (préserve remoteId/syncedAt)
  //getSingleInvoice: (invoice: Invoice) => Invoice | undefined;
  updateInvoice: (invoice: Invoice) => void;
  // Fonction de mise à jour de facture
  //updateInvoiceStatus: (invoiceId: string, newStatus: 'payée' | 'en attente' | 'en retard') => void;
  setProfile: (profile: Partial<BusinessEntity>) => void; // fusionne avec l'existant
  setCountry: (country: string) => void;
  setLanguage: (language: string) => void;
  setCurrency: (currency: string) => void;
  setTaxRate: (rate: number) => void;
  startNewInvoice: () => void;
  resetNewInvoice: () => void;
  saveInvoice: () => void;
  deleteInvoice: (invoice: Invoice) => void;
  addInvoice: (invoice: Invoice) => void; // ré-insertion (undo de suppression)
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

// État de données par défaut — utilisé à la création du store ET par
// store/user-scope.ts pour réinitialiser avant de réhydrater le tiroir
// d'un autre utilisateur (cloisonnement par uid).
export const createInitialData = () => ({
  profile: {
    id: Crypto.randomUUID(),
    name: '',
    address: '',
    tva: '',
    currency: 'TND', // Devise par défaut
    taxRate: 20, // Taux TVA par défaut
    country: '',
    language: '',
  } as BusinessEntity,
  onboardingStep: 'index' as const,
  onboardingCompleted: false,
  lastReviewRequestAt: null,
  lastSyncAt: null,
  invoices: [] as Invoice[],
  newInvoice: null,
  contacts: [] as BusinessEntity[],
});

export const useStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),
      // PROFILE
      // Fusion (pas remplacement) : l'étape profil de l'onboarding et settings/edit
      // n'envoient que name/address/tva — ne pas écraser country/language/currency/taxRate.
      setProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
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
            items: [],
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
        set((state) => ({ newInvoice: { ...state.newInvoice, ...invoiceInfo } })), // À plat : le récap et le PDF lisent invoiceNumber/dates à la racine
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
      // SYNC
      setLastSyncAt: (date) => set(() => ({ lastSyncAt: date })),
      // CONTACTS
      deleteContact: (contact) => {
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== contact.id),
        }));
      },
      // Fusion : les écrans n'envoient que les champs métier — remoteId/syncedAt
      // sont préservés. dirty est posé sauf si l'appelant (sync) le fixe explicitement.
      updateContact: (contact) => {
        set((state) => ({
          contacts: state.contacts.map((c) =>
            c.id === contact.id ? { ...c, ...contact, dirty: contact.dirty ?? true } : c
          ),
        }));
      },
      addContact: (contact) => {
        // Vérifiez si l'ID existe déjà dans les contacts
        if (!get().contacts.some((c) => c.id === contact.id)) {
          set((state) => ({
            // dirty par défaut : un contact créé localement doit être poussé
            contacts: [{ dirty: true, ...contact }, ...state.contacts],
          }));
        }
      },
      deleteInvoice: (invoice) => {
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== invoice.id),
        }));
      },
      addInvoice: (invoice) => {
        if (!get().invoices.some((inv) => inv.id === invoice.id)) {
          set((state) => ({ invoices: [invoice, ...state.invoices] }));
        }
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
      setCurrency: (currency) => set((state) => ({ profile: { ...state.profile, currency } })),
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
      // La clé est repointée sur `facture-store-{uid}` à la connexion
      // (store/user-scope.ts) — celle-ci n'est que le point de départ anonyme.
      name: 'facture-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Pas d'hydratation automatique au chargement du module : elle lirait la
      // clé héritée et pourrait résoudre APRÈS le scoping par uid (course).
      // Seul store/user-scope.ts réhydrate, explicitement, sur la bonne clé.
      skipHydration: true,
      version: 2, // sans version explicite, zustand n'appelle jamais migrate()
      migrate: (persistedState: any, version) => {
        // Migration pour les utilisateurs existants
        if (persistedState?.profile && !persistedState.profile.currency) {
          persistedState.profile.currency = 'TND';
        }
        // v1 : les champs édités à l'étape 1 du wizard vivaient sous invoice.invoiceInfo ;
        // on les fusionne à la racine (ce sont les valeurs réellement saisies par l'utilisateur).
        const flattenInvoiceInfo = (invoice: any) => {
          if (invoice?.invoiceInfo) {
            const { invoiceInfo, ...rest } = invoice;
            return { ...rest, ...invoiceInfo };
          }
          return invoice;
        };
        if (Array.isArray(persistedState?.invoices)) {
          persistedState.invoices = persistedState.invoices.map(flattenInvoiceInfo);
        }
        if (persistedState?.newInvoice) {
          persistedState.newInvoice = flattenInvoiceInfo(persistedState.newInvoice);
        }
        // v2 : métadonnées de sync — tout l'existant est antérieur au backend,
        // donc marqué dirty pour être poussé lors de la première synchronisation.
        if (version < 2) {
          const markDirty = (entity: any) => ({ ...entity, dirty: true });
          if (Array.isArray(persistedState?.invoices)) {
            persistedState.invoices = persistedState.invoices.map(markDirty);
          }
          if (Array.isArray(persistedState?.contacts)) {
            persistedState.contacts = persistedState.contacts.map(markDirty);
          }
          persistedState.lastSyncAt = null;
        }
        return persistedState as InvoiceState;
      },
    }
  )
);
