// Convertit un objet de filtres (valeurs string/number/boolean, champs optionnels)
// en URLSearchParams — les valeurs undefined sont omises.
export const toQueryParams = (filters?: Record<string, string | number | boolean | undefined>) =>
  new URLSearchParams(
    Object.entries(filters ?? {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
