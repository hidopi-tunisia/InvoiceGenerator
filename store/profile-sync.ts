import { useStore } from './index';
import { reportSyncError } from '../domain/http';
import { fromBackendProfile, toBackendProfileInput } from '../domain/mappers';
import { getProfile, updateProfile, uploadLogo, type BackendProfile } from '../domain/profile';

// ---------------------------------------------------------------------------
// Sync du profil (phase 2 du chantier backend).
// Offline-first : tout échec réseau est silencieux (l'app vit en local, retenté
// via le flag dirty). Le serveur fait foi pour les préférences (devise, TVA,
// langue) d'un utilisateur déjà établi — un habitué de l'EUR sur le web ne doit
// jamais retomber en TND sur mobile parce que le défaut local a gagné.
// ---------------------------------------------------------------------------

// Rien n'a encore été saisi localement (ni onboarding complété) ?
const isLocalProfilePristine = () => {
  const { profile, onboardingCompleted } = useStore.getState();
  return !onboardingCompleted && !profile.name && !profile.address && !profile.tva;
};

const remoteHasData = (remote: BackendProfile) =>
  remote.isProfileComplete || !!(remote.companyName || remote.vat || remote.currency);

/** Applique les champs serveur au profil local (marqués propres). */
const applyRemoteProfile = (remote: BackendProfile) => {
  const localPatch = fromBackendProfile(remote);
  if (Object.keys(localPatch).length > 0) {
    useStore
      .getState()
      .setProfile({ ...localPatch, syncedAt: new Date().toISOString(), dirty: false });
  }
};

/**
 * Pousse le profil local vers le backend (PATCH /profile, champs mappés).
 * Fire-and-forget : à appeler après chaque sauvegarde du profil
 * (onboarding, réglages). Échec → profil marqué dirty, retenté au boot.
 */
export const pushProfile = async (): Promise<void> => {
  const { profile, setProfile } = useStore.getState();
  try {
    await updateProfile(toBackendProfileInput(profile));
    setProfile({ syncedAt: new Date().toISOString(), dirty: false });
  } catch (error) {
    setProfile({ dirty: true });
    reportSyncError('pushProfile', error);
  }
};

/**
 * Upload best-effort du logo : si `logoUri` est présent et différent de
 * `logoSyncedUri`, tente l'upload. Succès → met à jour `logoUrl` et
 * `logoSyncedUri`. Échec réseau → silencieux (retenté à la prochaine
 * sauvegarde). Autre échec → `reportSyncError`.
 */
export const pushLogo = async (): Promise<void> => {
  const { profile, setProfile } = useStore.getState();
  const { logoUri, logoSyncedUri } = profile;
  if (!logoUri || logoUri === logoSyncedUri) return;
  try {
    const { logoUrl } = await uploadLogo(logoUri);
    setProfile({ logoUrl, logoSyncedUri: logoUri });
  } catch (error) {
    reportSyncError('pushLogo', error);
  }
};

/**
 * Récupère le profil serveur et réconcilie le store local. Réutilisable :
 * boot connecté et rafraîchissement à la demande (ouverture des Réglages).
 * - store local vierge + profil serveur renseigné (utilisateur venu du front
 *   Angular) → pré-remplissage local, onboarding sauté si `isProfileComplete` ;
 * - modification locale en attente (`dirty`) ou serveur vide (auto-créé) → push local ;
 * - sinon **le serveur fait foi** (préférences rapatriées).
 */
export const refreshProfileFromServer = async (): Promise<void> => {
  try {
    // GET /profile auto-crée le profil serveur + démarre le trial 14 j.
    const { data: remote } = await getProfile();

    if (isLocalProfilePristine()) {
      applyRemoteProfile(remote);
      if (remote.isProfileComplete) {
        // Profil déjà complet côté serveur : pas d'onboarding. L'auth-gate
        // réagit au changement de `onboardingCompleted` et redirige vers les tabs.
        useStore.getState().setOnboardingCompleted();
      }
      return;
    }

    if (useStore.getState().profile.dirty === true || !remoteHasData(remote)) {
      // Changement local en attente, ou serveur tout juste auto-créé : push local.
      await pushProfile();
      return;
    }

    applyRemoteProfile(remote);
  } catch (error) {
    // Réseau indisponible / backend froid : l'app continue en local.
    reportSyncError('refreshProfile', error);
  }
};

/** Alias sémantique pour l'appel au boot (après le scoping par uid). */
export const syncProfileOnBoot = refreshProfileFromServer;
