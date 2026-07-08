import { z } from 'zod';

export const businessEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string({ required_error: 'Le nom est obligatoire' }).min(1, 'Le nom est obligatoire'),
  address: z
    .string({ required_error: "L'adresse postale est obligatoire" })
    .min(1, "L'adresse obligatoire"),
  tva: z.string().optional(),
  siret: z.string().optional(),
  email: z.string().optional(),
  currency: z.string().optional(),
  taxRate: z.number().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  // Métadonnées de sync backend (jamais saisies en formulaire)
  remoteId: z.string().optional(), // ObjectId côté serveur — le local garde son UUID
  syncedAt: z.string().optional(), // ISO du dernier push/pull réussi
  dirty: z.boolean().optional(), // modification locale non poussée
  syncError: z.string().optional(), // dernier échec de push non-réseau (400/5xx) à corriger
});

//BusinessEntity : une entité autrement dit, c'est les info de l'entreprise qui va facturer à son client.

export type BusinessEntity = z.infer<typeof businessEntitySchema>;

// Les informations d'une facture (numero, date de la facture et date de fin de paiement)
export const InvoiceInfoSchema = z
  .object({
    invoiceNumber: z
      .string({ required_error: 'Le numéro de facture est obligatoire' })
      .min(1, 'Le numéro de facture est obligatoire'),
    // coerce : les dates viennent tantôt du picker natif, tantôt de la
    // persistance JSON (chaîne) → on accepte Date | chaîne | timestamp.
    invoiceDate: z.coerce.date({
      required_error: 'La date de facture est obligatoire',
      invalid_type_error: 'La date de facture doit être une date valide',
    }),
    invoiceDueDate: z.coerce
      .date({
        invalid_type_error: "La date d'échéance doit être une date valide",
      })
      .optional(),
  })
  .refine((data) => !data.invoiceDueDate || data.invoiceDueDate >= data.invoiceDate, {
    message: "L'échéance doit être postérieure ou égale à la date de facture",
    path: ['invoiceDueDate'],
  });
export type InvoiceInfo = z.infer<typeof InvoiceInfoSchema>;

// Désignations :

// Définition du schéma Zod pour validation
export const invoiceItemSchema = z.object({
  name: z.string({ required_error: 'Le nom est obligatoire' }).min(1, 'Le nom est obligatoire'),
  quantity: z
    .number({ required_error: 'La quantité est obligatoire' })
    .min(1, 'La quantité est obligatoire'),
  price: z.number({ required_error: 'Le prix est obligatoire' }).min(1, 'Le prix est obligatoire'),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

//type Items = z.infer<typeof itemsSchema>

export type Invoice = InvoiceInfo & {
  id: string;
  sender: BusinessEntity;
  recipient: BusinessEntity;
  items: InvoiceItem[];
  status?: 'payée' | 'en attente' | 'en retard';
  // Figés à la création depuis le profil (une facture émise ne change pas de taux/devise)
  taxRate?: number;
  currency?: string;
  // Métadonnées de sync backend
  remoteId?: string; // ObjectId côté serveur — le local garde son UUID
  syncedAt?: string; // ISO du dernier push/pull réussi
  dirty?: boolean; // modification locale non poussée
  syncError?: string; // dernier échec de push non-réseau (400/5xx) à corriger
  remotePdfUrl?: string; // PDF Cloudinary (si le plan a pdfGeneration) — prioritaire sur expo-print
};
