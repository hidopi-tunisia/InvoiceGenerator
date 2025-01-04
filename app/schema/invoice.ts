import { z } from 'zod';

export const businessEntitySchema = z.object({
  name: z.string({ required_error: 'Le nom est obligatoire' }).min(1, 'Le nom est obligatoire'),
  address: z
    .string({ required_error: "L'adresse postale est obligatoire" })
    .min(1, "L'adresse obligatoire"),
  tva: z.string().optional(),
  email: z.string().optional(),
});

//BusinessEntity : une entité autrement dit, c'est les info de l'entreprise qui va facturer à son client.

export type BusinessEntity = z.infer<typeof businessEntitySchema>;

// Les informations d'une facture (numero, date de la facture et date de fin de paiement)
export const InvoiceInfoSchema = z.object({
  invoiceNumber: z
    .string({ required_error: 'Le numéro de facture est obligatoire' })
    .min(1, 'Le numéro de facture est obligatoire'),
  invoiceDate: z.date({
    required_error: 'La date de facture est obligatoire',
    invalid_type_error: 'La date de facture doit être une date valide',
  }),
  invoiceDueDate: z
    .date({
      invalid_type_error: "La date d'échéance doit être une date valide",
    })
    .optional(),
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
  //invoiceInfo: InvoiceInfo; // Ajout explicite
  sender: BusinessEntity;
  recipient: BusinessEntity;
  items: InvoiceItem[];
};
