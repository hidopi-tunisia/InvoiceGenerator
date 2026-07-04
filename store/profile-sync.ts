import { useStore } from './index';
import { fromBackendProfile, toBackendProfileInput } from '../domain/mappers';
import { getProfile, updateProfile } from '../domain/profile';

// ---------------------------------------------------------------------------
// Sync du profil (phase 2 du chantier backend).
// Offline-first : tout échec réseau est silencieux — l'app vit en local et
// le push sera retenté (flag dirty) au prochain boot ou à la prochaine sauvegarde.
// ---------------------------------------------------------------------------

// Rien n'a encore été saisi localement (ni onboarding complété) ?
const isLocalProfilePristine = () => {
  const { profile, onboardingCompleted } = useStore.getState();
  return !onboardingCompleted && !profile.name && !profile.address && !profile.tva;
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
  } catch {
    setProfile({ dirty: true });
  }
};

/**
 * Au boot connecté (après le scoping par uid — jamais bloquant pour l'auth-gate) :
 * - `GET /profile` auto-crée le profil serveur + démarre le trial 14 j ;
 * - store local vierge + profil serveur renseigné (utilisateur venu du front
 *   Angular) → pré-remplissage local, onboarding sauté si `isProfileComplete` ;
 * - local renseigné → le mobile est la source active : push (LWW simple).
 */
export const syncProfileOnBoot = async (): Promise<void> => {
  try {
    const { data: remote } = await getProfile();

    if (isLocalProfilePristine()) {
      const localPatch = fromBackendProfile(remote);
      if (Object.keys(localPatch).length > 0) {
        useStore
          .getState()
          .setProfile({ ...localPatch, syncedAt: new Date().toISOString(), dirty: false });
        if (remote.isProfileComplete) {
          // L'utilisateur a déjà un profil complet côté serveur : pas d'onboarding.
          // L'auth-gate réagit au changement et redirige vers les tabs.
          useStore.getState().setOnboardingCompleted();
        }
      }
      return;
    }

    // Push initial ou retenter un push échoué (dirty), sinon rien à faire
    if (useStore.getState().profile.dirty !== false) {
      await pushProfile();
    }
  } catch {
    // Réseau indisponible / backend froid : l'app continue en local.
  }
};
