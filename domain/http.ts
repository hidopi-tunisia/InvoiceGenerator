import * as Application from 'expo-application';

import { ENDPOINT } from '../constants';
import { getAuthorization } from './authorization';

// ---------------------------------------------------------------------------
// Helper réseau unique de la couche domain (API.md §15.11).
// Les écrans ne voient jamais un `Response` brut : soit un `{ data, pagination }`
// typé, soit une erreur typée ci-dessous.
// ---------------------------------------------------------------------------

export type FieldError = { field: string; message: string };
export type Pagination = { total: number; page: number; limit: number; totalPages: number };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: FieldError[] | null = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
/** 400 — `errors[]` à mapper vers les formulaires (RHF setError, notation pointée). */
export class ValidationError extends ApiError {
  readonly name = 'ValidationError';
}
/** 401 — après l'unique retry avec token rafraîchi : re-login nécessaire. */
export class AuthError extends ApiError {
  readonly name = 'AuthError';
}
/** 403 — plan inactif / quota atteint : déclenche l'upsell, pas un toast d'erreur. */
export class QuotaError extends ApiError {
  readonly name = 'QuotaError';
}
/** 404 — ressource introuvable côté serveur. */
export class NotFoundError extends ApiError {
  readonly name = 'NotFoundError';
}
/** 409 — conflit (email dupliqué, tag existant…). */
export class ConflictError extends ApiError {
  readonly name = 'ConflictError';
}
/** 429 — rate limit : réessayer plus tard. */
export class RateLimitError extends ApiError {
  readonly name = 'RateLimitError';
}
/** Timeout ou réseau indisponible — l'app continue en local (jamais bloquant). */
export class NetworkError extends Error {
  readonly name = 'NetworkError';
}

// Cold starts Render : au-delà de 15 s on considère le backend indisponible (API.md §15.1)
const TIMEOUT_MS = 15_000;
const RETRY_BACKOFF_MS = 2_000;

// Version d'app envoyée pour les stats d'adoption avant tout retrait de v1 (API.md §13)
const APP_VERSION = Application.nativeApplicationVersion ?? 'dev';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
};

type Envelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: Pagination;
  errors?: FieldError[] | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    throw new NetworkError(
      error instanceof Error && error.name === 'AbortError'
        ? `Délai dépassé (${timeoutMs} ms)`
        : 'Réseau indisponible'
    );
  } finally {
    clearTimeout(timer);
  }
};

const toTypedError = (status: number, envelope: Envelope<unknown> | null): ApiError => {
  const message = envelope?.message ?? `Erreur serveur (${status})`;
  const errors = envelope?.errors ?? null;
  switch (status) {
    case 400:
      return new ValidationError(message, status, errors);
    case 401:
      return new AuthError(message, status, errors);
    case 403:
      return new QuotaError(message, status, errors);
    case 404:
      return new NotFoundError(message, status, errors);
    case 409:
      return new ConflictError(message, status, errors);
    case 429:
      return new RateLimitError(message, status, errors);
    default:
      return new ApiError(message, status, errors);
  }
};

const performRequest = async <T>(
  path: string,
  { method = 'GET', body, timeoutMs = TIMEOUT_MS }: RequestOptions,
  forceTokenRefresh: boolean
): Promise<{ response: Response; envelope: Envelope<T> | null }> => {
  const token = await getAuthorization(forceTokenRefresh);
  const response = await fetchWithTimeout(
    `${ENDPOINT}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-App-Version': APP_VERSION,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    timeoutMs
  );
  // 204 ou body non-JSON : enveloppe absente, on la traite comme nulle
  const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;
  return { response, envelope };
};

/**
 * Appel API v1. `path` commence par `/` (ex : `/invoices?page=1`).
 * - Timeout 15 s (cold starts Render) → `NetworkError`.
 * - Retry ×1 (backoff 2 s) sur GET uniquement — jamais sur mutation (doublons).
 * - 401 → refresh forcé du token Firebase puis un seul retry.
 * - Erreurs HTTP → erreurs typées (`ValidationError`, `QuotaError`…).
 */
export const request = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; pagination?: Pagination }> => {
  const method = options.method ?? 'GET';

  let response: Response;
  let envelope: Envelope<T> | null;
  try {
    ({ response, envelope } = await performRequest<T>(path, options, false));
  } catch (error) {
    // Échec réseau : un seul retry, GET uniquement (idempotent)
    if (error instanceof NetworkError && method === 'GET') {
      await sleep(RETRY_BACKOFF_MS);
      ({ response, envelope } = await performRequest<T>(path, options, false));
    } else {
      throw error;
    }
  }

  // Token expiré : refresh forcé puis un unique retry (toutes méthodes — même requête)
  if (response.status === 401) {
    ({ response, envelope } = await performRequest<T>(path, options, true));
  }

  if (!response.ok || envelope?.success === false) {
    throw toTypedError(response.status, envelope);
  }

  return { data: (envelope?.data ?? null) as T, pagination: envelope?.pagination };
};

/**
 * Réchauffe l'instance Render (fire-and-forget au boot connecté — API.md §15.2).
 * `/info` est public et vit à la racine, hors préfixe /api/v1. Ne lève jamais.
 */
export const warmUpBackend = (): void => {
  const root = ENDPOINT.replace(/\/api\/v1\/?$/, '');
  fetchWithTimeout(`${root}/info`, { method: 'GET' }, 5_000).catch(() => {
    // Silencieux : le warm-up est un bonus, jamais un parcours bloquant.
  });
};
