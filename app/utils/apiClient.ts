import { ENDPOINT, HTTPMethod } from '~/constants'; // Assurez-vous que ces constantes existent et sont exportées depuis ce chemin
import { getAuthorization } from '~/domain/authorization'; // Assurez-vous que cette fonction existe et est exportée

/**
 * Client API centralisé pour effectuer des requêtes fetch.
 * Gère l'ajout du token d'authentification, les en-têtes par défaut,
 * la construction de l'URL complète et la gestion basique des erreurs.
 *
 * @param path Le chemin de l'API (ex: '/recipients')
 * @param options Options standard de l'API Fetch (method, body, headers, etc.)
 * @returns La réponse JSON parsée ou null si réponse 204 No Content.
 * @throws Une erreur si la réponse réseau n'est pas 'ok'.
 */
async function fetchApi(path: string, options: RequestInit = {}) {
  let token: string | null = null;
  try {
    token = await getAuthorization();
  } catch (error) {
    console.error("Erreur lors de la récupération du token d'autorisation:", error);
    // Gérer l'erreur de token (ex: rediriger vers login ?)
    throw new Error("Impossible de récupérer le token d'autorisation.");
  }

  if (!token) {
    // Gérer le cas où le token est null ou vide (ex: rediriger vers login ?)
    throw new Error('Token d\'authentification manquant.');
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers, // Permet de surcharger les en-têtes par défaut si nécessaire
    },
  };

  // Assurez-vous que le chemin commence par un '/'
  const finalPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${ENDPOINT}${finalPath}`;

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      let errorData: any = { message: `Erreur HTTP: ${response.status}` };
      try {
        // Essayer de parser le corps de l'erreur s'il existe
        const errorBody = await response.text();
        if (errorBody) {
          errorData = JSON.parse(errorBody);
        }
      } catch (parseError) {
        // Ignorer l'erreur de parsing, garder le message d'erreur HTTP
        console.warn('Impossible de parser le corps de la réponse d\'erreur API:', parseError);
      }
      // Utiliser le message de l'API s'il existe, sinon le statut HTTP
      throw new Error(errorData?.message || `Erreur HTTP: ${response.status}`);
    }

    // Gérer les réponses sans contenu (ex: DELETE 204 No Content)
    if (response.status === 204) {
      return null;
    }

    // Tenter de parser la réponse en JSON
    return await response.json();

  } catch (error) {
    console.error(`Erreur lors de l'appel API à ${url}:`, error);
    // Relancer l'erreur pour qu'elle soit gérée par l'appelant (ex: dans useQuery/useMutation)
    throw error;
  }
}

export default fetchApi;
