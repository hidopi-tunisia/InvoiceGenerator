// Backends (préfixe /api/v1 requis par le contrat API.md)
// - Staging (Render) : accessible partout
// - Local : http://localhost:3000 sur la machine de dev.
//   Depuis un ÉMULATEUR Android, `localhost` = l'émulateur lui-même → utiliser 10.0.2.2
//   Sur iOS simulator, `localhost` fonctionne directement.
export const API_BASE = {
  STAGING: 'https://invoice-backend-qq9j.onrender.com/api/v1',
  LOCAL: 'http://localhost:3000/api/v1',
  LOCAL_ANDROID_EMULATOR: 'http://10.0.2.2:3000/api/v1',
} as const;

// Surcharge possible via EXPO_PUBLIC_API_URL (.env). Défaut : staging.
export const ENDPOINT = process.env.EXPO_PUBLIC_API_URL ?? API_BASE.STAGING;
// OAuth Google (Firebase Auth via expo-auth-session).
// À récupérer dans Google Cloud Console > "API et services" > "Identifiants" (OAuth 2.0),
// après avoir activé Google dans Firebase Console > Authentication > Sign-in method.
// Renseigner via .env (préfixe EXPO_PUBLIC_ obligatoire pour être exposé au client) :
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com   (type "Web")
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxx.apps.googleusercontent.com (type "Android")
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxx.apps.googleusercontent.com    (type "iOS")
export const GOOGLE_AUTH = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

export const HTTPMethod = {
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

// NB : les statuts de facture côté app sont les chaînes françaises du store
// ('payée' | 'en attente') + le statut dérivé 'en retard' (app/utils/invoice.ts).
// Les statuts backend (anglais) seront mappés dans domain/ au moment de la sync.
