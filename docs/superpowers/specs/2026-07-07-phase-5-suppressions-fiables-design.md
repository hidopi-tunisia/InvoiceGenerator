# Phase 5 — Suppressions fiables (tombstones persistés)

**Date** : 2026-07-07
**Statut** : design validé, prêt pour plan d'implémentation
**Branche** : `fix/firebase-auth`

## Contexte & problème

La synchronisation actuelle (phases 0-4) est déclenchée au boot uniquement :
`syncProfileOnBoot → syncContacts → syncInvoices` dans `app/_layout.tsx`. Le push
balaie les entités `dirty` puis pull. Les entités `dirty` étant **persistées dans le
store**, elles sont déjà retentées au prochain démarrage — le create/update est donc
déjà fiable.

Le **seul vrai défaut de correctness** est la **suppression hors ligne**. Aujourd'hui
`pushInvoiceDeletion` / `pushContactDeletion` tentent le `DELETE` distant une seule fois
en fire-and-forget. Si l'appareil est hors ligne, l'enregistrement local **et** son
`remoteId` disparaissent → il ne reste **rien à retenter** → le serveur garde une entité
fantôme indéfiniment. Le code référence partout « résorbé par la file de mutations
(phase 5) » : c'est la dette soldée ici.

Constats `API.md` qui cadrent le périmètre :
- **Pas de pull différentiel** : ni `GET /invoices` ni `GET /recipients` n'ont de filtre
  `updatedAt`/`since`. Le `lastSyncAt` du store ne pilote pas de delta serveur → le pull
  reste un fetch paginé complet dédoublonné côté client. (Hors périmètre ici.)
- **Recipients = soft delete** (`deleted: true`) ; **devis = archive** ; **invoices =
  hard delete** (`DELETE /invoices/:id` → `{ id }`).
- **DELETE vérifie `checkSubscription`** → un plan expiré peut renvoyer 403 sur une
  suppression.

## Objectif

**Fiabiliser les suppressions** : une suppression hors ligne ne doit jamais laisser
d'orphelin serveur. La fraîcheur des données (pull-to-refresh, resync complète au
premier plan) est explicitement **hors périmètre** de ce chantier.

## Approche retenue — Tombstones persistés (approche A)

On conserve le modèle actuel (`dirty` couvre create/update, déjà persisté + retenté) et
on ajoute une file **de suppressions uniquement**, persistée et rejouée. Écarté :

- **File de mutations générale** (upsert/delete/status unifiés) : gros refactor de code
  qui marche déjà, à contre-courant de YAGNI pour un objectif limité aux suppressions.
- **Drain replié dans `syncContacts`/`syncInvoices`** : entremêle la logique de
  suppression dans le push/pull → unité moins isolée, plus dure à tester seule.

## Architecture & frontières de modules

Une nouvelle unité isolée porte toute la logique ; le reste ne fait que l'appeler.

- **`store/deletions-sync.ts`** *(nouveau)* : type `PendingDeletion`, table
  entité→suppresseur domaine, `attemptDeletion()`, `drainDeletions()`, et
  `queueDeletion(entity, remoteId?)` (orchestration : appelle l'action de store
  `enqueueDeletion` puis tente immédiatement). Dépend uniquement de `useStore`, des
  removers `domain/` (`removeInvoice`, `removeRecipient`) et des erreurs `domain/http`.
  **N'importe pas `invoices-sync` / `contacts-sync` → pas de cycle de modules.**
- **`store/index.ts`** : tranche persistée `pendingDeletions` + actions `enqueueDeletion`
  / `dequeueDeletion` ; ajout à `createInitialData()` ; migration `version` 2 → 3.
- **`store/invoices-sync.ts` / `store/contacts-sync.ts`** : `pushInvoiceDeletion` /
  `pushContactDeletion` deviennent de fines enveloppes appelant `enqueueDeletion(...)`.
  → **les 4 fichiers UI qui les importent ne changent pas.**
- **`app/_layout.tsx`** : câble les déclencheurs (boot + `AppState`).

## Modèle de données

```ts
// store/deletions-sync.ts
export type DeletionEntity = 'invoice' | 'contact';
export type PendingDeletion = { entity: DeletionEntity; remoteId: string; enqueuedAt: string };
```

Stocké dans `pendingDeletions: PendingDeletion[]`, **dans le tiroir `facture-store-{uid}`**
→ cloisonné par utilisateur automatiquement (cohérent avec le correctif d'adoption du
2026-07-07). On n'enfile **que** si `remoteId` existe.

## Chemin d'enfilement (à la suppression locale)

`pushInvoiceDeletion(invoice)` / `pushContactDeletion(contact)` appellent
`queueDeletion(entity, remoteId)`, qui :

