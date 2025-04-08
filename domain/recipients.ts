import { ENDPOINT, HTTPMethod } from '../constants';
import { getAuthorization } from './authorization';

type Filters = {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
};
const getRecipients = async (filters?: Filters) => {
  const token = await getAuthorization();
  const params = new URLSearchParams(filters);
  const response = await fetch(`${ENDPOINT}/recipients?${params}`, {
    method: HTTPMethod.GET,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

type CreateRecipientPayload = {
  name?: string;
  address?: string;
  email?: string;
  vat?: number;
};
const createRecipient = async (payload: CreateRecipientPayload) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/recipients`, {
    method: HTTPMethod.POST,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
};

const getRecipientById = async (id: string) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/recipients/${id}`, {
    method: HTTPMethod.GET,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

type UpdateRecipientPayload = {
  name?: string;
  address?: string;
  email?: string;
  vat?: number;
};
const updateRecipientById = async (id: string, payload: UpdateRecipientPayload) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/recipients/${id}`, {
    method: HTTPMethod.PATCH,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
};

const removeRecipient = async (id: string) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/recipients/${id}`, {
    method: HTTPMethod.DELETE,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

export {
  getRecipients,
  createRecipient,
  getRecipientById,
  updateRecipientById,
  removeRecipient,
};
