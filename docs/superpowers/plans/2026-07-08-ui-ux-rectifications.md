# Rectifications UI/UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page détail contact (avec historique factures), refondre le wizard 3/4 avec un total temps réel HT/TVA/TTC, et finir de franciser l'app.

**Architecture:** Trois tâches indépendantes sur des écrans Expo Router existants/nouveaux, en réutilisant les utils (`getTotals`, `getInvoiceCurrency`, `getDisplayStatus`, `getStatusColor`, `formatAmount`, `formatDate`) et les actions store (`startNewInvoice`, `addRecipientInfo`, `addItems`, `deleteContact`). Le rendu visuel final est peaufiné avec le skill `ui-ux-pro-max`.

**Tech Stack:** React Native / Expo (SDK 57), expo-router, NativeWind, React Hook Form + Zod, Zustand. Pas de framework de test → vérification par `npx tsc --noEmit`, `npx eslint`, et smoke-test device.

## Global Constraints

- **Langue** : 100 % français pour toute chaîne affichée. **« Email » conservé** tel quel (décision utilisateur). Ne pas traduire identifiants techniques / valeurs de statut backend / commentaires.
- **Style** : NativeWind ; cartes `bg-white rounded-xl shadow-sm` ; primary `#4f46e5` via `bg-primary`/`text-primary` ; fonds `gray-50`. Dates via `formatDate` (fr-FR), montants via `formatAmount` + devise `getInvoiceCurrency`.
- **Alias** `~/` pour les imports. `npm run format` (prettier-plugin-tailwindcss trie les classes) après édition de className.
- **Modèle** : `BusinessEntity` n'a pas de téléphone/catégorie — n'afficher que name/address/email/tva/siret.
- **Pas de test framework** : ne pas en créer. Vérif = `tsc` + `eslint` + smoke-test.

---

### Task 1: Wizard 3/4 (`items.tsx`) — refonte carte article + total temps réel

**Files:**
- Modify: `app/invoices/generate/items.tsx` (réécriture du composant)

**Interfaces:**
- Consumes: `getTotals(invoice: Partial<Invoice>) => { subtotal, taxRate, tax, total }` et `getInvoiceCurrency(invoice?) => string` (`~/app/utils/invoice`) ; `useStore` (`newInvoice`, `addItems`) ; `formatAmount`.
- Produces: écran d'items avec footer récap temps réel ; navigation inchangée vers `summary`.

- [ ] **Step 1: Réécrire `app/invoices/generate/items.tsx`**

Remplacer tout le fichier par :

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';

import { InvoiceItem, invoiceItemSchema } from '~/app/schema/invoice';
import { formatAmount, getInvoiceCurrency, getTotals } from '~/app/utils/invoice';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import NumericInputText from '~/components/NumericInputText';
import { useStore } from '~/store';

const itemsSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, 'Ajoutez au moins un article à la facture'),
});

type FormValues = { items: InvoiceItem[] };

// Ligne vierge par défaut — le prix à 0 force une saisie réelle (min 1 au schéma)
const emptyItem: InvoiceItem = { name: '', quantity: 1, price: 0 };

