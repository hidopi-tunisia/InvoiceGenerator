import AsyncStorage from '@react-native-async-storage/async-storage';

import { createInitialData, useStore } from './index';

// ---------------------------------------------------------------------------
// Cloisonnement du store par utilisateur (défaut n°20 du quality gate).
// Chaque compte Firebase a son « tiroir » AsyncStorage : `facture-store-{uid}`.
// À la déconnexion on ne supprime RIEN — les données restent sous la clé de
// leur propriétaire ; à la reconnexion, il les retrouve.
//
// ⚠️ Piège central : zustand/persist ÉCRIT dans la clé courante à chaque
// setState. Toute réinitialisation d'état doit donc se faire pendant que le
// store pointe sur la clé jetable — jamais sur le tiroir d'un utilisateur,
// sinon on écrase ses données avec du vide avant de les relire.
// ---------------------------------------------------------------------------

const LEGACY_KEY = 'facture-store'; // clé unique d'avant le cloisonnement
const LEGACY_BACKUP_KEY = 'facture-store-legacy-backup'; // filet de sécurité, à purger dans quelques versions
const ANONYMOUS_KEY = 'facture-store-anonymous'; // état neutre hors connexion (jamais de données métier)

const userKey = (uid: string) => `facture-store-${uid}`;

// Un tiroir est « vierge » s'il ne contient ni facture, ni contact, ni
// onboarding complété — l'adopter ne fait alors rien perdre.
const isPristine = (raw: string | null): boolean => {
  if (!raw) return true;
  try {
    const state = JSON.parse(raw)?.state;
    return (
      !state ||
      ((state.invoices?.length ?? 0) === 0 &&
        (state.contacts?.length ?? 0) === 0 &&
        !state.onboardingCompleted)
    );
  } catch {
    return true;
  }
};

/**
 * Adoption des données héritées : l'app était mono-utilisateur, la clé unique
 * n'a pas de propriétaire connu → le premier compte connecté après la mise à
 * jour adopte les données de l'appareil (elles sont les siennes dans le cas
 * nominal). Le backup sert aussi de source de secours si le tiroir utilisateur
 * est resté vierge (auto-guérison).
 */
const adoptLegacyData = async (uid: string) => {
  const [legacy, backup, existing] = await Promise.all([
    AsyncStorage.getItem(LEGACY_KEY),
    AsyncStorage.getItem(LEGACY_BACKUP_KEY),
    AsyncStorage.getItem(userKey(uid)),
  ]);
  const source = legacy ?? backup;
  if (!source) return;

  if (isPristine(existing) && !isPristine(source)) {
    await AsyncStorage.setItem(userKey(uid), source);
  }
  if (legacy) {
    await AsyncStorage.setItem(LEGACY_BACKUP_KEY, legacy);
    await AsyncStorage.removeItem(LEGACY_KEY);
  }
};

/**
 * Pointe le store persisté sur le tiroir de l'utilisateur connecté puis
 * réhydrate. Ordre critique :
 *   1. reset de l'état en mémoire PENDANT que la clé courante est la jetable
 *      (l'écriture déclenchée par setState part dans le vide, pas chez l'utilisateur) ;
 *   2. bascule vers la clé utilisateur ;
 *   3. réhydratation (relit le tiroir adopté).
 *
 * À appeler AVANT toute redirection de l'auth-gate (l'onboarding se décide
 * sur `onboardingCompleted`, qui doit venir du bon tiroir).
 */
export const scopeStoreToUser = async (uid: string) => {
  await adoptLegacyData(uid);
  useStore.persist.setOptions({ name: ANONYMOUS_KEY });
  useStore.setState(createInitialData());
  useStore.persist.setOptions({ name: userKey(uid) });
  await useStore.persist.rehydrate();
};

/**
 * Déconnexion : état neutre vide, pointé sur une clé jetable pour qu'aucune
 * écriture accidentelle n'atterrisse dans le tiroir d'un utilisateur.
 * L'ordre (setOptions PUIS setState) garantit que l'écriture du reset part
 * dans la clé jetable.
 */
export const scopeStoreToAnonymous = () => {
  useStore.persist.setOptions({ name: ANONYMOUS_KEY });
  useStore.setState(createInitialData());
};
