# Profil enrichi — logo, téléphone, adresse structurée, SIRET/MF

**Date** : 2026-07-10
**Statut** : design validé, prêt pour plan
**Contrat** : `API.md` (§Profile lignes ~283-291, route `PATCH /profile/logo` ligne ~157)

## Décisions (validées)

1. **Identifiant fiscal** : le backend n'a qu'un `fiscalIdentifier { type, value, country }`.
   → **SIRET (FR) / MF (TN) est poussé au serveur** ; le numéro de TVA n'est **plus**
   poussé comme identifiant — il reste local (affiché sur factures/PDF comme aujourd'hui).
2. **Adresse** : **3 champs séparés** (Adresse=rue, Code postal, Ville), alignés sur la
   structure backend `Address { street, zip, city, … }`. Fini la concaténation au pull.
3. **Logo** : sélection galerie → aperçu local immédiat ; **upload à la sauvegarde,
   best-effort** (silencieux hors ligne, retenté à la sauvegarde suivante).
4. **Périmètre** : les **2 écrans** — onboarding `app/onbording/profile.tsx` ET
   Réglages `app/(tabs)/settings/edit.tsx`.

## Modèle local — `businessEntitySchema` (app/schema/invoice.ts)

Ajouts **tous optionnels** (`z.string().optional()`) — aucun bump de version de store,
`BusinessEntity` restant partagé avec les contacts (qui ignorent ces champs) :

| Champ | Rôle |
|---|---|
| `phone` | téléphone |
| `zipCode`, `city` | complètent `address` (qui garde son sens = **rue**, requis) |
| `mf` | matricule fiscal (TN) — `siret` (FR) existe déjà |
| `logoUri` | URI locale de l'image choisie (aperçu, offline-first) |
| `logoUrl` | URL serveur (Cloudinary) renvoyée par l'upload |
| `logoSyncedUri` | dernier `logoUri` uploadé avec succès → permet le retry best-effort |

## Mappers — `domain/mappers.ts`

**`toBackendProfileInput` (push)** :
- `phone: profile.phone || undefined`
- `address: { street: profile.address, zip: profile.zipCode, city: profile.city, country: profile.country }`
  (champs `undefined` si vides ; objet `undefined` si aucune donnée)
- `fiscalIdentifier` :
  - pays `FR` et `siret` renseigné → `{ type: 'SIRET', value: siret, country: 'FR' }`
  - pays `TN` et `mf` renseigné → `{ type: 'MF', value: mf, country: 'TN' }`
  - sinon → `undefined` (on ne met pas à jour le serveur ; la TVA n'est plus envoyée ici)
- Le reste (companyName, currency, language, vat=taxRate) inchangé.

**`fromBackendProfile` (pull)** :
- `+ phone`, `+ logoUrl` (si présents)
- Adresse **répartie** : `street→address`, `zip→zipCode`, `city→city`
  (plus de concaténation « street, zip, city, country »)
- `fiscalIdentifier` selon `type` : `SIRET→siret`, `MF→mf`, `TVA→tva`
  (rétro-compat : les valeurs déjà poussées en type TVA reviennent dans le champ TVA)
- `country` : logique existante conservée (fiscalIdentifier.country puis address.country).

## Upload du logo

- `domain/profile.ts` : nouvelle fonction `uploadLogo(uri: string)` → `PATCH /profile/logo`
  en **multipart** (`FormData` avec le fichier sous la clé `logo`, conforme API.md — pas
  de base64). Réponse `{ logoUrl }`. S'appuyer sur le helper http existant s'il gère le
  multipart, sinon un fetch dédié avec le même token Firebase (`domain/authorization`).
- `store/profile-sync.ts` : nouvelle fonction `pushLogo()` — si `profile.logoUri` présent
  et ≠ `profile.logoSyncedUri` : upload best-effort ; succès → `setProfile({ logoUrl,
  logoSyncedUri: logoUri })` ; échec réseau silencieux (retenté à la prochaine
  sauvegarde) ; échec non-réseau → `reportSyncError`. Appelée par les deux écrans à la
  sauvegarde (fire-and-forget, comme `pushProfile()`).

## UI — les 2 écrans (mêmes champs)

- **Logo** : cercle tappable en tête (aperçu `logoUri` ‖ `logoUrl`, sinon icône
  appareil photo + « Ajouter un logo ») → `expo-image-picker`
  `launchImageLibraryAsync({ mediaTypes: images, quality ~0.7 })` → **état local d'écran**
  `logoUri` (pas dans le formulaire RHF), fusionné à la sauvegarde :
  `setProfile({ ...data, logoUri })`.
- **Champs** : Nom (requis, existant) · **Téléphone** (optionnel, clavier téléphone) ·
  **Adresse** (multiline, agrandie, requis) · ligne **Code postal + Ville** (optionnels) ·
  **Siret** si `profile.country === 'FR'` / **MF** si `'TN'` (sinon aucun des deux) ·
  **Numéro de TVA (optionnel)** conservé.
- **Onboarding** : conserver la réactivité au pull serveur (option RHF `values` +
  `keepDirtyValues`) — inclure les nouveaux champs dans `values`.
- **Réglages/edit** : mêmes champs ; `defaultValues` figés acceptables (profil déjà local).
- À la sauvegarde (2 écrans) : `setProfile(data)` puis `pushProfile()` + `pushLogo()`.

## Dépendance

`npx expo install expo-image-picker` + plugin dans `app.json` (message de permission
photos en français). **Module natif → rebuild du dev-client requis** pour tester.

## Hors périmètre (YAGNI)

Logo dans le PDF ; validation stricte des formats SIRET (14 chiffres) / MF / téléphone ;
suppression du logo côté serveur ; champ `state` de l'adresse ; écran contacts.

## Vérification

Pas de framework de test : `npx tsc --noEmit` + `npx eslint` sur les fichiers modifiés +
smoke device : (a) ancien utilisateur Angular → adresse/CP/ville chacun dans son champ,
téléphone rempli ; (b) pays FR → champ Siret visible (TN → MF) ; (c) logo choisi →
aperçu immédiat, upload à la sauvegarde (vérifiable côté Angular/logoUrl) ; (d) hors
ligne → sauvegarde OK, logo retenté à la sauvegarde suivante ; (e) contacts et wizard
facture non affectés.
