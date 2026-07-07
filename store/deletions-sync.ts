import { useStore } from './index';
import { ApiError, NotFoundError, reportSyncError } from '../domain/http';
import { removeInvoice } from '../domain/invoices';
import { removeRecipient } from '../domain/recipients';

// ---------------------------------------------------------------------------
// File de suppressions distantes en attente. Une suppression hors
// ligne perd son enregistrement local ET son remoteId : sans tombstone
// persisté, l'orphelin serveur ne serait jamais résorbé.
// ---------------------------------------------------------------------------

export type DeletionEntity = 'invoice' | 'contact';

export type PendingDeletion = {
  entity: DeletionEntity;
  remoteId: string; // ObjectId serveur de l'entité à supprimer
  enqueuedAt: string; // ISO — pour diagnostic
};

const remover: Record<DeletionEntity, (remoteId: string) => Promise<unknown>> = {
  invoice: removeInvoice,
  contact: removeRecipient,
};

// true  = à retirer de la file (supprimé, OU 404 « déjà supprimé côté serveur »).
// false = à conserver (réseau / 403 plan expiré / 5xx) → retenté au prochain drain.
const attemptDeletion = async (deletion: PendingDeletion): Promise<boolean> => {
  try {
    await remover[deletion.entity](deletion.remoteId);
    return true;
  } catch (error) {
    if (error instanceof NotFoundError) return true;
    if (error instanceof ApiError) reportSyncError('drainDeletions', error); // 400/5xx : diag
    return false;
  }
};

let draining = false; // garde anti-concurrence (boot + retour premier plan quasi simultanés)

/** Rejoue toutes les suppressions en attente. Idempotent, sans concurrence. */
export const drainDeletions = async (): Promise<void> => {
  if (draining) return;
  draining = true;
  try {
    for (const deletion of [...useStore.getState().pendingDeletions]) {
      if (await attemptDeletion(deletion)) useStore.getState().dequeueDeletion(deletion);
    }
  } finally {
    draining = false;
  }
};

/** Enfile une suppression (seulement si déjà poussée) puis tente immédiatement. */
export const queueDeletion = (entity: DeletionEntity, remoteId?: string): void => {
  if (!remoteId) return; // jamais poussé → rien à supprimer côté serveur (pas de résurrection)
  const deletion: PendingDeletion = { entity, remoteId, enqueuedAt: new Date().toISOString() };
  useStore.getState().enqueueDeletion(deletion);
  attemptDeletion(deletion).then((done) => {
    if (done) useStore.getState().dequeueDeletion(deletion);
  });
};
