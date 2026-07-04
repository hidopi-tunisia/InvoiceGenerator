import { useStore } from './index';
import type { BusinessEntity } from '../app/schema/invoice';
import { ConflictError, NotFoundError } from '../domain/http';
import { fromBackendRecipient, toBackendRecipientInput } from '../domain/mappers';
import {
  BackendRecipient,
  createRecipient,
  getRecipients,
  removeRecipient,
  searchRecipients,
  updateRecipientById,
} from '../domain/recipients';

// ---------------------------------------------------------------------------
// Sync des contacts (phase 3 du chantier backend).
// Offline-first : tout échec est silencieux — les contacts dirty seront
// retentés au prochain boot ou à la prochaine sauvegarde.
// Résolution locale ↔ serveur : remoteId d'abord, sinon email.
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 20; // API.md §15.5 : toujours paginer

/** Pousse un contact local (création ou mise à jour selon remoteId). */
const pushContact = async (contact: BusinessEntity): Promise<void> => {
  const { updateContact } = useStore.getState();
  const payload = toBackendRecipientInput(contact);

  try {
    if (contact.remoteId) {
      try {
        await updateRecipientById(contact.remoteId, payload);
        updateContact({ id: contact.id, syncedAt: new Date().toISOString(), dirty: false });
        return;
      } catch (error) {
        // Supprimé côté serveur (ex : depuis Angular, ou undo local après
        // suppression distante) : on abandonne le remoteId et on recrée.
        if (!(error instanceof NotFoundError)) throw error;
      }
    }
    const { data: created } = await createRecipient(payload);
    updateContact({
      id: contact.id,
      remoteId: created._id,
      syncedAt: new Date().toISOString(),
      dirty: false,
    });
  } catch (error) {
    // 409 = email déjà côté serveur (ex : créé depuis le front Angular) :
    // on adopte le recipient existant au lieu de créer un doublon.
    if (error instanceof ConflictError && contact.email) {
      try {
        const { data: matches } = await searchRecipients(contact.email);
        const match = matches?.find((r) => r.email?.toLowerCase() === contact.email?.toLowerCase());
        if (match) {
          await updateRecipientById(match._id, payload);
          updateContact({
            id: contact.id,
            remoteId: match._id,
            syncedAt: new Date().toISOString(),
            dirty: false,
          });
        }
      } catch {
        // silencieux — restera dirty
      }
    }
    // Échec réseau/serveur : le contact reste dirty, retenté plus tard.
  }
};

/** Pousse tous les contacts locaux modifiés (dirty). */
export const pushDirtyContacts = async (): Promise<void> => {
  const dirtyContacts = useStore.getState().contacts.filter((c) => c.dirty !== false);
  for (const contact of dirtyContacts) {
    await pushContact(contact);
  }
};

/** Suppression distante best-effort (la file de mutations arrive en phase 5). */
export const pushContactDeletion = (contact: BusinessEntity): void => {
  if (!contact.remoteId) return;
  removeRecipient(contact.remoteId).catch(() => {
    // Hors ligne : l'orphelin serveur sera résorbé par la file de mutations (phase 5).
  });
};

/** Rapatrie toutes les pages de recipients (volume borné : carnet d'un utilisateur). */
const fetchAllRecipients = async (): Promise<BackendRecipient[]> => {
  const all: BackendRecipient[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, pagination } = await getRecipients({ page, limit: PAGE_LIMIT });
    all.push(...(data ?? []));
    totalPages = pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return all;
};

/**
 * Pull + merge : les recipients serveur (y compris créés depuis le front
 * Angular) entrent dans le store local. Un contact local `dirty` gagne
 * toujours (il sera poussé) ; sinon le serveur fait foi.
 */
export const pullContacts = async (): Promise<void> => {
  const remotes = await fetchAllRecipients();
  const { contacts, addContact, updateContact } = useStore.getState();

  for (const remote of remotes) {
    const local =
      contacts.find((c) => c.remoteId === remote._id) ??
      (remote.email
        ? contacts.find((c) => c.email?.toLowerCase() === remote.email?.toLowerCase())
        : undefined);

    if (!local) {
      addContact(fromBackendRecipient(remote));
      continue;
    }
    if (local.dirty) continue; // modification locale en attente : elle gagne

    const mapped = fromBackendRecipient(remote);
    updateContact({ ...mapped, id: local.id }); // conserve l'identité locale
  }
};

/** Cycle complet : push des modifications locales puis pull du serveur. */
export const syncContacts = async (): Promise<void> => {
  try {
    await pushDirtyContacts();
    await pullContacts();
  } catch {
    // Réseau indisponible / backend froid : l'app continue en local.
  }
};

/** Push d'un seul contact après sauvegarde d'écran (fire-and-forget). */
export const syncContactById = async (id: string): Promise<void> => {
  const contact = useStore.getState().contacts.find((c) => c.id === id);
  if (contact) await pushContact(contact);
};
