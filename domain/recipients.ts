import { request } from './http';
import { toQueryParams } from './query';

// Types alignés sur le contrat API.md §4-5 (routes /recipients).
// La résolution locale ↔ backend d'un contact se fait par email (API.md §15.15).

export type BackendAddress = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export type RecipientFilters = {
  page?: number;
  limit?: number;
  search?: string;
  starred?: boolean;
  category?: 'Entreprise' | 'Particulier';
};

export type RecipientInput = {
  contactPerson: string; // seul champ contact requis
  email?: string;
  phone?: string;
  category?: 'Entreprise' | 'Particulier';
  companyName?: string;
  country?: string; // défaut "TN" côté serveur — dérive le type fiscal
  fiscalIdentifier?: { type: 'MF' | 'SIRET' | 'SIREN' | 'TVA' | 'none'; value?: string };
  vat?: number;
  address?: BackendAddress;
  notes?: string;
  starred?: boolean;
};

export type BackendRecipient = RecipientInput & {
  _id: string;
  userId: string;
  deleted: boolean; // soft delete côté serveur
  createdAt: string;
  updatedAt: string;
};

const getRecipients = (filters?: RecipientFilters) =>
  request<BackendRecipient[]>(`/recipients?${toQueryParams(filters)}`);

/** Recherche plein-texte serveur (min 2 caractères). */
const searchRecipients = (q: string) =>
  request<BackendRecipient[]>(`/recipients/search?${toQueryParams({ q })}`);

const getRecipientById = (id: string) => request<BackendRecipient>(`/recipients/${id}`);

const createRecipient = (payload: RecipientInput) =>
  request<BackendRecipient>('/recipients', { method: 'POST', body: payload });

/** PATCH minimal : n'envoyer que les champs modifiés (API.md §15.7). */
const updateRecipientById = (id: string, payload: Partial<RecipientInput>) =>
  request<BackendRecipient>(`/recipients/${id}`, { method: 'PATCH', body: payload });

const removeRecipient = (id: string) =>
  request<{ id: string }>(`/recipients/${id}`, { method: 'DELETE' });

export {
  getRecipients,
  searchRecipients,
  getRecipientById,
  createRecipient,
  updateRecipientById,
  removeRecipient,
};
