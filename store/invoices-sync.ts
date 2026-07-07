import * as Sentry from '@sentry/react-native';

import { syncContactById } from './contacts-sync';
import { queueDeletion } from './deletions-sync';
import { useStore } from './index';
import type { Invoice } from '../app/schema/invoice';
import {
  ApiError,
  ConflictError,
  NotFoundError,
  QuotaError,
  reportSyncError,
} from '../domain/http';
import {
  createInvoice,
  getInvoices,
  updateInvoiceById,
  updateInvoiceStatus,
  type BackendInvoice,
} from '../domain/invoices';
import { fromBackendInvoice, toBackendInvoiceInput, toBackendStatus } from '../domain/mappers';

// ---------------------------------------------------------------------------
// Sync des factures (phase 4 du chantier backend).
// Offline-first : tout échec est silencieux — les factures dirty seront
// retentées au prochain boot. Dépendance : le contact destinataire doit être
// poussé d'abord (POST /invoices exige son ObjectId serveur).
// Un 403 (quota du plan atteint) laisse la facture dirty — l'upsell arrive
// en phase 6.
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 20; // API.md §15.5 : toujours paginer

/** Retrouve le contact local correspondant au destinataire de la facture. */
const resolveRecipientContact = (invoice: Invoice) => {
  const { contacts } = useStore.getState();
  return (
    contacts.find((c) => c.id === invoice.recipient?.id) ??
    (invoice.recipient?.email
      ? contacts.find((c) => c.email?.toLowerCase() === invoice.recipient.email?.toLowerCase())
      : undefined)
  );
};

/** Garantit que le contact destinataire a un remoteId (le pousse au besoin). */
const ensureRecipientRemoteId = async (invoice: Invoice): Promise<string | null> => {
  let contact = resolveRecipientContact(invoice);
  if (!contact) return null;
  if (!contact.remoteId) {
    await syncContactById(contact.id);
    contact = useStore.getState().contacts.find((c) => c.id === contact!.id);
  }
  return contact?.remoteId ?? null;
};

const markSynced = (invoiceId: string, remote: BackendInvoice) => {
  const store = useStore.getState();
  store.updateInvoice({
    id: invoiceId,
    remoteId: remote._id,
    remotePdfUrl: remote.downloadUrl || undefined,
    syncedAt: new Date().toISOString(),
    dirty: false,
    syncError: undefined, // un push réussi efface un éventuel échec précédent
  });
  // Un push réussi prouve qu'il reste du quota → on lève la bannière.
  if (store.quotaReached) store.setQuotaReached(false);
};

/** Pousse une facture locale (création ou mise à jour selon remoteId). */
const pushInvoice = async (invoice: Invoice): Promise<void> => {
  const recipientRemoteId = await ensureRecipientRemoteId(invoice);
  if (!recipientRemoteId) {
    // Le destinataire n'a pas pu être synchronisé : la facture reste dirty.
    // On le signale — c'est une cause fréquente de « facture absente du web ».
    Sentry.captureMessage('Invoice push skipped: recipient has no remoteId', {
      level: 'warning',
      tags: { area: 'sync', operation: 'pushInvoice' },
      extra: { invoiceNumber: invoice.invoiceNumber, recipientName: invoice.recipient?.name },
    });
    return;
  }

  const payload = toBackendInvoiceInput(invoice, recipientRemoteId);

  try {
    if (invoice.remoteId) {
      try {
        const { data: updated } = await updateInvoiceById(invoice.remoteId, payload);
        markSynced(invoice.id, updated);
        return;
      } catch (error) {
        // Supprimée côté serveur : on abandonne le remoteId et on recrée.
        if (!(error instanceof NotFoundError)) throw error;
      }
    }
    const { data: created } = await createInvoice(payload);
    markSynced(invoice.id, created);
  } catch (error) {
    // 409 = tag (numéro) déjà pris côté serveur : on recrée sans tag,
    // le serveur en génère un (INV-YYYY-NNNN) qu'on adopte au pull.
    if (error instanceof ConflictError) {
      try {
        const { data: created } = await createInvoice({ ...payload, tag: undefined });
        markSynced(invoice.id, created);
      } catch (retryError) {
        reportSyncError('pushInvoice.conflictRetry', retryError);
      }
      return;
    }
    // QuotaError (403) : facture locale (dirty) → bannière upsell (Réglages > Abonnement).
    if (error instanceof QuotaError) {
      useStore.getState().setQuotaReached(true);
      return;
    }
    // Validation (400) / 5xx : marqué sur la facture (indicateur « non synchronisée »)
    // pour que l'utilisateur puisse corriger, + remonté pour diagnostic.
    if (error instanceof ApiError) {
      useStore.getState().updateInvoice({ id: invoice.id, syncError: error.message });
    }
    reportSyncError('pushInvoice', error);
  }
};

