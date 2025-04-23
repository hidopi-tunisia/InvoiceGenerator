import { HTTPMethod } from '../constants'; // ENDPOINT et getAuthorization sont gérés par fetchApi
import fetchApi from '~/app/utils/apiClient'; // Importer le nouveau client API

type Filters = {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
};
const getRecipients = async (filters?: Filters) => {
  // Convertir les filtres en chaîne de requête
  // Attention: URLSearchParams attend Record<string, string> ou [string, string][]
  // Il faudra peut-être ajuster la conversion en fonction du type réel de Filters
  const params = new URLSearchParams(filters as Record<string, string>).toString();
  const path = params ? `/recipients?${params}` : '/recipients';
  return fetchApi(path, { method: HTTPMethod.GET });
};

type CreateRecipientPayload = {
  name?: string;
  address?: string;
  email?: string;
  vat?: number;
};
const createRecipient = async (payload: CreateRecipientPayload) => {
  return fetchApi('/recipients', {
    method: HTTPMethod.POST,
    body: JSON.stringify(payload),
  });
};

const getRecipientById = async (id: string) => {
  return fetchApi(`/recipients/${id}`, { method: HTTPMethod.GET });
};

type UpdateRecipientPayload = {
  name?: string;
  address?: string;
  email?: string;
  vat?: number;
};
const updateRecipientById = async (id: string, payload: UpdateRecipientPayload) => {
  return fetchApi(`/recipients/${id}`, {
    method: HTTPMethod.PATCH,
    body: JSON.stringify(payload),
  });
};

const removeRecipient = async (id: string) => {
  // fetchApi gère la réponse 204 No Content et retourne null dans ce cas
  return fetchApi(`/recipients/${id}`, { method: HTTPMethod.DELETE });
};

export {
  getRecipients,
  createRecipient,
  getRecipientById,
  updateRecipientById,
  removeRecipient,
};
