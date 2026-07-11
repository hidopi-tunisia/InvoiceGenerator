import { request, NetworkError } from './http';
import { BackendAddress } from './recipients';

// Types alignés sur le contrat API.md §4-5 (routes /profile).
// L'émetteur des factures = le Profile (jamais /senders, legacy — API.md §4).
// Le premier GET auto-crée le profil côté serveur et démarre le trial 14 jours.

export type BackendProfile = {
  _id: string; // = UID Firebase
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  currency: string;
  language: 'fr' | 'en' | 'ar';
  vat?: number;
  address?: BackendAddress;
  timbre?: { enabled: boolean; value: number };
  fiscalIdentifier?: {
    type: 'MF' | 'SIRET' | 'SIREN' | 'TVA' | 'none';
    value: string;
    country: string;
  };
  logoUrl?: string;
  emailVerified: boolean;
  isProfileComplete: boolean; // auto-calculé côté serveur
};

// Champs protégés (_id, userId, createdAt…) interdits dans le body (API.md §10)
export type ProfileInput = Partial<
  Pick<
    BackendProfile,
    | 'name'
    | 'phone'
    | 'companyName'
    | 'currency'
    | 'language'
    | 'vat'
    | 'address'
    | 'fiscalIdentifier'
    | 'timbre'
  >
>;

/** Auto-crée le profil + trial 14 j au premier appel. */
const getProfile = () => request<BackendProfile>('/profile');

const createProfile = (payload: ProfileInput) =>
  request<BackendProfile>('/profile', { method: 'POST', body: payload });

/** PATCH minimal : n'envoyer que les champs modifiés (API.md §15.7). */
const updateProfile = (payload: ProfileInput) =>
  request<BackendProfile>('/profile', { method: 'PATCH', body: payload });

const removeProfile = () => request<null>('/profile', { method: 'DELETE' });

/**
 * Upload du logo en multipart (PATCH /profile/logo, API.md §157).
 * Le helper `request` ne gère pas le multipart — fetch dédié avec token Firebase.
 * Retourne l'URL Cloudinary du logo uploadé.
 * Convertit les erreurs réseau natives (`TypeError`) en `NetworkError` du domaine
 * pour que `reportSyncError` (sync/profile-sync.ts) les silence correctement.
 */
const uploadLogo = async (uri: string): Promise<{ logoUrl: string }> => {
  const { getAuthorization } = await import('./authorization');
  const { ENDPOINT } = await import('../constants');
  const token = await getAuthorization(false);

  // Le fetch global du SDK 57 (runtime WinterCG d'Expo) REFUSE la pièce jointe
  // style RN { uri, name, type } (« Unsupported FormDataPart implementation ») :
  // il exige un vrai Blob. La classe File d'expo-file-system (nouvelle API)
  // implémente Blob et lit le fichier depuis son URI.
  const { File: FSFile } = await import('expo-file-system');
  const file = new FSFile(uri);
  const formData = new FormData();
  formData.append('logo', file as unknown as Blob, file.name || 'logo.jpg');

  try {
    const response = await fetch(`${ENDPOINT}/profile/logo`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        // Pas de Content-Type : le browser/RN le génère avec le boundary multipart
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Upload logo échoué (${response.status}) : ${text}`);
    }

    const json = (await response.json()) as { success: boolean; data: { logoUrl: string } };
    return { logoUrl: json.data.logoUrl };
  } catch (error) {
    // Convertir les erreurs réseau natives en NetworkError du domaine
    if (error instanceof TypeError) {
      throw new NetworkError('Réseau indisponible');
    }
    throw error;
  }
};

export { getProfile, createProfile, updateProfile, removeProfile, uploadLogo };