/** Pousse toutes les factures locales modifiées (dirty). */
export const pushDirtyInvoices = async (): Promise<void> => {
  const dirtyInvoices = useStore.getState().invoices.filter((inv) => inv.dirty !== false);
  for (const invoice of dirtyInvoices) {
    await pushInvoice(invoice);
  }
};

/** Push du changement de statut (« marquer payée ») — endpoint dédié. */
export const pushInvoiceStatus = async (invoiceId: string): Promise<void> => {
  const invoice = useStore.getState().invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) return;
  if (!invoice.remoteId) {
    await pushInvoice(invoice); // jamais poussée : le POST embarque déjà le statut
    return;
  }
  try {
    const { data: updated } = await updateInvoiceStatus(
      invoice.remoteId,
      toBackendStatus(invoice.status)
    );
    markSynced(invoice.id, updated);
  } catch (error) {
    reportSyncError('pushInvoiceStatus', error); // reste dirty, retenté au boot
  }
};

/** Met la suppression en file (persistée) : rejouée jusqu'au succès. */
export const pushInvoiceDeletion = (invoice: Invoice): void => {
  queueDeletion('invoice', invoice.remoteId);
};

/** Rapatrie toutes les pages de factures (volume borné : celles d'un utilisateur). */
const fetchAllInvoices = async (): Promise<BackendInvoice[]> => {
  const all: BackendInvoice[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, pagination } = await getInvoices({ page, limit: PAGE_LIMIT });
    all.push(...(data ?? []));
    totalPages = pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return all;
};

/**
 * Pull + merge : factures serveur (y compris créées depuis le front Angular)
 * → store local. Résolution par remoteId puis par tag (numéro). Une facture
 * locale `dirty` gagne (elle sera poussée) ; sinon le serveur fait foi.
 */
export const pullInvoices = async (): Promise<void> => {
  const remotes = await fetchAllInvoices();
  const { invoices, contacts, profile, addInvoice, updateInvoice } = useStore.getState();

  for (const remote of remotes) {
    const local =
      invoices.find((inv) => inv.remoteId === remote._id) ??
      invoices.find((inv) => inv.invoiceNumber === remote.tag);

    if (!local) {
      addInvoice(fromBackendInvoice(remote, contacts, profile));
      continue;
    }
    if (local.dirty) continue; // modification locale en attente : elle gagne

    const mapped = fromBackendInvoice(remote, contacts, profile);
    updateInvoice({ ...mapped, id: local.id, recipient: local.recipient ?? mapped.recipient });
  }
};

/** Cycle complet : push des modifications locales puis pull du serveur. */
export const syncInvoices = async (): Promise<void> => {
  try {
    await pushDirtyInvoices();
    await pullInvoices();
  } catch (error) {
    reportSyncError('syncInvoices', error); // l'app continue en local
  }
};

/** Push d'une seule facture après sauvegarde (fire-and-forget). */
export const syncInvoiceById = async (id: string): Promise<void> => {
  const invoice = useStore.getState().invoices.find((inv) => inv.id === id);
  if (invoice) await pushInvoice(invoice);
};
