// Convertit un objet de filtres (valeurs number/string, champs optionnels)
// en URLSearchParams — les valeurs undefined sont omises.
export const toQueryParams = (filters?: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(filters ?? {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
