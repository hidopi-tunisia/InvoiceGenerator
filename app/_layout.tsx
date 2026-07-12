import '../global.css';
import { Feather } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { ErrorBoundaryProps, Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, AppState } from 'react-native';
import { vexo } from 'vexo-analytics';

import { auth } from './config'; // Import Firebase auth

import { purgeLegacyPdfFilenames } from '~/app/utils/pdf';
import { warmUpBackend } from '~/domain/http';
import { useStore } from '~/store';
import { syncContacts, pushDirtyContacts } from '~/store/contacts-sync';
import { drainDeletions } from '~/store/deletions-sync';
import { syncInvoices, pushDirtyInvoices } from '~/store/invoices-sync';
import { syncProfileOnBoot } from '~/store/profile-sync';
import { purgeLegacyBackup, scopeStoreToAnonymous, scopeStoreToUser } from '~/store/user-scope';

const vexoApiKey = '4277a15f-8ec3-4fdc-ad1c-e6e2f5c61c40';

// Analytics uniquement en production (une seule initialisation)
if (!__DEV__ && vexoApiKey) {
  vexo(vexoApiKey);
}

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: 'https://2cacf18cbc1431eb07b8b3bdad5edbe7@o4508658689572864.ingest.de.sentry.io/4508658744361040',
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  tracesSampleRate: 1.0, // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing. Adjusting this value in production.
  integrations: [navigationIntegration],
  enableNativeFramesTracking: !isRunningInExpoGo(), // Tracks slow and frozen frames in the application
});

function Layout() {
  const [user, setUser] = useState<User | null>(null); // Track user authentication state
  const [authReady, setAuthReady] = useState(false); // onAuthStateChanged a répondu au moins une fois
  // Capture the NavigationContainer ref and register it with the integration.
  const ref = useNavigationContainerRef();
  const router = useRouter();
  const onboardingCompleted = useStore((state) => state.onboardingCompleted);

  useEffect(() => {
    if (ref?.current) {
      navigationIntegration.registerNavigationContainer(ref);
    }

    // Migration one-shot : purge du blob `legacy-backup` sans propriétaire sur
    // les appareils touchés par l'ancienne fuite d'adoption (fire-and-forget).
    purgeLegacyBackup();

    // Migration one-shot : purge des PDFs sous l'ancien nommage facture-*.pdf
    // (le fichier est désormais nommé d'après le tag seul, fire-and-forget).
    purgeLegacyPdfFilenames();

    // Subscribe to authentication state changes
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        // Réchauffe l'instance Render avant la première vraie requête (fire-and-forget)
        warmUpBackend();
        // Cloisonnement : pointer le store sur le tiroir de CET utilisateur et
        // réhydrater AVANT d'autoriser la redirection — sinon l'auth-gate
        // déciderait (onboarding ou tabs) sur les données du mauvais compte.
        await scopeStoreToUser(authUser.uid);
        // Drainer d'abord les suppressions en attente, avant tout pull
        // (pour ne pas re-tirer un contact qu'on est en train de supprimer).
        // Puis sync en séquence : profil (peut sauter l'onboarding pour un
        // utilisateur venu du front web) → contacts → factures
        // (le push d'une facture exige le remoteId de son contact).
        drainDeletions()
          .then(() => syncProfileOnBoot())
          .then(() => syncContacts())
          .then(() => syncInvoices());
      } else {
        scopeStoreToAnonymous();
      }
      setUser(authUser);
      setAuthReady(true);
    });

    // Retour au premier plan : flush sortant (suppressions + upserts en attente).
    // Pas de pull ici — la fraîcheur est hors périmètre de la phase 5.
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && auth.currentUser) {
        drainDeletions();
        pushDirtyInvoices();
        pushDirtyContacts();
      }
    });

    // Unsubscribe on component unmount
    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, [ref]);

  // Redirection conditionnelle — faite APRÈS le montage du navigateur (impératif),
  // sinon expo-router lève « Attempted to navigate before mounting the Root Layout ».
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace('/(auth)/login');
    } else if (!onboardingCompleted) {
      router.replace('/onbording');
    } else {
      router.replace('/(tabs)');
    }
  }, [authReady, user, onboardingCompleted]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
      {/* hide header for generate invoice screen */}
      <Stack.Screen name="invoices/generate" options={{ headerShown: false }} />
      <Stack.Screen name="onbording" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen
        name="invoices/[id]/success"
        options={{
          headerTitle: 'Facture générée',
          headerBackTitle: 'Accueil', // Texte du bouton retour
        }}
      />
      {/* Add auth screens */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}
export default Sentry.wrap(Layout);

//cette fonction va capter n'importe quelle erreur dans l'application
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-red-50 p-6">
      <Feather name="alert-triangle" size={56} color="#dc2626" style={{ marginBottom: 16 }} />

      {/* Titre d'erreur */}
      <Text className="mb-2 text-2xl font-bold text-red-600">Une erreur est survenue</Text>

      {/* Message d'erreur */}
      <Text className="mb-6 text-center text-base text-gray-700">
        {error.message || "Quelque chose s'est mal passé."}
      </Text>

      {/* Bouton pour réessayer */}
      <TouchableOpacity
        onPress={retry}
        accessibilityRole="button"
        accessibilityLabel="Réessayer"
        className="rounded-lg bg-red-500 px-6 py-3 shadow-md">
        <Text className="text-lg font-semibold text-white">Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}
