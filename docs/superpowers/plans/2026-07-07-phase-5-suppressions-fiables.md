# Phase 5 — Suppressions fiables (tombstones persistés) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une suppression de facture/contact effectuée hors ligne ne laisse jamais d'orphelin côté serveur : l'intention est persistée et rejouée jusqu'au succès.

**Architecture:** File de suppressions (tombstones) `pendingDeletions` dans le store Zustand persisté par utilisateur. Une unité isolée `store/deletions-sync.ts` enfile à la suppression et draine (boot + retour au premier plan). On garde le modèle `dirty` existant pour create/update (déjà fiable). Aucun changement de contrat backend.

**Tech Stack:** React Native / Expo, Zustand + `zustand/middleware` persist (AsyncStorage), TypeScript, ESLint. Pas de framework de test dans le repo → vérification par repros Node isolées + `npx eslint` + quality gate.

## Global Constraints

- **Langue** : chaînes UI et commentaires en français (public francophone).
- **Alias d'import** : `~/` = racine ; dans `store/` les imports relatifs `./x` et `../domain/x` sont la norme existante — les suivre.
- **Offline-first** : tout échec réseau est silencieux ; seuls les échecs non-réseau (400/5xx) remontent via `reportSyncError` (Sentry).
- **Pas de cycle de modules** : `store/deletions-sync.ts` importe `useStore` depuis `./index` (runtime) ; `store/index.ts` n'importe de `./deletions-sync` que des **types** via `import type` (effacé à la compilation → pas de cycle runtime).
- **Pas de framework de test** : ne pas en créer. Les « tests » sont des scripts Node autonomes dans le scratchpad, non commités.
- **Statut/format** inchangés ; `formatDate` fr-FR ; numéro `INV-YYYY-NNNN` — non concernés ici.
- **Vérif de fin** : `npm run lint` (ESLint + Prettier) doit passer ; produire le rapport quality gate PASS/WARNING/FAIL.

---

### Task 1: Tranche de store `pendingDeletions` + type + migration v3

**Files:**
- Create: `store/deletions-sync.ts` (types uniquement à cette étape)
- Modify: `store/index.ts` (import type ligne ~4 ; type `InvoiceState` ~24 ; `createInitialData` ~72 ; actions ~147 ; `version`/`migrate` ~214-253)

**Interfaces:**
- Produces: `type DeletionEntity = 'invoice' | 'contact'` ; `type PendingDeletion = { entity: DeletionEntity; remoteId: string; enqueuedAt: string }` ; état `pendingDeletions: PendingDeletion[]` ; actions `enqueueDeletion(d: PendingDeletion): void` (dédupe entity+remoteId), `dequeueDeletion(d: PendingDeletion): void` (retire par entity+remoteId).

- [ ] **Step 1: Créer `store/deletions-sync.ts` avec les types**

```ts
// store/deletions-sync.ts
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
```

- [ ] **Step 2: Importer le type dans `store/index.ts`**

Ajouter, sous les imports de types existants (après `import type { ... } from '../app/schema/invoice'` ou équivalent, vers la ligne 4) :

```ts
import type { PendingDeletion } from './deletions-sync';
```

- [ ] **Step 3: Déclarer l'état + les actions dans le type `InvoiceState`**

Dans `store/index.ts`, juste après le bloc `quotaReached` / `setQuotaReached` (ligne ~24) :

```ts
  // File de suppressions distantes en attente (phase 5) : survit au redémarrage,
  // drainée au boot + retour au premier plan.
  pendingDeletions: PendingDeletion[];
  enqueueDeletion: (deletion: PendingDeletion) => void;
  dequeueDeletion: (deletion: PendingDeletion) => void;
```

- [ ] **Step 4: Valeur initiale dans `createInitialData`**

Dans `createInitialData()` (ligne ~72), à côté de `quotaReached: false,` :

```ts
  pendingDeletions: [] as PendingDeletion[],
```

- [ ] **Step 5: Implémenter les actions**

Dans le corps du store, juste après `setQuotaReached` (ligne ~147) :

