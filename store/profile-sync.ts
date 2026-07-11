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
    // Préserver le dirty courant : setProfile force dirty=true quand absent,
    // ce qui déclencherait un push au lieu d'un pull au prochain boot.
    setProfile({
      logoUrl,
      logoSyncedUri: logoUri,
      dirty: useStore.getState().profile.dirty ?? false,
    });
  } catch (error) {
    reportSyncError('pushLogo', error);
  }
};

/**
 * Sélection d'un logo (demande produit : sauvegarde automatique) : persiste
 * l'URI locale immédiatement puis lance l'upload sans attendre « Sauvegarder ».
 * Best-effort : hors ligne, `pushLogo` sera retenté au boot / à la sauvegarde.
 */
export const adoptLogoAndPush = (uri: string): void => {
  const { setProfile, profile } = useStore.getState();
  // dirty préservé : le logo ne transite pas par PATCH /profile.
  setProfile({ logoUri: uri, dirty: profile.dirty ?? false });
  pushLogo().catch(() => {});
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
      // Les champs POSSÉDÉS par le serveur (logoUrl, écrit via PATCH /profile/logo)
      // doivent quand même être rapatriés : sinon un profil souvent dirty ne
      // récupère jamais le logo d'un utilisateur existant (front Angular).
      if (remote.logoUrl && remote.logoUrl !== useStore.getState().profile.logoUrl) {
        useStore.getState().setProfile({
          logoUrl: remote.logoUrl,
          dirty: useStore.getState().profile.dirty ?? false,
        });
      }
      return;
    }

    applyRemoteProfile(remote);
  } catch (error) {
    // Réseau indisponible / backend froid : l'app continue en local.
    reportSyncError('refreshProfile', error);
  }
};

/**
 * Sync complète au boot : profil + retry logo si non synchronisé.
 * `pushLogo` est idempotent (garde logoUri === logoSyncedUri), donc sans effet
 * si le logo a déjà été uploadé.
 */
export const syncProfileOnBoot = async (): Promise<void> => {
  await refreshProfileFromServer();
  // Retry logo fire-and-forget : ne bloque pas le boot, silencieux si déjà synced.
  pushLogo().catch(() => {});
};
