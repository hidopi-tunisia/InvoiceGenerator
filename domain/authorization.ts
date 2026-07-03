import { auth } from '../app/config'; // Import Firebase auth (config vit dans app/config.ts)

// Le SDK Firebase gère le cache et le refresh du token — jamais de stockage manuel.
// `forceRefresh` est utilisé par domain/http.ts après un 401 (token expiré côté serveur).
const getAuthorization = async (forceRefresh = false) => {
  const token = await auth.currentUser?.getIdToken(forceRefresh);
  return token;
};

export { getAuthorization };
