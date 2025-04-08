import { ENDPOINT, HTTPMethod, InvoiceStatus } from '../constants';
import { getAuthorization } from './authorization';

type Filters = {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
  sender?: string;
  recipient?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  tag?: string;
};
const getInvoices = async (filters?: Filters) => {
  const token = await getAuthorization();
  const params = new URLSearchParams(filters);
  const response = await fetch(`${ENDPOINT}/invoices?${params}`, {
    method: HTTPMethod.GET,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

const createInvoice = async (payload: any) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/invoices`, {
    method: HTTPMethod.POST,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return response.json();
};

const getInvoiceById = async (id: string) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/invoices/${id}`, {
    method: HTTPMethod.GET,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

const updateInvoiceById = async (id: string, payload: any) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/invoices/${id}`, {
    method: HTTPMethod.PATCH,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return response.json();
};

const removeInvoice = async (id: string) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/invoices/${id}`, {
    method: HTTPMethod.DELETE,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

export {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoiceById,
  removeInvoice,
};