```ts
      enqueueDeletion: (deletion) =>
        set((state) =>
          state.pendingDeletions.some(
            (d) => d.entity === deletion.entity && d.remoteId === deletion.remoteId,
          )
            ? {} // déjà en file : ne pas dupliquer
            : { pendingDeletions: [...state.pendingDeletions, deletion] },
        ),
      dequeueDeletion: (deletion) =>
        set((state) => ({
          pendingDeletions: state.pendingDeletions.filter(
            (d) => !(d.entity === deletion.entity && d.remoteId === deletion.remoteId),
          ),
        })),
```

- [ ] **Step 6: Bump `version` 2 → 3 + branche de migration**

Changer `version: 2,` (ligne ~220) en `version: 3,`.
Dans `migrate`, avant `return persistedState as InvoiceState;` (ligne ~253), ajouter :

```ts
        if (version < 3) {
          // Nouvelle file de suppressions — vide à la migration.
          persistedState.pendingDeletions = [];
        }
```

- [ ] **Step 7: Vérifier (lint)**

Run: `npx eslint store/deletions-sync.ts store/index.ts`
Expected: exit 0, aucune erreur (notamment aucun `PendingDeletion` non utilisé).

- [ ] **Step 8: Commit**

```bash
git add store/deletions-sync.ts store/index.ts
git commit -m "feat(store): tranche pendingDeletions + migration v3 (phase 5)"
```

---

### Task 2: Worker de drain (`attemptDeletion`, `drainDeletions`, `queueDeletion`)

**Files:**
- Modify: `store/deletions-sync.ts` (ajout de la logique sous les types)
- Test (Node, non commité): `scratchpad/deletions.repro.mjs`

**Interfaces:**
- Consumes: `useStore` (`./index`) — actions `enqueueDeletion`/`dequeueDeletion`, état `pendingDeletions` ; `removeInvoice` (`../domain/invoices`), `removeRecipient` (`../domain/recipients`) ; `ApiError`, `NotFoundError`, `reportSyncError` (`../domain/http`).
- Produces: `drainDeletions(): Promise<void>` (idempotent, garde anti-concurrence) ; `queueDeletion(entity: DeletionEntity, remoteId?: string): void`.

- [ ] **Step 1: Écrire le repro Node qui échoue (logique de drain)**

Créer `scratchpad/deletions.repro.mjs` (chemin scratchpad de session) :

```js
// Repro isolée de la logique attemptDeletion/drainDeletions.
class ApiError extends Error {}
class NotFoundError extends ApiError {}
class NetworkError extends Error {}

const makeStore = (initial) => {
  let pending = [...initial];
  return {
    getPending: () => pending,
    dequeue: (d) => { pending = pending.filter((x) => !(x.entity === d.entity && x.remoteId === d.remoteId)); },
  };
};

// removers pilotés par un scénario { remoteId: 'ok' | 'notfound' | 'network' }
const makeRemover = (scenario) => (remoteId) => {
  const outcome = scenario[remoteId];
  if (outcome === 'ok') return Promise.resolve();
  if (outcome === 'notfound') return Promise.reject(new NotFoundError());
  return Promise.reject(new NetworkError());
};

const attemptDeletion = async (remover, d, reported) => {
  try { await remover(d.remoteId); return true; }
  catch (e) {
    if (e instanceof NotFoundError) return true;
    if (e instanceof ApiError) reported.push(d.remoteId);
    return false;
  }
};

const drainDeletions = async (store, remover, reported) => {
  for (const d of [...store.getPending()]) {
    if (await attemptDeletion(remover, d, reported)) store.dequeue(d);
  }
};

const run = async () => {
  const store = makeStore([
    { entity: 'invoice', remoteId: 'ok1' },
    { entity: 'contact', remoteId: 'gone' },   // 404 → succès
    { entity: 'invoice', remoteId: 'offline' },// réseau → conservé
  ]);
  const remover = makeRemover({ ok1: 'ok', gone: 'notfound', offline: 'network' });
  const reported = [];
  await drainDeletions(store, remover, reported);

  const remaining = store.getPending().map((d) => d.remoteId);
  const okSuccess = !remaining.includes('ok1');
  const notFoundSuccess = !remaining.includes('gone');
  const networkKept = remaining.includes('offline') && remaining.length === 1;
  console.log('succès dequeue        :', okSuccess ? 'ok' : 'FAIL');
  console.log('404 = succès dequeue  :', notFoundSuccess ? 'ok' : 'FAIL');
  console.log('réseau conservé       :', networkKept ? 'ok' : 'FAIL');
  console.log('\nRésultat :', okSuccess && notFoundSuccess && networkKept ? 'PASS' : 'FAIL');
};
run();
```

