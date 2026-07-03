// Mappe les codes d'erreur Firebase Auth vers des messages français actionnables
// (convention MOBILE_GUIDELINES §15 : jamais de message technique anglais à l'écran).
// Les codes « identifiants incorrects » partagent volontairement le même message
// pour ne pas révéler si un compte existe.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/user-not-found': 'Email ou mot de passe incorrect.',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Vérifiez votre réseau puis réessayez.',
};

export const getAuthErrorCode = (error: unknown): string | undefined =>
  (error as { code?: string })?.code;

export const getAuthErrorMessage = (
  error: unknown,
  fallback = 'Une erreur est survenue. Réessayez.'
): string => {
  const code = getAuthErrorCode(error);
  return (code && AUTH_ERROR_MESSAGES[code]) || fallback;
};
