import { ENDPOINT, HTTPMethod } from '../constants';
import { getAuthorization } from './authorization';

type Filters = {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
};
const getSenders = async (filters?: Filters) => {
  const token = await getAuthorization();
  const params = new URLSearchParams(filters);
  const response = await fetch(`${ENDPOINT}/senders?${params}`, {
    method: HTTPMethod.GET,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

type CreateSenderPayload = {
  name: string;
  address: string;
  vat: number;
};
const createSender = async (payload: CreateSenderPayload) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/senders`, {
    method: HTTPMethod.POST,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    mode: 'cors',
    body: JSON.stringify(payload),
  });
  return response.json();
};

const getSenderById = async (id: string) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/senders/${id}`, {
    method: HTTPMethod.GET,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

type UpdateSenderPayload = {
  name?: string;
  address?: string;
  vat?: number;
};
const updateSenderById = async (id: string, payload: UpdateSenderPayload) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/senders/${id}`, {
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

const removeSender = async (id: string) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/senders/${id}`, {
    method: HTTPMethod.DELETE,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

export {
  getSenders,
  createSender,
  getSenderById,
  updateSenderById,
  removeSender,
};