- [ ] **Step 2: Lancer le repro (doit échouer : logique pas encore dans le vrai module)**

Le repro ci-dessus est autonome et passera dès l'écriture — il valide **l'algorithme** que Task 2 implémente dans le vrai module. Le lancer maintenant pour confirmer que l'algorithme est correct :

Run: `node <scratchpad>/deletions.repro.mjs`
Expected: `Résultat : PASS` (les trois lignes `ok`).

- [ ] **Step 3: Implémenter le worker dans `store/deletions-sync.ts`**

Ajouter sous les types :

```ts
import { ApiError, NotFoundError, reportSyncError } from '../domain/http';
import { removeInvoice } from '../domain/invoices';
import { removeRecipient } from '../domain/recipients';
import { useStore } from './index';

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
```

- [ ] **Step 4: Vérifier (lint)**

Run: `npx eslint store/deletions-sync.ts`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add store/deletions-sync.ts
git commit -m "feat(store): worker de drain des suppressions (phase 5)"
```

---

### Task 3: Brancher les suppressions + filtrer les contacts soft-delete au pull

**Files:**
- Modify: `store/invoices-sync.ts` (import ~13-19 ; `pushInvoiceDeletion` ligne ~153-157)
- Modify: `store/contacts-sync.ts` (import ~5-12 ; `pushContactDeletion` ligne ~94-98 ; `pullContacts` ligne ~120)

**Interfaces:**
- Consumes: `queueDeletion` (`./deletions-sync`) ; `BackendRecipient.deleted: boolean` (`../domain/recipients`) ; action store `deleteContact`.
- Produces: `pushInvoiceDeletion(invoice: Invoice): void` et `pushContactDeletion(contact: BusinessEntity): void` (signatures **inchangées** → les 4 fichiers UI appelants ne bougent pas).

- [ ] **Step 1: `invoices-sync.ts` — déléguer à `queueDeletion`**

Ajouter l'import (sous `import { useStore } from './index';`) :

```ts
import { queueDeletion } from './deletions-sync';
```

Retirer `removeInvoice,` du bloc `import { ... } from '../domain/invoices'` (devient inutilisé ici).

Remplacer la fonction (ligne ~153) :

```ts
/** Met la suppression en file (persistée) : rejouée jusqu'au succès (phase 5). */
export const pushInvoiceDeletion = (invoice: Invoice): void => {
  queueDeletion('invoice', invoice.remoteId);
};
```

- [ ] **Step 2: `contacts-sync.ts` — déléguer à `queueDeletion`**

Ajouter l'import (sous `import { useStore } from './index';`) :

```ts
import { queueDeletion } from './deletions-sync';
```

Retirer `removeRecipient,` du bloc `import { ... } from '../domain/recipients'` (devient inutilisé ici).

Remplacer la fonction (ligne ~94) :

```ts
/** Met la suppression en file (persistée) : rejouée jusqu'au succès (phase 5). */
export const pushContactDeletion = (contact: BusinessEntity): void => {
  queueDeletion('contact', contact.remoteId);
};
```

- [ ] **Step 3: `contacts-sync.ts` — ignorer les contacts soft-delete au pull**

Dans `pullContacts` (ligne ~120), première ligne du `for (const remote of remotes) {` :

```ts
  for (const remote of remotes) {
    if (remote.deleted) continue; // soft-delete serveur : ne jamais (re)créer localement
    const local =
      contacts.find((c) => c.remoteId === remote._id) ??
```

(Sans ce garde, un contact qu'on vient de supprimer localement — donc absent en local — serait ré-ajouté par `addContact` au pull suivant.)

- [ ] **Step 4: Vérifier (lint — détecte tout import devenu inutilisé)**

Run: `npx eslint store/invoices-sync.ts store/contacts-sync.ts store/deletions-sync.ts`
Expected: exit 0 (en particulier plus de `removeInvoice`/`removeRecipient` non utilisés).

- [ ] **Step 5: Commit**

```bash
git add store/invoices-sync.ts store/contacts-sync.ts
git commit -m "feat(sync): suppressions via la file persistée + pull ignore les contacts soft-delete (phase 5)"
```

---

### Task 4: Déclencheurs de drain (boot + retour au premier plan)

**Files:**
- Modify: `app/_layout.tsx` (import react-native ligne 8 ; imports store ; `useEffect` d'auth ligne ~47-76)

**Interfaces:**
- Consumes: `drainDeletions` (`~/store/deletions-sync`) ; `pushDirtyInvoices` (`~/store/invoices-sync`) ; `pushDirtyContacts` (`~/store/contacts-sync`) ; `AppState` (`react-native`) ; `auth` (`./config`).

- [ ] **Step 1: Imports**

Ligne 8, ajouter `AppState` :

```ts
import { View, Text, TouchableOpacity, AppState } from 'react-native';
```

Ajouter aux imports store :

```ts
import { drainDeletions } from '~/store/deletions-sync';
import { pushDirtyContacts } from '~/store/contacts-sync';
import { pushDirtyInvoices } from '~/store/invoices-sync';
```

(`syncContacts`/`syncInvoices` sont déjà importés ; ajouter les exports `pushDirty*` qui existent déjà dans ces modules.)

- [ ] **Step 2: Boot — drainer AVANT les pulls**

Dans le callback `onAuthStateChanged`, remplacer la chaîne de sync (ligne ~64) :

```ts
        // Drainer d'abord les suppressions en attente, avant tout pull
        // (pour ne pas re-tirer un contact qu'on est en train de supprimer).
        drainDeletions()
          .then(() => syncProfileOnBoot())
          .then(() => syncContacts())
          .then(() => syncInvoices());
```

- [ ] **Step 3: Retour au premier plan — flush sortant**

Dans le même `useEffect`, après l'abonnement `onAuthStateChanged` (avant le `return`) :

```ts
    // Retour au premier plan : flush sortant (suppressions + upserts en attente).
    // Pas de pull ici — la fraîcheur est hors périmètre de la phase 5.
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && auth.currentUser) {
        drainDeletions();
        pushDirtyInvoices();
        pushDirtyContacts();
      }
    });
