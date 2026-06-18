// Backends (préfixe /api/v1 requis par le contrat API.md)
// - Staging (Render) : accessible partout
// - Local : http://localhost:3000 sur la machine de dev.
//   Depuis un ÉMULATEUR Android, `localhost` = l'émulateur lui-même → utiliser 10.0.2.2
//   Sur iOS simulator, `localhost` fonctionne directement.
export const API_BASE = {
  STAGING: 'https://invoice-backend-qq9j.onrender.com/api/v1',
  LOCAL: 'http://localhost:3000/api/v1',
  LOCAL_ANDROID_EMULATOR: 'http://10.0.2.2:3000/api/v1',
} as const;

// Surcharge possible via EXPO_PUBLIC_API_URL (.env). Défaut : staging.
export const ENDPOINT = process.env.EXPO_PUBLIC_API_URL ?? API_BASE.STAGING;
export const HTTPMethod = {
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

export const InvoiceStatus = {
  DRAFT: "Draft",
  PENDING: "Pending",
  PAID: "Paid",
  PARTIAL_PAYMENT: "Partial_Payment",
  OVERDUE: "Overdue",
  CANCELLED: "Overdue",
  REJECTED: "Rejected",
  REFUNDED: "Refunded",
};