1. si pas de `remoteId` → `return` (inchangé : jamais poussé, rien à supprimer côté
   serveur, et l'entité a quitté le tableau local → pas de résurrection) ;
2. sinon action de store `enqueueDeletion({ entity, remoteId, enqueuedAt })` — persiste
   le tombstone **d'abord**, il survit même si l'app est tuée juste après ;
3. tentative immédiate `attemptDeletion()` → succès ⇒ action `dequeueDeletion()` ; échec
   ⇒ le tombstone reste pour le prochain drain.

Le comportement en ligne est identique à aujourd'hui ; la nouveauté est la persistance
de l'intention de suppression.

## Worker `drainDeletions()`

```ts
const remover: Record<DeletionEntity, (id: string) => Promise<unknown>> = {
  invoice: removeInvoice,
  contact: removeRecipient,
};

const attemptDeletion = async (d: PendingDeletion): Promise<boolean> => {
  try {
    await remover[d.entity](d.remoteId);
    return true;                                                    // supprimé
  } catch (e) {
    if (e instanceof NotFoundError) return true;                    // 404 = déjà supprimé ⇒ succès
    if (e instanceof ApiError) reportSyncError('drainDeletions', e); // 400/5xx : diag, on garde
    return false;                                                   // réseau / 403 / 5xx ⇒ on garde
  }
};

let draining = false; // garde anti-concurrence (boot + foreground quasi simultanés)

export const drainDeletions = async (): Promise<void> => {
  if (draining) return;
  draining = true;
  try {
    for (const d of [...useStore.getState().pendingDeletions]) {
      if (await attemptDeletion(d)) useStore.getState().dequeueDeletion(d);
    }
  } finally {
    draining = false;
  }
};
```

FIFO ; l'ordre entre suppressions n'a pas d'importance.

## Déclencheurs

- **Boot** : `drainDeletions()` ajouté à la chaîne de `_layout`, **avant** `pullContacts`
  (pour ne pas re-tirer un contact qu'on est en train de supprimer).
- **Retour au premier plan** : listener `AppState` dans `_layout`, sur transition →
  `'active'` et si `auth.currentUser`, exécute un **flush sortant** :
  `drainDeletions()` + `pushDirtyInvoices()` / `pushDirtyContacts()`. **Pas de pull**
  (la fraîcheur reste hors périmètre).

## Gestion d'erreurs & cas limites

| Cas | Traitement |
|---|---|
| Hors ligne / erreur réseau | tombstone **conservé**, silencieux (offline-first) |
| 404 `NotFoundError` | **succès** (déjà supprimé, ex. depuis Angular) → dequeue |
| 403 `QuotaError` (plan expiré bloque les DELETE) | conservé, drainé quand le plan redevient actif |
| 400 / 5xx `ApiError` | `reportSyncError` (Sentry) + conservé, retenté |
| Contact soft-delete re-tiré par le pull | `pullContacts` **ignore** `deleted === true` (ajout de robustesse) |
| Résurrection (créé + supprimé hors ligne avant push) | impossible : pas de `remoteId` → pas de tombstone, et l'entité a quitté le tableau local |

Pas de plafond de retries pour l'instant (les DELETE 400 sont rares ; Sentry surveille) —
suivi éventuel.

## Migration store v3

`version: 2 → 3`. `pendingDeletions` a une valeur par défaut `[]` via `createInitialData` ;
on ajoute par explicité `if (version < 3) persistedState.pendingDeletions = [];` (aligné
sur le style de migration existant).

## Vérification (pas de framework de test dans le repo)

Repros node isolées simulant store + AsyncStorage :
1. suppression hors ligne ⇒ tombstone persisté ;
2. drain ⇒ tombstone retiré au succès ;
3. 404 ⇒ traité comme succès (dequeue) ;
4. échec réseau ⇒ tombstone conservé ;
5. résurrection impossible (créé+supprimé hors ligne) ;
6. garde anti-concurrence (`draining`) empêche le double drain.

Puis **quality gate** (rapport PASS/WARNING/FAIL) + `npm run lint` sur le périmètre modifié.

## Documentation à mettre à jour

- `workflow/05-contacts.md` + workflow factures : suppressions désormais mises en file.
- `qualitygate.md` : phase 5 livrée.
- Commentaires de code référençant « (phase 5) » (`store/*-sync.ts`, `store/index.ts`,
  `store/user-scope.ts`).
- **`API.md` inchangé** (aucun changement de contrat).

## Hors périmètre (YAGNI)

- Pull différentiel (`since`) — non supporté par le backend.
- Pull-to-refresh (`RefreshControl`) et resync complète au premier plan — itération
  « fraîcheur » ultérieure si le besoin se confirme.
- File de mutations générale (upsert/delete/status unifiés).
- Reprise sur retour du réseau (`NetInfo`).
- Plafond de retries / purge des tombstones anciens.