```

Puis étendre le cleanup :

```ts
    return () => {
      unsubscribe();
      appStateSub.remove();
    };
```

- [ ] **Step 4: Vérifier (lint)**

Run: `npx eslint app/_layout.tsx`
Expected: exit 0.

- [ ] **Step 5: Vérification manuelle (décrite, à faire au prochain run de l'app)**

1. Se connecter, créer une facture, la laisser se synchroniser (elle obtient un `remoteId`).
2. Activer le mode avion, supprimer la facture (le tombstone est enfilé, le DELETE échoue silencieusement).
3. Fermer complètement l'app, désactiver le mode avion, rouvrir → au boot `drainDeletions()` rejoue → la facture disparaît côté serveur.
4. Variante : au lieu de fermer, mettre l'app en arrière-plan puis revenir → le listener `AppState` déclenche le drain.

- [ ] **Step 6: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(sync): drain des suppressions au boot + retour au premier plan (phase 5)"
```

---

### Task 5: Documentation + quality gate

**Files:**
- Modify: `workflow/05-contacts.md` (ligne ~70)
- Modify: `qualitygate.md` (section « Restent » ligne ~36 + section « Résolus »)
- Modify: commentaires `(phase 5)` dans `store/index.ts`, `store/contacts-sync.ts`, `store/invoices-sync.ts`, `store/user-scope.ts` (mise au présent : livré)

