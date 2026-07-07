// ---------------------------------------------------------------------------
// File de suppressions distantes en attente (phase 5). Une suppression hors
// ligne perd son enregistrement local ET son remoteId : sans tombstone
// persisté, l'orphelin serveur ne serait jamais résorbé.
// ---------------------------------------------------------------------------

export type DeletionEntity = 'invoice' | 'contact';

export type PendingDeletion = {
  entity: DeletionEntity;
  remoteId: string; // ObjectId serveur de l'entité à supprimer
  enqueuedAt: string; // ISO — pour diagnostic
};
