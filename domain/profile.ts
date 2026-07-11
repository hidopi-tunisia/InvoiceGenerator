import { request } from './http';
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

/** Extension de fichier → type MIME (défaut jpeg). */
const mimeForUri = (uri: string): string => {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

/**
 * Upload du logo (PATCH /profile/logo). Le backend déployé attend un JSON
 * `{ logoBase64 }` en data URI (validateur : « logoBase64 est requis ») —
 * PAS le multipart historique d'API.md. En JSON, on repasse par le helper
 * `request` : timeout 15 s, refresh token 401 et NetworkError inclus.
 * Retourne l'URL Cloudinary du logo uploadé.
 */
const uploadLogo = async (uri: string): Promise<{ logoUrl: string }> => {
  // Lecture base64 via l'API legacy (idiome du projet, cf. app/utils/pdf.ts).
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const logoBase64 = `data:${mimeForUri(uri)};base64,${base64}`;

  const { data } = await request<{ logoUrl: string }>('/profile/logo', {
    method: 'PATCH',
    body: { logoBase64 },
  });
  return { logoUrl: data.logoUrl };
};

export { getProfile, createProfile, updateProfile, removeProfile, uploadLogo };