- [ ] **Step 1: `workflow/05-contacts.md`**

Remplacer la ligne ~70 :

```markdown
- **Suppression** : DELETE distant différé à la fermeture du snackbar — un undo n'envoie jamais de suppression. Hors ligne, la suppression est **mise en file persistée** (`pendingDeletions`) et rejouée au boot + retour au premier plan jusqu'au succès (404 = déjà supprimé = succès).
```

- [ ] **Step 2: `qualitygate.md`**

Dans la ligne « Restent » (~36), retirer la mention phase 5 (il ne reste plus rien de ce chantier). Ajouter en tête de « ✅ Résolus » :

```markdown
### 2026-07-07 — phase 5 : suppressions fiables (tombstones)

- **Suppression hors ligne = orphelin serveur permanent** (l'enregistrement local et son `remoteId` disparaissaient → plus rien à retenter). **Corrigé** : file `pendingDeletions` persistée par utilisateur (`store/deletions-sync.ts`), enfilée à la suppression, drainée au boot (avant les pulls) et au retour au premier plan (`AppState`), avec 404 = succès et conservation offline-first. `pullContacts` ignore désormais les contacts soft-delete (`deleted: true`). Migration store **v3**. Hors périmètre (assumé) : pull différentiel (non supporté backend), pull-to-refresh, resync complète au premier plan.
```

- [ ] **Step 3: Commentaires de code au présent**

Mettre à jour les commentaires « (phase 5) » qui parlent d'un futur (ex. `store/contacts-sync.ts` / `store/invoices-sync.ts` « la file de mutations arrive en phase 5 » — déjà remplacés en Task 3 ; `store/index.ts:19` « dernier pull différentiel réussi » reste valable). Vérifier qu'aucun commentaire n'annonce encore la phase 5 comme à venir :

Run: `grep -rn "arrive en phase 5\|phase 5)" store/`
Corriger toute occurrence encore au futur.

- [ ] **Step 4: Lint complet + quality gate**

Run: `npm run lint`
Expected: exit 0 (ESLint + Prettier).

Puis dérouler `QUALITY_GATE.md` sur le périmètre (`store/`, `app/_layout.tsx`, docs) et produire le rapport PASS/WARNING/FAIL.

- [ ] **Step 5: Commit**

```bash
git add workflow/05-contacts.md qualitygate.md store/
git commit -m "docs: phase 5 livrée — suppressions fiables (quality gate)"
```

---

## Self-Review

**Spec coverage :**
- File persistée par utilisateur → Task 1 (slice dans le tiroir `facture-store-{uid}`). ✅
- `PendingDeletion` / entités → Task 1. ✅
- Enfilement à la suppression (remoteId requis, pas de résurrection) → Task 2 (`queueDeletion`) + Task 3 (wiring). ✅
- `drainDeletions` + garde anti-concurrence + 404=succès + offline-first → Task 2. ✅
- Déclencheurs boot (avant pull) + retour premier plan (flush sortant, pas de pull) → Task 4. ✅
- Contact soft-delete ignoré au pull → Task 3, Step 3. ✅
- Migration v3 → Task 1, Step 6. ✅
- Vérif repros Node + lint + quality gate → Tasks 2, 4, 5. ✅
- Docs (workflow, qualitygate, commentaires) → Task 5. ✅ API.md inchangé (aucune tâche — correct).

**Placeholder scan :** aucun TBD/TODO ; code complet à chaque étape. ✅

**Type consistency :** `DeletionEntity`/`PendingDeletion` définis en Task 1, consommés à l'identique en Tasks 2-3 ; `queueDeletion(entity, remoteId?)` et `drainDeletions()` définis en Task 2, appelés à l'identique en Tasks 3-4 ; `enqueueDeletion`/`dequeueDeletion` cohérents store ↔ worker. ✅
