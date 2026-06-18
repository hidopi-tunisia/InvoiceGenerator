import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { auth } from '~/app/config';
import { GOOGLE_AUTH } from '~/constants';

// Finalise la session d'auth quand l'app revient au premier plan (web/redirect).
WebBrowser.maybeCompleteAuthSession();

/**
 * Connexion ET inscription via Google : le même flux suffit — `signInWithCredential`
 * crée le compte Firebase s'il n'existe pas, sinon connecte l'utilisateur existant.
 *
 * Le flux : promptAsync() ouvre Google → on récupère un `id_token` → on l'échange
 * contre une credential Firebase. La redirection post-auth est gérée par l'auth-gate
 * dans app/_layout.tsx (onAuthStateChanged).
 */
export function useGoogleSignIn(onError?: (message: string) => void) {
  const [signingIn, setSigningIn] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_AUTH.webClientId,
    androidClientId: GOOGLE_AUTH.androidClientId,
    iosClientId: GOOGLE_AUTH.iosClientId,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        setSigningIn(false);
        onError?.('Aucun token reçu de Google.');
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .catch((e: any) => onError?.(e?.message ?? 'Échec de la connexion Google.'))
        .finally(() => setSigningIn(false));
    } else if (response.type === 'error') {
      setSigningIn(false);
      onError?.(response.error?.message ?? 'Connexion Google interrompue.');
    } else {
      // 'cancel' | 'dismiss' | 'opened' | 'locked'
      setSigningIn(false);
    }
  }, [response]);

  const signInWithGoogle = async () => {
    if (!GOOGLE_AUTH.webClientId && !GOOGLE_AUTH.androidClientId && !GOOGLE_AUTH.iosClientId) {
      onError?.('Google non configuré : renseignez EXPO_PUBLIC_GOOGLE_*_CLIENT_ID dans .env.');
      return;
    }
    setSigningIn(true);
    await promptAsync();
  };

  return {
    signInWithGoogle,
    signingIn,
    // `request` reste null tant que la config OAuth est absente → bouton désactivé.
    ready: !!request,
  };
}
