/**
 * Retourne le placeholder du champ téléphone selon le code pays du profil.
 */
export const phonePlaceholderForCountry = (country?: string): string => {
  if (country === 'FR') return '06 12 34 56 78';
  if (country === 'TN') return '20 123 456';
  return 'Numéro de téléphone';
};
