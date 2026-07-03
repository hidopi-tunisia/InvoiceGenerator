import { request } from './http';
import { BackendInvoiceItem, BackendInvoiceStatus } from './mappers';
import { toQueryParams } from './query';

// Types alignés sur le contrat API.md §4-5 (routes /invoices).

export type InvoiceFilters = {
  page?: number;
  limit?: number;
  status?: BackendInvoiceStatus;
  tag?: string;
  recipient?: string;
  startDate?: string; // ISO — utilisé pour la sync différentielle (API.md §15.8)
  endDate?: string;
  dueDate?: string;
  sortBy?: 'date' | 'dueDate' | 'total' | 'createdAt' | 'tag';
  sortOrder?: 'asc' | 'desc';
};

export type BackendRecipientRef = {
  _id: string;
  companyName?: string;
  contactPerson?: string;
  email?: string;
};

export type BackendInvoice = {
  _id: string;
  tag: string;
  userId: string;
  recipient: BackendRecipientRef;
  items: BackendInvoiceItem[];
  discount?: number;
  status: BackendInvoiceStatus;
  total: number; // calculé par le backend — fait foi une fois synchronisé
  totalInWords: string;
  date: string;
  dueDate?: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
  isLate: boolean; // calculé à la volée par le backend
  downloadUrl?: string; // PDF Cloudinary si le plan a pdfEnabled
};

// Ne JAMAIS envoyer total/totalInWords/sender : champs protégés → 400 (API.md §10)
export type InvoiceInput = {
  tag?: string; // le numéro local est conservé s'il est unique pour l'utilisateur
  date?: string;
  dueDate?: string;
  recipientId: string;
  items: BackendInvoiceItem[];
  discount?: number;
  status?: BackendInvoiceStatus;
  paymentMethod?: string;
  notes?: string;
  terms?: string;
};

const getInvoices = (filters?: InvoiceFilters) =>
  request<BackendInvoice[]>(`/invoices?${toQueryParams(filters)}`);

const getInvoiceById = (id: string) => request<BackendInvoice>(`/invoices/${id}`);

const createInvoice = (payload: InvoiceInput) =>
  request<BackendInvoice>('/invoices', { method: 'POST', body: payload });

const updateInvoiceById = (id: string, payload: Partial<InvoiceInput>) =>
  request<BackendInvoice>(`/invoices/${id}`, { method: 'PATCH', body: payload });

const updateInvoiceStatus = (id: string, status: BackendInvoiceStatus) =>
  request<BackendInvoice>(`/invoices/${id}/status`, { method: 'PATCH', body: { status } });

const removeInvoice = (id: string) =>
  request<{ id: string }>(`/invoices/${id}`, { method: 'DELETE' });

export {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceById,
  updateInvoiceStatus,
  removeInvoice,
};