export default function GenerateInvoice() {
  const addItems = useStore((data) => data.addItems);
  const items = useStore((data) => data.newInvoice?.items);
  const taxRate = useStore((data) => data.newInvoice?.taxRate);
  const currency = useStore((data) => getInvoiceCurrency(data.newInvoice ?? undefined));

  const methods = useForm<FormValues>({
    resolver: zodResolver(itemsSchema),
    defaultValues: { items: items?.length ? items : [emptyItem] },
  });
  const { control } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Total général temps réel : recalcul à chaque frappe (watch de toutes les lignes)
  const watchedItems = methods.watch('items');
  const { subtotal, tax, total } = getTotals({ items: watchedItems ?? [], taxRate });

  const onSubmit = (data: FormValues) => {
    addItems(data.items);
    router.push('/invoices/generate/summary');
  };

  return (
    <FormProvider {...methods}>
      <View className="flex-1 bg-gray-50">
        <KeyboardAwareScrollView>
          <View className="gap-4">
            {fields.map((item, index) => {
              const lineTotal =
                (methods.watch(`items.${index}.quantity`) || 0) *
                (methods.watch(`items.${index}.price`) || 0);
              return (
                <View key={item.id} className="gap-3 rounded-xl bg-white p-4 shadow-sm shadow-black/5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-gray-800">Article {index + 1}</Text>
                    {fields.length > 1 && (
                      <TouchableOpacity
                        onPress={() => remove(index)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer l'article ${index + 1}`}>
                        <Feather name="trash-2" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <CustomInputText
                    name={`items.${index}.name`}
                    label="Désignation"
                    placeholder="Entrez la désignation"
                    multiline
                  />

                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <CustomInputText
                        name={`items.${index}.quantity`}
                        label="Quantité"
                        placeholder="Quantité"
                        keyboardType="numeric"
                        onChangeText={(value) => {
                          const parsed = Number(value.replace(',', '.'));
                          methods.setValue(
                            `items.${index}.quantity`,
                            Number.isNaN(parsed) ? 0 : parsed
                          );
                        }}
                      />
                    </View>
                    <View className="flex-1">
                      <NumericInputText
                        name={`items.${index}.price`}
                        label="Prix unitaire"
                        placeholder="Prix"
                      />
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between border-t border-gray-100 pt-2">
                    <Text className="text-sm text-gray-500">Sous-total ligne</Text>
                    <Text className="font-semibold text-gray-700">
                      {formatAmount(lineTotal)} {currency}
                    </Text>
                  </View>
                </View>
              );
            })}

            {methods.formState.errors.items?.message && (
              <Text className="text-sm text-red-500">{methods.formState.errors.items.message}</Text>
            )}

            <Button variant="link" title="+ Ajouter un article" onPress={() => append(emptyItem)} />
          </View>
        </KeyboardAwareScrollView>

        {/* Récap fixe en bas : HT / TVA / TTC en temps réel, devise utilisateur */}
        <View className="border-t border-gray-200 bg-white px-4 pb-6 pt-4 shadow-lg shadow-black/10">
          <View className="mb-1 flex-row justify-between">
            <Text className="text-sm text-gray-500">Sous-total HT</Text>
            <Text className="text-sm text-gray-700">
              {formatAmount(subtotal)} {currency}
            </Text>
          </View>
          <View className="mb-2 flex-row justify-between">
            <Text className="text-sm text-gray-500">TVA ({taxRate ?? 0} %)</Text>
            <Text className="text-sm text-gray-700">
              {formatAmount(tax)} {currency}
            </Text>
          </View>
          <View className="mb-3 flex-row justify-between">
            <Text className="text-base font-bold text-gray-900">Total TTC</Text>
            <Text className="text-base font-bold text-primary">
              {formatAmount(total)} {currency}
            </Text>
          </View>
          <Button title="Suivant" onPress={methods.handleSubmit(onSubmit)} />
        </View>
      </View>
    </FormProvider>
  );
}
```

- [ ] **Step 2: Vérifier les types + lint**

Run: `npx tsc --noEmit` puis `npx eslint app/invoices/generate/items.tsx`
Expected: tsc exit 0 (aucune erreur) ; eslint 0 erreur. Si Prettier râle sur l'ordre des classes : `npx prettier --write app/invoices/generate/items.tsx`.

- [ ] **Step 3: Smoke-test (device, décrit)**

Lancer le wizard (Accueil → Nouvelle facture → étapes 1-2 → 3/4). Vérifier : titres « Article N », icône poubelle qui supprime une ligne (masquée s'il n'en reste qu'une), total de ligne live, et **barre HT/TVA/TTC en bas qui se met à jour à chaque frappe**, dans la devise du profil. « Suivant » → résumé.

- [ ] **Step 4: Commit**

```bash
git add app/invoices/generate/items.tsx
git commit -m "feat(wizard): refonte étape articles + total HT/TVA/TTC temps réel"
```

---

### Task 2: Page détail contact + navigation

**Files:**
- Create: `app/(tabs)/contacts/[id]/index.tsx`
- Modify: `app/(tabs)/contacts/_layout.tsx` (enregistrer l'écran détail)
- Modify: `app/(tabs)/contacts/index.tsx` (rendre la carte tappable → détail)

**Interfaces:**
- Consumes: `useStore` (`contacts`, `invoices`, `startNewInvoice`, `addRecipientInfo`, `deleteContact`) ; `pushContactDeletion` (`~/store/contacts-sync`) ; `getDisplayStatus`, `getStatusColor`, `getTotals`, `getInvoiceCurrency`, `formatAmount`, `formatDate` (`~/app/utils/invoice`) ; `Linking` (react-native).
- Produces: route `/contacts/[id]` (détail lecture).

- [ ] **Step 1: Créer `app/(tabs)/contacts/[id]/index.tsx`**

```tsx
import { Feather } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import {
  formatAmount,
  formatDate,
  getDisplayStatus,
  getInvoiceCurrency,
  getStatusColor,
  getTotals,
} from '~/app/utils/invoice';
import { Button } from '~/components/Button';
import { useStore } from '~/store';
import { pushContactDeletion } from '~/store/contacts-sync';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

// Ligne d'info (icône + valeur), masquée si la valeur est absente
function InfoRow({
  icon,
  value,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  value?: string;
  onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 py-2"
      accessibilityRole={onPress ? 'button' : undefined}>
      <Feather name={icon} size={18} color="#6b7280" />
      <Text className={`flex-1 text-base ${onPress ? 'text-primary' : 'text-gray-700'}`}>{value}</Text>
    </Pressable>
  );
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contact = useStore((state) => state.contacts.find((c) => c.id === id));
  const invoices = useStore((state) => state.invoices);
  const startNewInvoice = useStore((state) => state.startNewInvoice);
  const addRecipientInfo = useStore((state) => state.addRecipientInfo);
  const deleteContact = useStore((state) => state.deleteContact);

  if (!contact) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-gray-500">Contact introuvable.</Text>
      </View>
    );
  }

  // Factures de ce contact : match remoteId, sinon id local, sinon email
  const contactInvoices = invoices.filter((inv) => {
    const r = inv.recipient;
    if (!r) return false;
    if (contact.remoteId && r.remoteId) return r.remoteId === contact.remoteId;
    if (r.id === contact.id) return true;
    return !!contact.email && r.email?.toLowerCase() === contact.email.toLowerCase();
  });

  const onNewInvoice = () => {
    startNewInvoice();
    addRecipientInfo(contact);
    router.push('/invoices/generate/items');
  };

  const onDelete = () => {
    Alert.alert('Supprimer le contact', `Supprimer ${contact.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteContact(contact);
          pushContactDeletion(contact);
          router.back();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Contact',
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/contacts/${contact.id}/edit`)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Modifier le contact">
              <Text className="text-primary">Modifier</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* En-tête : avatar + nom */}
        <View className="mb-4 items-center">
          <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Text className="text-2xl font-bold text-primary">{getInitials(contact.name)}</Text>
          </View>
          <Text className="text-center text-xl font-bold text-gray-900">{contact.name}</Text>
        </View>

        {/* Infos */}
        <View className="mb-4 rounded-xl bg-white px-4 py-2 shadow-sm shadow-black/5">
          <InfoRow icon="map-pin" value={contact.address} />
          <InfoRow
            icon="mail"
            value={contact.email}
            onPress={contact.email ? () => Linking.openURL(`mailto:${contact.email}`) : undefined}
          />
          <InfoRow icon="file-text" value={contact.tva ? `TVA ${contact.tva}` : undefined} />
          <InfoRow icon="hash" value={contact.siret ? `SIRET ${contact.siret}` : undefined} />
        </View>

        {/* Actions */}
        <Button title="+ Nouvelle facture" onPress={onNewInvoice} />
        <Pressable onPress={onDelete} className="mt-3 items-center py-2" accessibilityRole="button">
          <Text className="text-red-500">Supprimer le contact</Text>
        </Pressable>

        {/* Historique factures */}
        <Text className="mb-2 mt-6 text-base font-semibold text-gray-900">
          Factures ({contactInvoices.length})
        </Text>
        {contactInvoices.length === 0 ? (
          <Text className="text-gray-500">Aucune facture pour ce contact.</Text>
        ) : (
          contactInvoices.map((invoice) => {
            const status = getDisplayStatus(invoice);
            const { total } = getTotals(invoice);
            return (
              <Pressable
                key={invoice.id}
                onPress={() => router.push(`/invoices/${invoice.id}/detail`)}
                className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm shadow-black/5">
                <View>
                  <Text className="font-semibold text-gray-900">#{invoice.invoiceNumber}</Text>
                  <Text className="mt-1 text-sm text-gray-500">{formatDate(invoice.invoiceDate)}</Text>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-gray-900">
                    {formatAmount(total)} {getInvoiceCurrency(invoice)}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-1">
                    <View className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
                    <Text className="text-xs capitalize text-gray-600">{status}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Enregistrer l'écran dans `app/(tabs)/contacts/_layout.tsx`**

Ajouter la `Stack.Screen` `[id]/index` (avant `[id]/edit`) :

```tsx
import { Stack } from 'expo-router';

export default function ContactLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Contacts' }} />
      <Stack.Screen name="new" options={{ title: 'Nouveau contact' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Contact' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Modifier un contact' }} />
    </Stack>
  );
}
```

- [ ] **Step 3: Rendre la carte de la liste tappable → détail**

Dans `app/(tabs)/contacts/index.tsx`, `ContactListItem`, envelopper le contenu de la carte (le `<View className="mb-4 flex-row ...">`) dans un `Pressable` qui navigue vers le détail, en gardant le `ContextMenu` (long-press) et le bouton emerald. Remplacer :

```tsx
      <View className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-4 shadow-sm shadow-black/10">
```

par :

```tsx
      <Pressable
        onPress={() => router.push(`/contacts/${contact.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Voir le contact ${contact.name}`}
        className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-4 shadow-sm shadow-black/10">
```

et la balise fermante correspondante `</View>` (celle qui ferme cette carte, juste après le bouton emerald `</Pressable>`) par `</Pressable>`. `Pressable` et `router` sont déjà importés dans ce fichier.

- [ ] **Step 4: Vérifier types + lint**

Run: `npx tsc --noEmit` puis `npx eslint "app/(tabs)/contacts/[id]/index.tsx" "app/(tabs)/contacts/_layout.tsx" "app/(tabs)/contacts/index.tsx"`
Expected: tsc exit 0 ; eslint 0 erreur. `npx prettier --write` sur ces fichiers si besoin.

- [ ] **Step 5: Smoke-test (device, décrit)**

Onglet Contacts → **tap** sur un contact → page détail (avatar, nom, adresse, email tappable → app mail, TVA/SIRET si présents). « Modifier » (header) → écran d'édition. « + Nouvelle facture » → wizard à l'étape articles avec le destinataire déjà posé. « Supprimer » → confirmation → retour à la liste. Section « Factures (N) » listant les factures du contact, tap → détail facture.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/contacts/[id]/index.tsx" "app/(tabs)/contacts/_layout.tsx" "app/(tabs)/contacts/index.tsx"
git commit -m "feat(contacts): page détail contact (infos, actions, historique factures)"
```

---

### Task 3: Balayage 100 % français

**Files:**
- Modify: tout fichier de `app/` ou `components/` contenant une chaîne affichée en anglais (identifiés par le grep ci-dessous).

**Interfaces:** aucune (chaînes d'UI uniquement).

- [ ] **Step 1: Recenser les chaînes anglaises restantes**

Run :
```bash
grep -rnoiE "(label|placeholder|title|accessibilityLabel)=\"[^\"]*\b(Item|Save|Cancel|Delete|Edit|Add|Next|Back|Submit|Name|Price|Amount|Search|Loading|Settings|Home|Invoice|Contact|Done|Yes|No|Confirm|Success|Failed|Update|Create|Remove|Close|Send)\b[^\"]*\"" app components
grep -rnoE ">[^<>{}]*\b(Item|Loading|Save|Cancel|Delete|Edit|Next|Back|Submit|Search|Settings|Home|Done|Confirm|Success|Failed|Create|Remove|Close|Send)\b[^<>{}]*<" app components
```
Noter chaque occurrence réellement **affichée** (ignorer les commentaires, clés techniques, statuts backend, et `Email`/`E-mail` qui restent tels quels).

- [ ] **Step 2: Traduire chaque occurrence**

Pour chaque chaîne trouvée, remplacer par l'équivalent français naturel. Exemples de correspondances (appliquer les mêmes conventions partout) :

```
Item → Article        Save → Enregistrer      Cancel → Annuler
Delete/Remove → Supprimer   Edit → Modifier    Add → Ajouter
Next → Suivant        Back → Retour           Search → Rechercher
Settings → Paramètres  Home → Accueil          Loading → Chargement
Done → Terminé        Confirm → Confirmer      Close → Fermer
Send → Envoyer        Create → Créer           Update → Mettre à jour
```

Ne pas toucher : `Email`/`E-mail` (conservés), les `status` backend (`Pending`/`Paid`…), les clés d'analytics (`customEvent('...')`), les noms de variables/props.

- [ ] **Step 3: Vérifier qu'il ne reste rien d'affiché en anglais**

Run: relancer les deux `grep` du Step 1.
Expected: plus aucune occurrence (hors `Email`/`E-mail` et faux positifs non-affichés). Si `items.tsx` remonte encore « Item », c'est que la Task 1 n'a pas été appliquée — vérifier.

- [ ] **Step 4: Types + lint**

Run: `npx tsc --noEmit` ; `npm run lint` (ou `npx eslint` sur les fichiers modifiés).
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(i18n): finalise la francisation des chaînes affichées"
```

---

## Self-Review

**Spec coverage :**
- §1 page détail contact (route, contenu, actions, historique) → Task 2. ✅ (téléphone/catégorie absents du modèle : non affichés, conforme au spec « on affiche l'existant »).
- §1 navigation liste → détail → Task 2, Step 3. ✅
- §2 total temps réel HT/TVA/TTC + devise → Task 1 (footer via `getTotals`/`getInvoiceCurrency`). ✅
- §2 refonte carte article + « Item → Article » + suppression par icône → Task 1. ✅
- §3 balayage français, « Email » conservé → Task 3. ✅

**Placeholder scan :** aucun TBD/TODO ; code complet pour les deux écrans ; Task 3 fournit la table de correspondances et les commandes exactes. ✅

**Type consistency :** `getTotals`/`getInvoiceCurrency`/`getDisplayStatus`/`getStatusColor`/`formatAmount`/`formatDate` utilisés avec leurs signatures réelles ; `startNewInvoice()`, `addRecipientInfo(contact)`, `addItems(items)`, `deleteContact(contact)`, `pushContactDeletion(contact)` conformes au store. Route `/contacts/[id]` cohérente entre `_layout` (`[id]/index`), la liste (push) et l'écran créé. ✅

## Note d'exécution
Le code fourni est un **baseline fonctionnel complet** (logique, data flow, navigation, français). Le **peaufinage visuel** (hiérarchie, espacements, états, contrastes) se fait avec le skill **`ui-ux-pro-max`** au moment de coder chaque écran, sans changer la logique ni les interfaces ci-dessus.
